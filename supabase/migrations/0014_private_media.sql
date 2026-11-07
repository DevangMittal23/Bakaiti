-- Existing public references keep working through /api/media; direct public access ends here.
BEGIN;

UPDATE storage.buckets SET public = false WHERE id IN ('message-media', 'post-media');
UPDATE storage.buckets SET allowed_mime_types = array_append(allowed_mime_types, 'video/webm')
WHERE id = 'message-media' AND NOT ('video/webm' = ANY(allowed_mime_types));

-- Accept only our persisted app references and legacy Supabase public references.
CREATE OR REPLACE FUNCTION public.media_object_path(reference text, bucket text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN reference LIKE '/api/media/' || bucket || '/%'
      THEN substr(reference, length('/api/media/' || bucket || '/') + 1)
    WHEN reference ~ ('^https://[^/]+/storage/v1/object/public/' || bucket || '/')
      THEN regexp_replace(reference, '^https://[^/]+/storage/v1/object/public/' || bucket || '/', '')
    ELSE NULL
  END;
$$;

DROP POLICY "Participants can access message media" ON storage.objects;
CREATE POLICY "Participants can access message media" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'message-media' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE NOT m.is_deleted AND public.media_object_path(m.media_url, 'message-media') = name
      )
    )
  );

DROP POLICY "Post media is publicly accessible" ON storage.objects;
CREATE POLICY "Visible posts and active stories grant media access" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'post-media' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.posts p, unnest(p.media_urls) reference
        WHERE public.media_object_path(reference, 'post-media') = name
      )
      OR EXISTS (
        SELECT 1 FROM public.stories s
        WHERE public.media_object_path(s.media_url, 'post-media') = name
      )
    )
  );

ALTER POLICY "Authenticated users can upload post media" ON storage.objects
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
ALTER POLICY "Authenticated users can upload message media" ON storage.objects
  WITH CHECK (bucket_id = 'message-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- A visible row must not be usable to publish somebody else's private upload.
CREATE OR REPLACE FUNCTION public.check_media_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  reference text;
  references_to_check text[];
  bucket text;
  owner_id uuid;
  object_path text;
BEGIN
  IF TG_TABLE_NAME = 'messages' THEN
    references_to_check := ARRAY[NEW.media_url]; bucket := 'message-media'; owner_id := NEW.sender_id;
  ELSIF TG_TABLE_NAME = 'stories' THEN
    references_to_check := ARRAY[NEW.media_url]; bucket := 'post-media'; owner_id := NEW.author_id;
  ELSE
    references_to_check := NEW.media_urls; bucket := 'post-media'; owner_id := NEW.author_id;
  END IF;
  FOREACH reference IN ARRAY coalesce(references_to_check, ARRAY[]::text[]) LOOP
    IF reference IS NULL THEN CONTINUE; END IF;
    object_path := public.media_object_path(reference, bucket);
    IF object_path IS NULL OR split_part(object_path, '/', 1) <> owner_id::text
       OR object_path ~ '(^|/)\.\.?(/|$)' OR object_path ~ '[%?#\\]' THEN
      RAISE EXCEPTION 'Media must reference the author''s own upload' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_message_media_owner BEFORE INSERT OR UPDATE OF media_url ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_media_owner();
CREATE TRIGGER check_post_media_owner BEFORE INSERT OR UPDATE OF media_urls ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.check_media_owner();
CREATE TRIGGER check_story_media_owner BEFORE INSERT OR UPDATE OF media_url ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.check_media_owner();

COMMIT;

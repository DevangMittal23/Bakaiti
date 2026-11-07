-- ============================================================
-- Bakaiti — Migration 0004: Storage Buckets (Idempotent)
-- ============================================================

-- 1. avatars bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit, 
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. post-media bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 'post-media', true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit, 
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. message-media bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-media', 'message-media', true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/webm', 'audio/mp4', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit, 
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Storage RLS: avatars
-- ============================================================
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Storage RLS: post-media
-- ============================================================
DROP POLICY IF EXISTS "Post media is publicly accessible" ON storage.objects;
CREATE POLICY "Post media is publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
CREATE POLICY "Authenticated users can upload post media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media' AND
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete their own post media" ON storage.objects;
CREATE POLICY "Users can delete their own post media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Storage RLS: message-media
-- ============================================================
DROP POLICY IF EXISTS "Participants can access message media" ON storage.objects;
CREATE POLICY "Participants can access message media" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-media');

DROP POLICY IF EXISTS "Authenticated users can upload message media" ON storage.objects;
CREATE POLICY "Authenticated users can upload message media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-media' AND
    auth.uid() IS NOT NULL
  );

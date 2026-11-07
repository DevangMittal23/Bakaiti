-- Bakaiti: forward-only integrity and access-control fixes.
-- Applies to both fresh installs and existing databases using public.users.

BEGIN;

-- Retain conversation history when its creator deletes their account.
ALTER TABLE public.conversations ALTER COLUMN created_by DROP NOT NULL;

-- CHECK expressions must reject NULL/empty arrays rather than evaluating to NULL.
-- NOT VALID preserves any pre-existing invalid rows while enforcing new writes.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_have_content CHECK (
  length(btrim(coalesce(content, ''))) > 0
  OR coalesce(cardinality(media_urls), 0) > 0
  OR (coalesce(is_repost, false) AND original_post_id IS NOT NULL)
) NOT VALID;

DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Joining a known conversation ID is not an invitation.
ALTER POLICY "Users can join conversations" ON public.participants
  WITH CHECK (
    public.is_conversation_creator(conversation_id, auth.uid())
    OR public.is_conversation_admin(conversation_id, auth.uid())
  );

-- Members may advance read receipts, but cannot promote themselves or move rows.
REVOKE UPDATE ON public.participants FROM anon, authenticated;
GRANT UPDATE (last_read_message_id) ON public.participants TO authenticated;

-- Scores and account timestamps are maintained by the database, not clients.
REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (
  username, display_name, avatar_url, bio, online_at,
  pulse_type, pulse_expires_at, pulse_set_at
) ON public.users TO authenticated;
DROP POLICY "Only system can insert signal history" ON public.signal_score_history;

-- Only the addressee can accept a pending request; blocked users cannot unblock themselves.
ALTER POLICY "Users can send friend requests" ON public.friendships
  WITH CHECK (auth.uid() = requester_id AND status IN ('pending', 'blocked'));
ALTER POLICY "Parties can update friendships" ON public.friendships
  USING (auth.uid() = addressee_id AND status = 'pending')
  WITH CHECK (auth.uid() = addressee_id AND status = 'accepted');
ALTER POLICY "Users can delete their own friendships" ON public.friendships
  USING (auth.uid() = requester_id OR (auth.uid() = addressee_id AND status <> 'blocked'));
REVOKE UPDATE ON public.friendships FROM anon, authenticated;
GRANT UPDATE (status) ON public.friendships TO authenticated;

-- Related rows inherit the parent post's RLS visibility.
ALTER POLICY "Comments are publicly readable" ON public.comments
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
ALTER POLICY "Authenticated users can comment" ON public.comments
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id)
  );
ALTER POLICY "Anyone can see post likes" ON public.post_likes
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
ALTER POLICY "Authenticated users can like posts" ON public.post_likes
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id)
  );
ALTER POLICY "Authenticated users can bookmark posts" ON public.post_bookmarks
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id)
  );
ALTER POLICY "Anyone can see comment likes" ON public.comment_likes
  USING (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id));
ALTER POLICY "Authenticated users can like comments" ON public.comment_likes
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id)
  );
ALTER POLICY "Participants can react to messages" ON public.message_reactions
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id)
  );

-- Keep identifiers, counters and authorship immutable through direct client updates.
REVOKE INSERT ON public.messages, public.posts, public.comments FROM anon, authenticated;
GRANT INSERT (conversation_id, sender_id, content, type, media_url, media_metadata, gif_url, reply_to_id)
  ON public.messages TO authenticated;
GRANT INSERT (author_id, content, media_urls, media_types, link_url, link_preview, visibility, is_repost, original_post_id)
  ON public.posts TO authenticated;
GRANT INSERT (post_id, author_id, content, parent_comment_id)
  ON public.comments TO authenticated;
REVOKE UPDATE ON public.messages, public.posts, public.comments FROM anon, authenticated;
GRANT UPDATE (content, is_edited, is_deleted, deleted_for, media_url, gif_url)
  ON public.messages TO authenticated;
GRANT UPDATE (content, media_urls, media_types, link_url, link_preview, visibility)
  ON public.posts TO authenticated;
GRANT UPDATE (content) ON public.comments TO authenticated;

-- Do not let a client impersonate a different notification actor.
-- Full event validation remains app work; see tasks.md.
ALTER POLICY "System can insert notifications" ON public.notifications
  WITH CHECK (auth.uid() = actor_id);
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

-- Scheduled global jobs run through the service role, not public RPC calls.
REVOKE EXECUTE ON FUNCTION public.calculate_signal_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_all_signal_scores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_pulses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_signal_score(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_all_signal_scores() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_pulses() TO service_role;

-- Qualify the nested call for existing installations before pinning search_path.
CREATE OR REPLACE FUNCTION public.calculate_all_signal_scores()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.users LOOP
    PERFORM public.calculate_signal_score(u.id);
  END LOOP;
END;
$$;

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN (
      'handle_new_user', 'increment_post_likes', 'decrement_post_likes',
      'increment_post_comments', 'decrement_post_comments',
      'increment_comment_likes', 'decrement_comment_likes',
      'update_conversation_last_message', 'increment_story_views',
      'calculate_signal_score', 'expire_stale_pulses'
    )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = %L', fn, '');
  END LOOP;
END $$;

-- Pulse subscriptions listen to users; friend requests and reactions also change live.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users', 'friendships', 'message_reactions'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;

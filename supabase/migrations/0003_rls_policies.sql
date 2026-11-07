-- ============================================================
-- Bakaiti — Migration 0003: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP EXISTING POLICIES TO PREVENT DUPLICATION ERRORS ON RERUN
-- ============================================================
DROP POLICY IF EXISTS "Users are publicly readable" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

DROP POLICY IF EXISTS "Users can see their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Parties can update friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;

DROP POLICY IF EXISTS "Users can see conversations they are in" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update group conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can see participants in their conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.participants;
DROP POLICY IF EXISTS "Admins can remove participants" ON public.participants;

DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can edit their own messages" ON public.messages;

DROP POLICY IF EXISTS "Participants can see reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Participants can react to messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;

DROP POLICY IF EXISTS "Public posts are readable by all" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.posts;

DROP POLICY IF EXISTS "Anyone can see post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;

DROP POLICY IF EXISTS "Users can see their own bookmarks" ON public.post_bookmarks;
DROP POLICY IF EXISTS "Authenticated users can bookmark posts" ON public.post_bookmarks;
DROP POLICY IF EXISTS "Users can unbookmark posts" ON public.post_bookmarks;

DROP POLICY IF EXISTS "Comments are publicly readable" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
DROP POLICY IF EXISTS "Authors can update their comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can delete their comments" ON public.comments;

DROP POLICY IF EXISTS "Anyone can see comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;

DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Active stories are publicly readable" ON public.stories;
DROP POLICY IF EXISTS "Authors can create stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can delete their stories" ON public.stories;

DROP POLICY IF EXISTS "Story authors can see views" ON public.story_views;
DROP POLICY IF EXISTS "Authenticated users can view stories" ON public.story_views;

DROP POLICY IF EXISTS "Participants can see call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Authenticated users can create call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Participants can update call logs" ON public.call_logs;

-- ============================================================
-- USERS POLICIES
-- ============================================================
CREATE POLICY "Users are publicly readable" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- FRIENDSHIPS POLICIES
-- ============================================================
CREATE POLICY "Users can see their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Parties can update friendships" ON public.friendships
  FOR UPDATE USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete their own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================================
-- CONVERSATIONS POLICIES
-- ============================================================
CREATE POLICY "Users can see conversations they are in" ON public.conversations
  FOR SELECT USING (
    public.is_conversation_participant(id, auth.uid()) OR
    auth.uid() = created_by
  );

CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update group conversations" ON public.conversations
  FOR UPDATE USING (
    public.is_conversation_admin(id, auth.uid())
  );

-- ============================================================
-- PARTICIPANTS POLICIES
-- ============================================================
CREATE POLICY "Users can see participants in their conversations" ON public.participants
  FOR SELECT USING (
    public.is_conversation_participant(conversation_id, auth.uid()) OR
    public.is_conversation_creator(conversation_id, auth.uid())
  );

CREATE POLICY "Users can join conversations" ON public.participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    public.is_conversation_admin(conversation_id, auth.uid()) OR
    public.is_conversation_creator(conversation_id, auth.uid())
  );

CREATE POLICY "Users can update their own participant record" ON public.participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can remove participants" ON public.participants
  FOR DELETE USING (
    auth.uid() = user_id OR
    public.is_conversation_admin(conversation_id, auth.uid())
  );

-- ============================================================
-- MESSAGES POLICIES
-- ============================================================
CREATE POLICY "Participants can read messages" ON public.messages
  FOR SELECT USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Senders can edit their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- ============================================================
-- MESSAGE REACTIONS POLICIES
-- ============================================================
CREATE POLICY "Participants can see reactions" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
      AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

CREATE POLICY "Participants can react to messages" ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- POSTS POLICIES
-- ============================================================
CREATE POLICY "Public posts are readable by all" ON public.posts
  FOR SELECT USING (
    visibility = 'public' OR
    author_id = auth.uid() OR
    (
      visibility = 'friends' AND
      EXISTS (
        SELECT 1 FROM public.friendships
        WHERE status = 'accepted' AND (
          (requester_id = auth.uid() AND addressee_id = posts.author_id) OR
          (addressee_id = auth.uid() AND requester_id = posts.author_id)
        )
      )
    )
  );

CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- POST LIKES POLICIES
-- ============================================================
CREATE POLICY "Anyone can see post likes" ON public.post_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- POST BOOKMARKS POLICIES
-- ============================================================
CREATE POLICY "Users can see their own bookmarks" ON public.post_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can bookmark posts" ON public.post_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unbookmark posts" ON public.post_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTS POLICIES
-- ============================================================
CREATE POLICY "Comments are publicly readable" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their comments" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments" ON public.comments
  FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- COMMENT LIKES POLICIES
-- ============================================================
CREATE POLICY "Anyone can see comment likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================
CREATE POLICY "Users can see their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ============================================================
-- STORIES POLICIES
-- ============================================================
CREATE POLICY "Active stories are publicly readable" ON public.stories
  FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Authors can create stories" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their stories" ON public.stories
  FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- STORY VIEWS POLICIES
-- ============================================================
CREATE POLICY "Story authors can see views" ON public.story_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_views.story_id
      AND stories.author_id = auth.uid()
    )
    OR auth.uid() = viewer_id
  );

CREATE POLICY "Authenticated users can view stories" ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ============================================================
-- CALL LOGS POLICIES
-- ============================================================
CREATE POLICY "Participants can see call logs" ON public.call_logs
  FOR SELECT USING (
    call_logs.conversation_id IS NOT NULL AND
    public.is_conversation_participant(call_logs.conversation_id, auth.uid())
  );

CREATE POLICY "Authenticated users can create call logs" ON public.call_logs
  FOR INSERT WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Participants can update call logs" ON public.call_logs
  FOR UPDATE USING (
    call_logs.conversation_id IS NOT NULL AND
    public.is_conversation_participant(call_logs.conversation_id, auth.uid())
  );

-- ============================================================
-- ENABLE REALTIME for key tables (Idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
    AND c.relname = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
    AND c.relname = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
    AND c.relname = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
    AND c.relname = 'participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
  END IF;
END $$;

-- ============================================================
-- Bakaiti — Migration 0002: Functions and Triggers
-- ============================================================

-- ============================================================
-- AUTO-UPDATE updated_at TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- AUTO-INCREMENT post likes_count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_like_insert ON public.post_likes;
CREATE TRIGGER on_post_like_insert AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION increment_post_likes();

DROP TRIGGER IF EXISTS on_post_like_delete ON public.post_likes;
CREATE TRIGGER on_post_like_delete AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_post_likes();

-- ============================================================
-- AUTO-INCREMENT post comments_count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_insert ON public.comments;
CREATE TRIGGER on_comment_insert AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION increment_post_comments();

DROP TRIGGER IF EXISTS on_comment_delete ON public.comments;
CREATE TRIGGER on_comment_delete AFTER DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION decrement_post_comments();

-- ============================================================
-- AUTO-INCREMENT comment likes_count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_like_insert ON public.comment_likes;
CREATE TRIGGER on_comment_like_insert AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION increment_comment_likes();

DROP TRIGGER IF EXISTS on_comment_like_delete ON public.comment_likes;
CREATE TRIGGER on_comment_like_delete AFTER DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_comment_likes();

-- ============================================================
-- AUTO-UPDATE conversation last_message_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ============================================================
-- AUTO-INCREMENT story views_count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_story_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_story_view_insert ON public.story_views;
CREATE TRIGGER on_story_view_insert AFTER INSERT ON public.story_views
  FOR EACH ROW EXECUTE FUNCTION increment_story_views();

-- ============================================================
-- SECURITY DEFINER HELPERS TO PREVENT RLS INFINITE RECURSION
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conversation_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.conversation_id = $1 AND p.user_id = $2
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO public;

-- Helper to check if a user is an admin of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_admin(conversation_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.conversation_id = $1 AND p.user_id = $2 AND p.role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_admin(UUID, UUID) TO public;

-- Helper to check if a user created the conversation
CREATE OR REPLACE FUNCTION public.is_conversation_creator(conversation_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = $1 AND c.created_by = $2
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_creator(UUID, UUID) TO public;

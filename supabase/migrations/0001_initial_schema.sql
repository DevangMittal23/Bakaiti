-- Bakaiti: core schema. Apply once to an empty public schema.
-- Forward changes belong in a new migration; never reset existing tables here.

-- Enable required extensions

CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy username search

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (
    length(username) >= 3 AND
    length(username) <= 30 AND
    username ~ '^[a-zA-Z0-9_]+$'
  ),
  display_name TEXT NOT NULL CHECK (length(display_name) >= 1 AND length(display_name) <= 50),
  avatar_url TEXT,
  bio TEXT CHECK (length(bio) <= 160),
  online_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast username lookup and search
CREATE INDEX idx_users_username ON public.users USING gin(username gin_trgm_ops);
CREATE INDEX idx_users_online_at ON public.users(online_at DESC);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- ============================================================
-- CONVERSATIONS (DMs and Group Chats)
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('dm', 'group')),
  name TEXT, -- NULL for DMs, required for groups
  avatar_url TEXT, -- NULL for DMs, optional for groups
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_type ON public.conversations(type);

-- ============================================================
-- PARTICIPANTS (Who is in which conversation)
-- ============================================================
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  last_read_message_id UUID, -- FK added later to avoid circular dep
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_participants_conversation ON public.participants(conversation_id);
CREATE INDEX idx_participants_user ON public.participants(user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT, -- NULL for pure media messages
  type TEXT NOT NULL DEFAULT 'text' CHECK (
    type IN ('text', 'image', 'video', 'audio', 'gif', 'file', 'system')
  ),
  media_url TEXT, -- Supabase Storage URL for media messages
  media_metadata JSONB, -- { width, height, duration, size, filename }
  gif_url TEXT, -- Tenor GIF URL
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_for TEXT DEFAULT 'none' CHECK (deleted_for IN ('none', 'me', 'everyone')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to_id);

-- Add the FK for last_read_message_id now that messages table exists
ALTER TABLE public.participants
  ADD CONSTRAINT fk_last_read_message
  FOREIGN KEY (last_read_message_id)
  REFERENCES public.messages(id)
  ON DELETE SET NULL;

-- ============================================================
-- MESSAGE REACTIONS
-- ============================================================
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (length(emoji) <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);

-- ============================================================
-- POSTS (Feed)
-- ============================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT CHECK (length(content) <= 2000),
  media_urls TEXT[] DEFAULT '{}', -- Array of Supabase Storage URLs
  media_types TEXT[] DEFAULT '{}', -- Parallel array: 'image' | 'video' for each URL
  link_url TEXT,
  link_preview JSONB, -- { title, description, image, domain }
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (
    visibility IN ('public', 'friends', 'private')
  ),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  is_repost BOOLEAN DEFAULT FALSE,
  original_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (content IS NOT NULL OR array_length(media_urls, 1) > 0)
);

CREATE INDEX idx_posts_author ON public.posts(author_id, created_at DESC);
CREATE INDEX idx_posts_feed ON public.posts(created_at DESC) WHERE visibility = 'public';
CREATE INDEX idx_posts_visibility ON public.posts(visibility);

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

-- ============================================================
-- POST BOOKMARKS
-- ============================================================
CREATE TABLE public.post_bookmarks (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_comments_post ON public.comments(post_id, created_at ASC);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX idx_comments_author ON public.comments(author_id);

-- ============================================================
-- COMMENT LIKES
-- ============================================================
CREATE TABLE public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (comment_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'friend_request',
    'friend_accept',
    'post_like',
    'post_comment',
    'comment_like',
    'comment_reply',
    'mention',
    'message',
    'group_invite',
    'call_missed'
  )),
  entity_id UUID,
  entity_type TEXT CHECK (entity_type IN ('post', 'message', 'comment', 'conversation', 'user')),
  body TEXT, -- Human-readable preview
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- STORIES
-- ============================================================
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT CHECK (length(caption) <= 200),
  views_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_stories_author ON public.stories(author_id);
CREATE INDEX idx_stories_active ON public.stories(expires_at DESC);

-- ============================================================
-- STORY VIEWS
-- ============================================================
CREATE TABLE public.story_views (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (story_id, viewer_id)
);

-- ============================================================
-- CALL LOGS
-- ============================================================
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL UNIQUE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  initiated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (
    status IN ('ringing', 'active', 'ended', 'missed', 'rejected')
  ),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_call_logs_conversation ON public.call_logs(conversation_id);
CREATE INDEX idx_call_logs_initiator ON public.call_logs(initiated_by);

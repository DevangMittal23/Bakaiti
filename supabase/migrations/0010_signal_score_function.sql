-- ============================================================
-- Migration 0010: Signal Score calculation functions
-- ============================================================

-- Per-user scoring function: calculates a 0-1000 score from a 7-day rolling window
CREATE OR REPLACE FUNCTION calculate_signal_score(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  window_start TIMESTAMPTZ := NOW() - INTERVAL '7 days';
  posts_score INTEGER := 0;
  likes_received_score INTEGER := 0;
  comments_received_score INTEGER := 0;
  comments_made_score INTEGER := 0;
  messages_sent_score INTEGER := 0;
  messages_received_score INTEGER := 0;
  voice_notes_score INTEGER := 0;
  friend_accepts_score INTEGER := 0;
  raw_total INTEGER;
  final_score INTEGER;
BEGIN
  -- Posts created (capped at 21 over 7 days, worth 15 each)
  SELECT LEAST(COUNT(*), 21) * 15 INTO posts_score
  FROM public.posts
  WHERE author_id = target_user_id AND created_at >= window_start;

  -- Likes received on their posts (capped at 280, worth 2 each)
  SELECT LEAST(COUNT(*), 280) * 2 INTO likes_received_score
  FROM public.post_likes pl
  JOIN public.posts p ON p.id = pl.post_id
  WHERE p.author_id = target_user_id AND pl.created_at >= window_start;

  -- Comments received on their posts (capped at 350, worth 5 each)
  SELECT LEAST(COUNT(*), 350) * 5 INTO comments_received_score
  FROM public.comments c
  JOIN public.posts p ON p.id = c.post_id
  WHERE p.author_id = target_user_id AND c.created_at >= window_start AND c.author_id != target_user_id;

  -- Comments they made on others' content (capped at 280, worth 4 each)
  SELECT LEAST(COUNT(*), 280) * 4 INTO comments_made_score
  FROM public.comments c
  JOIN public.posts p ON p.id = c.post_id
  WHERE c.author_id = target_user_id AND c.created_at >= window_start AND p.author_id != target_user_id;

  -- Messages sent (capped at 140, worth 1 each)
  SELECT LEAST(COUNT(*), 140) * 1 INTO messages_sent_score
  FROM public.messages
  WHERE sender_id = target_user_id AND created_at >= window_start AND type != 'system';

  -- Unique senders who messaged them (capped at 210, worth 3 each)
  SELECT LEAST(COUNT(DISTINCT m.sender_id), 210) * 3 INTO messages_received_score
  FROM public.messages m
  JOIN public.participants p ON p.conversation_id = m.conversation_id
  WHERE p.user_id = target_user_id 
    AND m.sender_id != target_user_id 
    AND m.created_at >= window_start;

  -- Voice notes sent (capped at 210, worth 6 each)
  SELECT LEAST(COUNT(*), 210) * 6 INTO voice_notes_score
  FROM public.messages
  WHERE sender_id = target_user_id AND type = 'audio' AND created_at >= window_start;

  -- Friend acceptances in either direction (capped at 70, worth 10 each)
  SELECT LEAST(COUNT(*), 70) * 10 INTO friend_accepts_score
  FROM public.friendships
  WHERE (requester_id = target_user_id OR addressee_id = target_user_id)
    AND status = 'accepted'
    AND updated_at >= window_start;

  raw_total := posts_score + likes_received_score + comments_received_score +
               comments_made_score + messages_sent_score + messages_received_score +
               voice_notes_score + friend_accepts_score;

  -- Normalize: scale to 0-1000, clamp
  final_score := LEAST(1000, GREATEST(0, ROUND(raw_total * 1000.0 / 1200.0)));

  -- Insert history record with breakdown
  INSERT INTO public.signal_score_history (user_id, score, breakdown)
  VALUES (
    target_user_id,
    final_score,
    jsonb_build_object(
      'posts', posts_score,
      'likes_received', likes_received_score,
      'comments_received', comments_received_score,
      'comments_made', comments_made_score,
      'messages_sent', messages_sent_score,
      'messages_received', messages_received_score,
      'voice_notes', voice_notes_score,
      'friend_accepts', friend_accepts_score
    )
  );

  -- Update the user's current score
  UPDATE public.users
  SET signal_score = final_score, signal_score_updated_at = NOW()
  WHERE id = target_user_id;

  RETURN final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch function: recalculate ALL users' scores (called by daily cron)
CREATE OR REPLACE FUNCTION calculate_all_signal_scores()
RETURNS void AS $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.users LOOP
    PERFORM public.calculate_signal_score(u.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration 0009: Pulse + Signal Score columns and history table
-- ============================================================

-- PULSE: Add pulse fields to users table
ALTER TABLE public.users
  ADD COLUMN pulse_type TEXT DEFAULT NULL CHECK (pulse_type IN ('chill', 'active', 'busy', 'hyped') OR pulse_type IS NULL),
  ADD COLUMN pulse_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN pulse_set_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_users_pulse_expires ON public.users(pulse_expires_at) WHERE pulse_expires_at IS NOT NULL;

-- SIGNAL SCORE: Add score fields to users table
ALTER TABLE public.users
  ADD COLUMN signal_score INTEGER DEFAULT 0 CHECK (signal_score >= 0 AND signal_score <= 1000),
  ADD COLUMN signal_score_updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX idx_users_signal_score ON public.users(signal_score DESC);

-- SIGNAL SCORE HISTORY (for the 7-day rolling window calculation
-- and optional "trending up/down" indicator on profile)
CREATE TABLE public.signal_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  breakdown JSONB -- { posts: 12, likes_received: 8, comments_received: 15, ... }
);

CREATE INDEX idx_signal_history_user ON public.signal_score_history(user_id, calculated_at DESC);

-- RLS for signal_score_history
ALTER TABLE public.signal_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signal score history is publicly readable" ON public.signal_score_history
  FOR SELECT USING (true);

CREATE POLICY "Only system can insert signal history" ON public.signal_score_history
  FOR INSERT WITH CHECK (true);

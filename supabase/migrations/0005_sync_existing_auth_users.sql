-- ============================================================
-- Bakaiti — Migration 0005: Fill missing profiles for existing auth accounts
-- ============================================================
-- Only fills missing profiles. Existing profiles and account data are preserved.
-- Existing installations may record this migration under version 005; see ../README.md.
-- ============================================================

INSERT INTO public.users (id, username, display_name, avatar_url)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
  COALESCE(au.raw_user_meta_data->>'display_name', COALESCE(au.raw_user_meta_data->>'full_name', 'User')),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

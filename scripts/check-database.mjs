// Runs real PostgreSQL migrations in memory; never connects to Supabase.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const db = new PGlite({ extensions: { pg_trgm } });
const migrationDir = new URL('../supabase/migrations/', import.meta.url);
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const outsider = '33333333-3333-4333-8333-333333333333';
const departing = '44444444-4444-4444-8444-444444444444';

async function scalar(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return Object.values(rows[0])[0];
}

async function asUser(id, run, role = 'authenticated') {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id ?? '']);
  await db.exec(`SET ROLE ${role}`);
  try {
    return await run();
  } finally {
    await db.exec('RESET ROLE');
  }
}

async function denied(sql, params = []) {
  await assert.rejects(db.query(sql, params), (error) => error.code === '42501');
}

try {
  // Minimal Supabase-owned schemas; application migrations run without rewriting SQL.
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (
      id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
      SELECT string_to_array(name, '/')
    $$;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    CREATE PUBLICATION supabase_realtime;
  `);

  // Seed an auth account before migrations to exercise the existing-account backfill.
  await db.query('INSERT INTO auth.users (id, raw_user_meta_data) VALUES ($1, $2)',
    [alice, { username: 'alice', display_name: 'Alice' }]);

  const files = (await readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
  assert.equal(new Set(files.map((file) => Number(file.split('_')[0]))).size, files.length,
    'Migration version numbers must be unique');

  let legacyEmptyPost;
  for (const file of files) {
    assert.match(file, /^\d{4}_/, 'Use one consistent four-digit migration version format');
    if (file === '0012_schema_integrity.sql') {
      // An existing row accepted by the old NULL check must survive the upgrade.
      legacyEmptyPost = await scalar('INSERT INTO public.posts (author_id) VALUES ($1) RETURNING id', [alice]);
    }
    const sql = await readFile(new URL(file, migrationDir), 'utf8');
    assert.doesNotMatch(sql, /DROP TABLE|public\.(profiles|chat_rooms|room_members)\b/i,
      `${file} must not reset tables or depend on retired schemas`);
    await db.exec(sql);
    console.log(`Applied ${file}`);
  }

  assert.equal(await scalar('SELECT count(*)::int FROM public.posts WHERE id = $1', [legacyEmptyPost]), 1,
    'Forward migration must preserve existing rows');
  assert.equal(await scalar('SELECT username FROM public.users WHERE id = $1', [alice]), 'alice');
  for (const [id, username] of [[bob, 'bob'], [outsider, 'outsider'], [departing, 'departing']]) {
    await db.query('INSERT INTO auth.users (id, raw_user_meta_data) VALUES ($1, $2)',
      [id, { username, display_name: username }]);
  }
  assert.equal(await scalar('SELECT count(*)::int FROM public.users'), 4, 'Signup trigger creates profiles');
  await db.exec(await readFile(new URL('0005_sync_existing_auth_users.sql', migrationDir), 'utf8'));
  assert.equal(await scalar('SELECT count(*)::int FROM public.users'), 4, 'Backfill preserves existing profiles');
  assert.equal(await scalar("SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public'"), 17);
  assert.equal(await scalar("SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity"), 0);

  const conversation = await asUser(alice, async () => {
    const id = await scalar("INSERT INTO public.conversations (type, created_by) VALUES ('group', $1) RETURNING id", [alice]);
    await db.query("INSERT INTO public.participants (conversation_id, user_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'member')",
      [id, alice, bob]);
    return id;
  });

  const message = await asUser(alice, () => scalar(
    "INSERT INTO public.messages (conversation_id, sender_id, content) VALUES ($1, $2, 'hello') RETURNING id",
    [conversation, alice]));

  await asUser(outsider, async () => {
    assert.equal(await scalar('SELECT count(*)::int FROM public.messages WHERE conversation_id = $1', [conversation]), 0);
    await denied('INSERT INTO public.participants (conversation_id, user_id) VALUES ($1, $2)', [conversation, outsider]);
    await denied("INSERT INTO public.message_reactions (message_id, user_id, emoji) VALUES ($1, $2, '👍')", [message, outsider]);
  });


  await asUser(bob, async () => {
    await denied("UPDATE public.participants SET role = 'admin' WHERE conversation_id = $1 AND user_id = $2", [conversation, bob]);
    await db.query('UPDATE public.participants SET last_read_message_id = $1 WHERE conversation_id = $2 AND user_id = $3',
      [message, conversation, bob]);
    assert.equal(await scalar('SELECT count(*)::int FROM public.messages WHERE conversation_id = $1', [conversation]), 1);
  });

  let privatePost;
  await asUser(alice, async () => {
    await assert.rejects(db.query('INSERT INTO public.posts (author_id) VALUES ($1)', [alice]),
      (error) => error.code === '23514');
    privatePost = await scalar("INSERT INTO public.posts (author_id, content, visibility) VALUES ($1, '#Secret private', 'private') RETURNING id", [alice]);
    await assert.rejects(db.query('INSERT INTO public.posts (author_id, is_repost, original_post_id) VALUES ($1, NULL, $2)', [alice, privatePost]),
      (error) => error.code === '23514');
    await denied("INSERT INTO public.posts (author_id, content, likes_count) VALUES ($1, 'fake likes', 999)", [alice]);
    await db.query("INSERT INTO public.comments (post_id, author_id, content) VALUES ($1, $2, 'private comment')", [privatePost, alice]);
    await db.query('INSERT INTO public.post_likes (post_id, user_id) VALUES ($1, $2)', [privatePost, alice]);
    assert.equal(await scalar('SELECT likes_count FROM public.posts WHERE id = $1', [privatePost]), 1);
    assert.equal(await scalar('SELECT comments_count FROM public.posts WHERE id = $1', [privatePost]), 1);
    await db.query("UPDATE public.users SET display_name = 'Alice updated' WHERE id = $1", [alice]);
    await denied('UPDATE public.users SET signal_score = 1000 WHERE id = $1', [alice]);
    await denied('INSERT INTO public.signal_score_history (user_id, score) VALUES ($1, 1000)', [alice]);
    await denied('SELECT public.calculate_signal_score($1)', [alice]);
    await denied('SELECT public.calculate_all_signal_scores()');
    await denied('SELECT public.expire_stale_pulses()');
    await denied("INSERT INTO public.notifications (recipient_id, actor_id, type) VALUES ($1, $2, 'message')", [alice, bob]);
  });
  await asUser(bob, async () => {
    assert.equal(await scalar("SELECT count(*)::int FROM public.search_post_hashtags('#secret', 20)"), 0);
    assert.equal(await scalar('SELECT count(*)::int FROM public.comments WHERE post_id = $1', [privatePost]), 0);
    assert.equal(await scalar('SELECT count(*)::int FROM public.post_likes WHERE post_id = $1', [privatePost]), 0);
    await denied("INSERT INTO public.comments (post_id, author_id, content) VALUES ($1, $2, 'intrusion')", [privatePost, bob]);
    await denied('INSERT INTO public.post_likes (post_id, user_id) VALUES ($1, $2)', [privatePost, bob]);
  });
  await asUser(null, async () => {
    assert.equal(await scalar('SELECT count(*)::int FROM public.comments WHERE post_id = $1', [privatePost]), 0);
    await denied('SELECT public.calculate_all_signal_scores()');
  }, 'anon');

  const request = await asUser(alice, () => scalar(
    "INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'pending') RETURNING id", [alice, bob]));
  const beforeAccept = await scalar('SELECT updated_at FROM public.friendships WHERE id = $1', [request]);
  await asUser(alice, async () => {
    const { affectedRows } = await db.query("UPDATE public.friendships SET status = 'accepted' WHERE id = $1", [request]);
    assert.equal(affectedRows, 0, 'Requester cannot accept their own request');
  });
  await asUser(bob, () => db.query("UPDATE public.friendships SET status = 'accepted' WHERE id = $1", [request]));
  assert.ok(new Date(await scalar('SELECT updated_at FROM public.friendships WHERE id = $1', [request])) >= new Date(beforeAccept));
  await asUser(alice, () => db.query("UPDATE public.posts SET visibility = 'friends' WHERE id = $1", [privatePost]));
  await asUser(bob, async () => {
    assert.equal(await scalar('SELECT count(*)::int FROM public.comments WHERE post_id = $1', [privatePost]), 1);
    assert.equal(await scalar("SELECT usage_count::int FROM public.search_post_hashtags('#secret', 20)"), 1);
  });

  await asUser(alice, () => db.query("INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'blocked')", [alice, outsider]));
  await asUser(outsider, async () => {
    const { affectedRows } = await db.query('DELETE FROM public.friendships WHERE requester_id = $1 AND addressee_id = $2', [alice, outsider]);
    assert.equal(affectedRows, 0, 'Blocked users cannot remove the block themselves');
  });

  await db.query("INSERT INTO public.conversations (type, created_by) VALUES ('dm', $1)", [departing]);
  await db.query('DELETE FROM auth.users WHERE id = $1', [departing]);
  assert.equal(await scalar('SELECT count(*)::int FROM public.conversations WHERE created_by IS NULL'), 1,
    'Deleting a creator preserves their conversation');
  await asUser(null, async () => {
    await db.exec('SELECT public.calculate_all_signal_scores(); SELECT public.expire_stale_pulses();');
    assert.equal(await scalar('SELECT count(*)::int FROM public.signal_score_history'), 3);
  }, 'service_role');

  // Storage metadata RLS must grant the same access as the parent message/post.
  const messagePath = `${alice}/attachment.pdf`;
  const postPath = `${alice}/photo.jpg`;
  await asUser(alice, async () => {
    await db.query("INSERT INTO storage.objects (bucket_id, name) VALUES ('message-media', $1), ('post-media', $2)", [messagePath, postPath]);
    await db.query('UPDATE public.messages SET media_url = $1 WHERE id = $2', [`/api/media/message-media/${messagePath}`, message]);
    await db.query("UPDATE public.posts SET visibility = 'private', media_urls = ARRAY[$1] WHERE id = $2", [`/api/media/post-media/${postPath}`, privatePost]);
  });
  await asUser(bob, async () => {
    assert.equal(await scalar('SELECT count(*)::int FROM storage.objects WHERE name = $1', [messagePath]), 1);
    assert.equal(await scalar('SELECT count(*)::int FROM storage.objects WHERE name = $1', [postPath]), 0);
    await denied('INSERT INTO public.posts (author_id, media_urls) VALUES ($1, ARRAY[$2])', [bob, `/api/media/post-media/${postPath}`]);
    await denied("INSERT INTO storage.objects (bucket_id, name) VALUES ('message-media', $1)", [`${alice}/forged.pdf`]);
  });
  await asUser(outsider, async () => {
    assert.equal(await scalar('SELECT count(*)::int FROM storage.objects'), 0);
  });
  await asUser(null, async () => {
    assert.equal(await scalar('SELECT count(*)::int FROM storage.objects'), 0);
  }, 'anon');
  assert.equal(await scalar("SELECT count(*)::int FROM storage.buckets WHERE public AND id IN ('message-media', 'post-media')"), 0);

  await asUser(null, async () => {
    const historyBefore = await scalar('SELECT count(*)::int FROM public.signal_score_history');
    const due = await scalar("SELECT extract(hour FROM now() AT TIME ZONE 'UTC') >= 3");
    await db.query('SELECT public.run_scheduled_maintenance()');
    const firstRunHistory = await scalar('SELECT count(*)::int FROM public.signal_score_history');
    assert.equal(firstRunHistory, historyBefore + (due ? 3 : 0));
    await db.query('SELECT public.run_scheduled_maintenance()');
    assert.equal(await scalar('SELECT count(*)::int FROM public.signal_score_history'), firstRunHistory,
      'Repeated scheduler requests cannot recalculate the same day twice');
  }, 'service_role');

  const { rows: published } = await db.query("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
  for (const table of ['users', 'messages', 'notifications', 'conversations', 'participants', 'friendships', 'message_reactions']) {
    assert.ok(published.some((row) => row.tablename === table), `${table} must be published for Realtime`);
  }
  console.log('Database checks passed: migrations, signup/backfill, RLS, score protection, counters, account deletion and Realtime.');
} finally {
  await db.close();
}

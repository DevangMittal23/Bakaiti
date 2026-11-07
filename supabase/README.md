# Bakaiti database

Email verification and Gmail SMTP are configured in Supabase Auth, separately from SQL. See [AUTH_SETUP.md](AUTH_SETUP.md); this auth flow needs no additional database migration.

The active migrations use one schema: `public.users`, `friendships`, `conversations`, `participants`, `messages`, reactions, posts, comments, notifications, stories, call logs, and Signal Score history. There are no active migrations for `profiles`, `chat_rooms`, `room_members`, the old notification columns, or legacy storage buckets.

## Fresh Supabase project

Apply these files **once**, in this order, to a new project with an empty application/public schema. Supabase supplies `auth`, `storage`, the API roles, and the `supabase_realtime` publication.

| Version | File | Purpose |
|---|---|---|
| 0001 | `0001_initial_schema.sql` | Core tables, indexes and constraints; no DROP TABLE/reset statements |
| 0002 | `0002_functions_triggers.sql` | Signup, counters, timestamps and membership helpers |
| 0003 | `0003_rls_policies.sql` | Baseline row policies and chat/notification Realtime tables |
| 0004 | `0004_storage_buckets.sql` | Avatars, post media and message media |
| 0005 | `0005_sync_existing_auth_users.sql` | Insert missing application profiles without replacing existing profiles |
| 0009 | `0009_pulse_and_signal.sql` | Pulse fields and Signal Score history |
| 0010 | `0010_signal_score_function.sql` | Engagement score calculation |
| 0011 | `0011_pulse_cleanup_function.sql` | Pulse expiry function and optional scheduling examples |
| 0012 | `0012_schema_integrity.sql` | Forward integrity fixes, column permissions, RLS and Realtime updates |
| 0013 | `0013_hashtag_search.sql` | Hashtags derived from visible posts, without duplicate tables |
| 0014 | `0014_private_media.sql` | Private media buckets, row-aware storage policies and upload ownership |
| 0015 | `0015_scheduled_maintenance.sql` | Service-only, idempotent daily scoring with pulse cleanup |

The gaps before 0009 are intentional: established Pulse/Signal migration versions are preserved. Apply through the final migration before exposing the API; the baseline policies are tightened by 0012. Migrations are versioned changes, not reset scripts or files to rerun on every deployment.

## Existing database with the current schema

1. Take a database backup and inspect applied migrations and actual table definitions in a staging copy first.
2. If `public.users`, `conversations`, `participants` and Pulse/Signal fields already exist, do **not** rerun the initial migrations. Apply only the pending forward migrations in order. If you already ran through 0013, the new files to run are **0014 and 0015**.
3. The old `005_resync_auth_users.sql` is now `0005_sync_existing_auth_users.sql`. If a migration runner recorded version `005`, verify the SQL that actually ran before reconciling history to `0005`. A different retired file also used `005`; the number alone is insufficient evidence. Do not mark unapplied migrations as applied merely to bypass a history error.
4. If old versions `001`–`008` remain in remote migration history, reconcile the retired entries against the backup and schema inventory before using automated `db push`. SQL Editor users can apply only the pending forward files after checking their prerequisites. Deleting local files does not repair remote migration history.
5. Migration 0012 retains conversation history when its creator is deleted, fills the missing friendship timestamp trigger, restricts client-update columns, protects scoring RPCs, and publishes presence-related tables. It preserves existing rows.
6. Its new post-content constraint is `NOT VALID`: pre-existing invalid posts are preserved; new inserts/updates must comply. Review those rows before running `ALTER TABLE public.posts VALIDATE CONSTRAINT posts_have_content;`. Updates to an invalid legacy row must also make it valid.
7. Rehearse sign-up, profile editing, DM/group creation, messaging, read receipts, friendships, post privacy, and score scheduling in staging before deployment.

Example read-only check for invalid legacy posts:

```sql
SELECT id, author_id, created_at
FROM public.posts
WHERE NOT (
  length(btrim(coalesce(content, ''))) > 0
  OR coalesce(cardinality(media_urls), 0) > 0
  OR (coalesce(is_repost, false) AND original_post_id IS NOT NULL)
);
```

## Database still using the retired schema

The legacy SQL files were removed from the active chain because they create incompatible versions of the same tables. This repository cleanup is **not** a data conversion or a remote table deletion. An existing database with `profiles`, `chat_rooms`, `room_members`, or old `posts.user_id`/`messages.room_id` columns requires a separately reviewed export/mapping/import into the canonical schema (or a fresh Supabase project). Do not apply 0001 over it or drop legacy tables before preserving and verifying their data.

## Scheduled jobs and known limits

Set `NEXT_PUBLIC_APP_URL` to the canonical public application origin before building/deploying, and allow its `/auth/callback` URL in Supabase Auth. Callback redirects deliberately use that configured origin, never an untrusted forwarded-host header or Next.js's internal localhost origin.

For the production deployment, prefer Supabase Cron (`pg_cron`) and schedule **`SELECT public.run_scheduled_maintenance();` every 15 minutes**. The function performs Pulse cleanup each run and computes Signal Scores once per UTC date after 03:00 UTC. Repeated/concurrent calls skip completed runs; a failed transaction rolls back its completion marker so it can be retried. This direct database job does not need `CRON_SECRET` or a Vercel Cron Job.

The authenticated HTTP fallback is for an external scheduler only: call **GET `/api/cron` every 15 minutes with `Authorization: Bearer <CRON_SECRET>`**. Add the same long random `CRON_SECRET` to the app's server environment; the Supabase service-role key must remain server-only. Secrets in query parameters are rejected. Failed jobs return HTTP 500 for retries/alerting. Do not schedule both the HTTP route and the database function.

If using pg_cron, schedule `SELECT public.run_scheduled_maintenance();` every 15 minutes instead of the old direct daily scoring example in 0011. Replace an old schedule rather than running both paths: direct calls to `calculate_all_signal_scores()` bypass the daily ledger. Use one coordinated schedule.

Migration 0014 makes both message and post-media buckets private. The app returns stable `/api/media/<bucket>/<path>` references; legacy public URLs are normalized by the media renderers without rewriting stored data. The authenticated route uses the user's JWT and Storage RLS to issue a 60-second signed URL. Uploader previews work before a message/post is created; recipients need a visible parent row. A client cannot create a row pointing at another user's upload.

Deploy the matching app changes and 0014/0015 together. Old app builds that render permanent public media URLs will fail after 0014. Until 0014 is applied, existing public buckets are not private merely because the app uses the new route. Verify direct anonymous reads, recipient/outsider access, and previously cached public URLs against Supabase/CDN behavior before declaring the rollout complete. Already downloaded files cannot be revoked.

## Local checks

Run `npm run test:db`. The development-only PGlite dependency supplies real PostgreSQL in memory. The check creates minimal stand-ins for Supabase-owned auth/storage tables and API roles, applies the migration SQL unchanged, and exercises authorized and forbidden operations. This verifies SQL, RLS and triggers, but does not simulate Supabase Auth delivery, PostgREST, Storage HTTP behavior, Realtime delivery, or production migration history. Test those against staging separately.

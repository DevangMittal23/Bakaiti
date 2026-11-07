# Bakaiti deployment: Supabase Cron + Vercel Hobby

Bakaiti is a server-rendered Next.js app and can use Vercel's default Next.js build settings. Keep the 15-minute maintenance schedule in Supabase: Vercel Hobby Cron runs no more than once per day, while this app's maintenance function should run every 15 minutes. No `vercel.json` cron entry is needed.

## 1. Apply pending Supabase migrations

In the Supabase Dashboard, open the Bakaiti project → **SQL Editor**. Confirm which migrations actually ran. The project notes say the baseline is through 0013, but remote migration state has not been independently checked.

If 0013 is the latest migration already applied, run `supabase/migrations/0014_private_media.sql` and then `supabase/migrations/0015_scheduled_maintenance.sql`, separately and in that order. Do not rerun the initial schema migrations or 0014/0015 if they are already applied. Keep the matching app release together with 0014 because it changes media buckets to private.

## 2. Create the Supabase pg_cron job

In Supabase, open **Integrations → Cron** and enable the Cron/`pg_cron` extension if it is not enabled. Create one job named `bakaiti-maintenance` with schedule:

```text
*/15 * * * *
```

Choose a SQL command and use:

```sql
SELECT public.run_scheduled_maintenance();
```

Alternatively, use SQL Editor after `pg_cron` is enabled. This removes only an older job with this same name, then creates the current schedule:

```sql
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'bakaiti-maintenance';

SELECT cron.schedule(
  'bakaiti-maintenance',
  '*/15 * * * *',
  $$SELECT public.run_scheduled_maintenance();$$
);
```

In **Integrations → Cron → Jobs/History**, confirm the job exists and has successful runs. Do not also schedule the same maintenance via `/api/cron` or Vercel. `CRON_SECRET` is not required for this direct database job.

## 3. Import the project into Vercel

1. Push the project to a Git provider Vercel can access, then in Vercel choose **Add New → Project** and import that repository.
2. Keep the detected framework as **Next.js**, the project root as the repository root, and the default build command (`npm run build`). Do not set a static output directory or add a cron job.
3. In **Environment Variables**, add the variables below for **Production**. Add them to Preview only if you also configure a fixed preview app origin and allow its exact Auth callback URL in Supabase.
4. Deploy. After the first deployment, assign your domain in Vercel and wait for it to become the production domain. You may first use the generated `*.vercel.app` production URL.

### Vercel production environment variables

Copy the URL and keys from the **same Supabase project** used for the production database. Enter secrets in Vercel's dashboard; never commit `.env.local` or expose server secrets with a `NEXT_PUBLIC_` prefix.

| Variable | Value / requirement |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Bakaiti Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | That project's Publishable key (or legacy anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | That project's server-only Secret key (`sb_secret_...`) or legacy `service_role` key |
| `NEXT_PUBLIC_APP_URL` | Exact production origin, e.g. `https://bakaiti.vercel.app` (no path or trailing slash) |
| `LIVEKIT_API_KEY` | LiveKit server API key; required for calls |
| `LIVEKIT_API_SECRET` | LiveKit server API secret; required for calls |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit Cloud WebSocket URL, e.g. `wss://…livekit.cloud` |
| `TENOR_API_KEY` | Tenor key for GIF search; optional if GIF search is not needed |
| `CRON_SECRET` | Not needed when Supabase pg_cron calls the database function directly; required only for an external scheduler calling `/api/cron` |

After adding or changing variables, redeploy so the build and server functions receive them. Never put `SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`, or `CRON_SECRET` in a browser-visible variable.

## 4. Set Supabase Auth production URLs

After the Vercel production URL/domain is known, open Supabase **Authentication → URL Configuration**:

- Set **Site URL** to the exact production origin (for example `https://bakaiti.vercel.app`).
- Add the exact production callback URL `https://bakaiti.vercel.app/auth/callback` under **Redirect URLs**.
- Keep local development URLs if needed. Add a Vercel preview pattern only if preview authentication is intentionally enabled; production Site URL should remain the canonical production origin.
- Save. `NEXT_PUBLIC_APP_URL` in Vercel must match the production Site URL origin exactly.

The current app uses `/auth/callback` for password recovery. Signup OTP verification stays in the app's verification flow.

## 5. Production smoke check

After deployment, verify:

1. The home/login page loads over HTTPS, and a new account can request and verify an email OTP.
2. Sign out and sign in using username/password; check forgot-password reaches `/auth/callback` and returns to the app.
3. Test private media as the uploader and as an intended conversation recipient; confirm anonymous/outsider access is denied.
4. Test a one-to-one message and a call if LiveKit is configured.
5. In Supabase Cron History, confirm maintenance succeeds. In Vercel Runtime Logs, check for missing environment configuration or server errors.

Vercel Hobby is intended for personal, non-commercial use. Review the current plan terms before using it for a commercial launch.

# Bakaiti

**Your people. Your frequency.** Bakaiti is a social messaging application with conversations, a community feed, friendships, stories and expressive presence. The interface uses an ink/lilac/lime design system, responsive messaging panels, accessible menus/dialogs and reduced-motion support.

This repository contains a working development implementation, not a blanket claim that every integration is ready for production. See the [functionality audit](docs/FUNCTIONALITY_AUDIT.md) for evidence and [tasks.md](tasks.md) for launch blockers, improvements and ideas.

## What is implemented

| Area | Current behavior | Remaining verification or work |
| --- | --- | --- |
| Authentication | Signup with chosen username/password, six-digit email verification, resend/resume signup, later username/password login; live OTP/verification/logout/login happy path confirmed on 2026-11-07 | Expired/reused codes, resend limits, session persistence and full password recovery acceptance |
| Messaging | DM/group creation paths, text and attachment/voice/GIF components, inline selected-file previews, bounded sent media/document cards, conversation filters, per-conversation memory drafts, message edit/delete/react UI | Atomic conversation creation, cross-user delivery/receipts/reactions, block enforcement and complete group administration |
| Feed | Chronological RLS-visible feed, server-seeded initial results, composition, visibility selection, likes, comments, bookmarks and real post-detail/share URLs | Two-user privacy/mutation tests, deterministic pagination, reposts |
| Discovery and search | Real suggested people/top Signal users/public posts, URL-backed people/post/topic search with clear/error/no-results states | Search relevance, pagination and integration checks; no simulated polls/audio/hype |
| Profile and presence | Actual profile data, posts/media/saved views, profile editing/avatar upload, expiring Pulse and recorded Signal history | Multi-user presence/expiry checks and profile editing edge cases |
| Activity | Notifications, unread state and friend-request response UI resolving relationship IDs | Server-validated notification events, multi-user synchronization and complete preferences |
| Appearance | Browser-local theme/accent/glass preferences using shared CSS tokens | Cross-browser contrast/accessibility checks |
| Privacy and calling | Honest unavailable states for controls that are not enforced or release-ready | Persistent/enforced privacy preferences and complete LiveKit signaling/media controls |

Reply support exists in the schema/actions but is not yet exposed as a complete composer workflow. Calls are intentionally unavailable in the redesigned chat controls until incoming signaling and real track controls work. Encryption beyond the platform transport is not claimed.

## Pulse and Signal

**Pulse** is an optional Chill/Active/Busy/Hyped state that expires after four hours. It is separate from actual online presence. **Signal Score** is a server-calculated 0–1000 engagement score over a rolling seven-day window; the database records history. Zero/missing values are never replaced by invented scores or online claims.

The scoring/expiry functions need a configured scheduler. The API job uses a bearer `CRON_SECRET` and an idempotent UTC-day ledger; see [database setup](supabase/README.md). A feature existing in code does not mean a production schedule has been configured.

## Stack and structure

Next.js 16.4.3 App Router, React 19, TypeScript, Tailwind CSS 4, Zustand, React Hook Form/Zod, Framer Motion, Radix, Sonner, Supabase Auth/PostgreSQL/Storage/Realtime, and LiveKit integration code. Google fonts are loaded through Next font setup.

- `src/app`: auth pages, authenticated routes, post details and API handlers.
- `src/components`: shared navigation/primitives and feature UI.
- `src/actions`: authenticated data operations; database RLS remains authoritative.
- `src/hooks` / `src/stores`: session, realtime and interaction state.
- `supabase/migrations`: one canonical schema; [installation/upgrade order](supabase/README.md).
- `scripts`: local SQL/security/auth/functionality/compiled HTTP checks and isolated fixture preview.
- [DESIGN.md](DESIGN.md) and [UX-CONTRACT.md](UX-CONTRACT.md): visual tokens, ownership, interaction and responsive contracts.

`AuthProvider` initializes the client profile and one auth listener. The browser is notified when server auth endpoints write session cookies. Logout clears account-specific chat, notification, feed and call stores. Navigation badges consume stored counts; the main shell starts its synchronization hooks once. Some screen-level realtime subscriptions still need consolidation.

## Run with your Supabase project

Requires Node.js 20+ and a Supabase project. Install with `npm install`, copy `.env.example` to `.env.local`, and set the Supabase URL, public Publishable/anon key and server-only Secret/service-role key **from the same project**. The existing variable names are retained. Keep server credentials outside browser bundles. Configure additional LiveKit/Tenor/scheduler values only for the integrations you are using.

Apply migrations once in the order in [supabase/README.md](supabase/README.md). Existing projects must apply pending forward migrations rather than replaying/resetting the initial schema. Private media deployment depends on migration 0014; maintenance idempotency depends on 0015.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). [Free Brevo SMTP, Gmail alternative and signup OTP setup](supabase/AUTH_SETUP.md) is separate from SQL. On 2026-11-07 the local URL/public key were aligned with the actual Bakaiti project (`yiwizdahpvklgqojsqug`) and the user's saved Secret key. Live public/admin checks pass and Confirm email is enabled. The user confirmed OTP delivery, verification, logout and subsequent username/password login; read-only checks confirm the matching profile and verified Auth account. Production Site URL/callback allowlist configuration is deferred until deployment, as requested; production app origins must match exactly.

## Isolated UI preview

```bash
npm run preview
```

Open [127.0.0.1:3000/login](http://127.0.0.1:3000/login). Use **mira / preview-only**; the fake signup code is **123456**. Stop any other app on port 3000 first.

This launches the actual development application against a localhost-only fake Supabase transport on port 54329. It overrides environment values only for the child process; `.env.local` is unchanged. All people/content and mutations are disposable in-memory fixtures, reset when stopped. No real emails/messages are sent. It does **not** exercise Supabase RLS, live Realtime/Storage, SMTP, LiveKit or two-account delivery and must not be used as production hosting.

The preview uses a separate `.next-preview` build directory. Set `BAKAITI_PREVIEW_PORT=3001` in the preview process environment to run beside the real app. In-memory fixture media upload/sign/read and controlled upload failures support attachment UI checks; `node scripts/check-preview.mjs` checks this local transport before starting preview. Stop preview before running that check because both use fixture port54329.

## Verification

```bash
npm run test:auth
npm run test:security
npm run test:db
npm run test:functionality
npx tsc --noEmit --incremental false
npm run lint
npm run build
npm run test:production
```

- SQL checks apply all twelve migrations to local PGlite PostgreSQL with minimal Auth/Storage stubs; they never connect to Supabase.
- Auth/security checks execute the actual TypeScript code with mocked service boundaries.
- Functionality checks cover unread markers, own/duplicate sends, request IDs, post-detail/Explore viewer state, membership failures, delayed cross-conversation responses and missing/failed GIF providers. Tenor must be configured for real GIF results; the UI otherwise shows an unavailable state.
- Compiled HTTP checks start/stop a temporary production server on port 3100. Run after building with your real environment, after stopping preview. `SMOKE_PORT` overrides the port.
- Build font downloads need network access. A successful build and mocked UI checks do not establish deployed integration readiness. Current lint/audit limitations are recorded in the project tasks/audit rather than hidden.

## Next steps and ideas

The release order is security/privacy enforcement → atomic messaging and delivery semantics → recovery/integrations → accessibility/operational checks. See [tasks.md](tasks.md) for acceptance criteria. Product ideas such as replies, unread jump, pinned conversations, opt-in drafts, push and native mobile remain separate from claims about current functionality.

## Author and license

Devang Mittal. See [LICENSE](LICENSE) for licensing terms.

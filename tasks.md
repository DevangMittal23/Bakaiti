# Bakaiti project tasks

Updated: 2026-11-07. P0 = launch blocker; P1 = core functionality; P2 = quality/operations; P3 = future product work. Check items only after verifying their acceptance conditions. This is the project backlog; README feature descriptions do not imply that every flow is complete.

Read the [functionality audit](docs/FUNCTIONALITY_AUDIT.md) for the feature matrix and evidence boundaries. Keep this single canonical backlog (`tasks.md`); do not create a duplicate `task.md`.

## Active

### P0 — Security and privacy

- [ ] **Deploy and verify private media** — implementation and local RLS tests are complete in 0014, the authenticated media route and all media renderers. Apply 0014 with the app release, then verify anonymous denial, outsider denial, uploader/recipient reads, old references and CDN behavior against Supabase. The remote rollout is unverified; application code alone does not make existing buckets private until the migration runs.
- [ ] **Validate notification events on the server** — 0012 prevents actor impersonation, but clients can still send arbitrary event types/bodies/recipients as themselves. Use validated actions/triggers and restrict direct inserts.
- [ ] **Enforce blocks throughout the product** — block ownership is now protected, but blocked users must also be prevented from creating DMs, sending messages, inviting members and interacting as defined by product rules.
- [ ] **Persist and enforce privacy preferences** — unsupported browser-only switches have been removed. Store per-user online-status, read-receipt and DM-restriction preferences and enforce them in actions, queries and subscriptions before enabling controls.
- [ ] **Validate all server inputs and prevent abuse** — reuse Zod at action/API boundaries; constrain pagination/file sizes, enforce media ownership, handle malformed multipart inputs and escape PostgREST search filters. Rate-limit uploads, messages, invites, search, scraping and username checks.
- [ ] **Audit remaining cross-row permissions** — constrain read receipts/replies to their conversation, comment parents to their post, and call-log changes to allowed fields/transitions. Add denial tests for each relationship.

### P1 — Auth and database

- [ ] **Complete recovery flows** — verify email confirmation, expired/invalid callback codes and reset-password links; add a reachable password-setting form and validate redirect destinations.
- [ ] **Validate signup metadata and backfill collisions** — handle empty/invalid/conflicting usernames and oversized display names without aborting signup or migration 0005. Preserve existing profile choices.
- [ ] **Generate database types** — bind Supabase clients/actions to generated types; keep `src/types/index.ts` aligned with nullability and remove unsafe casts/`any` at data boundaries.
- [ ] **Make conversation creation atomic** — insert the conversation and participants in one transaction/RPC; check membership failures, reject self/duplicate participants and prevent duplicate DMs under concurrency.
- [ ] **Validate legacy posts** — review rows excluded by `posts_have_content`, repair/archive by an explicit data policy, then validate the constraint after rollout.

### P1 — Messaging, calls and notifications

- [ ] **Implement delete-for-me** — use per-user hidden-message state instead of a shared `deleted_for = 'me'` field; hide only for the acting user.
- [ ] **Finish reaction/read-receipt delivery** — consume reaction and participant updates, enrich reply previews and avoid duplicate events. Publishing the tables alone does not wire the clients.
- [ ] **Complete the call lifecycle** — invitations now reach other conversation members through realtime notifications; each caller/joiner receives a token for their own identity, and accept/reject work. Add cancel/timeout/missed-call state and persist call logs; verify missed/reconnect behavior.
- [ ] **Complete call media controls** — microphone and camera controls now operate LiveKit tracks and video tracks render. Add screen sharing and test denied devices, reconnects, cleanup and group calls; add the missing ringtone asset or remove its reference.
- [ ] **Implement notification preferences** — persist mute/category choices, apply them during delivery, synchronize read/unread state and resolve notification clicks to real entities.
- [ ] **Complete group administration** — define invitation consent, owner/admin transfer, removal and leave-group behavior; enforce authorization in the database/server.

### P1 — Feed, profiles and discovery

- [ ] **Verify feed privacy and reposts** — include intended friend/own-private posts in the right views, resolve original posts, enforce visibility on reposts and verify bookmark/repost/delete flows.
- [ ] **Verify search relevance and pagination** — URL state, explicit clear, stale-response guards, IME handling and bounded basic filter sanitization are implemented. Add paging/relevance, adversarial filter tests and live visibility checks.
- [ ] **Finish story lifecycle** — verify views, expiry and video support; make repeat views idempotent and clean up expired rows/orphaned media according to retention policy.
- [ ] **Handle mutation failures consistently** — report failed likes/deletes/member changes, roll back optimistic state where needed and distinguish empty data from failed queries.

### P2 — Performance and quality

- [ ] **Finish redesigned interaction acceptance** — live two-account tests for text/media/reactions/receipts, story lifecycle, friend actions and post privacy; keyboard/screen-reader/200% zoom, virtual keyboard, long-content and reduced-motion checks. Fixtures exercise local UI only.

- [ ] **Clear lint failures** — fix explicit `any`, hook/state problems and dependencies, unused values, JSX escaping and image warnings. Latest scan: 21 errors and 34 warnings (down from the 65 errors/103 warnings baseline). Remaining failures are in legacy call/group-info/friend components and supporting hooks; the redesigned core is checked separately.
- [ ] **Consolidate remaining realtime subscriptions** — AuthProvider and navigation store consumers are shared now. Consolidate remaining screen-level conversation/notification/Pulse listeners, revalidate after reconnect and test user switches. Logout clears account-specific stores.
- [ ] **Reduce conversation query fan-out** — batch previews/unread counts, paginate beyond the first 20 conversations and avoid refetching all conversations per event.
- [ ] **Make pagination stable** — use deterministic cursors including an ID for equal timestamps; prevent duplicate loads/messages/posts.
- [ ] **Verify accessibility/mobile layouts** — icon labels, keyboard/focus, dialogs, contrast, reduced motion, long text, narrow screens and virtual keyboards. Start with `MOBILE_AUDIT.md`.
- [ ] **Add focused app integration/E2E checks and CI** — signup/recovery, two-user privacy/chat, uploads, calls and settings; run DB checks, typecheck, lint and build on PRs. SQL checks do not replace Supabase staging tests.
- [ ] **Add operational visibility** — structured server errors and monitoring for uploads, realtime, scoring and calls; avoid logging secrets or message contents.

## Waiting On

- [ ] **Finish live Auth edge-case checks** — OTP delivery, verification, logout and subsequent username/password login are user-confirmed on the corrected Bakaiti project. Test wrong/expired/reused codes, resend/rate limits, refresh/session persistence and recovery. Earlier test accounts belong to the old project. Production Site URL/callback allowlist remains deferred until deployment.

- [ ] **Apply new forward migrations 0014 and 0015** — the user reports running/saving the baseline through 0013 in Supabase SQL Editor on 2026-10-27. That report is recorded; remote schema/history has not been independently inspected. Run only the two new migrations, with the matching app release, then verify live storage and scheduler behavior.
- [ ] **Convert legacy deployed data if present** — databases still using `profiles`, `chat_rooms`, `room_members` or incompatible shared tables need a mapped export/import and count/relationship verification before retiring tables. Local migration deletion does not convert remote data.
- [ ] **Reconcile migration history** — distinguish retired versions from current ones, especially the two former `005` files, before automated pushes. Verify the prior backfill before mapping `005` to `0005`.
- [ ] **Deploy Bakaiti on Vercel Hobby** — follow [DEPLOYMENT.md](DEPLOYMENT.md): apply pending 0014/0015 migrations, create one Supabase pg_cron job, add production environment variables, deploy from Git, then set Supabase Auth Site URL/redirect allowlist and verify production flows. Vercel Hobby Cron cannot run the app's 15-minute schedule; do not add a Vercel cron config.
- [ ] **Verify production integrations** — Supabase Auth redirects/email, LiveKit, Tenor, private media, environment values, database schedule history and deployment health checks.
- [ ] **Finalize Bakaiti release identity** — domain/handles, support/contact details, privacy/terms, favicon/app icons, social previews and screenshots. Historical Stitch images may still contain old wordmarks; the actual GitHub remote URL remains until renamed.

## Improvements and ideas

- [ ] **Messaging improvements** — reply composer, jump to first unread, persistent pin/archive controls, explicit sending/failed/retry states and accessible shortcuts. Implement backend semantics before showing saved state.
- [ ] **Responsible local drafts** — memory drafts already survive room switches; evaluate opt-in reload recovery with per-user expiry and an explicit discard/restore choice.
- [ ] **Real discovery features** — add persisted polls/events only after defining storage, permissions and moderation. Do not restore simulated engagement.

## Someday

- [ ] **React Native / Expo app** — reuse verified API/auth/storage/realtime behavior; see `MOBILE_AUDIT.md`.
- [ ] **Push notifications** — consent, device-token lifecycle, preferences and deep links.
- [ ] **End-to-end encryption** — design identity/keys, multi-device behavior and recovery first.
- [ ] **Temporary social rooms** — define lifecycle, moderation and membership before adding Vibe Rooms.

## Done

- [x] **Enable chat voice and video calls** — replace disabled header controls with LiveKit start actions; authorize membership server-side, issue a participant token and notify other chat members through the existing realtime notifications table. Incoming invitations open the accept/reject modal; accepted members receive their own token without re-notifying the room. Render LiveKit video tracks and operate microphone/camera controls. Security regressions cover room authorization and invitation delivery; no migration is required. (2026-11-07)

- [x] **Redesign the in-call screen** — ink/plum lighting, connection-aware header, named participant roster, real saved avatars and initials fallback, camera-off video tiles, speaking rings for voice, and a floating thumb-sized control dock. Real names/avatar data are carried into outgoing and incoming call state; no raw UUIDs or fake participants are displayed. Typecheck and focused lint pass. (2026-11-07)

- [x] **Preview selected chat attachments and bound sent-media sizing** — keep the selected file preview, filename, kind, size and available dimensions inside the composer; support remove/reselect and retain selection/caption after a retryable upload failure. Sent images/videos preserve aspect ratio within 320×360 px, GIFs within 280×280 px and documents in compact bounded cards; persist available pixel dimensions. Desktop/mobile fixture browser checks cover image, video and document selection/sends, failure/retry, unsupported replacement, enlargement, same-file reselection and mobile overflow. (2026-11-07)

- [x] **Verify live signup, OTP and subsequent login** — after project alignment, the user received the OTP, verified it, signed out and signed in again with username/password. Read-only checks confirm the new `dm_host` profile matches its Auth account, email is confirmed and a sign-in is recorded in Bakaiti. (2026-11-07)

- [x] **Correct the cross-project authentication configuration** — the signed-in dashboard identified Bakaiti as `yiwizdahpvklgqojsqug`; local URL/public key still referenced `vynsfpnkvffnkdkhmlkk` while the saved Secret key/settings belonged to Bakaiti. Updated only the local URL/public key, preserving the user's Secret key. Live Auth settings, profile queries and Auth admin checks now return HTTP200; Confirm email is enabled. The running app returns expected HTTP401 for a deliberately nonexistent username instead of backend HTTP503. (2026-11-07)

- [x] **Improve signup failure diagnosis** — replace the username-blaming fallback with neutral copy; show known signup-only provider failure categories and log only a bounded server-side provider code/status. Development appends a safe Auth-code reference to unmapped failures; production excludes it. Keep production account-existence and login responses generic; tests exclude private provider messages, email/password values and unsafe code text from logs. The user retry now identifies `user_already_exists`; separate login diagnostics confirm a placeholder server credential/HTTP401. The public settings recheck continues to show `mailer_autoconfirm: true`. (2026-11-07)
- [x] **Fix local signup origin mismatch** — accept loopback aliases with matching protocol/port only in development; retain strict production origin checks and reject remote origins/hosts. Replace the vague error with an app-address explanation. Auth regression reproduces the previous 403 and covers allowed aliases, rejected ports/hosts and production rejection; local HTTP checks reach input validation without creating accounts or sending email. (2026-11-03)
- [x] **Review README claims and redesign the application UI** — messaging-first ink/lilac/lime shell; responsive inbox/thread/composer, feed, Explore, profile, search, activity and honest settings. Removed fake scores/statistics/polls/audio and unsupported privacy-save promises. Updated visual/behavior contracts and functionality audit. Service readiness remains explicit. (2026-10-28)
- [x] **Correct unread counts and delayed conversation state** — incoming nondeleted messages after actual read marker; exclude own/duplicate badge increments; active-room/revision guards for history, realtime and sends; preserve per-chat memory drafts and message scrolling. Runnable functionality regression covers delayed room responses. (2026-10-28)
- [x] **Use initial feed results and show mutation failures** — seed real server data, guard stale requests, deduplicate pages and keep retryable content; cards check returned errors, update local state and use accessible edit/delete dialogs. (2026-10-28)
- [x] **Repair real post links and relationship actions** — post-detail route/viewer state, search/activity/share links, username/actor-to-friendship lookup for removal/responses. (2026-10-28)
- [x] **Unify session and appearance owners** — one AuthProvider, server-cookie/client synchronization, initial profile hydration preserves direct-chat loads, logout/account-switch store clearing, navigation store consumers, canonical theme/accent helper and semantic tokens. Regression checks cover hydration versus account changes. Further subscription consolidation remains tracked. (2026-10-28)
- [x] **Use real Pulse mutation and profile values** — enforce supported Pulse choices and four-hour expiry, honor missing state/zero score and recorded history, remove invented profile statistics. (2026-10-28)
- [x] **Record user-completed Gmail dashboard setup** — SMTP/verification/template steps through AUTH_SETUP step5 are user-reported complete. Real delivery and deployed URLs remain pending above. (2026-10-28)
- [x] **Remove fake GIF search fallback** — missing Tenor configuration returns an honest unavailable state; provider failures return bounded, generic errors, with query/limit bounds and a timeout. Regression checks cover missing configuration, actual mapping and failures; the browser unavailable state was verified. (2026-10-28)
- [x] **Add isolated preview and functionality checks** — `npm run preview` uses disposable local fixtures without changing environment files/production services; `npm run test:functionality` tests unread/request/post/state regressions. (2026-10-28)

- [x] **Implement signup email OTP and username/password login** — shared server validation, six-digit confirmation, resend/pending-signup recovery, server-only username→email lookup, cookie session handling, masked accessible inputs and Gmail setup/template. No duplicate auth schema or OTP table. `npm run test:auth` checks actual server code with mocked provider responses. Live SMTP rollout remains above. (2026-10-28)

- [x] **Rename maintained branding to Bakaiti** — metadata, app copy, package name, SVG wordmarks and config; preserve old browser preferences. (2026-10-27)
- [x] **Remove nine retired/incompatible migrations** — one active application schema, a single four-digit format and no duplicated IDs. (2026-10-27)
- [x] **Remove destructive bootstrap resets** — initial schema creates tables without dropping existing data. (2026-10-27)
- [x] **Preserve existing profiles during backfill** — normalize its filename; repeated backfills leave existing rows intact. (2026-10-27)
- [x] **Add forward integrity fixes** — nullable deleted creator, nonempty-post constraint including reposts and friendship timestamps. (2026-10-27)
- [x] **Tighten database access** — prevent self-joining/promotion, restrict client fields/counters/scores, protect block ownership/private interactions, pin definer search paths and restrict scoring/expiry RPCs to the service role. (2026-10-27)
- [x] **Publish presence-related tables** — users, friendships and message reactions join the existing Realtime tables. Client delivery still needs verification. (2026-10-27)
- [x] **Remove legacy search assumptions** — derive hashtags from visible posts and use canonical users/author types without a profiles alias. (2026-10-27)
- [x] **Add PostgreSQL regression checks** — `npm run test:db`: ordering, row preservation, signup/backfill, allowed/forbidden operations, counters, hashtag privacy, service jobs and publications. (2026-10-27)
- [x] **Document install/upgrade procedures** — `supabase/README.md`, README checks and a tracked `.env.example` with CRON_SECRET. (2026-10-27)
- [x] **Unblock auth callbacks and scheduler routing** — exact auth-page matching, callback access, API 401 responses, refresh-cookie preservation and no secret/code query copying into login redirects. Verified against the actual middleware with mocks. (2026-10-27)
- [x] **Validate callback redirects and public origin** — reject external/protocol-relative, encoded control-character and backslash destinations; use configured NEXT_PUBLIC_APP_URL rather than an internal localhost/proxy origin. Full password recovery UI remains open. (2026-10-27)
- [x] **Harden link-preview requests** — public-address checks on every redirect, DNS pinned to the actual socket, standard HTTP(S) ports, no credentials, 5-second fetch deadline and 1-MB HTML cap. The scraper parses bounded HTML without making its own requests. Network fixture tests cover forbidden redirects and oversized responses. (2026-10-27)
- [x] **Authorize call rooms from conversations** — reject client-supplied room names, derive a canonical room from the validated conversation ID and mint a separate token for every authenticated participant. Incoming-call signaling/media controls remain open. (2026-10-27)
- [x] **Implement private-media reads and upload validation** — stable authenticated media references, legacy-URL conversion in chat/feed/stories/profile renderers, 60-second signed reads, private storage policies and DB-enforced media ownership. Uploader prefixes, bucket/type/size limits and bounded multipart parsing are enforced; rollout/live verification remains open. (2026-10-27)
- [x] **Make scheduled maintenance idempotent** — service-only transaction/UTC-day ledger, catch-up after 03:00 UTC, pulse expiry on each run, constant-time bearer-secret comparison and honest HTTP failure responses. Repeated-run SQL tests pass. (2026-10-27)
- [x] **Resolve audited dependency vulnerabilities** — Next.js and matching ESLint config updated to 16.4.3; compatible dependency fixes applied without force/major upgrades. npm reports zero vulnerabilities. (2026-10-27)
- [x] **Add security endpoint regression checks** — `npm run test:security` tests the real TypeScript modules with mocked Supabase/network boundaries, including proxy, callback, cron, media signing and call authorization. (2026-10-27)
- [x] **Add compiled production smoke checks** — `npm run test:production` starts/stops a localhost production server and verifies login branding, protected redirects, callback access and API/private-media 401 responses. (2026-10-27)

## Latest verification

- **Chat calls (2026-11-07):** focused lint and TypeScript pass; security regression exercises authorized token issuance, server-derived room naming, invitations to other members, and no duplicate invite on join. Functionality regression, optimized production build and compiled HTTP smoke checks pass. Local LiveKit URL/credentials are present, but no real two-account session or microphone/camera permission flow was run; complete that acceptance test in the browser.

- **Call interface redesign (2026-11-07):** participant identity mapping, avatar fallbacks and responsive voice/video stages are typechecked and linted. No real media call or device permission was triggered; live visual and device testing remains in the staging acceptance task.

- **Chat attachments (2026-11-07):** source checks pass for media sizing/metadata and isolated preview upload/sign/read/failure behavior; `test:functionality`, typecheck, focused ESLint (0 errors, 4 raw-image optimization warnings), production build and compiled production HTTP smoke checks pass. Desktop/mobile fixture browser checks confirmed previews inside the composer, preserved wide/portrait/video aspect ratios, compact long-filename documents, failure retention/retry, and a 380px document width on a 390px viewport. Generated fixture media only; no user files or real Supabase uploads were used.

- **Project alignment and live acceptance (2026-11-07, current):** actual dashboard project identity and enabled Confirm email were observed. After correcting `.env.local`, live public key, server profile query and Auth admin checks pass (HTTP200); signup is allowed and `mailer_autoconfirm: false`. The user confirms OTP receipt, verification, logout and subsequent username/password login. Read-only checks confirm `dm_host` has a matching profile/Auth account, confirmed email and recorded sign-in. The production build and Auth regressions also pass with the corrected connection. Edge cases and deployment URLs remain pending.

- **Signup/login failure diagnosis (2026-11-07):** the user's retry reports `user_already_exists`; sign-in shows the temporary-unavailable response. A read-only server profile request returns HTTP401; an offline credential-shape check confirms a placeholder, without exposing it. Auth regression, focused lint, typecheck, production build and compiled HTTP checks pass after adding signup-only diagnostics. The real server key, Confirm email setting and actual SMTP delivery/session checks remain pending.

- **Signup configuration diagnosis (2026-11-07):** auth regression checks pass locally. A read-only request to the configured Supabase project's public Auth settings returned HTTP200 with email signup enabled, signup allowed and `mailer_autoconfirm: true`. This explains the exact immediate-session guard error. No accounts were created, no emails sent, and no remote settings changed; enabling Confirm email and live delivery/login checks remain pending.

- **Signup origin fix (2026-11-03):** auth regression first reproduced the loopback mismatch (403), then passed with development-only aliases and strict production checks. Local HTTP requests with empty input reach validation (400) from both localhost/127.0.0.1; an untrusted origin remains 403. Auth/security tests, TypeScript, focused lint, production build and compiled HTTP smoke checks pass. No real signup email was sent; Brevo dashboard configuration and delivery remain pending.

- **Redesign (2026-10-28):** final production build/typecheck, auth/security/SQL/functionality regression and compiled HTTP checks pass. DESIGN.md validator reports 0 errors/0 warnings. Focused redesigned core lint has no errors (image optimization warnings remain). Browser fixtures exercised login/profile synchronization, inbox filtering, DM/group switching, memory drafts, text send, post creation/detail, search URL/clear, profile zero/empty state, Pulse/account menus, appearance persistence, story dialog/cancel and narrow layout. These are not real Supabase delivery tests.
- **Static UI audit:** `premium-audit.json` retains seven actionless-button findings for Radix `asChild` triggers and the shared prop-forwarding Button. Manual source/runtime review identifies delegated handlers, rather than dummy no-op actions. The raw strict audit still exits1; no clean-audit claim is made. Full external design evaluation could not complete because the delegated agents hit the account usage limit.

- **Auth (2026-10-28):** `npm run test:auth` passes against the real actions/API with mocked provider boundaries. TypeScript, focused auth/security lint and the production build pass. Compiled HTTP checks reject malformed input on all four public auth endpoints. Browser checks cover signup→OTP, incomplete/expired codes, resend cooldown, pending-signup recovery, masked inputs, password clearing and mobile layout using a local mock; live email/session delivery remains pending.

- **Database:** `npm run test:db` passes against all twelve migrations in local PostgreSQL, including storage RLS, media ownership and once-per-day scheduler behavior.
- **Security:** `npm run test:security` passes; mocked boundaries do not replace live Supabase/Auth/Storage/LiveKit tests.
- **Types:** `tsc --noEmit --incremental false` passes.
- **Production:** `npm run build` passes on Next.js 16.4.3; Google Fonts required network access.
- **Compiled HTTP:** `npm run test:production` passes six routing/security checks plus input validation for all four auth endpoints. Local server/client needed to run outside the network sandbox; the smoke server was stopped afterward.
- **Lint:** fails with 21 errors and 34 warnings after the redesign (baseline: 65 errors/103 warnings). The new security modules and regression scripts introduce no lint errors. Remaining errors are tracked above.
- **Dependencies:** `npm audit fix` reports zero vulnerabilities after the targeted Next.js security upgrade and compatible fixes.
- **Remote integration:** baseline execution is user-reported. New 0014/0015 deployment, Auth delivery, Storage HTTP, Realtime delivery and multi-user browser flows remain to verify on Supabase.

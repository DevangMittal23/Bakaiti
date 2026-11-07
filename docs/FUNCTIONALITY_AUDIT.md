# Functionality audit — Bakaiti

Reviewed 2026-10-28 against the README, current actions/hooks/stores/routes, local regression checks and browser fixture preview. User requested functional review before a modern Gen Z UI/UX redesign. Existing unrelated changes were preserved. No production data or settings were changed.

## Evidence boundaries

- **Local SQL**: actual migration SQL executed in PGlite with minimal Supabase Auth/Storage role stubs.
- **Action regression**: actual TypeScript modules executed with service/query mocks; tests assert behavior, not merely source strings.
- **Browser fixtures**: actual Next application and server actions against a localhost fake Supabase transport; no real messages/accounts/emails. Mutations are in memory. These checks do not establish RLS, SMTP, Storage, Realtime or LiveKit readiness.
- **User-reported configuration**: Gmail SMTP/Confirm email/OTP template completed through AUTH_SETUP step5. Production URLs deliberately deferred. No independent dashboard/delivery verification.
- **Review limitation**: the implementation agents saved their work, then account usage limits stopped the independent evaluation and final agent turns. The coordinating agent continued source checks, fixes and browser QA. No external/cross-provider design-evaluation pass is claimed.

## Functional review and outcome

| Surface | Audit finding | Result of this changeset | Still required |
| --- | --- | --- | --- |
| Auth | Server-created session cookies did not notify the persistent client profile store; each useAuth mounted its own listener; initial hydration could clear an already opened chat | One AuthProvider, API success synchronization event, store-only consumer, logout/account-switch data clearing while preserving initial authenticated child loads | Live signup/login/recovery/session expiry with Gmail; profile-fetch failure recovery |
| Inbox | Unread count queried after latest message, then hardcoded zero; own messages counted | Counts actual incoming, nondeleted messages after read marker; duplicate/own preview updates do not inflate badges; real search/group/unread filters | Timestamp tie policy, pagination/query fan-out, live multi-user receipt reconciliation |
| Chat state | Slow room-A results could replace room-B global messages | Active-room/revision/unsubscribe guards; per-room memory drafts; send failure retains draft; initial scroll to latest and older-history scroll preservation | Disconnection/retry semantics, real delivery acknowledgements and deterministic cursors |
| Message actions | Imported edit/reply affordances did not form a complete workflow; deletion errors looked successful | Accessible edit/delete/reaction menus and app-owned dialogs; mutations check returned errors | Reply composer, delete-for-me data model, realtime reactions/read receipts |
| Friendships | Friend-user ID passed to relationship-ID deletion; activity response used actor ID as relationship ID | Resolve friendship ID before removal; respondToFriendRequest resolves actor → incoming pending relationship | Atomic block/relationship operations and wider block enforcement |
| Feed | Server-loaded initial results discarded; like/bookmark failures appeared saved | Seeded hook, deduplication/stale guards, inline retry, real local card mutation state and server-error handling; main feed includes RLS-visible posts | Live friend/own-private visibility checks, stable pagination, repost implementation |
| GIFs | Missing Tenor configuration returned unrelated hardcoded GIFs | Honest 503/unavailable UI; bounded query/limit, provider timeout, generic failure response and valid-media filtering | Configured Tenor staging checks and rate limits |
| Post navigation | Share links pointed at absent /post route; search posts always went to feed | Real /post/[postId] detail route + viewer like/bookmark state; share/search/activity point to objects | Two-user private/deleted post denial and canonical deployed-origin checks |
| Search | URL query/type ignored; no reliable clear/stale recovery; raw OR filters | Read initial URL state, explicit commit/clear, IME-aware debounce/stale guards, basic bounded filter sanitization | Relevance, paging and adversarial/live query coverage |
| Explore | Simulated audio, polls, hype, score fallbacks and fake live labels | Removed fake actions/content; actual people, scores, suggested accounts and public posts | Optional real persisted poll/event feature is a future product decision |
| Profile | Invented bio/pulse/statistics, score0→924, fixed chart | Actual profile data, honest empty/zero states, expiring Pulse mutation, recorded history chart and real media/saved views | Persisted statistics if wanted, profile edit collisions and media staging tests |
| Stories | Add Story opened unsupported blank global modal | Dedicated existing StoryCreate in Radix Dialog; refreshed visual story list, actual viewer | Real uploads, expiry/orphans, repeated view idempotency/RLS, video/device tests |
| Privacy/preferences | LocalStorage-only switches pretended to enforce privacy/mute settings | Removed false saved switches; explicit unavailable descriptions; actual per-post visibility remains | Persist and enforce profile/DM/receipt/notification preferences on server |
| Appearance | Multiple hardcoded palettes and inline variables drifted | Canonical appearance helper/data attributes and semantic CSS tokens; browser-local scope explicit | Theme contrast/device matrix and cross-tab preference synchronization |
| Calls | No incoming state machine; placeholder video; controls changed booleans rather than tracks | Voice/video buttons disabled with accessible coming-soon labels | Full invitation signaling, participant tracks, permissions, reconnect, cleanup and call log validation |
| Shared UI | Header/sidebar widths conflicted, duplicate headers, unclear focus and manual overlays | Messaging-first 240px/72px desktop shell, mobile safe-area navigation/thread mode, shared Radix Dialog/menus, skip link, reduced motion, stable controls | Broader screen-reader/device/200% zoom QA |

## Browser acceptance exercised

The local fixture preview was used for username/password login, populated feed, inbox search/no-results/clear, unread badges, opening DM/group threads, sending a text message, switching rooms, and returning to a draft. Both desktop and narrow viewport layouts were inspected. Final verification notes and screenshots are maintained alongside this document as checks complete. No real media/call permission was requested, and no real user received a message.

## Product priorities

1. **Release trust**: blocks, server-validated notification events, cross-row permissions and private-media deployment.
2. **Messaging quality**: atomic DM/group creation, deterministic paging, genuine delivery/read states, realtime reactions, explicit retry and reply composer.
3. **Launch operations**: live Gmail/session/recovery checks, allowed production URLs after deployment, scheduler, storage/CDN and configured Tenor/LiveKit checks.
4. **Retention without fake engagement**: unread jump, pin/archive conversation controls with persistence, shareable post details, real history and useful empty states.
5. **Later exploration**: opt-in longer-lived drafts, accessible keyboard shortcuts, push notifications and native mobile. Persisted polls/events and E2EE require their own product/security design before UI promises.

Use [tasks.md](../tasks.md) for prioritized acceptance criteria and the current release backlog. The redesign is an application refresh, not completion of every backend/integration feature.

## Final verification results

- `npm run test:auth`: pass, including server-cookie/client synchronization events.
- `npm run test:security`: pass.
- `npm run test:db`: pass across all twelve migrations; no remote SQL changes.
- `npm run test:functionality`: pass, including unread markers, duplicate/own sends, relationship IDs, post-detail/Explore viewer state, membership-failure cleanup, stale-room responses, initial auth hydration/account clearing and GIF configuration/provider failures. Browser verifies direct chat loading and the missing-configuration state.
- TypeScript and `npm run build`: pass on Next16.4.3.
- `npm run test:production`: pass (six routing/security checks plus four auth input boundaries).
- Official DESIGN.md lint: 0 errors/0 warnings.
- Focused redesigned core lint: no errors; six image-optimization warnings in the checked set.
- Full repository lint: **21 errors /34 warnings**, down from **65 /103**. Legacy call/group-info/friend components and supporting hooks remain in tasks.md.
- Static premium audit: seven flagged actionless buttons. These are Radix `asChild` triggers and the prop-forwarding shared Button, whose delegated handlers were inspected; raw strict result remains exit1. No new fake `onClick` handlers were added to satisfy a regex. See the raw premium-audit.json and UX-CONTRACT.md.
- Independent design evaluation could not finish after account usage limits stopped the agents. No cross-provider review or automated accessibility certification is claimed.

Screenshots under `docs/screenshots/` show disposable fixture content, not real production users. The fixture preview is separate from `npm run dev` with actual Supabase credentials. Production URLs, live Gmail, private Storage/CDN, Realtime delivery, LiveKit and two-account acceptance remain explicit release checks.

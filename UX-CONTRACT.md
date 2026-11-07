# Bakaiti UX contract

This contract covers the shared shell, signup verification, messaging, social surfaces and settings changed during the 2026-10-28 redesign. Product facts come from the current user request and verified actions/schema. Visual intent and runtime token ownership live in [DESIGN.md](DESIGN.md). A flow described here is an intended interaction contract; see the functionality audit and tasks.md for verification and remaining service limitations.

## Sources and scope

Signup verifies email once, then username/password authenticates later logins. The API handlers remain `/api/auth/signup`, `/api/auth/verify-signup`, `/api/auth/resend-signup` and `/api/auth/login`. Database RLS and validated server operations remain authoritative. Frontend visibility is never authorization. The redesign does not introduce new retention, encryption, moderation, legal, privacy or permissions policy.

## Canonical UI map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Navigation | Sidebar, Header, BottomNav, ContentContainer | Framework route state | Desktop sidebar/header; mobile bottom nav; open thread | Route matching, unread labels, mobile/back/skip link |
| Session | AuthProvider + useAuth store consumer | Supabase Auth | Signed out, loading, signed in | Cookie/session checks and logout clearing |
| Form | Shared Zod validators + form owner | Server actions/API | Auth, profile, composition | Inline validation, draft retention, guarded submit |
| Sensitive input | PasswordInput | Native input semantics | Password, confirmation, signup code | Mask/reveal, paste, autocomplete, focus |
| Action | Shared Button | Component variants | Brand, neutral, outline, ghost, danger | Pending/disabled/focus/pressed states |
| Menu / choice | Existing Radix DropdownMenu | Controlled selected value | Account, Pulse, contextual actions | Keyboard, Escape, focus restoration, placement |
| Select/Listbox | Native select for post visibility | Server visibility enum | Everyone, Friends, Only me; platform popup accepted | Native keyboard, label and selected value |
| Overlay | Existing Radix Dialog | Explicit dialog state | Create, edit, confirmation | Focus trap, title, Escape, restoration |
| Chat attachment | MessageInput + MediaPreview + MessageItem, chat-media.ts | Selected local File; confirmed server message metadata | Inline single-file preview; bounded sent image/video/GIF; compact document/audio | Validation, remove/reselect, URL cleanup, upload failure retention, dimensions and narrow layout |
| Call interface | CallRoom + LiveKitRoom | Authenticated conversation roster and LiveKit room state | Voice avatar stage; responsive video roster | Ring/join, connection states, avatar fallback, actual media controls, narrow layout |
| Feedback / Toast | Root Sonner + inline field/panel messages | Actual operation response | Success, failure, loading, retry | Never the only correction path; accessible status |
| Scrollbar | globals.css | Document and panel overflow contract | Natural document, bounded message/inbox panel | Narrow layout, horizontal list scroll, long forms |
| Appearance | appearance.ts data attributes → globals.css | Browser-local stored preference | Theme, accent, glass | Immediate visual change, reload persistence, storage failure |
| Dataset / CRUD | Existing actions and canonical route | Server response and RLS | Conversation list/thread, feed, search, profile | Full route/state flow and failure checks |

No data table selection or date picker is introduced by the redesign. Native select behavior is retained only where the product accepts platform-owned popup geometry; authored menus use the existing Radix owner.

## Shared navigation and layout

Primary vocabulary is Messages/Chats, Feed, Discover, Circle and Activity. The desktop sidebar also exposes Settings and the current profile. Mobile keeps search and account access in the header. Navigation links use `aria-current`, unread badges derive from stored actual counts, and zero badges disappear. A count does not pretend to be live unless its subscription has supplied that state. No perpetual bell shake or decorative fake counts.

Ordinary pages scroll in the document. Desktop chat uses the viewport below the 72px global header. Mobile inbox also leaves room for the 64px header and 72px bottom navigation; an open thread replaces them with contextual back/navigation and composer. Panels carry `min-width:0`/`min-height:0` where needed so long names and messages wrap without breaking the shell. Back navigation goes to the appropriate list, never a guessed object route.

## Operation ledger

| Operation | Trigger and pending | Success | Failure and recovery |
| --- | --- | --- | --- |
| Signup | Explicit form submit; disable duplicate writes | Clear password fields; show verification for submitted email | Stay on form with inline error and values |
| Verify signup | Explicit six-digit code submit; separate pending label | Normal cookie session, then replace route with feed and refresh | Keep code step; refocus code after controls re-enable; correct or resend |
| Resend / resume signup | Explicit email send/resend; no automatic send on page load | Neutral delivery message and server-directed cooldown | Inline error, respect retryAfter; no account enumeration |
| Login | Username/password submit | Open feed after API success | Generic credential/service error with pending-signup recovery option |
| Logout | Explicit account action | Clear account-scoped stores, open login, refresh | Keep visible error/retry if provider signout fails |
| Open conversation | Select actual conversation or create through existing authorized action | Open thread route; display the selected room only | Keep inbox/navigation usable; show honest empty/error state |
| Send message | Explicit send/Enter, except Shift+Enter and active IME composition | Add server-returned message and update preview | Preserve text/media for correction/retry; do not announce success on error |
| Start/join call | Explicit voice/video action or accept; authenticated token per room participant | Show call UI on token success; render only connected LiveKit participants and their real media | Keep the chat usable and explain token/connect/device errors; end call releases local media |
| Select attachment | Paperclip opens the native picker; existing allowed MIME types and 50MB limit validate immediately | Show filename, kind, size and image/video thumbnail inside the composer before upload | Keep any prior valid selection and caption on rejected replacement; clear/reselect is available before send |
| Search / filter | Immediate local filter or explicit/debounced remote search | Matching results, URL query where meaningful | No-results state distinct from load failure; ignore older requests |
| Publish / react / save | Explicit action with pending guard | Reflect actual server result; reconcile shared/local state | Roll back optimistic change and retain correction/retry path |
| Edit profile / Pulse | Explicit validated save/selection | Show actual stored profile/Pulse and expiry | Keep prior canonical value if save fails |
| Appearance | Explicit theme/accent/glass selection | Update via shared adapter and save in this browser | Explain storage failure; never claim an account-wide save |

## Chat media

Selected attachment previews live inside the composer above the caption. Preview object URLs are tied to the selected file and revoked on replacement/removal/unmount; typing must not allocate new preview URLs. Filename/type/size and available image/video dimensions identify the selected file. Image/video preview failures retain the selection with a clear fallback. Removing a selection returns focus to the caption and allows choosing the same file again.

The explicit main send uploads the selected file and caption. Actual upload progress comes from useUpload; upload/message pending state prevents duplicate sends and disables selection/removal. A failed upload or message write retains the attachment and caption for retry. GIF/voice actions operate independently and retain a pending file/caption for the main send.

Sent images/videos preserve their original ratio within 320 × 360px and the available message width; GIFs fit 280 × 280px. Valid stored dimensions reserve preview geometry, while old messages without dimensions use natural media sizing under the same limits. Small originals are not enlarged unnecessarily. File links show a wrapping name, kind and known size in a compact card. Audio controls stay within the bubble. Image enlargement uses the existing app-owned Dialog and Escape/focus behavior. These are display limits; original file data is not resized or recompressed.

## Auth and sensitive input

Auth forms keep `noValidate`, real labels, field-associated errors, `aria-invalid`, autocomplete and first-error focus. Passwords/codes are masked by default; reveal controls are keyboard accessible with changing labels/state. Allow paste and password managers. The code is one six-digit numeric field. Password strength and token validity are enforced by server/provider, not by decorative UI.

Busy state prevents duplicates, preserves button geometry and announces progress. Passwords/codes never enter URLs, analytics, toasts, logs or persistent client storage. Pending signup can be resumed by entering the original email from login. SMTP settings belong in Supabase; browser tests with fixtures do not establish live delivery.

## Async, presence and data honesty

Keep input on failed mutations, ignore late results after a room/query changes, and preserve cached readable content when requests fail. Error, empty, loading and success states are distinct. The browser's online signal is only a hint; do not claim a message is delivered because a local draft was accepted. No offline queue is implied.

Pulse/online status, scores and statistics must use real values. Missing Pulse is unset; a zero score stays zero. Empty suggested-user or feed data is an empty state, not “connecting to a live stream.” Polls/audio/rooms without persistence or media behavior must not have enabled controls that claim success. Call invitations use the existing realtime notifications feed; LiveKit connection and participant state must remain explicit, and staging acceptance still requires a real two-account/device check. Privacy/notification settings that are not persisted and enforced cannot present a working save switch.

## Accessibility and feedback

Use native links/buttons, visible focus, associated text errors, readable semantic colors, stable targets and normal keyboard semantics. Primary touch targets are at least 44px. Long names/email/content wrap; truncated previews retain a route to the full content. Use the shared Dialog rather than browser confirm/alert. Confirm actual destructive object removal with the object and consequence, while avoiding confirmation for routine reversible saves.

CSS and JavaScript animation respect reduced motion; do not animate every status update. The shell has one Sonner provider; critical feedback remains inline. Controls never exist purely to produce a success toast. English interface copy stays concise and conversational without hiding meaning behind slang.

## Verification and migration

The canonical owner map applies to migrated surfaces. Older consumers can remain temporarily only when tracked; do not extend old patterns. Parent verification owns actual project build/tests, static premium audit, representative desktop/mobile states, theme persistence, keyboard/focus behavior and a two-account staging checklist. Local service fixtures must be clearly labelled and use only fictional data; they never become an app authentication bypass.

Live Gmail delivery, Supabase Realtime, private Storage HTTP access, incoming calls and multi-user privacy require service-backed acceptance checks. A compiled UI or static audit does not prove those behaviors.

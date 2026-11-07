---
version: alpha
colors:
  background: "#0D0F14"
  surface: "#151821"
  elevated: "#1D202B"
  border: "#2A2D38"
  primary: "#B8A0FB"
  accent: "#B8A0FB"
  accentHover: "#CBB8FF"
  secondary: "#D7F87B"
  onPrimary: "#1D152C"
  textPrimary: "#F5F3FA"
  textSecondary: "#A6A7B7"
  error: "#FFB4AB"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
  mono:
    fontFamily: "JetBrains Mono, monospace"
rounded:
  control: "12px"
  panel: "20px"
omitted:
  - section: spacing
    reason: "The established Tailwind spacing scale remains canonical."
  - section: components
    reason: "Shared React primitives own component variants; no generated component-token layer."
---

# Bakaiti design context

## Overview

Bakaiti is a social messenger for a young, conversational audience. The visual north star is a late-night digital clubhouse: intimate ink surfaces, expressive lilac actions, small lime Pulse accents, warm conversational copy and clear utility inside a thread. The current user explicitly authorized an application-wide modern Gen Z redesign on 2026-10-28. This replaces the former glow-heavy Stitch treatment while preserving the Bakaiti name, violet family and established auth behavior.

The memorable signature is the slightly tilted lime conversation mark next to a tight Bakaiti wordmark, with restrained Pulse capsules. Expression belongs in page headings, navigation and auth storytelling; reading messages, forms and privacy boundaries remain familiar. Avoid simulated engagement, invented live states, generic SaaS statistics grids, neon-on-neon typography and nightlife stock imagery. The interface language is English; no Japanese locale or Japan-specific business requirement is established.

## Colors

`src/app/globals.css` owns all runtime values. Its `:root` primitive/semantic variables feed the `@theme inline` aliases, then Tailwind classes and shared components. Values above document that source, not a separate generated theme. Change a documented value and its CSS owner together.

| Document role | Runtime owner | Consumers |
| --- | --- | --- |
| background / surface / elevated | `--bg-base`, `--bg-surface`, `--bg-surface-container` | `bg-background`, `bg-surface`, `bg-surface-container` |
| primary / accent | `--accent-primary` and aliases | `text-accent`, `bg-accent`, focus ring, shared Button |
| textPrimary / textSecondary | `--text-primary`, `--text-secondary` | readable text and instructions |
| border | `--border-default` | shared outlines and navigation separation |
| secondary | `--color-secondary` | lime mark, real status, small emphasis |

Lilac brand buttons use dark ink `text-on-primary`, rather than white text, for contrast. Error, warning and success retain separate semantic labels and icons. Do not communicate status by color alone. Zero is a valid value; missing data is not replaced with a more exciting number.

Themes are semantic adapters: `data-theme` selects Clubhouse (`sleek`), After hours (`amethyst`), Blue hour (`midnight`) or Lights out (`obsidian`); `data-accent` selects lilac, rose, lagoon, mint or peach. All palette values live in CSS. `src/lib/appearance.ts` owns allowed IDs, local persistence and data-attribute application, including migration of historical browser preference keys. It never writes a second set of independent colors. The before-paint initializer and Appearance screen share this path. Preferences are browser-local and must be described as such.

## Typography

`src/app/layout.tsx` loads Space Grotesk, Plus Jakarta Sans and JetBrains Mono with unique `--font-grotesk`, `--font-jakarta` and `--font-jetbrains` variables. CSS aliases map those to display/body/mono; aliases must not reference themselves. Headings use close tracking and a strong size step; long-form body and messages use ordinary sentence case, readable line height and flexible wrapping. Reserve monospace for codes and small numeric details. Icons come from the installed Lucide system; the legacy Material font remains only for unmigrated consumers.

## Layout

The desktop shell uses a 240px persistent sidebar and 72px top header, sharing those exact offsets with content. At widths below 1024px, the sidebar becomes a 72px bottom navigation and the top header is 64px. The five mobile primary destinations are Chats, Feed, Discover, Circle and Activity; account/profile/settings remain accessible from the header. Navigation marks the current page and announces real unread counts. A skip link targets main content.

Ordinary pages scroll naturally in the document and fit within a 1360px maximum content region. Feed may use a narrow stream and useful secondary rail. Chat owns the remaining viewport: desktop `100dvh - 72px`, mobile inbox `100dvh - 136px - safe-area`, mobile open thread `100dvh` with its own contextual header/composer. Each active conversation has one message scroller; long settings forms do not inherit chat height constraints. Mobile actions respect safe areas and the virtual keyboard.

Auth uses an asymmetric brand/story panel on desktop and a focused form-first mobile layout. The form width is at most 420px; the page scrolls naturally as validation or signup content grows. Decorative content never obscures verification, recovery or errors.

## Elevation & Depth

Use border separation and a small palette of surfaces before shadow. Shared panels have restrained shadows; the new shell has no glowing navigation or perpetual badge animation. Backdrop treatment is limited and supports the browser-local glass preference. Motion is brief and purposeful; CSS respects reduced motion globally, and any JavaScript motion must use its own reduced-motion control.

## Shapes

Controls use a 12px radius, panels 20px, avatars circles. Small status capsules can be fully rounded; whole screens must not become a grid of pill-shaped cards. The tilted conversation mark is a brand exception, not a repeated interaction transform. Primary targets are at least 44px; compact contextual controls can use named small variants when space requires them.

## Components

`Button` owns emphasis and intent variants, dimensions, disabled/pressed/focus behavior. `DropdownMenu` owns account and contextual menus with keyboard focus and collision handling. `PulsePicker` reuses the existing Radix `Dialog` for one accessible Pulse-selection workflow across header and profile. Dialog also owns group creation and destructive confirmations. Sonner is mounted once in the root layout for shared accessible acknowledgements; inline errors remain the correction path.

`AuthProvider` owns session initialization; navigation reads auth stores. `NavigationSync` initializes navigation badge sources, while Sidebar, Header, BottomNav and NotificationBell consume shared stores instead of creating their own subscription each. Some older feature consumers still initialize their own subscriptions; that migration remains tracked until verified.

`PasswordInput` owns masked password/code controls. `SignupVerification` owns fresh/resumed signup codes. Existing user avatars and stored media are used when present; fallback initials are honest. No decorative fake users, metrics or private data enter production screens. See `UX-CONTRACT.md` for state and navigation behavior.

### Chat attachment geometry

The composer shows a selected attachment inline above the caption: a contained image/video thumbnail or document/audio icon, filename, kind, byte size and known pixel dimensions, plus a 44px remove action. Selection is visually separate from the actual upload/send status. Existing semantic surfaces, lilac actions and typography remain the visual owners.

Sent image/video previews fit within 320px width and 360px height without crop, stretching or unnecessary upscaling. GIFs fit within 280px in either dimension. Media bubbles also shrink to the available phone width; documents use a compact approximately 288px card with wrapping filenames and known file size. The existing image dialog shows the full image. `chat-media.ts` owns media-fit calculations/detail formatting; MessageItem owns the bounded rendering.

### In-call interface

The full-screen call surface uses an ink-plum stage with restrained lilac lighting, a small lime connected indicator, and a floating control dock. Voice calls feature real saved participant avatars, names, speaking state and connection state; video calls use responsive rounded live-video tiles with avatar fallbacks for camera-off, invited and connecting participants. The UI maps LiveKit identities to the existing conversation roster and never exposes raw UUIDs. No fake participant counts or audio activity are shown. Microphone, camera and leave controls remain thumb-sized and safe-area aware.

## Do's and Don'ts

Do preserve real draft input after a failed mutation, associate errors with fields, retain keyboard focus and show meaningful loading/empty/retry states. Do make the product inviting through composition and words rather than invented activity. Do keep secrets out of URLs, persistent browser storage, logs and toasts. Do not claim an unsupported privacy setting has saved, a fake vote was recorded, or a call is connected before LiveKit reports that state.

### Reconcile drift — 2026-10-28

| Former rule / evidence | Verdict | Resolution |
| --- | --- | --- |
| Heavy glow, radial auth orbs and violet-on-violet labels | Intentional redesign | Replaced with ink surfaces, lilac/ink actions and lime accents under the user's app-wide redesign request |
| Sidebar 240px, main offset 260px, header spanning over sidebar | Drift | One 240px/72px desktop shell contract |
| Root CSS, `@theme`, root script and Appearance page independently set palette values | Drift | CSS is sole value owner; data attributes and shared appearance helper select adapters |
| Font aliases referenced their own variable names | Drift | Unique next/font variables feed CSS role aliases |
| Auth-only design/behavior context | Scope expansion | Preserved auth guarantees and extended shell/shared interaction owners; unresolved service behavior remains in the project backlog |


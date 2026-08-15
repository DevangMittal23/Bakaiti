# HUDdang

**A social messenger where you can feel how alive your friends are — without anyone saying a word.**

HUDdang combines real-time messaging, a social feed, and two original presence mechanics — **Pulse** and **Signal Score** — into a single dark, tactile, purple-accented experience.

<!-- TODO: Add a hero screenshot or GIF here — the Feed or Explore page with Pulse rings visible -->

---

## What Makes HUDdang Different

Most social apps show you a follower count and a green "online" dot. HUDdang replaces both:

- **Pulse** — a real-time, expiring emotional/availability signal (Chill, Active, Busy, Hyped) that shows as a glowing animated ring around every user's avatar. Set your Pulse, and your Circle sees your energy live — no status text required. Pulses auto-expire after 4 hours.

- **Signal Score** — a 0–1000 rolling 7-day score that measures genuine presence: posting, reacting, replying, sending voice notes, being sought out by others. Unlike a follower count, it resets meaning every week — you can't coast on old popularity.

Friends in your Circle are sorted by Signal Score, not alphabetically or by add date — the people who are actually around right now surface first.

---

## Features

### Messaging
- Real-time 1:1 and group chat (Supabase Realtime)
- Read receipts, typing indicators, message reactions
- Voice notes, image/video sharing, GIF search
- Reply, edit, delete messages
- Link previews with Open Graph scraping
- Voice and video calls (LiveKit)

### Social Feed
- Create posts with text, images, video
- Like, comment (with nested replies), bookmark, repost
- Visibility controls: public / friends / private
- Stories (24-hour disappearing media)
- Explore page: trending posts + "Blazing Right Now" (top Signal Score users)

### Presence System
- **Pulse**: 4-state live availability signal with 4-hour auto-expiry
- **Signal Score**: server-calculated engagement score with 7-day rolling history, trend chart, and tier system (Blazing / Warm / Steady / Quiet)

### Social Graph
- Friend requests, accept/decline, remove, block
- User search and discovery
- Suggested people ("People you may know")
- Real-time online status via Supabase Presence

### Notifications
- Real-time activity feed: likes, comments, friend requests, messages, group invites, missed calls
- Inline accept/decline on friend request notifications
- Unread badge counts on sidebar and bottom nav

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Animation | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime (Postgres Changes + Presence + Broadcast) |
| Storage | Supabase Storage |
| Voice/Video | LiveKit |
| Forms | react-hook-form + Zod |
| Charts | Recharts (Signal Score trend) |
| UI Primitives | Radix UI |

---

## Architecture Highlights

- **Signal Score is computed server-side only**, via a Postgres function (`calculate_signal_score`) run on a scheduled cron job — never trusted from the client. The function computes a weighted aggregate of posts, likes received, comments, messages sent/received, voice notes, and friend accepts over a 7-day rolling window, normalized to 0–1000.

- **Pulse uses a hybrid Realtime strategy**: single-user contexts (profile, chat header, your own avatar) subscribe to live Postgres Changes on the `users` table; list contexts (feed, Explore, Circle) receive Pulse data as props from the initial batch query to avoid opening dozens of simultaneous Realtime channels.

- **Row Level Security is enabled on every table** — no data access relies on client-trusted user IDs. All Supabase queries go through RLS, and the `calculate_signal_score` function uses `SECURITY DEFINER` to write history records.

- **Cron fallback**: If `pg_cron` is not available on your Supabase plan, an API route at `/api/cron` handles pulse expiry (every 15 min) and signal score recalculation (daily at 3 AM UTC), secured by a `CRON_SECRET` env var.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (free tier works)

### Setup

```bash
git clone https://github.com/DevangMittal23/HUDdang.git
cd HUDdang
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=any_random_secret_string
```

Run the database migrations in `supabase/migrations/` against your Supabase project in numerical order via the Supabase SQL editor or CLI.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Screenshots

<!-- TODO: Add 3-4 screenshots here: Feed, Chat, Explore with Pulse/Signal visible, Profile -->

---

## Roadmap

- [ ] React Native mobile app (Expo) — see `MOBILE_AUDIT.md` for preparation notes
- [ ] Voice/video call improvements (group calls, screen sharing enhancements)
- [ ] Group chat admin controls (mute, kick, role management)
- [ ] Vibe Rooms — temporary shared spaces
- [ ] End-to-end encryption for DMs
- [ ] Push notifications (Expo Push / FCM)

> **Note**: `FUTURE.md` (the 3D spatial refactor plan from earlier in this project) was lost during the "Revert 3D refactor" commit and needs to be recreated if that direction is revisited.

---

## Author

**Devang Mittal**
Pre-final year B.Tech CS (AI & Data Analytics), GLA University, Mathura

<!-- TODO: Add your actual links below -->
[LinkedIn](https://linkedin.com/in/YOUR_LINKEDIN) · [Portfolio](https://YOUR_PORTFOLIO_URL)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

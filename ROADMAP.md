# 🗺️ Homeroom Product Roadmap

Welcome to the official **Homeroom** development roadmap. Homeroom is a private social and productivity platform designed specifically for classmates, featuring note sharing, messaging, Q&A, ClassCoin (CC) economy, streaks, and gamified achievements.

> Treat Homeroom like a real software product — ship features intentionally, version them properly, and test before you build new things.

---

## 🎯 Release Vision & Versioning Strategy

We follow [Semantic Versioning](https://semver.org/) (`vMAJOR.MINOR.PATCH`):

| Version | Milestone | Architecture | Status |
|---------|-----------|--------------|--------|
| **v0.5** | Core features working & critical bug fixes | Flask + SQLite | ✅ Done |
| **v0.6** | Critical bug fixes (auth, wallet, DMs, bookmarks) | Flask + SQLite | ✅ Done |
| **v0.7** | Feature complete — Notes v2, Q&A v2, Messaging v2 | Flask + SQLite | ✅ Done |
| **v0.8** | Social layer — Wallet v2, Profiles v2, Dashboard redesign | Flask + SQLite | ✅ Done |
| **v0.9** | UI polish, PWA, FAB, skeleton screens | Flask + SQLite | ✅ Done |
| **v1.0** | Stable release (GitHub Pages + Flask API + R2 Storage + IndexedDB) | Flask + SQLite + R2 | 🔄 Ready |
| **v1.5** | Cloudflare Serverless Migration (Workers + D1 Database + R2 Storage) | Cloudflare Workers + D1 | ⏳ Planned |
| **v2.0** | Realtime Durable Objects, AI Summaries, OCR Notes, Live Quizzes | Cloudflare Durable Objects | ⏳ Future |

---

## 🏗️ Homeroom v1.0 Active Architecture (Current Stable)

```
                        Classmates / Users
                                │
                          GitHub Pages
                     (Frontend Client PWA)
                                │
                        HTTPS REST / WebSockets
                                │
                         Cloudflare Tunnel
                                │
                        Homeroom Server
        ┌───────────────────────┴───────────────────────┐
        │                                               │
     Flask API                                    SQLite Database
  (Gunicorn + Nginx)                              (Automated Backups)
        │                                               │
        └───────────────────────┬───────────────────────┘
                                │
                      Cloudflare R2 Storage
             (Notes, Avatars, Attachments, Media)
```

---

## ☁️ Homeroom Serverless Architecture (v1.5 / v2.0 Migration Blueprint)

```
                            Users
                              │
                    GitHub Pages (PWA)
                              │
                          HTTPS API
                              │
                        Cloudflare Worker
                     (Authentication & API)
                              │
                 ┌────────────┴────────────┐
                 │                         │
           Cloudflare D1            Cloudflare R2
         (SQLite Database)        (Files & Images)
```

### Serverless Target Stack Breakdown

| Component | Current (v1.0) | Serverless Target (v1.5 / v2.0) |
|-----------|----------------|---------------------------------|
| **Frontend** | GitHub Pages (PWA) | GitHub Pages (PWA + React/Vite option) |
| **Backend/API** | Flask + Gunicorn | Cloudflare Workers |
| **Database** | SQLite (`homeroom.db`) | Cloudflare D1 (Serverless SQLite) |
| **File Storage** | Cloudflare R2 / Local | Cloudflare R2 (`avatars/`, `notes/`, `marketplace/`, `backups/`) |
| **Authentication** | JWT + Refresh Tokens | JWT + Refresh Tokens |
| **Realtime** | WebSockets / SocketIO | Cloudflare Durable Objects / WebSockets |
| **Offline** | PWA (`sw.js`) + IndexedDB | PWA + IndexedDB offline action queue |
| **Automatic Backups** | `server/backup.py` ZIP | D1 automated snapshots + R2 ZIP backups |

---

## 🛣️ Migration Strategy (Flask → Cloudflare Serverless)

To eliminate risk and maintain rapid development velocity:

1. **Phase 1 (v1.0 - Current)**: Stabilize all core features on the Flask + SQLite + R2 backend. Store all uploads directly in Cloudflare R2 and keep database schemas D1-compatible.
2. **Phase 2 (v1.5)**: Migrate API endpoints feature-by-feature to Cloudflare Workers and D1 database (Auth → Notes → Questions → Wallet → Messaging).
3. **Phase 3 (v2.0)**: Upgrade realtime chat and notifications to Cloudflare Durable Objects + WebSockets.



---

## 🚩 Phase 1 — Finish Homeroom (v1.0 Target)

### 🔴 Sprint 1 — Critical Bug Fixes (→ v0.6)

> Goal: Nothing should be broken. The core loop must work end-to-end.

- [x] **Fix Login / Session Expiry** — Refresh tokens, session persistence, "Remember Me", grace period handling
- [x] **Fix Message Receiving** — WebSocket/polling real-time updates, unread count sync, message ordering
- [x] **Fix Profile Persistence** — Avatar, banner, bio, and settings save reliably
- [x] **Fix Note Uploading** — Multi-format validation, file storage integrity, subject tag handling
- [x] **Fix Question Creation** — Proper tag handling, instant rendering, notification dispatch
- [x] **Fix Notifications** — Real-time push + in-app badge for messages, upvotes, and approvals
- [x] **Fix Search** — Global search across Notes, Q&A, and Users with proper indexing

---

### 💬 Sprint 2 — Messaging v2 (→ v0.7)

**Current:** Basic send only
**Target:** Full-featured messaging experience

- [x] **Delivery Status**: `Sending ⏳` → `Sent ✓` → `Delivered ✓✓` → `Seen ✓✓` (blue ticks)
- [x] **Typing Indicator**: `Aaron is typing...` with animated dots
- [x] **Online / Offline Status**: Green dot badge on avatars
- [x] **Unread Badge**: Per-thread unread counter + global nav counter
- [x] **Message Reactions**: Emoji picker on long-press / hover
- [x] **Reply in Thread**: Quote a message and reply inline
- [x] **Forward Message**: Forward to another conversation
- [x] **Pin Message**: Pin important messages to the top of a conversation
- [x] **Delete for Everyone**: Remove a message from all participants

---

### 📄 Sprint 2 — Notes v2 (→ v0.7)

**Current:** Upload PDF only
**Target:** Full notes discovery & consumption experience

- [x] **Document Preview**: In-browser PDF/image viewer (no download required)
- [x] **Auto Thumbnails**: Generate thumbnail from first page of PDF
- [x] **Metadata**: Subject, tags, file size, page count, upload date
- [x] **Search**: Full-text search across note titles, subjects, and tags
- [x] **Bookmarks / Favorites**: Save notes to a personal collection
- [x] **Recent Uploads**: Feed of the latest notes added
- [x] **Popular / Trending**: Sort by download count or average rating
- [x] **Download Counter**: Track total downloads per note
- [x] **Star Ratings**: 1–5 star rating with average score display

---

### ❓ Sprint 2 — Q&A (Mini Stack Overflow) (→ v0.7)

**Current:** Basic question list with upvotes
**Target:** Full threaded Q&A with accepted answers

```
Question
  └─ Answers (sorted by upvote score)
       └─ Accepted Answer (marked by question author)
            └─ [SOLVED] badge on question card & thread header
```

- [x] **Threaded Answers**: Each question has a dedicated answers list
- [x] **Upvotes / Downvotes**: Per-answer voting with visible score
- [x] **Accepted Answer**: Question author marks one answer as accepted
- [x] **Solved Badge**: `[SOLVED]` shown on question list cards and thread header
- [x] **Answer Notifications**: Author notified when their question gets answered
- [x] **Best Answer Reward**: CC bonus awarded to the accepted answer author

---

### 💰 Sprint 3 — Wallet v2 & ClassCoin Economy (→ v0.8)

**Current:** Shows coin balance only
**Target:** Full financial dashboard with gamification

- [x] **Balance Display**: Prominent CC balance with daily change indicator (+/-)
- [x] **Transaction History**: Full audit trail — earned vs. spent, with source labels
- [x] **Daily Rewards**: Interactive spin wheel + daily check-in streak multipliers
- [x] **Achievements**: Milestone badges with CC bonuses (e.g. "First Upload", "Streak Master", "Answer Hero")
- [x] **Coin Analytics**: Earning vs. spending graph over time (7d / 30d / all time)

---

### 👤 Sprint 3 — Profiles v2 (→ v0.8)

**Current:** Name + avatar
**Target:** Rich public profile page

```
[ Banner Image                               ]
[Avatar] Aaron Fernandes               Lv. 12
         "Student by day, coder by night"
──────────────────────────────────────────────
🏅 Badges   ⚡ XP Bar   🔥 12d Streak
💰 ClassCoin Balance: 480 CC
──────────────────────────────────────────────
📌 Recent Activity
📅 Joined: July 2026
🏆 Contribution Score: 480
```

- [x] **Banner Image**: Full-width banner with upload + crop
- [x] **Avatar Frame**: Unlockable avatar frames via achievements
- [x] **Bio**: Short bio text field
- [x] **XP & Level**: Progress bar to next level, current level title
- [x] **Badges**: Earned badge showcase
- [x] **ClassCoin Balance**: Public coin balance display
- [x] **Recent Activity Feed**: Last 10 notes uploaded, questions asked, answers given
- [x] **Contribution Score**: Aggregate positive-action score
- [x] **Streak Counter**: Current active daily streak
- [x] **Joined Date**: Member since timestamp

---

### 📊 Sprint 3 — Dashboard Redesign (→ v0.8)

**Current:** Separate feature cards, no personalization
**Target:** Unified, personalized home screen

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Good Evening, Aaron 👋
  🔥 12 Day Streak
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📩 Unread Messages  (3 new)
  📚 Latest Notes
  📋 Today's Tasks
  🏆 Leaderboard — Top 3
  📢 Class Announcements
  ⚡ Recent Activity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [x] **Personalized Greeting**: Time-aware greeting ("Good Morning / Evening, [Name]")
- [x] **Streak Widget**: Prominent live daily streak display
- [x] **Unread Messages Preview**: Inline message snippets with sender avatar
- [x] **Latest Notes Feed**: 3–5 most recent note uploads
- [x] **Today's Tasks / Checklist**: Personal lightweight task widget
- [x] **Leaderboard Preview**: Top 3 users by XP this week
- [x] **Class Announcements**: Pinned announcements from admin
- [x] **Recent Activity Feed**: Global activity stream (notes, Q&A, answers)

---

### 🎨 Sprint 4 — UI Polish & PWA (→ v0.9)

- [x] **Floating Action Button (FAB)**: Speed-dial FAB with:
  - ➕ Ask Question
  - 📄 Upload Note
  - 💬 New Chat
- [x] **Skeleton Loading Screens**: Replace all spinners with content-shaped skeletons
- [x] **Micro-Animations**: Smooth page transitions, button press feedback, card reveal animations
- [x] **Pull-to-Refresh**: Native-feeling gesture refresh on mobile
- [x] **Empty State Illustrations**: Friendly illustrations for empty lists and feeds
- [x] **Better Toast Notifications**: Stacked, dismissible, action-able toasts
- [x] **Offline Support**: Service worker caching for key pages
- [x] **PWA Improvements**: Install prompt, background sync, push notifications

---

## 🛠️ Backend & Infrastructure Improvements

### 🔐 Authentication
- [ ] JWT refresh tokens (silent re-authentication)
- [ ] Session persistence with "Remember Me" checkbox
- [ ] Self-service password reset flow
- [ ] Optional email verification on signup

### 🗄️ Database
- [ ] Foreign key enforcement (`PRAGMA foreign_keys = ON`)
- [ ] Indexes on hot query columns (user_id, created_at, etc.)
- [ ] Soft deletes (`deleted_at` timestamp column instead of hard deletes)
- [ ] Cascading deletes for related records
- [ ] Migration management script (`migrations/`)

### 🔌 API Standardization

Every single endpoint must return this shape — no exceptions:

```json
{
  "success": true,
  "message": "Human-readable result description",
  "data": {}
}
```

### 📋 Structured Logging

All key actions logged with: timestamp, user ID, action, IP address.

| Action | Log Level |
|--------|-----------|
| User login / logout | `INFO` |
| Note upload / delete | `INFO` |
| Message send / delete | `INFO` |
| Admin action | `WARN` |
| Auth failure / rate limit hit | `WARN` |
| 500 / unhandled errors | `ERROR` |

### ⚡ Performance
- [ ] Pagination + infinite scrolling (notes, questions, messages)
- [ ] Image compression on upload (Pillow)
- [ ] Lazy loading for images and thumbnails
- [ ] Response caching for slow/static queries
- [ ] Background sync for notifications

### 🔒 Security
- [ ] Rate limiting on all auth and upload endpoints
- [ ] CSRF protection (if switching to cookie-based auth)
- [ ] Strict file type + size validation on all uploads
- [ ] Stronger password rules (min 8 chars, complexity)
- [ ] Admin audit log (who did what, when)
- [ ] Admin moderation tools (delete content, warn/ban users)

---

## ☁️ Sprint 5 — Deployment (→ v1.0)

> **Active Deployment Target:** Online cloud web service hosted on **Render** (via `render.yaml` & `Procfile`).

```
                   ┌─────────────────────────┐
                   │       Render Cloud      │
                   │   (Flask Web Service)   │
                   └────────────┬────────────┘
                                │  HTTPS / REST API
                                ▼
                   ┌─────────────────────────┐
                   │    PWA Client (public/) │
                   └─────────────────────────┘
```

- [x] Configure `Procfile` (`web: gunicorn server.app:app`)
- [x] Add `render.yaml` Blueprint for 1-click Render web service deployment
- [x] Add `/healthz` health check route in Flask backend
- [x] Clear `homeroom.db` & reset database to clean production state
- [ ] Push changes to GitHub (`git push origin main`) to trigger automatic Render deployment build
- [ ] Invite classmates for beta testing & cut stable `v1.0` tag

---

## 📅 Sprint Summary

| Sprint | Focus | Key Deliverables | Target Version |
|--------|-------|-----------------|----------------|
| **Sprint 1** | Bug fixes & auth | Fix all 🔴 critical bugs listed above | `v0.6` |
| **Sprint 2** | Core feature upgrades | Notes v2, Q&A v2, Messaging v2 | `v0.7` |
| **Sprint 3** | Social & discovery | Wallet v2, Profiles v2, Dashboard redesign, Search, Leaderboard | `v0.8` |
| **Sprint 4** | UI polish & PWA | FAB, skeletons, animations, pull-to-refresh, offline support | `v0.9` |
| **Sprint 5** | Deployment | Redmi 7A server, GitHub Pages, beta invite, stable release | `v1.0` |

---

## 🚀 v2.0 — Future Horizons

Features for after v1.0 is stable and classmates are actively using the platform:

- 🎙️ Voice / audio messages in DMs
- 🖊️ Real-time collaborative note editing (Google Docs-style)
- 📅 Class events calendar with reminders
- 📊 Teacher dashboard with class analytics
- 🎮 Class-wide challenges and gamified tournaments
- 🔔 Native Web Push API notifications
- 🌐 Multi-class / multi-school support

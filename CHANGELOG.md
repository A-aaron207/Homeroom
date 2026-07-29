# 📝 Changelog

All notable changes to the **Homeroom** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.0] — 2026-07-29

### Added
- **Floating Action Button (FAB)**: Speed-dial floating action button (➕ Ask Question, 📄 Upload Note, 💬 New Chat) in bottom-right corner.
- **Skeleton Loading Screens**: Replaced static loading spinners with animated shimmer skeleton loaders on Home and Chats.
- **Mobile Pull-to-Refresh**: Native-feeling gesture refresh on touch devices when scrolled to top.
- **Micro-Animations**: Card hover elevations, button press scale feedback, smooth modal animations, and pulse glow effects.

---

## [0.8.0] — 2026-07-29

### Added
- **Dashboard Redesign**: Personalized time-aware greeting ("Good Morning / Evening"), live streak counter, unread messages preview widget, latest notes feed, top 3 leaderboard, quick action buttons, and class announcements stream.
- **Wallet v2 & Transaction Types**: Unified transaction categories (`earned` vs `spent`), transaction filter tabs (All, Earned, Spent), and ClassCoin transfer UI.
- **Profiles v2 Enhancements**: Stats grid (Total XP, CC Balance, Current & Longest Streaks), streak visualizer calendar, and user questions/answers count integration.

---

## [0.7.0] — 2026-07-29

### Added
- **Messaging v2**:
  - Delivery & read status indicators: `Sent ✓` → `Delivered ✓✓` → `Seen ✓✓` (blue ticks).
  - Emoji message reactions with quick picker popover (`👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`, `🔥`, `💯`).
  - Quote-and-reply inline message threading.
  - Delete message for everyone feature.
  - Automatic DM conversation title and icon resolution from partner profile.
- **Notes v2**:
  - Bookmarks & favorites functionality (`POST /api/notes/<id>/bookmark` & `GET /api/notes/bookmarked`).
  - "Bookmarked" filter chip in notes discovery view.
  - Star ratings and download tracking per note.
- **Q&A v2 (Mini Stack Overflow)**:
  - `[SOLVED]` badge on question list cards and thread headers when an accepted answer exists.
  - "Solved Only" filter in question sort dropdown.
  - Accepted Answer visual styling with green banner and priority sorting.

---

## [0.6.0] — 2026-07-29

### Fixed
- **Wallet Transaction Mismatch**: Standardized transaction types (`earned` / `spent`) between backend routes and DB helpers.
- **DM Conversation Naming**: Fixed missing title & avatar icon for DM conversations by resolving participant profile info.
- **Message Delivery Status**: Added `delivered_to` JSON column to messages table and added `POST /conversations/<id>/delivered` endpoint.
- **Note Bookmarks API**: Fixed route collision by placing `GET /notes/bookmarked` prior to parameter route `GET /notes/<id>`.
- **User Profile Stats**: Included `answers` and `questions` count in user profile statistics API.

---

## [0.5.0] — 2026-07-28

### Added
- **Product Roadmap**: Created `ROADMAP.md` establishing Sprints 1–5 leading to v1.0.
- **Changelog Tracking**: Established `CHANGELOG.md` with semantic versioning guidelines.
- **Global Search API & UI**: Cross-entity search across notes, Q&A questions, and classmates (`/api/search`).
- **In-App Notification Engine**: Real-time notifications for note uploads, question posts, answers, and best answers (`/api/notifications`).
- **JWT Refresh Tokens**: Endpoint `/api/auth/refresh` for seamless session renewal.

### Fixed
- 🔴 **Login & Session Expiry**: Added automatic token refresh interceptor in `api.js` and silent re-authentication.
- 🔴 **Message Receiving**: Resolved array mutation bug (`messages.reverse()`) in `chats.js` that caused chat order flipping.
- 🔴 **Profile Persistence**: Harmonized camelCase and snake_case field mappings in `users.py`.
- 🔴 **Note Uploading & Downloading**: Fixed note upload tags JSON parsing and author name mapping.
- 🔴 **Question Creation**: Prevented double JSON stringification on question tags in `qna.py`.
- 🔴 **Notifications**: Created notifications DB schema, bell badge counter, and mark-all-read interface.
- 🔴 **Search**: Added global search input debouncing and quick modal navigation.

---

## [0.4.0] — Initial Prototype

### Added
- Fullstack architecture: Flask REST API backend + SQLite database.
- Single Page Application (SPA) modular JS frontend.
- ClassCoin (CC) virtual economy with daily spin wheel and shop marketplace.
- Note upload & download system categorized by school subjects.
- Class chat, DMs, and subject discussion channels.
- Basic Q&A forum with upvoting.
- Email approval system for new user signups.
- PWA manifest and service worker configuration.

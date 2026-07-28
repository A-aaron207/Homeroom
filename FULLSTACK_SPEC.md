# Homeroom Full-Stack Specification

## Tech Stack
- **Backend**: Python Flask (in .venv), SQLite3, PyJWT, smtplib
- **Frontend**: Vanilla HTML/CSS/JS (no framework), PWA
- **Auth**: JWT tokens in localStorage
- **Email**: Gmail SMTP for signup approvals
- **DB**: SQLite3 (built-in Python)

## Project Structure
```
homeroom/
├── .venv/                  # Python virtual environment
├── server/
│   ├── __init__.py
│   ├── app.py              # Flask app, config, static serving
│   ├── database.py         # DB init, schema, helpers
│   ├── email_service.py    # Gmail SMTP
│   ├── middleware.py        # JWT auth decorator
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py         # Signup, login, approval
│   │   ├── users.py        # Profiles
│   │   ├── notes.py        # Notes CRUD
│   │   ├── chats.py        # Messaging
│   │   ├── tasks.py        # Task board
│   │   ├── marketplace.py  # Shop
│   │   ├── qna.py          # Q&A
│   │   ├── daily.py        # Spin, streaks, daily login
│   │   ├── leaderboard.py  # Rankings
│   │   └── admin.py        # Announcements, admin actions
│   └── utils.py            # Helpers (XP calc, level, etc.)
├── public/
│   ├── index.html          # Main app shell (auth-protected)
│   ├── auth.html           # Login/Signup page
│   ├── approve.html        # Admin approval page
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   ├── css/
│   │   └── styles.css      # Complete design system + themes
│   ├── js/
│   │   ├── api.js          # API client wrapper
│   │   ├── auth.js         # Auth state, token management
│   │   ├── store.js        # Client state from API
│   │   ├── app.js          # Router, sidebar, toast, modal
│   │   └── pages/
│   │       ├── home.js
│   │       ├── notes.js
│   │       ├── chats.js
│   │       ├── community.js
│   │       ├── tasks.js
│   │       ├── leaderboard.js
│   │       ├── marketplace.js
│   │       ├── wallet.js
│   │       ├── qna.js
│   │       ├── profile.js
│   │       └── settings.js
│   └── icons/              # PWA icons (generated)
├── uploads/                # User file uploads
├── requirements.txt
└── run.py                  # Entry point
```

## Database Schema (SQLite)

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_emoji TEXT DEFAULT '🎓',
    avatar_bg TEXT DEFAULT 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    bio TEXT DEFAULT '',
    roll_number TEXT DEFAULT '',
    xp INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0,
    streak_current INTEGER DEFAULT 0,
    streak_longest INTEGER DEFAULT 0,
    last_login_date TEXT,
    last_spin_date TEXT,
    join_date TEXT DEFAULT (datetime('now')),
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'pending',
    theme TEXT DEFAULT 'dark',
    purchased_items TEXT DEFAULT '[]',
    achievements TEXT DEFAULT '[]',
    username_color TEXT DEFAULT '',
    profile_frame TEXT DEFAULT '',
    approval_token TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    subject TEXT NOT NULL,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER DEFAULT 0,
    uploaded_by TEXT REFERENCES users(id),
    download_count INTEGER DEFAULT 0,
    rating_sum REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Note Comments
CREATE TABLE IF NOT EXISTS note_comments (
    id TEXT PRIMARY KEY,
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Note Ratings
CREATE TABLE IF NOT EXISTS note_ratings (
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    PRIMARY KEY (note_id, user_id)
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'dm',
    name TEXT,
    icon TEXT DEFAULT '💬',
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Conversation Members
CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    reply_to TEXT,
    edited INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    reactions TEXT DEFAULT '{}',
    read_by TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    reward_coins INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    created_by TEXT REFERENCES users(id),
    deadline TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Task Submissions
CREATE TABLE IF NOT EXISTS task_submissions (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    proof TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    submitted_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT REFERENCES users(id),
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Questions (Q&A)
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    subject TEXT DEFAULT '',
    asked_by TEXT REFERENCES users(id),
    upvotes INTEGER DEFAULT 0,
    answer_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Question Votes
CREATE TABLE IF NOT EXISTS question_votes (
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    PRIMARY KEY (question_id, user_id)
);

-- Answers
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    answered_by TEXT REFERENCES users(id),
    is_best INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Answer Votes
CREATE TABLE IF NOT EXISTS answer_votes (
    answer_id TEXT REFERENCES answers(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    PRIMARY KEY (answer_id, user_id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Marketplace Items (seeded by server)
CREATE TABLE IF NOT EXISTS marketplace_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    icon TEXT DEFAULT '🎁',
    item_data TEXT DEFAULT '{}'
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    item_id TEXT REFERENCES marketplace_items(id),
    purchased_at TEXT DEFAULT (datetime('now'))
);

-- Daily Spins
CREATE TABLE IF NOT EXISTS daily_spins (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    reward_type TEXT,
    reward_value TEXT DEFAULT '',
    reward_amount INTEGER DEFAULT 0,
    spun_at TEXT DEFAULT (datetime('now'))
);
```

## API Endpoints Contract

All API routes are prefixed with `/api`.
Auth header: `Authorization: Bearer <jwt_token>`
Response format: `{ "success": bool, "data": ..., "message": "..." }`

### Auth (`/api/auth`)
```
POST /api/auth/signup
  Body: { username, displayName, email, password, rollNumber, bio, avatarEmoji }
  → Creates pending user, sends approval email to admin
  Response: { success: true, message: "Account created. Waiting for admin approval." }

POST /api/auth/login
  Body: { email, password }
  → Returns JWT token + user data (only if status='approved')
  Response: { success: true, data: { token, user } }

GET /api/auth/me
  Auth: Required
  → Returns current user data
  Response: { success: true, data: { user } }
```

### Approval (`/api/approve`)
```
GET /api/approve/<token>
  → Returns pending user info for the approval page
  Response: { success: true, data: { user: { username, displayName, email, rollNumber, bio } } }

POST /api/approve/<token>
  Body: { action: 'approve' | 'reject' }
  → Updates user status
  Response: { success: true, message: "User approved/rejected" }
```

### Users (`/api/users`)
```
GET /api/users
  Auth: Required
  → List all approved users (public profiles)

GET /api/users/<id>
  Auth: Required
  → Get user profile with stats

PUT /api/users/me
  Auth: Required
  Body: { displayName?, bio?, avatarEmoji?, avatarBg?, theme? }
  → Update own profile
```

### Notes (`/api/notes`)
```
GET /api/notes?subject=&sort=newest|rating|downloads&search=
  Auth: Required

POST /api/notes (multipart/form-data)
  Auth: Required
  Fields: title, description, subject, tags (JSON string), file
  → Creates note, awards +15 CC and +25 XP

GET /api/notes/<id>
  Auth: Required → with comments and ratings

POST /api/notes/<id>/rate
  Body: { rating: 1-5 }

POST /api/notes/<id>/comment
  Body: { content }

GET /api/notes/<id>/download
  → Serves file, increments download count

DELETE /api/notes/<id>
  Auth: Required (own note or admin)
```

### Chats (`/api/chats`)
```
GET /api/conversations
  Auth: Required → user's conversations

POST /api/conversations
  Body: { type: 'dm'|'group'|'subject', name?, participants: [userId], subject? }

GET /api/conversations/<id>/messages?before=&limit=50

POST /api/conversations/<id>/messages
  Body: { content, replyTo? }

PUT /api/messages/<id>
  Body: { content }

DELETE /api/messages/<id>

POST /api/messages/<id>/react
  Body: { emoji }

POST /api/conversations/<id>/read
  → Marks all messages as read
```

### Tasks (`/api/tasks`)
```
GET /api/tasks
  Auth: Required

POST /api/tasks (admin only)
  Body: { title, description, rewardCoins, rewardXp, deadline }

POST /api/tasks/<id>/submit
  Body: { proof }

GET /api/tasks/<id>/submissions (admin only)

POST /api/submissions/<id>/review
  Body: { action: 'approve'|'reject' }
  → If approve: awards coins+xp to submitter
```

### Marketplace (`/api/marketplace`)
```
GET /api/marketplace
  Auth: Required → list items + user's purchases

POST /api/marketplace/purchase/<itemId>
  Auth: Required → deducts coins, adds to user purchases
```

### Q&A (`/api/qna`)
```
GET /api/questions?sort=newest|popular|unanswered&search=&subject=

POST /api/questions
  Body: { title, content, tags, subject }

GET /api/questions/<id>
  → With answers

POST /api/questions/<id>/answer
  Body: { content } → awards +3 CC, +5 XP

POST /api/questions/<id>/upvote
POST /api/answers/<id>/upvote

POST /api/answers/<id>/best (question author only)
  → Awards answerer +15 CC, +20 XP
```

### Daily (`/api/daily`)
```
POST /api/daily/checkin
  → Awards streak coins (+5 base, +1 per day, caps at +30), +2 XP

POST /api/daily/spin
  → Once per day, random reward: 5/10/20/50 CC, 10/25 XP, badge, nothing
  Response: { reward_type, reward_amount }

GET /api/daily/status
  → { canSpin: bool, streak: { current, longest, lastDate }, todayCheckedIn: bool }
```

### Leaderboard (`/api/leaderboard`)
```
GET /api/leaderboard?type=xp|coins|notes|downloads&period=all|monthly|weekly
  → Sorted user list with ranks
```

### Wallet (`/api/wallet`)
```
GET /api/wallet
  Auth: Required → { balance, totalEarned, totalSpent, transactions, rank }

POST /api/wallet/transfer
  Body: { recipientId, amount, reason }
  → Validates balance, transfers coins
```

### Admin (`/api/admin`)
```
POST /api/announcements (admin only)
  Body: { title, content, pinned? }

GET /api/announcements

DELETE /api/announcements/<id> (admin only)

GET /api/admin/pending (admin only)
  → List pending user signups
```

## Level System
```python
LEVELS = [
    {"level": 1, "title": "New Student",       "icon": "🌱", "min_xp": 0},
    {"level": 2, "title": "Active Member",     "icon": "⚡", "min_xp": 500},
    {"level": 3, "title": "Study Buddy",       "icon": "📖", "min_xp": 1500},
    {"level": 4, "title": "Note Master",       "icon": "📝", "min_xp": 3000},
    {"level": 5, "title": "Class Helper",      "icon": "🤝", "min_xp": 5000},
    {"level": 6, "title": "Top Contributor",   "icon": "🌟", "min_xp": 8000},
    {"level": 7, "title": "Knowledge Keeper",  "icon": "🧠", "min_xp": 12000},
    {"level": 8, "title": "Homeroom Legend",    "icon": "👑", "min_xp": 18000},
]
```

## Reward Table
| Action | CC | XP |
|--------|----|----|
| Upload Note | +15 | +25 |
| Answer Question | +3 | +5 |
| Best Answer | +15 | +20 |
| Daily Login | +5 (base) | +2 |
| Complete Task | varies | varies |
| Quiz Winner | +50 | +100 |
| Get a Like | +1 | +2 |
| Daily Spin | varies | varies |

## Achievement Definitions (seeded)
```python
ACHIEVEMENTS = [
    {"id": "first_upload", "title": "First Upload", "desc": "Share your first note", "icon": "📝", "rarity": "common"},
    {"id": "knowledge_master", "title": "Knowledge Master", "desc": "Upload 50 notes", "icon": "📚", "rarity": "legendary"},
    {"id": "100_downloads", "title": "Popular Notes", "desc": "Get 100 total downloads", "icon": "⬇️", "rarity": "epic"},
    {"id": "helpful_person", "title": "Helpful Person", "desc": "Answer 25 questions", "icon": "🤝", "rarity": "rare"},
    {"id": "7_day_streak", "title": "Week Warrior", "desc": "7-day login streak", "icon": "🔥", "rarity": "uncommon"},
    {"id": "30_day_streak", "title": "Dedicated Student", "desc": "30-day login streak", "icon": "💪", "rarity": "epic"},
    {"id": "quiz_champion", "title": "Quiz Champion", "desc": "Win 10 quizzes", "icon": "🏆", "rarity": "rare"},
    {"id": "top_contributor", "title": "Top Contributor", "desc": "Reach #1 on leaderboard", "icon": "👑", "rarity": "legendary"},
    {"id": "rich_student", "title": "Rich Student", "desc": "Accumulate 1000 CC", "icon": "💰", "rarity": "rare"},
    {"id": "social_butterfly", "title": "Social Butterfly", "desc": "Send 100 messages", "icon": "🦋", "rarity": "uncommon"},
    {"id": "first_purchase", "title": "Shopper", "desc": "Buy from marketplace", "icon": "🛒", "rarity": "common"},
    {"id": "best_answer", "title": "Best Answer", "desc": "Get a best answer", "icon": "⭐", "rarity": "uncommon"},
]
```

## Marketplace Items (seeded)
```python
MARKETPLACE_ITEMS = [
    {"id": "theme_cyber", "name": "Cyber Theme", "desc": "Neon cyan & magenta", "category": "theme", "price": 200, "icon": "🌐"},
    {"id": "theme_matrix", "name": "Matrix Theme", "desc": "Green on black", "category": "theme", "price": 200, "icon": "💚"},
    {"id": "theme_solo", "name": "Solo Leveling Theme", "desc": "Purple gaming aesthetic", "category": "theme", "price": 300, "icon": "⚔️"},
    {"id": "theme_neon", "name": "Neon Theme", "desc": "Bright neon colors", "category": "theme", "price": 200, "icon": "✨"},
    {"id": "theme_light", "name": "Light Theme", "desc": "Clean light mode", "category": "theme", "price": 50, "icon": "☀️"},
    {"id": "color_gold", "name": "Golden Username", "desc": "Gold colored username", "category": "username_color", "price": 400, "icon": "🏅"},
    {"id": "color_rainbow", "name": "Rainbow Username", "desc": "Rainbow gradient", "category": "username_color", "price": 500, "icon": "🌈"},
    {"id": "color_fire", "name": "Fire Username", "desc": "Red-orange gradient", "category": "username_color", "price": 300, "icon": "🔥"},
    {"id": "frame_animated", "name": "Animated Avatar Border", "desc": "Glowing animated ring", "category": "profile_frame", "price": 150, "icon": "💫"},
    {"id": "frame_diamond", "name": "Diamond Frame", "desc": "Sparkling diamond border", "category": "profile_frame", "price": 350, "icon": "💎"},
    {"id": "badge_vip", "name": "VIP Badge", "desc": "Exclusive VIP badge", "category": "badge", "price": 250, "icon": "👑"},
    {"id": "card_premium", "name": "Premium Profile Card", "desc": "Animated profile background", "category": "profile_card", "price": 500, "icon": "🎴"},
]
```

## Spin Wheel Rewards
```python
SPIN_REWARDS = [
    {"type": "coins", "amount": 5, "label": "5 CC", "weight": 30},
    {"type": "coins", "amount": 10, "label": "10 CC", "weight": 25},
    {"type": "coins", "amount": 20, "label": "20 CC", "weight": 15},
    {"type": "coins", "amount": 50, "label": "50 CC", "weight": 5},
    {"type": "xp", "amount": 10, "label": "10 XP", "weight": 20},
    {"type": "xp", "amount": 25, "label": "25 XP", "weight": 10},
    {"type": "nothing", "amount": 0, "label": "Try Again!", "weight": 15},
]
```

## Theme System (CSS)
7 themes, each overrides CSS custom properties via `[data-theme="name"]`:

1. **dark** (default) — Deep indigo dark (#08081a, accent #6366f1)
2. **light** — Clean white (#f8f9fa, accent #4f46e5)
3. **cyber** — Dark with cyan/magenta (#0a0f1a, accent #00f5ff)
4. **glass** — Heavy glassmorphism, more transparent cards
5. **matrix** — Green on black (#000000, accent #00ff41)
6. **solo-leveling** — Dark purple/blue (#0d0a1a, accent #7c3aed, glow heavy)
7. **neon** — Dark with bright multi-neon (#0a0a0a, accent #ff006e)

## Sidebar Navigation Items (with dividers)
```
── Main ──
🏠 Home
📚 Notes
💬 Chats
❓ Q&A
👥 Community
── Activity ──
📋 Tasks
🏆 Leaderboard
── Economy ──
🛒 Marketplace
💰 Wallet
── Personal ──
👤 Profile
⚙️ Settings
```

## Frontend Patterns

### API Client (js/api.js)
```js
const API = {
  baseURL: '/api',
  token: localStorage.getItem('homeroom_token'),

  async request(method, path, body, isFormData) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const res = await fetch(this.baseURL + path, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
    });
    return res.json();
  },

  get(path) { return this.request('GET', path); },
  post(path, body, isFormData) { return this.request('POST', path, body, isFormData); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); }
};
```

### Auth Flow
1. User opens app → check for token in localStorage
2. No token → redirect to auth.html
3. Token exists → call GET /api/auth/me
4. If 401 → clear token, redirect to auth.html
5. If valid → load app, store user in Homeroom.store.currentUser

### Page Module Pattern
```js
window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.pageName = {
  async render() { /* return HTML string, can be async for API calls */ },
  init() { /* bind events after render */ },
  destroy() { /* cleanup */ }
};
```
Note: render() can now be async. The router should `await` it.

### PWA Requirements
- manifest.json with name, icons, theme_color, display: standalone
- sw.js caching static assets (CSS, JS, HTML, fonts)
- Add to home screen support

## Email Approval Flow
1. User signs up → account status='pending', generate approval_token
2. Server sends email to admin Gmail (configured in server config):
   - Subject: "Homeroom: New signup request from {displayName}"
   - Body: HTML with user details + approve/deny links
   - Links: `{SERVER_URL}/approve.html?token={approval_token}`
3. Admin opens link → approve.html loads, fetches user info from API
4. Admin clicks Approve or Reject
5. API updates user status
6. User can now login (if approved)

## Server Config
The server reads config from environment variables or a config.json:
```python
CONFIG = {
    'SECRET_KEY': 'your-secret-key-change-this',
    'ADMIN_EMAIL': '',      # Admin's Gmail for receiving approval requests
    'GMAIL_USER': '',       # Gmail address for sending emails
    'GMAIL_APP_PASSWORD': '', # Gmail App Password
    'SERVER_URL': 'http://localhost:5000',
    'DB_PATH': 'homeroom.db',
    'UPLOAD_FOLDER': 'uploads',
    'MAX_FILE_SIZE': 10 * 1024 * 1024,  # 10MB
}
```

## Currency Name
- ClassCoin (CC) — displayed as "⭐ 150 CC"
- Use throughout instead of HC (Homeroom Coins)

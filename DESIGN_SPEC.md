# Homeroom — Design Specification

## Overview
Homeroom is a private digital space for classmates. Vanilla HTML/CSS/JS SPA (no framework, no build step).

## Architecture
- **No ES Modules** — use `<script>` tags with a global `Homeroom` namespace
- **Hash-based router** — `#home`, `#notes`, `#chats`, etc.
- **State in memory** — `Homeroom.store` holds all data, localStorage for persistence
- Scripts load order: `store.js` → all page scripts → `app.js`

## Global Namespace Pattern
```js
window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};
Homeroom.store = Homeroom.store || {};
```

Each page registers itself:
```js
Homeroom.pages.pageName = {
  render() { return '<div class="page fade-in">...</div>'; },
  init() { /* bind event listeners after render */ },
  destroy() { /* optional cleanup */ }
};
```

## File Structure
```
index.html
css/styles.css
js/store.js          — State management, mock data, event bus
js/app.js            — Router, sidebar logic, global UI
js/pages/home.js
js/pages/notes.js
js/pages/chats.js
js/pages/community.js
js/pages/tasks.js
js/pages/leaderboard.js
js/pages/wallet.js
js/pages/profile.js
js/pages/settings.js
```

## HTML Shell (index.html)
```
┌────────────────────────────────────────────────────────┐
│ <body>                                                  │
│ ┌──────────┬───────────────────────────────────────────┐│
│ │ .sidebar │ .main-wrapper                             ││
│ │          │ ┌───────────────────────────────────────┐ ││
│ │ logo     │ │ .header (search, notifs, coins, user) │ ││
│ │ nav-items│ ├───────────────────────────────────────┤ ││
│ │          │ │ #main-content                         │ ││
│ │          │ │ (pages render here)                   │ ││
│ │          │ │                                       │ ││
│ │          │ └───────────────────────────────────────┘ ││
│ └──────────┴───────────────────────────────────────────┘│
│ .mobile-nav (bottom bar, visible < 768px)               │
└────────────────────────────────────────────────────────┘
```

## Sidebar Nav Items
```
🏠 Home        → #home
📚 Notes       → #notes
💬 Chats       → #chats
👥 Community   → #community
📋 Tasks       → #tasks
🏆 Leaderboard → #leaderboard
💰 Wallet      → #wallet
👤 Profile     → #profile
⚙️ Settings    → #settings
```

## CSS Design System (css/styles.css)

### CSS Custom Properties
```css
:root {
  /* Backgrounds */
  --bg-base: #08081a;
  --bg-primary: #0c0c22;
  --bg-secondary: #13132e;
  --bg-tertiary: #1a1a3a;
  --bg-card: rgba(22, 22, 55, 0.65);
  --bg-card-hover: rgba(30, 30, 70, 0.75);
  --bg-input: rgba(18, 18, 45, 0.8);
  --bg-sidebar: rgba(10, 10, 30, 0.95);
  
  /* Glass */
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-border-hover: rgba(255, 255, 255, 0.12);
  --glass-blur: 20px;
  
  /* Text */
  --text-primary: #eaeaf2;
  --text-secondary: #9494b8;
  --text-muted: #5a5a80;
  --text-inverse: #0c0c22;
  
  /* Accent (Indigo) */
  --accent: #6366f1;
  --accent-light: #818cf8;
  --accent-dark: #4f46e5;
  --accent-glow: rgba(99, 102, 241, 0.15);
  --accent-glow-strong: rgba(99, 102, 241, 0.35);
  
  /* Semantic */
  --success: #10b981;
  --success-bg: rgba(16, 185, 129, 0.12);
  --warning: #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.12);
  --danger: #ef4444;
  --danger-bg: rgba(239, 68, 68, 0.12);
  --info: #3b82f6;
  --info-bg: rgba(59, 130, 246, 0.12);
  
  /* Coin */
  --coin: #fbbf24;
  --coin-bg: rgba(251, 191, 36, 0.12);
  --coin-glow: rgba(251, 191, 36, 0.3);
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 999px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.45);
  --shadow-glow: 0 0 20px var(--accent-glow);
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition: 0.25s ease;
  --transition-slow: 0.4s ease;
  
  /* Layout */
  --sidebar-width: 260px;
  --sidebar-collapsed: 72px;
  --header-height: 68px;
  --mobile-nav-height: 64px;
  
  /* Font */
  --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### CSS Class Inventory

**Layout:**
- `.sidebar` — Left nav sidebar, glassmorphism, fixed
- `.sidebar-logo` — Logo area at top of sidebar
- `.sidebar-nav` — Nav list container
- `.nav-item` — Sidebar nav link (has `data-page` attr, `.active` class)
- `.nav-item-icon` — Emoji/icon span inside nav item
- `.nav-item-label` — Text label inside nav item
- `.main-wrapper` — Right side content wrapper
- `.header` — Top header bar, glassmorphism
- `.header-search` — Search input in header
- `.header-actions` — Right side of header (notifs, coins, avatar)
- `#main-content` — Page content container
- `.mobile-nav` — Bottom nav bar for mobile
- `.mobile-nav-item` — Bottom nav item

**Page Structure:**
- `.page` — Wrapper for each page's content
- `.page-header` — Page title area with optional actions
- `.page-title` — h1 page title
- `.page-subtitle` — Subtitle/description
- `.page-actions` — Action buttons in page header
- `.page-content` — Scrollable page body

**Cards:**
- `.card` — Glassmorphism card container
- `.card-sm` — Smaller padding card
- `.card-lg` — Larger card
- `.card-header` — Card header with title
- `.card-body` — Card body
- `.card-footer` — Card footer
- `.card-highlight` — Card with accent border glow
- `.card-interactive` — Adds hover effect and cursor pointer

**Buttons:**
- `.btn` — Base button (transparent)
- `.btn-primary` — Indigo filled button
- `.btn-secondary` — Subtle background button
- `.btn-ghost` — Transparent with border
- `.btn-danger` — Red button
- `.btn-sm` — Small button
- `.btn-lg` — Large button
- `.btn-icon` — Icon-only circular button

**Inputs:**
- `.input` — Text input field
- `.input-group` — Input with icon/button
- `.textarea` — Textarea
- `.select` — Select dropdown
- `.search-input` — Search field with icon

**Badges:**
- `.badge` — Default badge
- `.badge-primary` — Indigo badge
- `.badge-success` — Green badge
- `.badge-warning` — Yellow badge
- `.badge-danger` — Red badge
- `.badge-coin` — Gold coin badge (shows HC amount)

**Avatar:**
- `.avatar` — 40px emoji avatar with gradient bg
- `.avatar-sm` — 32px
- `.avatar-lg` — 48px
- `.avatar-xl` — 64px
- `.avatar-2xl` — 96px (for profile pages)
- `.avatar-ring` — Adds accent ring

**Tags/Chips:**
- `.chip` — Filter/tag chip
- `.chip-active` — Active chip state
- `.chip-group` — Flex container for chips

**Stats:**
- `.stat-card` — Card for displaying a stat
- `.stat-value` — Large number
- `.stat-label` — Description text
- `.stat-icon` — Icon for stat
- `.stat-trend` — Trend indicator

**Lists:**
- `.list` — List container
- `.list-item` — List row with padding and border
- `.list-item:hover` — Subtle highlight

**Tabs:**
- `.tabs` — Tab container
- `.tab` — Individual tab
- `.tab-active` — Active tab

**Progress:**
- `.progress` — Progress bar track
- `.progress-bar` — Filled portion (set width via style)
- `.progress-bar-accent` — Indigo fill
- `.progress-bar-coin` — Gold fill
- `.progress-bar-success` — Green fill

**Grid:**
- `.grid` — CSS Grid container
- `.grid-2` — 2 columns (1 on mobile)
- `.grid-3` — 3 columns (2 on tablet, 1 on mobile)
- `.grid-4` — 4 columns (2 on tablet, 1 on mobile)

**Flex:**
- `.flex` — Flex row
- `.flex-col` — Flex column
- `.flex-wrap` — Flex wrap
- `.flex-between` — space-between
- `.flex-center` — center both axes
- `.flex-end` — justify-end
- `.items-center` — align-items center
- `.items-start` — align-items start
- `.gap-xs` `.gap-sm` `.gap-md` `.gap-lg` `.gap-xl`

**Text:**
- `.text-xs` `.text-sm` `.text-md` `.text-lg` `.text-xl` `.text-2xl` `.text-3xl`
- `.text-bold` `.text-medium` `.text-light`
- `.text-accent` `.text-muted` `.text-success` `.text-warning` `.text-danger`
- `.text-coin` — Gold color for HC amounts
- `.text-center` `.text-right`
- `.truncate` — Ellipsis overflow

**Animation:**
- `.fade-in` — Fade in from opacity 0
- `.slide-up` — Slide up + fade
- `.slide-in-right` — Slide from right
- `.scale-in` — Scale from 0.95
- `.stagger-1` thru `.stagger-6` — Animation delay multipliers

**Utility:**
- `.glass` — Glassmorphism (backdrop blur, semi-transparent bg, subtle border)
- `.glow` — Box shadow glow with accent
- `.scrollbar-thin` — Custom thin scrollbar
- `.hidden` — display none
- `.mt-sm` `.mt-md` `.mt-lg` `.mb-sm` `.mb-md` `.mb-lg` — Margin top/bottom
- `.p-sm` `.p-md` `.p-lg` — Padding
- `.w-full` — width 100%
- `.rounded` — border-radius md
- `.rounded-full` — border-radius full
- `.overflow-auto` — overflow auto
- `.relative` `.absolute` — positioning
- `.cursor-pointer`
- `.no-select` — user-select none
- `.divider` — horizontal line divider

**Modal:**
- `.modal-overlay` — Full screen backdrop
- `.modal` — Modal container
- `.modal-header` — Modal title bar
- `.modal-body` — Modal content
- `.modal-footer` — Modal action buttons
- `.modal-open` — Added to body to prevent scroll

**Toast:**
- `.toast-container` — Fixed position container
- `.toast` — Individual toast notification
- `.toast-success` `.toast-warning` `.toast-danger` `.toast-info`

**Misc:**
- `.empty-state` — Centered empty state with icon + message
- `.section-title` — Section heading inside page
- `.coin-display` — Inline coin amount with icon (⭐ 1,250 HC)
- `.notification-dot` — Small red dot indicator
- `.online-dot` — Small green dot for online status

## Store Data Model (js/store.js)

### Current User
```js
{
  id: 'u1',
  name: 'Aaron S.',
  username: 'aarons',
  avatar: '🎓',
  avatarBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  bio: 'Class representative | Notes enthusiast',
  role: 'admin',
  coins: 1250,
  xp: 3400,
  level: 'Note Master',
  joinedAt: '2026-01-15',
  streak: 12,
  achievements: ['first_note', 'chat_starter', 'task_master', '10_notes', 'week_streak'],
  stats: {
    notesShared: 24,
    tasksCompleted: 18,
    messagesCount: 156,
    coinsEarned: 2800,
    coinsSpent: 1550
  },
  settings: {
    darkMode: true,
    notifications: true,
    soundEffects: true
  }
}
```

### Users (12-15 classmates with varied data)
Each user:
```js
{
  id: 'u2', name: 'Priya M.', username: 'priyam', avatar: '👩‍💻',
  avatarBg: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  bio: 'Math nerd 🧮', role: 'member',
  coins: 980, xp: 2800, level: 'Study Buddy',
  online: true,
  stats: { notesShared: 18, tasksCompleted: 12, messagesCount: 203 }
}
```

### Notes
```js
{
  id: 'n1',
  title: 'Physics Ch.5 - Wave Optics',
  subject: 'Physics',
  content: 'Comprehensive notes covering interference, diffraction, and polarization...',
  author: 'u1', // user id
  createdAt: '2026-07-25T10:30:00',
  likes: 8,
  downloads: 15,
  tags: ['physics', 'optics', 'waves'],
  fileType: 'pdf', // pdf, doc, image, text
  pages: 12
}
```

Subjects: Physics, Chemistry, Mathematics, Biology, English, Computer Science, History, Economics

### Conversations
```js
{
  id: 'c1',
  type: 'dm', // dm or group
  name: null, // null for DMs, string for groups
  participants: ['u1', 'u2'],
  messages: [
    { id: 'm1', sender: 'u2', text: 'Hey, did you finish the physics notes?', timestamp: '2026-07-28T09:15:00', read: true },
    { id: 'm2', sender: 'u1', text: 'Yeah! Just uploaded them 📚', timestamp: '2026-07-28T09:16:00', read: true }
  ],
  lastActivity: '2026-07-28T09:16:00',
  unread: 0
}
```
Also include a "Class Group" (type: 'group') with all participants.

### Tasks
```js
{
  id: 't1',
  title: 'Share notes for Chapter 6',
  description: 'Upload your notes for the latest chapter',
  reward: 50, // HC
  xpReward: 100,
  difficulty: 'easy', // easy, medium, hard
  category: 'notes', // notes, social, study, community
  deadline: '2026-08-01',
  completedBy: ['u2', 'u5'], // user ids who completed
  maxCompletions: null, // null = unlimited
  createdBy: 'system' // or a user id
}
```

### Announcements
```js
{
  id: 'a1',
  title: 'Welcome to Homeroom! 🎉',
  content: 'Hey everyone! This is our class digital home...',
  author: 'u1',
  createdAt: '2026-07-20T08:00:00',
  pinned: true,
  reactions: { '🎉': 12, '❤️': 8, '👍': 15 }
}
```

### Transactions
```js
{
  id: 'tx1',
  type: 'earned', // earned or spent
  amount: 50,
  description: 'Completed: Share notes for Chapter 6',
  category: 'task', // task, note, achievement, transfer, shop
  timestamp: '2026-07-27T14:20:00'
}
```

### Achievement Definitions
```js
{
  id: 'first_note',
  title: 'First Note! 📝',
  description: 'Share your first note with the class',
  icon: '📝',
  xpReward: 100,
  coinReward: 25,
  rarity: 'common' // common, uncommon, rare, epic, legendary
}
```

### Store Methods (exported on Homeroom.store)
```js
Homeroom.store = {
  // Data
  currentUser, users, notes, conversations, tasks, announcements, transactions, achievements,
  
  // Getters
  getUserById(id),
  getNotesBySubject(subject),
  getConversation(id),
  getTasksByCategory(category),
  getLeaderboard(), // returns users sorted by XP
  getUserLevel(xp), // returns level title
  getUserProgress(xp), // returns {current, next, percent}
  getUnreadCount(), // total unread messages
  
  // Actions
  addCoins(amount, description, category),
  spendCoins(amount, description, category),
  completeTask(taskId),
  addNote(noteData),
  likeNote(noteId),
  sendMessage(conversationId, text),
  toggleAchievement(achievementId),
  
  // Events
  on(event, callback),
  off(event, callback),
  emit(event, data),
  
  // Persistence
  save(),
  load()
};
```

Events emitted: `coinsChanged`, `xpChanged`, `taskCompleted`, `noteAdded`, `messageSent`, `stateChanged`

### Level Thresholds
```js
const LEVELS = [
  { title: 'New Student', icon: '🌱', minXP: 0 },
  { title: 'Active Member', icon: '⚡', minXP: 500 },
  { title: 'Study Buddy', icon: '📖', minXP: 1500 },
  { title: 'Note Master', icon: '📝', minXP: 3000 },
  { title: 'Class Helper', icon: '🤝', minXP: 5000 },
  { title: 'Top Contributor', icon: '🌟', minXP: 8000 },
  { title: 'Knowledge Keeper', icon: '🧠', minXP: 12000 },
  { title: 'Homeroom Legend', icon: '👑', minXP: 18000 }
];
```

## Page Specifications

### 🏠 Home Page
Dashboard view showing:
- Welcome greeting with user name + level
- Announcement cards (pinned first)
- Quick stats row (4 stat cards: Notes Shared, Tasks Done, HC Balance, Current Streak)
- Recent activity feed (latest notes, messages, task completions)
- Quick action buttons (New Note, New Task, View Chats)

### 📚 Notes Page
- Subject filter chips at top (All, Physics, Chemistry, Math, etc.)
- Grid of note cards (showing title, subject badge, author avatar+name, likes, downloads, date)
- Search functionality
- "Upload Note" button → opens a modal form (title, subject select, content textarea, tags)
- Sort options (Newest, Most Liked, Most Downloaded)

### 💬 Chats Page
- Two-panel layout (conversation list | chat view)
- Left: List of conversations (avatar, name, last message preview, time, unread badge)
- Right: Chat view with message bubbles (own messages right-aligned, others left)
- Message input with send button
- Group chats and DMs
- On mobile: single panel, tap to open chat

### 👥 Community Page
- Class member grid (cards with avatar, name, level badge, role, online indicator)
- Search/filter members
- View member profile on click (mini profile popup/card)
- Class stats summary at top (total members, notes shared, tasks completed)

### 📋 Tasks Page
- Category filter chips (All, Notes, Social, Study, Community)
- Task cards showing: title, description, reward (HC + XP), difficulty badge, deadline, progress
- "Complete Task" button on each eligible task
- Completed tasks section with ✅ indicator
- "Create Task" button for admins

### 🏆 Leaderboard Page
- Top 3 highlighted (gold/silver/bronze with larger cards)
- Full ranking table (rank, avatar, name, XP, level, coins, notes count)
- Time period tabs (All Time, This Month, This Week)
- Current user's rank highlighted
- Achievement showcase section

### 💰 Wallet Page
- Large balance display with coin animation (⭐ 1,250 HC)
- Quick stats (Total Earned, Total Spent, Rank by Wealth)
- Transaction history list (earn/spend with icons, descriptions, amounts, dates)
- Filter by type (All, Earned, Spent)
- "Transfer Coins" feature (send HC to classmate)
- Shop section placeholder (things to spend coins on)

### 👤 Profile Page
- Large profile card (avatar, name, username, bio, level with XP progress bar)
- Stats grid (Notes, Tasks, Messages, Coins, Streak)
- Achievement badges showcase (unlocked with glow, locked grayed out)
- Recent activity timeline
- Edit Profile button → modal/inline edit

### ⚙️ Settings Page
- Toggle switches for: Dark Mode, Notifications, Sound Effects
- Profile section (change name, bio, avatar)
- Account section
- About section (app version, credits)
- Clean, organized card sections

## Responsive Breakpoints
- Desktop: > 1024px — Full sidebar + content
- Tablet: 768px-1024px — Collapsed sidebar (icons only)  
- Mobile: < 768px — No sidebar, bottom tab navigation (Home, Notes, Chats, Tasks, Profile + more menu)

## Fonts
Google Fonts: `Inter` (weights: 300, 400, 500, 600, 700)

## Animations
- Page transitions: fade-in (0.3s)
- Card hover: translateY(-2px) + shadow increase
- Button hover: brightness increase + subtle scale
- Coin earn: scale bounce + glow pulse
- Toast notifications: slide in from right
- Modal: fade overlay + scale-in content
- Sidebar nav item: left border slide in on active
- Number counters: count-up animation for stats

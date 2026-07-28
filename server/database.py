import sqlite3
import json
import os
from flask import g, current_app

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

SCHEMA = """
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

CREATE TABLE IF NOT EXISTS note_comments (
    id TEXT PRIMARY KEY,
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS note_ratings (
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    PRIMARY KEY (note_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'dm',
    name TEXT,
    icon TEXT DEFAULT '💬',
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (conversation_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS task_submissions (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    proof TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    submitted_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT REFERENCES users(id),
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS question_votes (
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    PRIMARY KEY (question_id, user_id)
);

CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    answered_by TEXT REFERENCES users(id),
    is_best INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS answer_votes (
    answer_id TEXT REFERENCES answers(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    PRIMARY KEY (answer_id, user_id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marketplace_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    icon TEXT DEFAULT '🎁',
    item_data TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    item_id TEXT REFERENCES marketplace_items(id),
    purchased_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_spins (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    reward_type TEXT,
    reward_value TEXT DEFAULT '',
    reward_amount INTEGER DEFAULT 0,
    spun_at TEXT DEFAULT (datetime('now'))
);
"""


def get_db():
    """Get database connection (stored in flask.g)."""
    if 'db' not in g:
        db_path = current_app.config.get('DB_PATH', 'homeroom.db')
        g.db = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


def close_db(e=None):
    """Close database connection."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def seed_marketplace(db):
    """Insert marketplace items if table is empty."""
    count = db.execute("SELECT COUNT(*) as c FROM marketplace_items").fetchone()['c']
    if count == 0:
        for item in MARKETPLACE_ITEMS:
            db.execute(
                "INSERT INTO marketplace_items (id, name, description, category, price, icon) VALUES (?, ?, ?, ?, ?, ?)",
                (item['id'], item['name'], item['desc'], item['category'], item['price'], item['icon'])
            )
        db.commit()
        print(f"  Seeded {len(MARKETPLACE_ITEMS)} marketplace items")


def init_db(app):
    """Initialize the database with schema and seed data."""
    with app.app_context():
        db = get_db()
        db.executescript(SCHEMA)
        db.commit()
        seed_marketplace(db)
        print("  Database initialized")
    app.teardown_appcontext(close_db)

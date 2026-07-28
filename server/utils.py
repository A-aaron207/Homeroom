import uuid
import json

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

SPIN_REWARDS = [
    {"type": "coins", "amount": 5, "label": "5 CC", "weight": 30},
    {"type": "coins", "amount": 10, "label": "10 CC", "weight": 25},
    {"type": "coins", "amount": 20, "label": "20 CC", "weight": 15},
    {"type": "coins", "amount": 50, "label": "50 CC", "weight": 5},
    {"type": "xp", "amount": 10, "label": "10 XP", "weight": 20},
    {"type": "xp", "amount": 25, "label": "25 XP", "weight": 10},
    {"type": "nothing", "amount": 0, "label": "Try Again!", "weight": 15},
]


def get_user_level(xp):
    """Returns the level dict for a given XP amount."""
    current = LEVELS[0]
    for lvl in LEVELS:
        if xp >= lvl["min_xp"]:
            current = lvl
        else:
            break
    return current


def get_user_progress(xp):
    """Returns progress info: current level, next level, percent, xp_to_next."""
    current_level = get_user_level(xp)
    next_level = None
    for lvl in LEVELS:
        if lvl["level"] > current_level["level"]:
            next_level = lvl
            break

    if not next_level:
        return {
            "current_level": current_level,
            "next_level": current_level,
            "percent": 100,
            "xp_to_next": 0
        }

    xp_in_level = xp - current_level["min_xp"]
    level_xp_range = next_level["min_xp"] - current_level["min_xp"]
    percent = (xp_in_level / level_xp_range) * 100
    xp_to_next = next_level["min_xp"] - xp

    return {
        "current_level": current_level,
        "next_level": next_level,
        "percent": min(100, max(0, percent)),
        "xp_to_next": xp_to_next
    }


def generate_id():
    """Generate a unique ID."""
    return uuid.uuid4().hex


def award_xp(db, user_id, amount):
    """Add XP to user and check achievements."""
    if amount <= 0:
        return 0
    db.execute('UPDATE users SET xp = xp + ? WHERE id = ?', (amount, user_id))
    db.commit()
    check_achievements(db, user_id)
    return amount


def award_coins(db, user_id, amount, description, category='reward'):
    """Add/deduct coins and create a transaction record."""
    if amount == 0:
        return 0
    db.execute('UPDATE users SET coins = coins + ? WHERE id = ?', (amount, user_id))
    tx_id = generate_id()
    if amount > 0:
        db.execute(
            'INSERT INTO transactions (id, user_id, type, amount, description, category) VALUES (?, ?, ?, ?, ?, ?)',
            (tx_id, user_id, 'earned', amount, description, category)
        )
    else:
        db.execute(
            'INSERT INTO transactions (id, user_id, type, amount, description, category) VALUES (?, ?, ?, ?, ?, ?)',
            (tx_id, user_id, 'spent', abs(amount), description, category)
        )
    db.commit()
    check_achievements(db, user_id)
    return amount


def check_achievements(db, user_id):
    """Check all achievement conditions and award new ones."""
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        return

    try:
        user_achievements = json.loads(user['achievements'])
    except (json.JSONDecodeError, TypeError):
        user_achievements = []

    new_achievements = []

    # First Upload
    if "first_upload" not in user_achievements:
        count = db.execute('SELECT COUNT(*) as c FROM notes WHERE uploaded_by = ?', (user_id,)).fetchone()['c']
        if count >= 1:
            new_achievements.append("first_upload")

    # Knowledge Master
    if "knowledge_master" not in user_achievements:
        count = db.execute('SELECT COUNT(*) as c FROM notes WHERE uploaded_by = ?', (user_id,)).fetchone()['c']
        if count >= 50:
            new_achievements.append("knowledge_master")

    # 100 Downloads
    if "100_downloads" not in user_achievements:
        result = db.execute('SELECT COALESCE(SUM(download_count), 0) as s FROM notes WHERE uploaded_by = ?', (user_id,)).fetchone()
        if result['s'] >= 100:
            new_achievements.append("100_downloads")

    # Helpful Person
    if "helpful_person" not in user_achievements:
        count = db.execute('SELECT COUNT(*) as c FROM answers WHERE answered_by = ?', (user_id,)).fetchone()['c']
        if count >= 25:
            new_achievements.append("helpful_person")

    # 7 Day Streak
    if "7_day_streak" not in user_achievements:
        if user['streak_longest'] >= 7:
            new_achievements.append("7_day_streak")

    # 30 Day Streak
    if "30_day_streak" not in user_achievements:
        if user['streak_longest'] >= 30:
            new_achievements.append("30_day_streak")

    # Rich Student
    if "rich_student" not in user_achievements:
        if user['coins'] >= 1000:
            new_achievements.append("rich_student")

    # Social Butterfly
    if "social_butterfly" not in user_achievements:
        count = db.execute('SELECT COUNT(*) as c FROM messages WHERE sender_id = ?', (user_id,)).fetchone()['c']
        if count >= 100:
            new_achievements.append("social_butterfly")

    # First Purchase
    if "first_purchase" not in user_achievements:
        count = db.execute('SELECT COUNT(*) as c FROM purchases WHERE user_id = ?', (user_id,)).fetchone()['c']
        if count >= 1:
            new_achievements.append("first_purchase")

    # Best Answer
    if "best_answer" not in user_achievements:
        count = db.execute('SELECT COUNT(*) as c FROM answers WHERE answered_by = ? AND is_best = 1', (user_id,)).fetchone()['c']
        if count >= 1:
            new_achievements.append("best_answer")

    if new_achievements:
        user_achievements.extend(new_achievements)
        db.execute('UPDATE users SET achievements = ? WHERE id = ?', (json.dumps(user_achievements), user_id))
        db.commit()


def format_user(row):
    """Convert a sqlite Row to a safe dict (no sensitive fields)."""
    d = dict(row)
    d.pop('password_hash', None)
    d.pop('approval_token', None)

    try:
        d['purchased_items'] = json.loads(d.get('purchased_items', '[]'))
    except (json.JSONDecodeError, TypeError):
        d['purchased_items'] = []

    try:
        d['achievements'] = json.loads(d.get('achievements', '[]'))
    except (json.JSONDecodeError, TypeError):
        d['achievements'] = []

    d['level_info'] = get_user_progress(d.get('xp', 0))
    return d

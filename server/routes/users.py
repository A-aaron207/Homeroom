from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
from server.utils import LEVELS
import json

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('/', methods=['GET'])
@auth_required
def get_users():
    db = get_db()
    users = db.execute('SELECT id, username, display_name, avatar_emoji, avatar_bg, role, xp, reputation, profile_frame, username_color FROM users WHERE status = ?', ('approved',)).fetchall()
    
    users_list = []
    for u in users:
        u_dict = dict(u)
        user_level = 1
        for lvl in LEVELS:
            if u['xp'] >= lvl['min_xp']:
                user_level = lvl['level']
        u_dict['level'] = user_level
        users_list.append(u_dict)
        
    return jsonify({'success': True, 'data': users_list})

@bp.route('/<id>', methods=['GET'])
@auth_required
def get_user_profile(id):
    if id == 'me':
        id = g.user['id']
        
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (id,)).fetchone()
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    from server.utils import format_user
    user_dict = format_user(user)
    
    # Stats
    note_count = db.execute('SELECT COUNT(*) FROM notes WHERE uploaded_by = ?', (id,)).fetchone()[0]
    task_count = db.execute('SELECT COUNT(*) FROM task_submissions WHERE user_id = ? AND status = "approved"', (id,)).fetchone()[0]
    message_count = db.execute('SELECT COUNT(*) FROM messages WHERE sender_id = ?', (id,)).fetchone()[0]
    answer_count = db.execute('SELECT COUNT(*) FROM answers WHERE answered_by = ?', (id,)).fetchone()[0]
    question_count = db.execute('SELECT COUNT(*) FROM questions WHERE asked_by = ?', (id,)).fetchone()[0]
    
    user_dict['stats'] = {
        'notes': note_count,
        'tasks': task_count,
        'messages': message_count,
        'answers': answer_count,
        'questions': question_count
    }
    
    # Return both top-level fields and user wrapper for 100% compatibility
    return jsonify({'success': True, 'data': {**user_dict, 'user': user_dict}})

@bp.route('/me', methods=['PUT'])
@auth_required
def update_profile():
    data = request.json or {}
    db = get_db()
    
    mapping = {
        'displayName': 'display_name',
        'display_name': 'display_name',
        'bio': 'bio',
        'avatarEmoji': 'avatar_emoji',
        'avatar_emoji': 'avatar_emoji',
        'avatarBg': 'avatar_bg',
        'avatar_bg': 'avatar_bg',
        'theme': 'theme',
        'rollNumber': 'roll_number',
        'roll_number': 'roll_number'
    }
    
    updates = []
    values = []
    seen_db_fields = set()
    
    for key, value in data.items():
        if key in mapping and mapping[key] not in seen_db_fields:
            db_field = mapping[key]
            updates.append(f'{db_field} = ?')
            values.append(value)
            seen_db_fields.add(db_field)
            
    if not updates:
        return jsonify({'success': False, 'message': 'No valid fields to update'}), 400
        
    values.append(g.user['id'])
    
    db.execute(f'''
        UPDATE users
        SET {", ".join(updates)}
        WHERE id = ?
    ''', values)
    db.commit()
    
    updated_user = db.execute('SELECT * FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    
    from server.utils import format_user
    return jsonify({'success': True, 'message': 'Profile updated', 'data': {'user': format_user(updated_user)}})


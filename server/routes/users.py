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
    db = get_db()
    user = db.execute('SELECT id, username, display_name, bio, avatar_emoji, avatar_bg, role, xp, coins, reputation, streak_current, streak_longest, join_date, purchased_items, achievements, profile_frame, username_color FROM users WHERE id = ?', (id,)).fetchone()
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    user_dict = dict(user)
    try:
        user_dict['purchased_items'] = json.loads(user_dict['purchased_items'])
    except:
        user_dict['purchased_items'] = []
        
    try:
        user_dict['achievements'] = json.loads(user_dict['achievements'])
    except:
        user_dict['achievements'] = []
        
    user_level = 1
    for lvl in LEVELS:
        if user['xp'] >= lvl['min_xp']:
            user_level = lvl['level']
    user_dict['level'] = user_level
    
    # Stats
    note_count = db.execute('SELECT COUNT(*) FROM notes WHERE uploaded_by = ?', (id,)).fetchone()[0]
    task_count = db.execute('SELECT COUNT(*) FROM task_submissions WHERE user_id = ? AND status = "approved"', (id,)).fetchone()[0]
    message_count = db.execute('SELECT COUNT(*) FROM messages WHERE sender_id = ?', (id,)).fetchone()[0]
    
    user_dict['stats'] = {
        'notes': note_count,
        'tasks': task_count,
        'messages': message_count
    }
    
    return jsonify({'success': True, 'data': user_dict})

@bp.route('/me', methods=['PUT'])
@auth_required
def update_profile():
    data = request.json
    db = get_db()
    
    updatable_fields = ['displayName', 'bio', 'avatarEmoji', 'avatarBg', 'theme']
    db_fields = ['display_name', 'bio', 'avatar_emoji', 'avatar_bg', 'theme']
    
    updates = []
    values = []
    for i, field in enumerate(updatable_fields):
        if field in data:
            updates.append(f'{db_fields[i]} = ?')
            values.append(data[field])
            
    if not updates:
        return jsonify({'success': False, 'message': 'No valid fields to update'}), 400
        
    values.append(g.user['id'])
    
    db.execute(f'''
        UPDATE users
        SET {", ".join(updates)}
        WHERE id = ?
    ''', values)
    db.commit()
    
    return jsonify({'success': True, 'message': 'Profile updated'})

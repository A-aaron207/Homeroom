from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required, admin_required
import uuid

bp = Blueprint('admin', __name__, url_prefix='/api')

@bp.route('/announcements', methods=['POST'])
@admin_required
def create_announcement():
    data = request.json
    if not data.get('title') or not data.get('content'):
        return jsonify({'success': False, 'message': 'Title and content required'}), 400
        
    a_id = str(uuid.uuid4())
    pinned = 1 if data.get('pinned') else 0
    
    db = get_db()
    db.execute('INSERT INTO announcements (id, title, content, created_by, pinned) VALUES (?, ?, ?, ?, ?)',
               (a_id, data['title'], data['content'], g.user['id'], pinned))
    db.commit()
    
    return jsonify({'success': True, 'data': {'id': a_id}})

@bp.route('/announcements', methods=['GET'])
@auth_required
def get_announcements():
    db = get_db()
    announcements = db.execute('''
        SELECT a.*, u.username, u.display_name, u.avatar_emoji, u.username_color 
        FROM announcements a
        JOIN users u ON a.created_by = u.id
        ORDER BY a.pinned DESC, a.created_at DESC
    ''').fetchall()
    
    result = []
    for a in announcements:
        a_dict = dict(a)
        a_dict['author'] = {
            'id': a['created_by'],
            'username': a['username'],
            'display_name': a['display_name'],
            'avatar_emoji': a['avatar_emoji'],
            'username_color': a['username_color']
        }
        result.append(a_dict)
        
    return jsonify({'success': True, 'data': result})

@bp.route('/announcements/<id>', methods=['DELETE'])
@admin_required
def delete_announcement(id):
    db = get_db()
    db.execute('DELETE FROM announcements WHERE id = ?', (id,))
    db.commit()
    return jsonify({'success': True, 'message': 'Announcement deleted'})

@bp.route('/admin/pending', methods=['GET'])
@admin_required
def get_pending_users():
    db = get_db()
    users = db.execute('SELECT id, username, display_name, email, roll_number, bio, approval_token, created_at FROM users WHERE status = ?', ('pending',)).fetchall()
    return jsonify({'success': True, 'data': [dict(u) for u in users]})

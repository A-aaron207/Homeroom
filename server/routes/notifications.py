from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required

bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@bp.route('/', methods=['GET'])
@auth_required
def get_notifications():
    db = get_db()
    notifications = db.execute('''
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC LIMIT 30
    ''', (g.user['id'],)).fetchall()
    
    unread_count = db.execute('''
        SELECT COUNT(*) FROM notifications 
        WHERE user_id = ? AND is_read = 0
    ''', (g.user['id'],)).fetchone()[0]
    
    return jsonify({
        'success': True,
        'data': {
            'notifications': [dict(n) for n in notifications],
            'unread_count': unread_count
        }
    })

@bp.route('/read-all', methods=['POST'])
@auth_required
def mark_all_read():
    db = get_db()
    db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', (g.user['id'],))
    db.commit()
    return jsonify({'success': True, 'message': 'All notifications marked as read'})

@bp.route('/<id>/read', methods=['POST'])
@auth_required
def mark_read(id):
    db = get_db()
    db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', (id, g.user['id']))
    db.commit()
    return jsonify({'success': True, 'message': 'Notification marked as read'})

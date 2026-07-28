from flask import Blueprint, request, jsonify
from server.database import get_db

bp = Blueprint('approve', __name__, url_prefix='/api/approve')

@bp.route('/<token>', methods=['GET'])
def get_pending_user(token):
    db = get_db()
    user = db.execute('SELECT username, display_name, email, roll_number, bio FROM users WHERE approval_token = ? AND status = ?', (token, 'pending')).fetchone()
    if not user:
        return jsonify({'success': False, 'message': 'Invalid or expired token'}), 404
        
    return jsonify({'success': True, 'data': {'user': dict(user)}})

@bp.route('/<token>', methods=['POST'])
def approve_user(token):
    data = request.json
    action = data.get('action')
    
    if action not in ['approve', 'reject']:
        return jsonify({'success': False, 'message': 'Invalid action'}), 400
        
    db = get_db()
    user = db.execute('SELECT id FROM users WHERE approval_token = ? AND status = ?', (token, 'pending')).fetchone()
    
    if not user:
        return jsonify({'success': False, 'message': 'Invalid or expired token'}), 404
        
    if action == 'approve':
        db.execute('UPDATE users SET status = ?, approval_token = NULL WHERE id = ?', ('approved', user['id']))
    else:
        db.execute('DELETE FROM users WHERE id = ?', (user['id'],))
        
    db.commit()
    return jsonify({'success': True, 'message': f'User {action}d'})

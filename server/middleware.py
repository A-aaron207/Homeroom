from functools import wraps
import jwt
from flask import request, jsonify, current_app, g
from server.database import get_db


def auth_required(f):
    """Decorator that requires a valid JWT token."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Missing or invalid Authorization header'}), 401

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload.get('sub')

            db = get_db()
            user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                return jsonify({'success': False, 'message': 'User not found'}), 401

            if dict(user).get('status') == 'rejected':
                return jsonify({'success': False, 'message': 'Account is suspended or rejected'}), 401

            g.user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator that requires admin role."""
    @wraps(f)
    @auth_required
    def decorated_function(*args, **kwargs):
        if g.user['role'] != 'admin':
            return jsonify({'success': False, 'message': 'Admin privileges required'}), 403
        return f(*args, **kwargs)
    return decorated_function

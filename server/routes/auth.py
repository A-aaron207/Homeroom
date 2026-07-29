from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from server.database import get_db
from server.middleware import auth_required, admin_required
from server.utils import generate_id, award_xp, award_coins, format_user, LEVELS, ACHIEVEMENTS, SPIN_REWARDS
import jwt
import datetime
import uuid

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    required_fields = ['username', 'displayName', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'Missing {field}'}), 400
    
    username = data['username'].strip().lower()
    if username.startswith('@'):
        username = username[1:]
        
    db = get_db()
    
    # Check if username exists
    existing = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if existing:
        return jsonify({'success': False, 'message': 'Username is already taken'}), 409

    user_id = str(uuid.uuid4())
    password_hash = generate_password_hash(data['password'])
    approval_token = str(uuid.uuid4())
    
    try:
        db.execute('''
            INSERT INTO users (id, username, display_name, email, password_hash, roll_number, bio, avatar_emoji, status, approval_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            username,
            data['displayName'],
            data.get('email', ''),
            password_hash,
            data.get('rollNumber', ''),
            data.get('bio', ''),
            data.get('avatarEmoji', '🎓'),
            'approved',
            approval_token
        ))
        db.commit()
        
        # Generate JWT token for instant login
        token = jwt.encode({
            'sub': user_id,
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        
        user_row = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        user_dict = format_user(user_row)

        return jsonify({
            'success': True,
            'message': 'Account created successfully!',
            'data': {
                'token': token,
                'user': user_dict
            }
        })
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    identifier = data.get('username') or data.get('email')
    password = data.get('password')
    
    if not identifier or not password:
        return jsonify({'success': False, 'message': 'Missing username or password'}), 400
        
    identifier = identifier.strip().lower()
    if identifier.startswith('@'):
        identifier = identifier[1:]

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ? OR (email != "" AND email = ?)', (identifier, identifier)).fetchone()
    
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
        
    if dict(user).get('status') == 'rejected':
        return jsonify({'success': False, 'message': 'Account is suspended or rejected'}), 403
        
    # Update last login
    db.execute('UPDATE users SET last_login_date = ? WHERE id = ?', (datetime.datetime.utcnow().isoformat(), user['id']))
    db.commit()
    
    # Generate JWT
    token = jwt.encode({
        'sub': user['id'],
        'user_id': user['id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    user_dict = format_user(user)
    
    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user_dict
        }
    })

@bp.route('/me', methods=['GET'])
@auth_required
def me():
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    user_dict = format_user(user)
    return jsonify({'success': True, 'data': {'user': user_dict}})


@bp.route('/refresh', methods=['POST'])
@auth_required
def refresh_token():
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    new_token = jwt.encode({
        'sub': user['id'],
        'user_id': user['id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'success': True,
        'message': 'Token refreshed',
        'data': {
            'token': new_token,
            'user': format_user(user)
        }
    })


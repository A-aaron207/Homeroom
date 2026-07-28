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
    required_fields = ['username', 'displayName', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'message': f'Missing {field}'}), 400
    
    db = get_db()
    
    # Check if username or email exists
    existing = db.execute('SELECT * FROM users WHERE username = ? OR email = ?', (data['username'], data['email'])).fetchone()
    if existing:
        return jsonify({'success': False, 'message': 'Username or email already exists'}), 409

    user_id = str(uuid.uuid4())
    password_hash = generate_password_hash(data['password'])
    approval_token = str(uuid.uuid4())
    
    try:
        db.execute('''
            INSERT INTO users (id, username, display_name, email, password_hash, roll_number, bio, avatar_emoji, status, approval_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            data['username'],
            data['displayName'],
            data['email'],
            password_hash,
            data.get('rollNumber', ''),
            data.get('bio', ''),
            data.get('avatarEmoji', '🎓'),
            'pending',
            approval_token
        ))
        db.commit()
        
        # Here we would send the approval email to admin using current_app.config['ADMIN_EMAIL']
        # from server.email_service import send_approval_email
        # send_approval_email(data['displayName'], approval_token)
        
        return jsonify({'success': True, 'message': 'Account created. Waiting for admin approval.'})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    if 'email' not in data or 'password' not in data:
        return jsonify({'success': False, 'message': 'Missing email or password'}), 400
        
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (data['email'],)).fetchone()
    
    if not user or not check_password_hash(user['password_hash'], data['password']):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
    if user['status'] != 'approved':
        return jsonify({'success': False, 'message': 'Account is not approved yet'}), 403
        
    # Update last login
    db.execute('UPDATE users SET last_login_date = ? WHERE id = ?', (datetime.datetime.utcnow().isoformat(), user['id']))
    db.commit()
    
    # Generate JWT
    token = jwt.encode({
        'user_id': user['id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    user_dict = dict(user)
    del user_dict['password_hash']
    del user_dict['approval_token']
    
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
        
    user_dict = dict(user)
    del user_dict['password_hash']
    del user_dict['approval_token']
    
    # Calculate level
    user_level = 1
    for lvl in LEVELS:
        if user['xp'] >= lvl['min_xp']:
            user_level = lvl['level']
    user_dict['level'] = user_level
    
    return jsonify({'success': True, 'data': {'user': user_dict}})

from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
from server.utils import award_coins, award_xp, SPIN_REWARDS
import datetime
import uuid
import random

bp = Blueprint('daily', __name__, url_prefix='/api/daily')

@bp.route('/checkin', methods=['POST'])
@auth_required
def checkin():
    db = get_db()
    user = db.execute('SELECT streak_current, streak_longest, last_login_date FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    
    today = datetime.datetime.utcnow().date()
    
    if user['last_login_date']:
        last_date = datetime.datetime.fromisoformat(user['last_login_date']).date()
        if last_date == today:
            return jsonify({'success': False, 'message': 'Already checked in today'}), 400
        elif (today - last_date).days == 1:
            streak = user['streak_current'] + 1
        else:
            streak = 1
    else:
        streak = 1
        
    longest = max(streak, user['streak_longest'])
    
    # Award coins (5 base + min(streak-1, 25))
    bonus_coins = 5 + min(streak - 1, 25)
    
    db.execute('''
        UPDATE users 
        SET streak_current = ?, streak_longest = ?, last_login_date = ? 
        WHERE id = ?
    ''', (streak, longest, datetime.datetime.utcnow().isoformat(), g.user['id']))
    
    award_coins(db, g.user['id'], bonus_coins, f"Daily check-in (streak: {streak})")
    award_xp(db, g.user['id'], 2)
    
    db.commit()
    
    return jsonify({'success': True, 'message': f'Checked in! Streak: {streak}'})

@bp.route('/spin', methods=['POST'])
@auth_required
def spin():
    db = get_db()
    user = db.execute('SELECT last_spin_date FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    
    today = datetime.datetime.utcnow().date()
    
    if user['last_spin_date']:
        last_spin = datetime.datetime.fromisoformat(user['last_spin_date']).date()
        if last_spin == today:
            return jsonify({'success': False, 'message': 'Already spun today'}), 400
            
    # Weighted random
    total_weight = sum(item['weight'] for item in SPIN_REWARDS)
    r = random.uniform(0, total_weight)
    
    upto = 0
    reward = SPIN_REWARDS[-1]
    for item in SPIN_REWARDS:
        if upto + item['weight'] >= r:
            reward = item
            break
        upto += item['weight']
        
    if reward['type'] == 'coins':
        award_coins(db, g.user['id'], reward['amount'], 'Daily spin')
    elif reward['type'] == 'xp':
        award_xp(db, g.user['id'], reward['amount'])
        
    db.execute('UPDATE users SET last_spin_date = ? WHERE id = ?', (datetime.datetime.utcnow().isoformat(), g.user['id']))
    db.execute('INSERT INTO daily_spins (id, user_id, reward_type, reward_amount) VALUES (?, ?, ?, ?)',
               (str(uuid.uuid4()), g.user['id'], reward['type'], reward['amount']))
               
    db.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'reward_type': reward['type'],
            'reward_amount': reward['amount'],
            'label': reward['label']
        }
    })

@bp.route('/status', methods=['GET'])
@auth_required
def status():
    db = get_db()
    user = db.execute('SELECT streak_current, streak_longest, last_login_date, last_spin_date FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    
    today = datetime.datetime.utcnow().date()
    
    can_checkin = True
    if user['last_login_date']:
        last_date = datetime.datetime.fromisoformat(user['last_login_date']).date()
        if last_date == today:
            can_checkin = False
            
    can_spin = True
    if user['last_spin_date']:
        last_spin = datetime.datetime.fromisoformat(user['last_spin_date']).date()
        if last_spin == today:
            can_spin = False
            
    return jsonify({
        'success': True,
        'data': {
            'canSpin': can_spin,
            'canCheckin': can_checkin,
            'streak': {
                'current': user['streak_current'],
                'longest': user['streak_longest'],
                'lastDate': user['last_login_date']
            },
            'todayCheckedIn': not can_checkin
        }
    })

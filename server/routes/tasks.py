from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required, admin_required
from server.utils import award_coins, award_xp
import uuid
import datetime

bp = Blueprint('tasks', __name__, url_prefix='/api')

@bp.route('/tasks', methods=['GET'])
@auth_required
def list_tasks():
    db = get_db()
    tasks = db.execute('SELECT * FROM tasks WHERE status = "active" ORDER BY created_at DESC').fetchall()
    
    result = []
    for t in tasks:
        t_dict = dict(t)
        # Check submission status for current user
        sub = db.execute('SELECT status FROM task_submissions WHERE task_id = ? AND user_id = ?', (t['id'], g.user['id'])).fetchone()
        t_dict['user_submission_status'] = sub['status'] if sub else None
        result.append(t_dict)
        
    return jsonify({'success': True, 'data': result})

@bp.route('/tasks', methods=['POST'])
@admin_required
def create_task():
    data = request.json
    required = ['title', 'rewardCoins', 'rewardXp']
    for req in required:
        if req not in data:
            return jsonify({'success': False, 'message': f'Missing {req}'}), 400
            
    t_id = str(uuid.uuid4())
    db = get_db()
    db.execute('''
        INSERT INTO tasks (id, title, description, reward_coins, reward_xp, created_by, deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (t_id, data['title'], data.get('description', ''), data['rewardCoins'], data['rewardXp'], g.user['id'], data.get('deadline')))
    db.commit()
    
    return jsonify({'success': True, 'data': {'id': t_id}})

@bp.route('/tasks/<id>/submit', methods=['POST'])
@auth_required
def submit_task(id):
    proof = request.json.get('proof', '')
    
    db = get_db()
    task = db.execute('SELECT * FROM tasks WHERE id = ?', (id,)).fetchone()
    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404
        
    existing = db.execute('SELECT * FROM task_submissions WHERE task_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    if existing:
        return jsonify({'success': False, 'message': 'Already submitted'}), 400
        
    sub_id = str(uuid.uuid4())
    db.execute('INSERT INTO task_submissions (id, task_id, user_id, proof) VALUES (?, ?, ?, ?)', (sub_id, id, g.user['id'], proof))
    db.commit()
    
    return jsonify({'success': True, 'data': {'id': sub_id}})

@bp.route('/tasks/<id>/submissions', methods=['GET'])
@admin_required
def list_submissions(id):
    db = get_db()
    subs = db.execute('''
        SELECT ts.*, u.username, u.display_name, u.avatar_emoji
        FROM task_submissions ts
        JOIN users u ON ts.user_id = u.id
        WHERE ts.task_id = ?
        ORDER BY ts.submitted_at DESC
    ''', (id,)).fetchall()
    
    return jsonify({'success': True, 'data': [dict(s) for s in subs]})

@bp.route('/submissions/<id>/review', methods=['POST'])
@admin_required
def review_submission(id):
    action = request.json.get('action')
    if action not in ['approve', 'reject']:
        return jsonify({'success': False, 'message': 'Invalid action'}), 400
        
    db = get_db()
    sub = db.execute('''
        SELECT ts.*, t.reward_coins, t.reward_xp, t.title 
        FROM task_submissions ts
        JOIN tasks t ON ts.task_id = t.id
        WHERE ts.id = ?
    ''', (id,)).fetchone()
    
    if not sub:
        return jsonify({'success': False, 'message': 'Submission not found'}), 404
        
    if sub['status'] != 'pending':
        return jsonify({'success': False, 'message': 'Already reviewed'}), 400
        
    if action == 'approve':
        db.execute('UPDATE task_submissions SET status = ?, reviewed_at = ? WHERE id = ?', ('approved', datetime.datetime.utcnow().isoformat(), id))
        award_coins(db, sub['user_id'], sub['reward_coins'], f"Task completed: {sub['title']}")
        award_xp(db, sub['user_id'], sub['reward_xp'])
    else:
        db.execute('UPDATE task_submissions SET status = ?, reviewed_at = ? WHERE id = ?', ('rejected', datetime.datetime.utcnow().isoformat(), id))
        
    db.commit()
    return jsonify({'success': True, 'message': f'Submission {action}d'})

from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
import json

bp = Blueprint('search', __name__, url_prefix='/api')

@bp.route('/search', methods=['GET'])
@auth_required
def global_search():
    q = request.args.get('q', '').strip()
    if not q or len(q) < 2:
        return jsonify({'success': True, 'data': {'notes': [], 'questions': [], 'users': []}})
        
    db = get_db()
    like_q = f'%{q}%'
    
    # 1. Search Notes
    notes = db.execute('''
        SELECT n.id, n.title, n.description, n.subject, n.tags, n.download_count, u.display_name as author_name
        FROM notes n
        JOIN users u ON n.uploaded_by = u.id
        WHERE n.title LIKE ? OR n.description LIKE ? OR n.tags LIKE ? OR n.subject LIKE ?
        ORDER BY n.created_at DESC LIMIT 10
    ''', (like_q, like_q, like_q, like_q)).fetchall()
    
    formatted_notes = []
    for n in notes:
        d = dict(n)
        try:
            d['tags'] = json.loads(d['tags']) if isinstance(d['tags'], str) else d['tags']
        except:
            d['tags'] = []
        formatted_notes.append(d)
        
    # 2. Search Questions
    questions = db.execute('''
        SELECT q.id, q.title, q.content, q.subject, q.tags, q.upvotes, q.answer_count, u.display_name as author_name
        FROM questions q
        JOIN users u ON q.asked_by = u.id
        WHERE q.title LIKE ? OR q.content LIKE ? OR q.tags LIKE ? OR q.subject LIKE ?
        ORDER BY q.created_at DESC LIMIT 10
    ''', (like_q, like_q, like_q, like_q)).fetchall()
    
    formatted_questions = []
    for q_item in questions:
        d = dict(q_item)
        try:
            d['tags'] = json.loads(d['tags']) if isinstance(d['tags'], str) else d['tags']
        except:
            d['tags'] = []
        formatted_questions.append(d)
        
    # 3. Search Users
    users = db.execute('''
        SELECT id, username, display_name, avatar_emoji, role, xp, bio, username_color
        FROM users
        WHERE (username LIKE ? OR display_name LIKE ? OR bio LIKE ?) AND status = 'approved'
        ORDER BY xp DESC LIMIT 10
    ''', (like_q, like_q, like_q)).fetchall()
    
    return jsonify({
        'success': True,
        'data': {
            'query': q,
            'notes': formatted_notes,
            'questions': formatted_questions,
            'users': [dict(u) for u in users]
        }
    })

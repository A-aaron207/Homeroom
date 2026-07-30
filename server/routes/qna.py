from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
from server.utils import award_xp, award_coins
import uuid
import json

bp = Blueprint('qna', __name__, url_prefix='/api')

@bp.route('/questions', methods=['GET'])
@auth_required
def list_questions():
    sort = request.args.get('sort', 'newest')
    search = request.args.get('search')
    subject = request.args.get('subject')
    
    db = get_db()
    query = '''
        SELECT q.*, u.username, u.display_name, u.display_name as asked_by_name, u.avatar_emoji, u.username_color,
               (SELECT COUNT(*) FROM answers WHERE question_id = q.id AND is_best = 1) as best_answer_count
        FROM questions q
        LEFT JOIN users u ON q.asked_by = u.id
        WHERE 1=1
    '''
    params = []
    
    if subject and subject.strip():
        query += ' AND q.subject = ?'
        params.append(subject.strip())
        
    if search:
        query += ' AND (q.title LIKE ? OR q.content LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])

    if request.args.get('solved') == '1':
        query += ' AND EXISTS (SELECT 1 FROM answers WHERE question_id = q.id AND is_best = 1)'
        
    if sort == 'popular':
        query += ' ORDER BY q.upvotes DESC, q.created_at DESC'
    elif sort == 'unanswered':
        query += ' AND q.answer_count = 0 ORDER BY q.created_at DESC'
    else:
        query += ' ORDER BY q.created_at DESC'
        
    questions = db.execute(query, params).fetchall()
    
    result = []
    for q in questions:
        q_dict = dict(q)
        try:
            q_dict['tags'] = json.loads(q_dict['tags']) if isinstance(q_dict['tags'], str) else q_dict['tags']
        except:
            q_dict['tags'] = []
            
        q_dict['author'] = {
            'id': q['asked_by'],
            'username': q['username'],
            'display_name': q['display_name'],
            'avatar_emoji': q['avatar_emoji'],
            'username_color': q['username_color']
        }
        result.append(q_dict)
        
    return jsonify({'success': True, 'data': result})

@bp.route('/questions', methods=['POST'])
@auth_required
def ask_question():
    data = request.json or {}
    if not data.get('title') or not data.get('content'):
        return jsonify({'success': False, 'message': 'Title and content required'}), 400
        
    raw_tags = data.get('tags', [])
    if isinstance(raw_tags, str):
        try:
            parsed_tags = json.loads(raw_tags)
        except:
            parsed_tags = [t.strip() for t in raw_tags.split(',') if t.strip()]
    elif isinstance(raw_tags, list):
        parsed_tags = raw_tags
    else:
        parsed_tags = []
        
    tags_json = json.dumps(parsed_tags)

    q_id = str(uuid.uuid4())
    db = get_db()
    db.execute('''
        INSERT INTO questions (id, title, content, tags, subject, asked_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (q_id, data['title'], data['content'], tags_json, data.get('subject', ''), g.user['id']))
    
    from server.utils import create_notification
    create_notification(db, g.user['id'], 'question_asked', 'Question Posted! ❓', f'Your question "{data["title"]}" is live!')
    
    db.commit()
    
    return jsonify({'success': True, 'message': 'Question posted successfully', 'data': {'id': q_id}})

@bp.route('/questions/<id>', methods=['GET'])
@auth_required
def get_question(id):
    db = get_db()
    q = db.execute('''
        SELECT q.*, u.username, u.display_name, u.display_name as asked_by_name, u.avatar_emoji, u.username_color 
        FROM questions q
        JOIN users u ON q.asked_by = u.id
        WHERE q.id = ?
    ''', (id,)).fetchone()
    
    if not q:
        return jsonify({'success': False, 'message': 'Question not found'}), 404
        
    q_dict = dict(q)
    try:
        q_dict['tags'] = json.loads(q_dict['tags']) if isinstance(q_dict['tags'], str) else q_dict['tags']
    except:
        q_dict['tags'] = []
        
    q_dict['author'] = {
        'id': q['asked_by'],
        'username': q['username'],
        'display_name': q['display_name'],
        'avatar_emoji': q['avatar_emoji'],
        'username_color': q['username_color']
    }
    
    # Check user vote
    user_vote = db.execute('SELECT 1 FROM question_votes WHERE question_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    q_dict['user_voted'] = bool(user_vote)
    
    # Get answers
    answers = db.execute('''
        SELECT a.*, u.username, u.display_name, u.display_name as answered_by_name, u.avatar_emoji, u.username_color 
        FROM answers a
        JOIN users u ON a.answered_by = u.id
        WHERE a.question_id = ?
        ORDER BY a.is_best DESC, a.upvotes DESC, a.created_at ASC
    ''', (id,)).fetchall()
    
    ans_list = []
    for a in answers:
        a_dict = dict(a)
        a_dict['author'] = {
            'id': a['answered_by'],
            'username': a['username'],
            'display_name': a['display_name'],
            'avatar_emoji': a['avatar_emoji'],
            'username_color': a['username_color']
        }
        
        user_ans_vote = db.execute('SELECT 1 FROM answer_votes WHERE answer_id = ? AND user_id = ?', (a['id'], g.user['id'])).fetchone()
        a_dict['user_voted'] = bool(user_ans_vote)
        ans_list.append(a_dict)
        
    q_dict['answers'] = ans_list
    return jsonify({'success': True, 'data': q_dict})

@bp.route('/questions/<id>/answer', methods=['POST'])
@auth_required
def answer_question(id):
    content = request.json.get('content')
    if not content:
        return jsonify({'success': False, 'message': 'Content required'}), 400
        
    db = get_db()
    q = db.execute('SELECT id, title, asked_by FROM questions WHERE id = ?', (id,)).fetchone()
    if not q:
        return jsonify({'success': False, 'message': 'Question not found'}), 404
        
    a_id = str(uuid.uuid4())
    db.execute('INSERT INTO answers (id, question_id, content, answered_by) VALUES (?, ?, ?, ?)',
               (a_id, id, content, g.user['id']))
    db.execute('UPDATE questions SET answer_count = answer_count + 1 WHERE id = ?', (id,))
    
    award_coins(db, g.user['id'], 3, 'Answered a question')
    award_xp(db, g.user['id'], 5)
    
    from server.utils import create_notification
    if q['asked_by'] != g.user['id']:
        create_notification(db, q['asked_by'], 'new_answer', 'New Answer! 💬', f'{g.user["display_name"]} answered your question "{q["title"]}"')
    
    db.commit()
    return jsonify({'success': True, 'data': {'id': a_id}, 'message': 'Answer posted'})

@bp.route('/questions/<id>/upvote', methods=['POST'])
@auth_required
def upvote_question(id):
    db = get_db()
    vote = db.execute('SELECT 1 FROM question_votes WHERE question_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    
    if vote:
        db.execute('DELETE FROM question_votes WHERE question_id = ? AND user_id = ?', (id, g.user['id']))
        db.execute('UPDATE questions SET upvotes = upvotes - 1 WHERE id = ?', (id,))
    else:
        db.execute('INSERT INTO question_votes (question_id, user_id) VALUES (?, ?)', (id, g.user['id']))
        db.execute('UPDATE questions SET upvotes = upvotes + 1 WHERE id = ?', (id,))
        
    db.commit()
    return jsonify({'success': True, 'message': 'Vote toggled'})

@bp.route('/answers/<id>/upvote', methods=['POST'])
@auth_required
def upvote_answer(id):
    db = get_db()
    vote = db.execute('SELECT 1 FROM answer_votes WHERE answer_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    
    if vote:
        db.execute('DELETE FROM answer_votes WHERE answer_id = ? AND user_id = ?', (id, g.user['id']))
        db.execute('UPDATE answers SET upvotes = upvotes - 1 WHERE id = ?', (id,))
    else:
        db.execute('INSERT INTO answer_votes (answer_id, user_id) VALUES (?, ?)', (id, g.user['id']))
        db.execute('UPDATE answers SET upvotes = upvotes + 1 WHERE id = ?', (id,))
        
    db.commit()
    return jsonify({'success': True, 'message': 'Vote toggled'})

@bp.route('/answers/<id>/best', methods=['POST'])
@auth_required
def best_answer(id):
    db = get_db()
    ans = db.execute('SELECT question_id, answered_by FROM answers WHERE id = ?', (id,)).fetchone()
    if not ans:
        return jsonify({'success': False, 'message': 'Answer not found'}), 404
        
    q = db.execute('SELECT asked_by, title FROM questions WHERE id = ?', (ans['question_id'],)).fetchone()
    if q['asked_by'] != g.user['id']:
        return jsonify({'success': False, 'message': 'Only question author can mark best answer'}), 403
        
    # Unmark previous
    db.execute('UPDATE answers SET is_best = 0 WHERE question_id = ?', (ans['question_id'],))
    # Mark new
    db.execute('UPDATE answers SET is_best = 1 WHERE id = ?', (id,))
    
    award_coins(db, ans['answered_by'], 15, 'Best answer marked')
    award_xp(db, ans['answered_by'], 20)
    
    from server.utils import create_notification
    create_notification(db, ans['answered_by'], 'best_answer', 'Best Answer! ⭐', f'Your answer for "{q["title"]}" was marked as the Best Answer (+15 CC)!')
    
    db.commit()
    return jsonify({'success': True, 'message': 'Best answer marked'})


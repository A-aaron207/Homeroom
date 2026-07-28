from flask import Blueprint, request, jsonify, g, current_app, send_file
from server.database import get_db
from server.middleware import auth_required
from server.utils import award_xp, award_coins
import uuid
import os
import json
from werkzeug.utils import secure_filename
import datetime

bp = Blueprint('notes', __name__, url_prefix='/api/notes')

@bp.route('/', methods=['GET'])
@auth_required
def list_notes():
    subject = request.args.get('subject')
    sort = request.args.get('sort', 'newest')
    search = request.args.get('search')
    
    db = get_db()
    query = '''
        SELECT n.*, u.username, u.display_name, u.avatar_emoji, u.username_color 
        FROM notes n
        JOIN users u ON n.uploaded_by = u.id
        WHERE 1=1
    '''
    params = []
    
    if subject:
        query += ' AND n.subject = ?'
        params.append(subject)
        
    if search:
        query += ' AND (n.title LIKE ? OR n.description LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
        
    if sort == 'rating':
        query += ' ORDER BY (CAST(n.rating_sum AS FLOAT) / CASE WHEN n.rating_count = 0 THEN 1 ELSE n.rating_count END) DESC, n.created_at DESC'
    elif sort == 'downloads':
        query += ' ORDER BY n.download_count DESC, n.created_at DESC'
    else:
        query += ' ORDER BY n.created_at DESC'
        
    notes = db.execute(query, params).fetchall()
    
    result = []
    for n in notes:
        n_dict = dict(n)
        try:
            n_dict['tags'] = json.loads(n_dict['tags'])
        except:
            n_dict['tags'] = []
        n_dict['author'] = {
            'id': n['uploaded_by'],
            'username': n['username'],
            'display_name': n['display_name'],
            'avatar_emoji': n['avatar_emoji'],
            'username_color': n['username_color']
        }
        del n_dict['username']
        del n_dict['display_name']
        del n_dict['avatar_emoji']
        del n_dict['username_color']
        
        if n_dict['rating_count'] > 0:
            n_dict['average_rating'] = n_dict['rating_sum'] / n_dict['rating_count']
        else:
            n_dict['average_rating'] = 0
            
        result.append(n_dict)
        
    return jsonify({'success': True, 'data': result})

@bp.route('/', methods=['POST'])
@auth_required
def create_note():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400
        
    title = request.form.get('title')
    subject = request.form.get('subject')
    description = request.form.get('description', '')
    tags = request.form.get('tags', '[]')
    
    if not title or not subject:
        return jsonify({'success': False, 'message': 'Title and subject required'}), 400
        
    filename = secure_filename(file.filename)
    note_id = str(uuid.uuid4())
    
    upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(filename)[1]
    saved_filename = f"{note_id}{file_ext}"
    file_path = os.path.join(upload_dir, saved_filename)
    
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    
    db = get_db()
    db.execute('''
        INSERT INTO notes (id, title, description, subject, file_path, file_name, file_size, uploaded_by, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (note_id, title, description, subject, saved_filename, filename, file_size, g.user['id'], tags))
    
    # Award CC and XP
    award_coins(db, g.user['id'], 15, 'Uploaded note')
    award_xp(db, g.user['id'], 25)
    
    db.commit()
    
    return jsonify({'success': True, 'data': {'id': note_id}, 'message': 'Note uploaded successfully'})

@bp.route('/<id>', methods=['GET'])
@auth_required
def get_note(id):
    db = get_db()
    note = db.execute('''
        SELECT n.*, u.username, u.display_name, u.avatar_emoji, u.username_color 
        FROM notes n
        JOIN users u ON n.uploaded_by = u.id
        WHERE n.id = ?
    ''', (id,)).fetchone()
    
    if not note:
        return jsonify({'success': False, 'message': 'Note not found'}), 404
        
    n_dict = dict(note)
    try:
        n_dict['tags'] = json.loads(n_dict['tags'])
    except:
        n_dict['tags'] = []
        
    n_dict['author'] = {
        'id': n_dict['uploaded_by'],
        'username': n_dict['username'],
        'display_name': n_dict['display_name'],
        'avatar_emoji': n_dict['avatar_emoji'],
        'username_color': n_dict['username_color']
    }
    
    if n_dict['rating_count'] > 0:
        n_dict['average_rating'] = n_dict['rating_sum'] / n_dict['rating_count']
    else:
        n_dict['average_rating'] = 0
        
    # Get comments
    comments = db.execute('''
        SELECT c.*, u.username, u.display_name, u.avatar_emoji
        FROM note_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.note_id = ?
        ORDER BY c.created_at DESC
    ''', (id,)).fetchall()
    
    n_dict['comments'] = [dict(c) for c in comments]
    
    # Get user rating
    user_rating = db.execute('SELECT rating FROM note_ratings WHERE note_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    n_dict['user_rating'] = user_rating['rating'] if user_rating else None
    
    return jsonify({'success': True, 'data': n_dict})

@bp.route('/<id>/rate', methods=['POST'])
@auth_required
def rate_note(id):
    rating = request.json.get('rating')
    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({'success': False, 'message': 'Invalid rating'}), 400
        
    db = get_db()
    existing = db.execute('SELECT rating FROM note_ratings WHERE note_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    
    if existing:
        old_rating = existing['rating']
        db.execute('UPDATE note_ratings SET rating = ? WHERE note_id = ? AND user_id = ?', (rating, id, g.user['id']))
        db.execute('UPDATE notes SET rating_sum = rating_sum - ? + ? WHERE id = ?', (old_rating, rating, id))
    else:
        db.execute('INSERT INTO note_ratings (note_id, user_id, rating) VALUES (?, ?, ?)', (id, g.user['id'], rating))
        db.execute('UPDATE notes SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?', (rating, id))
        
    db.commit()
    return jsonify({'success': True, 'message': 'Rating saved'})

@bp.route('/<id>/comment', methods=['POST'])
@auth_required
def comment_note(id):
    content = request.json.get('content')
    if not content:
        return jsonify({'success': False, 'message': 'Content required'}), 400
        
    comment_id = str(uuid.uuid4())
    db = get_db()
    db.execute('INSERT INTO note_comments (id, note_id, user_id, content) VALUES (?, ?, ?, ?)', (comment_id, id, g.user['id'], content))
    db.commit()
    
    return jsonify({'success': True, 'data': {'id': comment_id}})

@bp.route('/<id>/download', methods=['GET'])
def download_note(id):
    db = get_db()
    note = db.execute('SELECT * FROM notes WHERE id = ?', (id,)).fetchone()
    if not note:
        return jsonify({'success': False, 'message': 'Note not found'}), 404
        
    upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    file_path = os.path.join(upload_dir, note['file_path'])
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': 'File not found on server'}), 404
        
    db.execute('UPDATE notes SET download_count = download_count + 1 WHERE id = ?', (id,))
    db.commit()
    
    return send_file(file_path, as_attachment=True, download_name=note['file_name'])

@bp.route('/<id>', methods=['DELETE'])
@auth_required
def delete_note(id):
    db = get_db()
    note = db.execute('SELECT * FROM notes WHERE id = ?', (id,)).fetchone()
    if not note:
        return jsonify({'success': False, 'message': 'Note not found'}), 404
        
    if note['uploaded_by'] != g.user['id'] and g.user['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    db.execute('DELETE FROM notes WHERE id = ?', (id,))
    db.commit()
    
    return jsonify({'success': True, 'message': 'Note deleted'})

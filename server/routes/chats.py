from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
import uuid
import json
import datetime

bp = Blueprint('chats', __name__, url_prefix='/api/chats')

@bp.route('/conversations', methods=['GET'])
@auth_required
def get_conversations():
    db = get_db()
    conversations = db.execute('''
        SELECT c.*, 
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM conversations c
        JOIN conversation_members cm ON c.id = cm.conversation_id
        WHERE cm.user_id = ?
        ORDER BY last_message_time DESC NULLS LAST, c.created_at DESC
    ''', (g.user['id'],)).fetchall()
    
    result = []
    for c in conversations:
        c_dict = dict(c)
        
        # Get members
        members = db.execute('''
            SELECT u.id, u.username, u.display_name, u.avatar_emoji, u.username_color 
            FROM conversation_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.conversation_id = ?
        ''', (c['id'],)).fetchall()
        
        c_dict['participants'] = [dict(m) for m in members]
        
        # Determine unread count
        unread = db.execute('''
            SELECT COUNT(*) FROM messages 
            WHERE conversation_id = ? AND sender_id != ? AND read_by NOT LIKE ?
        ''', (c['id'], g.user['id'], f'%"{g.user["id"]}"%')).fetchone()[0]
        
        c_dict['unread_count'] = unread
        result.append(c_dict)
        
    return jsonify({'success': True, 'data': result})

@bp.route('/conversations', methods=['POST'])
@auth_required
def create_conversation():
    data = request.json
    c_type = data.get('type', 'dm')
    name = data.get('name')
    participants = data.get('participants', [])
    icon = data.get('icon', '💬')
    
    if not participants:
        return jsonify({'success': False, 'message': 'Participants required'}), 400
        
    if g.user['id'] not in participants:
        participants.append(g.user['id'])
        
    db = get_db()
    
    # If DM, check if exists
    if c_type == 'dm' and len(participants) == 2:
        existing = db.execute('''
            SELECT c.id FROM conversations c
            JOIN conversation_members cm1 ON c.id = cm1.conversation_id
            JOIN conversation_members cm2 ON c.id = cm2.conversation_id
            WHERE c.type = 'dm' AND cm1.user_id = ? AND cm2.user_id = ?
        ''', (participants[0], participants[1])).fetchone()
        
        if existing:
            return jsonify({'success': True, 'data': {'id': existing['id']}})
            
    c_id = str(uuid.uuid4())
    db.execute('INSERT INTO conversations (id, type, name, icon, created_by) VALUES (?, ?, ?, ?, ?)',
               (c_id, c_type, name, icon, g.user['id']))
               
    for p_id in participants:
        db.execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', (c_id, p_id))
        
    db.commit()
    return jsonify({'success': True, 'data': {'id': c_id}})

@bp.route('/conversations/<id>/messages', methods=['GET'])
@auth_required
def get_messages(id):
    before = request.args.get('before')
    limit = int(request.args.get('limit', 50))
    
    db = get_db()
    
    # Check access
    member = db.execute('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    if not member:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    query = '''
        SELECT m.*, u.username, u.display_name, u.avatar_emoji, u.username_color 
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
    '''
    params = [id]
    
    if before:
        query += ' AND m.created_at < ?'
        params.append(before)
        
    query += ' ORDER BY m.created_at DESC LIMIT ?'
    params.append(limit)
    
    messages = db.execute(query, params).fetchall()
    
    result = []
    for m in messages:
        m_dict = dict(m)
        try:
            m_dict['reactions'] = json.loads(m_dict['reactions'])
        except:
            m_dict['reactions'] = {}
            
        try:
            m_dict['read_by'] = json.loads(m_dict['read_by'])
        except:
            m_dict['read_by'] = []
            
        m_dict['sender'] = {
            'id': m_dict['sender_id'],
            'username': m_dict['username'],
            'display_name': m_dict['display_name'],
            'avatar_emoji': m_dict['avatar_emoji'],
            'username_color': m_dict['username_color']
        }
        del m_dict['username']
        del m_dict['display_name']
        del m_dict['avatar_emoji']
        del m_dict['username_color']
        result.append(m_dict)
        
    result.reverse()
    return jsonify({'success': True, 'data': result})

@bp.route('/conversations/<id>/messages', methods=['POST'])
@auth_required
def send_message(id):
    content = request.json.get('content')
    reply_to = request.json.get('replyTo')
    
    if not content:
        return jsonify({'success': False, 'message': 'Content required'}), 400
        
    db = get_db()
    member = db.execute('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', (id, g.user['id'])).fetchone()
    if not member:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    m_id = str(uuid.uuid4())
    db.execute('INSERT INTO messages (id, conversation_id, sender_id, content, reply_to, read_by) VALUES (?, ?, ?, ?, ?, ?)',
               (m_id, id, g.user['id'], content, reply_to, json.dumps([g.user['id']])))
    db.commit()
    
    return jsonify({'success': True, 'data': {'id': m_id}})

@bp.route('/messages/<id>', methods=['PUT'])
@auth_required
def edit_message(id):
    content = request.json.get('content')
    if not content:
        return jsonify({'success': False, 'message': 'Content required'}), 400
        
    db = get_db()
    msg = db.execute('SELECT sender_id FROM messages WHERE id = ?', (id,)).fetchone()
    if not msg:
        return jsonify({'success': False, 'message': 'Message not found'}), 404
    if msg['sender_id'] != g.user['id']:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    db.execute('UPDATE messages SET content = ?, edited = 1, updated_at = ? WHERE id = ?', (content, datetime.datetime.utcnow().isoformat(), id))
    db.commit()
    return jsonify({'success': True, 'message': 'Message edited'})

@bp.route('/messages/<id>', methods=['DELETE'])
@auth_required
def delete_message(id):
    db = get_db()
    msg = db.execute('SELECT sender_id FROM messages WHERE id = ?', (id,)).fetchone()
    if not msg:
        return jsonify({'success': False, 'message': 'Message not found'}), 404
    if msg['sender_id'] != g.user['id'] and g.user['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    db.execute('UPDATE messages SET content = "This message was deleted", deleted = 1 WHERE id = ?', (id,))
    db.commit()
    return jsonify({'success': True, 'message': 'Message deleted'})

@bp.route('/messages/<id>/react', methods=['POST'])
@auth_required
def react_message(id):
    emoji = request.json.get('emoji')
    if not emoji:
        return jsonify({'success': False, 'message': 'Emoji required'}), 400
        
    db = get_db()
    msg = db.execute('SELECT reactions FROM messages WHERE id = ?', (id,)).fetchone()
    if not msg:
        return jsonify({'success': False, 'message': 'Message not found'}), 404
        
    try:
        reactions = json.loads(msg['reactions'])
    except:
        reactions = {}
        
    if emoji not in reactions:
        reactions[emoji] = []
        
    if g.user['id'] in reactions[emoji]:
        reactions[emoji].remove(g.user['id'])
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        reactions[emoji].append(g.user['id'])
        
    db.execute('UPDATE messages SET reactions = ? WHERE id = ?', (json.dumps(reactions), id))
    db.commit()
    return jsonify({'success': True, 'message': 'Reaction updated'})

@bp.route('/conversations/<id>/read', methods=['POST'])
@auth_required
def read_messages(id):
    db = get_db()
    messages = db.execute('SELECT id, read_by FROM messages WHERE conversation_id = ? AND sender_id != ?', (id, g.user['id'])).fetchall()
    
    for m in messages:
        try:
            read_by = json.loads(m['read_by'])
        except:
            read_by = []
            
        if g.user['id'] not in read_by:
            read_by.append(g.user['id'])
            db.execute('UPDATE messages SET read_by = ? WHERE id = ?', (json.dumps(read_by), m['id']))
            
    db.commit()
    return jsonify({'success': True, 'message': 'Messages read'})

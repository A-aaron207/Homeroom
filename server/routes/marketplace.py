from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
import uuid
import json

bp = Blueprint('marketplace', __name__, url_prefix='/api/marketplace')

@bp.route('/', methods=['GET'])
@auth_required
def get_items():
    db = get_db()
    items = db.execute('SELECT * FROM marketplace_items').fetchall()
    
    purchases = db.execute('SELECT item_id FROM purchases WHERE user_id = ?', (g.user['id'],)).fetchall()
    purchased_ids = [p['item_id'] for p in purchases]
    
    result = []
    for i in items:
        i_dict = dict(i)
        i_dict['purchased'] = i['id'] in purchased_ids
        i_dict['type'] = i_dict.get('category', '')
        try:
            i_dict['item_data'] = json.loads(i_dict.get('item_data', '{}'))
        except:
            i_dict['item_data'] = {}
        result.append(i_dict)
        
    return jsonify({'success': True, 'data': result})

@bp.route('/purchase/<item_id>', methods=['POST'])
@auth_required
def purchase_item(item_id):
    db = get_db()
    item = db.execute('SELECT * FROM marketplace_items WHERE id = ?', (item_id,)).fetchone()
    if not item:
        return jsonify({'success': False, 'message': 'Item not found'}), 404
        
    existing = db.execute('SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?', (g.user['id'], item_id)).fetchone()
    if existing:
        return jsonify({'success': False, 'message': 'Item already purchased'}), 400
        
    user = db.execute('SELECT coins, purchased_items FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    if user['coins'] < item['price']:
        return jsonify({'success': False, 'message': 'Insufficient coins'}), 400
        
    # Deduct coins
    db.execute('UPDATE users SET coins = coins - ? WHERE id = ?', (item['price'], g.user['id']))
    
    # Record transaction
    db.execute('''
        INSERT INTO transactions (id, user_id, type, amount, description, category)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), g.user['id'], 'expense', item['price'], f"Bought {item['name']}", "marketplace"))
    
    # Record purchase
    db.execute('INSERT INTO purchases (id, user_id, item_id) VALUES (?, ?, ?)', (str(uuid.uuid4()), g.user['id'], item_id))
    
    # Update user purchased_items json
    try:
        p_items = json.loads(user['purchased_items'])
    except:
        p_items = []
        
    if item_id not in p_items:
        p_items.append(item_id)
        db.execute('UPDATE users SET purchased_items = ? WHERE id = ?', (json.dumps(p_items), g.user['id']))
        
    db.commit()
    return jsonify({'success': True, 'message': 'Purchase successful'})

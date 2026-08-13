from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
import uuid

bp = Blueprint('wallet', __name__, url_prefix='/api/wallet')

@bp.route('/', methods=['GET'])
@auth_required
def get_wallet():
    db = get_db()
    
    # Balance
    user = db.execute('SELECT coins FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    
    # Transactions
    transactions = db.execute(
        'SELECT id, user_id, type, amount, COALESCE(description, \'\') as description, COALESCE(category, \'\') as category, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
        (g.user['id'],)
    ).fetchall()
    
    total_earned = sum(t['amount'] for t in transactions if t['type'] == 'earned')
    total_spent = sum(t['amount'] for t in transactions if t['type'] in ('spent', 'expense'))
    
    # Wealth rank
    rank = db.execute('SELECT COUNT(*) + 1 FROM users WHERE status = "approved" AND coins > ?', (user['coins'],)).fetchone()[0]
    
    return jsonify({
        'success': True,
        'data': {
            'balance': user['coins'],
            'totalEarned': total_earned,
            'totalSpent': total_spent,
            'rank': rank,
            'transactions': [dict(t) for t in transactions]
        }
    })

@bp.route('/transfer', methods=['POST'])
@auth_required
def transfer():
    data = request.json
    recipient_id = data.get('recipientId')
    amount = data.get('amount')
    reason = data.get('reason', '')
    
    if not recipient_id or not amount or not isinstance(amount, int) or amount <= 0:
        return jsonify({'success': False, 'message': 'Invalid transfer data'}), 400
        
    db = get_db()
    
    # Check balance
    sender = db.execute('SELECT coins, display_name FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    if sender['coins'] < amount:
        return jsonify({'success': False, 'message': 'Insufficient balance'}), 400
        
    recipient = db.execute('SELECT id, display_name FROM users WHERE id = ? AND status = "approved"', (recipient_id,)).fetchone()
    if not recipient:
        return jsonify({'success': False, 'message': 'Recipient not found'}), 404
        
    if recipient['id'] == g.user['id']:
        return jsonify({'success': False, 'message': 'Cannot transfer to yourself'}), 400
        
    # Deduct from sender
    db.execute('UPDATE users SET coins = coins - ? WHERE id = ?', (amount, g.user['id']))
    db.execute('INSERT INTO transactions (id, user_id, type, amount, description, category) VALUES (?, ?, ?, ?, ?, ?)',
               (str(uuid.uuid4()), g.user['id'], 'spent', amount, f"Transfer to {recipient['display_name']}: {reason}", "transfer"))
               
    # Add to recipient
    db.execute('UPDATE users SET coins = coins + ? WHERE id = ?', (amount, recipient['id']))
    db.execute('INSERT INTO transactions (id, user_id, type, amount, description, category) VALUES (?, ?, ?, ?, ?, ?)',
               (str(uuid.uuid4()), recipient['id'], 'earned', amount, f"Transfer from {sender['display_name']}: {reason}", "transfer"))
               
    db.commit()
    
    return jsonify({'success': True, 'message': 'Transfer successful'})

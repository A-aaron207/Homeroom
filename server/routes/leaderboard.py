from flask import Blueprint, request, jsonify, g
from server.database import get_db
from server.middleware import auth_required
from server.utils import LEVELS
import datetime

bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')

@bp.route('/', methods=['GET'])
@auth_required
def leaderboard():
    l_type = request.args.get('type', 'xp')
    period = request.args.get('period', 'all')
    
    db = get_db()
    
    order_col = 'xp'
    if l_type == 'coins':
        order_col = 'coins'
    elif l_type == 'notes':
        order_col = '(SELECT COUNT(*) FROM notes WHERE uploaded_by = users.id)'
    elif l_type == 'downloads':
        order_col = '(SELECT COALESCE(SUM(download_count), 0) FROM notes WHERE uploaded_by = users.id)'
        
    query = f'''
        SELECT id, username, display_name, avatar_emoji, avatar_bg, username_color, profile_frame, xp, coins,
               {order_col} as score
        FROM users
        WHERE status = 'approved'
        ORDER BY score DESC
        LIMIT 50
    '''
    
    users = db.execute(query).fetchall()
    
    result = []
    for i, u in enumerate(users):
        u_dict = dict(u)
        u_dict['rank'] = i + 1
        
        user_level = 1
        for lvl in LEVELS:
            if u['xp'] >= lvl['min_xp']:
                user_level = lvl['level']
        u_dict['level'] = user_level
        
        result.append(u_dict)
        
    return jsonify({'success': True, 'data': result})

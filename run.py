#!/usr/bin/env python3
"""Homeroom — Entry point"""
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server.app import app, socketio

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    print(f"\n🏠 Homeroom is running at http://localhost:{port}\n")
    if socketio:
        socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)
    else:
        app.run(host='0.0.0.0', port=port, debug=debug)

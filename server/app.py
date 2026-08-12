import os
import sys
import json
import importlib
from flask import Flask, send_from_directory, jsonify

socketio = None

def create_app():
    """Create and configure the Flask application with SocketIO support."""
    global socketio

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'public')
    if not os.path.exists(public_dir):
        public_dir = base_dir

    app = Flask(__name__, static_folder=public_dir, static_url_path='')
    app.url_map.strict_slashes = False

    # Default config
    app.config.update(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'homeroom-secret-key-change-in-production'),
        ADMIN_EMAIL=os.environ.get('ADMIN_EMAIL', 'aaronsaha.22@gmail.com'),
        GMAIL_USER=os.environ.get('GMAIL_USER', ''),
        GMAIL_APP_PASSWORD=os.environ.get('GMAIL_APP_PASSWORD', ''),
        SERVER_URL=os.environ.get('SERVER_URL', 'http://localhost:5000'),
        DB_PATH=os.environ.get('DB_PATH', os.path.join(base_dir, 'homeroom.db')),
        UPLOAD_FOLDER=os.path.join(base_dir, 'uploads'),
        MAX_FILE_SIZE=10 * 1024 * 1024,
        MAX_CONTENT_LENGTH=10 * 1024 * 1024,
        # Cloudinary (primary — 25 GB free, NO card needed)
        CLOUDINARY_CLOUD_NAME=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
        CLOUDINARY_API_KEY=os.environ.get('CLOUDINARY_API_KEY', ''),
        CLOUDINARY_API_SECRET=os.environ.get('CLOUDINARY_API_SECRET', ''),
        # Backblaze B2 (secondary — 10 GB free, needs $1 verify)
        B2_KEY_ID=os.environ.get('B2_KEY_ID', ''),
        B2_APPLICATION_KEY=os.environ.get('B2_APPLICATION_KEY', ''),
        B2_BUCKET_NAME=os.environ.get('B2_BUCKET_NAME', 'homeroom'),
        B2_ENDPOINT=os.environ.get('B2_ENDPOINT', ''),
        B2_PUBLIC_DOMAIN=os.environ.get('B2_PUBLIC_DOMAIN', ''),
        # Cloudflare R2 (tertiary — 10 GB free, requires card on file)
        R2_ACCOUNT_ID=os.environ.get('R2_ACCOUNT_ID', ''),
        R2_ACCESS_KEY_ID=os.environ.get('R2_ACCESS_KEY_ID', ''),
        R2_SECRET_ACCESS_KEY=os.environ.get('R2_SECRET_ACCESS_KEY', ''),
        R2_BUCKET_NAME=os.environ.get('R2_BUCKET_NAME', 'homeroom'),
        R2_PUBLIC_DOMAIN=os.environ.get('R2_PUBLIC_DOMAIN', '')
    )

    # Load config from config.json if present
    config_path = os.path.join(base_dir, 'config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                app.config.update(json.load(f))
            print("  Loaded config.json")
        except Exception as e:
            print(f"  Warning: Failed to load config.json: {e}")

    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # CORS headers
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    # Initialize database
    from server.database import init_db
    init_db(app)

    # Initialize Flask-SocketIO
    try:
        from flask_socketio import SocketIO
        socketio = SocketIO(app, cors_allowed_origins="*", async_mode=None)
        app.config['SOCKETIO'] = socketio
        print("  SocketIO initialized")
    except ImportError:
        socketio = None
        print("  Notice: flask_socketio not installed, falling back to HTTP")

    # Auto-register all route blueprints
    routes_dir = os.path.join(os.path.dirname(__file__), 'routes')
    if os.path.exists(routes_dir):
        for filename in sorted(os.listdir(routes_dir)):
            if filename.endswith('.py') and filename != '__init__.py':
                module_name = filename[:-3]
                try:
                    module = importlib.import_module(f'server.routes.{module_name}')
                    if hasattr(module, 'bp'):
                        app.register_blueprint(module.bp)
                        print(f"  Registered route: {module_name}")
                except Exception as e:
                    print(f"  Warning: Could not load route {module_name}: {e}")

    # Serve static uploads fallback
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Serve frontend pages
    @app.route('/')
    def serve_index():
        return app.send_static_file('index.html')

    @app.route('/auth.html')
    def serve_auth():
        return app.send_static_file('auth.html')

    @app.route('/favicon.ico')
    def serve_favicon():
        return app.send_static_file('favicon.ico')

    @app.route('/favicon.png')
    def serve_favicon_png():
        return app.send_static_file('favicon.png')

    @app.route('/favicon.svg')
    def serve_favicon_svg():
        return app.send_static_file('favicon.svg')

    @app.route('/manifest.json')
    def serve_manifest():
        return app.send_static_file('manifest.json')

    @app.route('/sw.js')
    def serve_sw():
        response = app.send_static_file('sw.js')
        response.headers['Service-Worker-Allowed'] = '/'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Content-Type'] = 'application/javascript'
        return response

    @app.route('/offline.html')
    def serve_offline():
        return app.send_static_file('offline.html')

    @app.route('/approve.html')
    def serve_approve():
        return app.send_static_file('approve.html')

    @app.route('/healthz')
    def health_check():
        return jsonify({'status': 'healthy'}), 200

    return app


# WSGI entry point
app = create_app()

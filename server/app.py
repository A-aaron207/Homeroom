import os
import json
import importlib
from flask import Flask, send_from_directory


def create_app():
    """Create and configure the Flask application."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'public')

    app = Flask(__name__, static_folder=public_dir, static_url_path='')

    # Default config
    app.config.update(
        SECRET_KEY='homeroom-secret-key-change-in-production',
        ADMIN_EMAIL='',
        GMAIL_USER='',
        GMAIL_APP_PASSWORD='',
        SERVER_URL='http://localhost:5000',
        DB_PATH=os.path.join(base_dir, 'homeroom.db'),
        UPLOAD_FOLDER=os.path.join(base_dir, 'uploads'),
        MAX_FILE_SIZE=10 * 1024 * 1024,
        MAX_CONTENT_LENGTH=10 * 1024 * 1024
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

    # Serve frontend pages
    @app.route('/')
    def serve_index():
        return app.send_static_file('index.html')

    @app.route('/auth.html')
    def serve_auth():
        return app.send_static_file('auth.html')

    @app.route('/approve.html')
    def serve_approve():
        return app.send_static_file('approve.html')

    return app

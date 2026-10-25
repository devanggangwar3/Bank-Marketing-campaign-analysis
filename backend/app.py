"""
Flask Application Factory & Entry Point for Bank Marketing Backend
"""
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path regardless of execution method
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from flask import Flask, jsonify
from flask_cors import CORS

from backend.config import Config
from backend.database import init_db, seed_default_dataset_if_empty
from backend.routes import (
    health_bp,
    upload_bp,
    dashboard_bp,
    analytics_bp,
    insights_bp,
    reports_bp,
    filters_bp
)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all API routes
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize SQLite database
    db_path = app.config['DATABASE_PATH']
    init_db(db_path)

    # Auto-seed default benchmark dataset if empty
    base_dir = Path(__file__).resolve().parent.parent
    sample_csv = base_dir / 'sample_bank_marketing_data.csv'
    if sample_csv.exists() and not app.config.get('TESTING'):
        seed_default_dataset_if_empty(db_path, str(sample_csv))

    # Register Route Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(insights_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(filters_bp)

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'success': False, 'error': 'Bad Request', 'message': str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'error': 'Endpoint Not Found'}), 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({'success': False, 'error': 'File Too Large', 'message': 'Maximum upload size is 16MB'}), 413

    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({'success': False, 'error': 'Internal Server Error', 'message': str(e)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    print(f"\n" + "="*64)
    print(f"🏦  Bank Marketing Campaign Analysis Flask API")
    print(f"="*64)
    print(f"🚀  API running at: http://localhost:{port}")
    print(f"🩺  Health Check:   http://localhost:{port}/api/health")
    print(f"="*64 + "\n")
    app.run(host='0.0.0.0', port=port, debug=True)

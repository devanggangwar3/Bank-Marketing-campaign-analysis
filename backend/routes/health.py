from flask import Blueprint, jsonify, current_app
from backend.models.dataset_metadata import DatasetRepository

health_bp = Blueprint('health', __name__)

@health_bp.route('/api/health', methods=['GET'])
def health_check():
    db_path = current_app.config['DATABASE_PATH']
    active_dataset = DatasetRepository.get_active_dataset_metadata(db_path)
    
    return jsonify({
        'status': 'healthy',
        'service': 'Bank Marketing Campaign Analysis REST API',
        'version': '2.4.0',
        'database': 'connected',
        'activeDataset': active_dataset['filename'] if active_dataset else None,
        'activeDatasetRows': active_dataset['valid_rows'] if active_dataset else 0
    }), 200

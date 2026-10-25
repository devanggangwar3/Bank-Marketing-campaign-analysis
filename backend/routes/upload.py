import os
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from backend.services.validator import CSVValidator, ValidationError
from backend.models.dataset_metadata import DatasetRepository
from backend.database import get_db_connection

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': 'No file part found in upload request. Key must be "file".'
        }), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected for upload.'
        }), 400

    safe_name = secure_filename(file.filename) or 'campaign_data.csv'

    try:
        validation_result = CSVValidator.validate_and_clean(file.stream, safe_name)
    except ValidationError as ve:
        return jsonify({
            'success': False,
            'error': ve.message,
            'details': ve.details
        }), 422
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Unexpected error parsing CSV: {str(e)}'
        }), 500

    db_path = current_app.config['DATABASE_PATH']
    df = validation_result['df']
    dataset_id = DatasetRepository.save_new_dataset(
        db_path,
        safe_name,
        df,
        validation_result['delimiter'],
        validation_result['duplicates_removed']
    )

    return jsonify({
        'success': True,
        'message': f'Dataset "{safe_name}" successfully validated and stored.',
        'datasetId': dataset_id,
        'stats': {
            'filename': safe_name,
            'totalRowsDetected': validation_result['total_rows'],
            'validRowsParsed': validation_result['valid_rows'],
            'duplicatesRemoved': validation_result['duplicates_removed'],
            'delimiter': validation_result['delimiter'],
            'missingOptionalColumns': validation_result['missing_optional_columns']
        }
    }), 201

@upload_bp.route('/api/reset-demo', methods=['POST'])
def reset_demo():
    """Resets the active dataset to the benchmark cohort."""
    db_path = current_app.config['DATABASE_PATH']
    base_dir = Path(current_app.root_path).parent
    sample_csv = base_dir / 'sample_bank_marketing_data.csv'

    if not sample_csv.exists():
        return jsonify({
            'success': False,
            'error': 'Benchmark CSV file not found on server.'
        }), 404

    with open(sample_csv, 'rb') as f:
        validation_result = CSVValidator.validate_and_clean(f, 'sample_bank_marketing_data.csv')

    dataset_id = DatasetRepository.save_new_dataset(
        db_path,
        'sample_bank_marketing_data.csv',
        validation_result['df'],
        validation_result['delimiter'],
        0
    )

    return jsonify({
        'success': True,
        'message': 'Restored default benchmark campaign dataset (1,250 records).',
        'datasetId': dataset_id,
        'validRows': validation_result['valid_rows']
    }), 200

@upload_bp.route('/api/datasets', methods=['GET'])
def list_datasets():
    """Lists history of uploaded datasets."""
    db_path = current_app.config['DATABASE_PATH']
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT id, filename, total_rows, valid_rows, skipped_rows, delimiter, is_active, uploaded_at, notes FROM datasets ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify({'datasets': rows}), 200

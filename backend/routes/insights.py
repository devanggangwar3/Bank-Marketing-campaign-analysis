from flask import Blueprint, request, jsonify, current_app
from backend.models.dataset_metadata import DatasetRepository
from backend.services.analytics_service import AnalyticsService

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/api/insights', methods=['GET'])
def get_insights():
    db_path = current_app.config['DATABASE_PATH']
    df = DatasetRepository.get_active_dataframe(db_path)

    if df.empty:
        return jsonify({'insights': []}), 200

    filters = {
        'month': request.args.get('month', 'all'),
        'job': request.args.get('job', 'all'),
        'education': request.args.get('education', 'all'),
        'contact': request.args.get('contact', 'all'),
        'outcome': request.args.get('outcome', 'all'),
        'marital': request.args.get('marital', 'all'),
        'touches': request.args.get('touches', 'all'),
        'search': request.args.get('search', '')
    }

    filtered_df = AnalyticsService.apply_filters(df, filters)
    insights = AnalyticsService.generate_insights(filtered_df)

    return jsonify({'insights': insights}), 200

from flask import Blueprint, request, jsonify, current_app
from backend.models.dataset_metadata import DatasetRepository
from backend.services.analytics_service import AnalyticsService

analytics_bp = Blueprint('analytics', __name__)

def get_filtered_active_df():
    db_path = current_app.config['DATABASE_PATH']
    df = DatasetRepository.get_active_dataframe(db_path)
    if df.empty:
        return df

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
    return AnalyticsService.apply_filters(df, filters)

@analytics_bp.route('/api/analytics/period', methods=['GET'])
def get_period_analytics():
    df = get_filtered_active_df()
    data = AnalyticsService.compute_period_analysis(df)
    return jsonify({'periods': data}), 200

@analytics_bp.route('/api/analytics/channel', methods=['GET'])
def get_channel_analytics():
    df = get_filtered_active_df()
    data = AnalyticsService.compute_channel_analysis(df)
    return jsonify({'channels': data}), 200

@analytics_bp.route('/api/analytics/frequency', methods=['GET'])
def get_frequency_analytics():
    df = get_filtered_active_df()
    data = AnalyticsService.compute_frequency_analysis(df)
    return jsonify({'frequencies': data}), 200

@analytics_bp.route('/api/analytics/segments', methods=['GET'])
def get_segment_analytics():
    df = get_filtered_active_df()
    data = AnalyticsService.compute_segments(df)
    return jsonify(data), 200

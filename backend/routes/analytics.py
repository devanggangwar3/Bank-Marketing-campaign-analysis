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
        'housing': request.args.get('housing', 'all'),
        'balance_tier': request.args.get('balance_tier', request.args.get('balanceTier', 'all')),
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

@analytics_bp.route('/api/analytics/roi', methods=['GET'])
def get_roi_analytics():
    df = get_filtered_active_df()
    cost = request.args.get('cost_per_contact', 4.50)
    value = request.args.get('value_per_conversion', 200.0)
    touch_cap = request.args.get('touch_cap', None)
    data = AnalyticsService.compute_roi_simulation(df, cost, value, touch_cap)
    return jsonify(data), 200

@analytics_bp.route('/api/analytics/balance', methods=['GET'])
def get_balance_analytics():
    df = get_filtered_active_df()
    data = AnalyticsService.compute_balance_analysis(df)
    return jsonify(data), 200

@analytics_bp.route('/api/analytics/propensity', methods=['GET'])
def get_propensity_analytics():
    df = get_filtered_active_df()
    data = AnalyticsService.compute_propensity_analysis(df)
    return jsonify(data), 200

@analytics_bp.route('/api/analytics/propensity/score', methods=['POST'])
def score_single_lead_api():
    lead_data = request.get_json(silent=True) or {}
    data = AnalyticsService.score_single_lead(lead_data)
    return jsonify(data), 200

@analytics_bp.route('/api/analytics/cohort-compare', methods=['GET', 'POST'])
def get_cohort_comparison():
    df = get_filtered_active_df()
    if request.method == 'POST':
        body = request.get_json(silent=True) or {}
        cohort_a = body.get('cohortA', 'cellular')
        cohort_b = body.get('cohortB', 'telephone')
    else:
        cohort_a = request.args.get('cohortA', 'cellular')
        cohort_b = request.args.get('cohortB', 'telephone')
    data = AnalyticsService.compute_cohort_comparison(df, cohort_a, cohort_b)
    return jsonify(data), 200

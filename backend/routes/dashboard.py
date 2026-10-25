from flask import Blueprint, request, jsonify, current_app
from backend.models.dataset_metadata import DatasetRepository
from backend.services.analytics_service import AnalyticsService

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard', methods=['GET'])
def get_dashboard_summary():
    db_path = current_app.config['DATABASE_PATH']
    df = DatasetRepository.get_active_dataframe(db_path)
    meta = DatasetRepository.get_active_dataset_metadata(db_path)

    if df.empty:
        return jsonify({
            'kpis': AnalyticsService.compute_kpis(df),
            'outcomeDistribution': AnalyticsService.compute_outcome_distribution(df),
            'activeDataset': None
        }), 200

    # Extract query filters
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
    kpis = AnalyticsService.compute_kpis(filtered_df)
    outcome_dist = AnalyticsService.compute_outcome_distribution(filtered_df)

    # Log analysis in history
    if meta:
        DatasetRepository.log_analysis(
            db_path,
            meta['id'],
            str(filters),
            kpis['totalCustomers'],
            kpis['responseRate']
        )

    return jsonify({
        'kpis': kpis,
        'outcomeDistribution': outcome_dist,
        'activeDataset': {
            'id': meta['id'] if meta else None,
            'filename': meta['filename'] if meta else 'None',
            'totalRecords': len(df),
            'filteredRecords': len(filtered_df),
            'isActive': True
        }
    }), 200

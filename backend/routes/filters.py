from flask import Blueprint, request, jsonify, current_app
from backend.models.dataset_metadata import DatasetRepository
from backend.services.analytics_service import AnalyticsService

filters_bp = Blueprint('filters', __name__)

@filters_bp.route('/api/filters', methods=['GET'])
def get_filter_options():
    db_path = current_app.config['DATABASE_PATH']
    df = DatasetRepository.get_active_dataframe(db_path)

    if df.empty:
        return jsonify({
            'months': [],
            'jobs': [],
            'educations': [],
            'contacts': [],
            'maritals': []
        }), 200

    months = sorted(list(df['month'].dropna().unique()))
    jobs = sorted(list(df['job'].dropna().unique()))
    educations = sorted(list(df['education'].dropna().unique()))
    contacts = sorted(list(df['contact'].dropna().unique()))
    maritals = sorted(list(df['marital'].dropna().unique()))

    return jsonify({
        'months': months,
        'jobs': jobs,
        'educations': educations,
        'contacts': contacts,
        'maritals': maritals
    }), 200

@filters_bp.route('/api/data/records', methods=['GET'])
def get_data_records():
    """Returns paginated, sorted, and filtered data records for the BI table."""
    db_path = current_app.config['DATABASE_PATH']
    df = DatasetRepository.get_active_dataframe(db_path)

    if df.empty:
        return jsonify({
            'records': [],
            'totalRecords': 0,
            'page': 1,
            'pageSize': 10,
            'totalPages': 0
        }), 200

    # Extract filters
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

    filtered_df = AnalyticsService.apply_filters(df, filters)

    # Sorting
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'asc').lower()
    ascending = (sort_dir == 'asc')

    if sort_by in filtered_df.columns:
        filtered_df = filtered_df.sort_values(by=sort_by, ascending=ascending)

    # Pagination
    try:
        page = max(1, int(request.args.get('page', 1)))
        page_size = min(100, max(5, int(request.args.get('page_size', 10))))
    except ValueError:
        page = 1
        page_size = 10

    total_records = len(filtered_df)
    total_pages = max(1, (total_records + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    page_slice = filtered_df.iloc[start_idx:end_idx]
    records = page_slice.to_dict(orient='records')

    # Enhance records with propensity scoring
    for r in records:
        scored = AnalyticsService.score_single_lead(r)
        r['propensityPercent'] = scored['propensityPercent']
        r['propensityTier'] = scored['tier']
        r['propensityClass'] = scored['tierClass']

    return jsonify({
        'records': records,
        'totalRecords': total_records,
        'page': page,
        'pageSize': page_size,
        'totalPages': total_pages,
        'startIndex': start_idx,
        'endIndex': min(end_idx, total_records)
    }), 200

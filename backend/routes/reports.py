import io
from datetime import datetime
from flask import Blueprint, request, Response, send_file, current_app
from backend.models.dataset_metadata import DatasetRepository
from backend.services.analytics_service import AnalyticsService
from backend.services.report_service import ReportService

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/api/reports/export', methods=['GET'])
def export_report():
    db_path = current_app.config['DATABASE_PATH']
    df = DatasetRepository.get_active_dataframe(db_path)

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
    export_format = request.args.get('format', 'csv').lower()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    if export_format == 'png':
        png_bytes = ReportService.generate_chart_png(filtered_df)
        return send_file(
            io.BytesIO(png_bytes),
            mimetype='image/png',
            as_attachment=True,
            download_name=f'bank_campaign_report_{timestamp}.png'
        )

    # Default to CSV export
    csv_str = ReportService.generate_csv_export(filtered_df)
    return Response(
        csv_str,
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=bank_marketing_report_{timestamp}.csv',
            'Content-Type': 'text/csv; charset=utf-8'
        }
    )

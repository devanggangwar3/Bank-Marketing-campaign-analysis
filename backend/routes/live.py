"""
Live Campaign Telemetry & Real-Time Outreach Streaming Route
"""
import random
from flask import Blueprint, request, jsonify, current_app
from backend.models.dataset_metadata import DatasetRepository
from backend.services.analytics_service import AnalyticsService

live_bp = Blueprint('live', __name__)

JOB_LIST = ['management', 'technician', 'blue-collar', 'admin.', 'retired', 'services', 'self-employed', 'entrepreneur', 'student', 'unemployed', 'housemaid']
EDUCATION_LIST = ['secondary', 'tertiary', 'primary', 'unknown']
MARITAL_LIST = ['married', 'single', 'divorced']
MONTH_LIST = ['may', 'jul', 'aug', 'jun', 'nov', 'apr', 'feb', 'jan', 'oct', 'sep', 'mar', 'dec']

def generate_realistic_campaign_contact():
    """Generates a realistic bank outreach contact with probabilistic conversion propensity."""
    job = random.choices(
        JOB_LIST,
        weights=[0.22, 0.17, 0.19, 0.11, 0.08, 0.07, 0.04, 0.03, 0.03, 0.03, 0.03]
    )[0]
    
    education = random.choices(
        EDUCATION_LIST,
        weights=[0.51, 0.29, 0.15, 0.05]
    )[0]
    
    age = random.randint(18, 75)
    contact = random.choices(['cellular', 'telephone'], weights=[0.82, 0.18])[0]
    housing = random.choices(['yes', 'no'], weights=[0.55, 0.45])[0]
    loan = random.choices(['no', 'yes'], weights=[0.84, 0.16])[0]
    marital = random.choices(MARITAL_LIST, weights=[0.60, 0.28, 0.12])[0]
    balance = int(random.gauss(1350, 1500))
    if balance < -500:
        balance = -random.randint(50, 400)

    campaign_touches = random.choices([1, 2, 3, 4, 5], weights=[0.45, 0.25, 0.15, 0.10, 0.05])[0]
    duration = random.randint(45, 680)

    # Calculate realistic conversion propensity
    base_propensity = 0.115
    if job in ['retired', 'student']:
        base_propensity += 0.20
    elif job in ['management', 'self-employed']:
        base_propensity += 0.06
    elif job == 'blue-collar':
        base_propensity -= 0.04

    if housing == 'no':
        base_propensity += 0.08
    if contact == 'cellular':
        base_propensity += 0.05
    if duration > 300:
        base_propensity += 0.18
    elif duration < 90:
        base_propensity -= 0.08
    if campaign_touches > 3:
        base_propensity -= 0.07

    base_propensity = max(0.02, min(0.75, base_propensity))
    converted = random.random() < base_propensity
    outcome = 'yes' if converted else 'no'

    return {
        'age': age,
        'job': job,
        'marital': marital,
        'education': education,
        'default': 'no',
        'balance': balance,
        'housing': housing,
        'loan': loan,
        'contact': contact,
        'day': random.randint(1, 28),
        'month': random.choice(MONTH_LIST),
        'duration': duration,
        'campaign': campaign_touches,
        'pdays': -1,
        'previous': 0,
        'poutcome': 'nonexistent',
        'y': outcome
    }

@live_bp.route('/api/live/simulate', methods=['POST'])
def simulate_live_interaction():
    """Simulates or receives an outbound marketing interaction and records it in SQLite."""
    db_path = current_app.config['DATABASE_PATH']
    data = request.get_json(silent=True) or {}
    
    # Use provided record or generate realistic one
    record = data.get('record') or generate_realistic_campaign_contact()
    saved_record = DatasetRepository.append_single_record(db_path, record)
    
    # Recompute updated KPIs
    df = DatasetRepository.get_active_dataframe(db_path)
    kpis = AnalyticsService.compute_kpis(df)
    
    return jsonify({
        'success': True,
        'record': saved_record,
        'kpis': kpis,
        'totalRecords': len(df)
    }), 201

@live_bp.route('/api/live/stream', methods=['GET'])
def get_live_stream_summary():
    """Returns recent campaign records and live operational health."""
    db_path = current_app.config['DATABASE_PATH']
    df = DatasetRepository.get_active_dataframe(db_path)
    meta = DatasetRepository.get_active_dataset_metadata(db_path)
    
    recent_records = []
    if not df.empty:
        recent_records = df.tail(20).to_dict(orient='records')
        recent_records.reverse()

    kpis = AnalyticsService.compute_kpis(df)
    
    return jsonify({
        'success': True,
        'liveStatus': 'active',
        'activeDataset': meta['filename'] if meta else 'Benchmark Cohort',
        'totalRecords': len(df),
        'recentRecords': recent_records,
        'kpis': kpis
    }), 200

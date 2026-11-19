import io
from pathlib import Path
import pytest
from backend.app import create_app
from backend.config import TestingConfig
from backend.database import init_db

@pytest.fixture
def client():
    test_db = Path(TestingConfig.DATABASE_PATH)
    if test_db.exists():
        test_db.unlink()
    
    app = create_app(TestingConfig)
    init_db(str(test_db))
    
    with app.test_client() as client:
        yield client
        
    if test_db.exists():
        try:
            test_db.unlink()
        except Exception:
            pass

def test_live_simulate_auto_generated(client):
    """Test POST /api/live/simulate with automatic contact generation."""
    res = client.post('/api/live/simulate', json={})
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert 'record' in data
    record = data['record']
    assert 'age' in record
    assert 'job' in record
    assert 'y' in record
    assert record['y'] in ['yes', 'no']
    assert 'kpis' in data
    assert data['totalRecords'] >= 1

def test_live_simulate_custom_payload(client):
    """Test POST /api/live/simulate with explicit customer outreach record."""
    custom_record = {
        'age': 32,
        'job': 'management',
        'marital': 'single',
        'education': 'tertiary',
        'default': 'no',
        'balance': 2500,
        'housing': 'no',
        'loan': 'no',
        'contact': 'cellular',
        'day': 12,
        'month': 'aug',
        'duration': 420,
        'campaign': 1,
        'pdays': -1,
        'previous': 0,
        'poutcome': 'nonexistent',
        'y': 'yes'
    }
    res = client.post('/api/live/simulate', json={'record': custom_record})
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['record']['job'] == 'management'
    assert data['record']['y'] == 'yes'
    assert data['record']['balance'] == 2500

def test_live_stream_endpoint(client):
    """Test GET /api/live/stream endpoint returns live stream status and recent telemetry."""
    # First post two records
    client.post('/api/live/simulate', json={})
    client.post('/api/live/simulate', json={})
    
    res = client.get('/api/live/stream')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['liveStatus'] == 'active'
    assert 'recentRecords' in data
    assert len(data['recentRecords']) >= 2
    assert 'kpis' in data
    assert data['totalRecords'] >= 2


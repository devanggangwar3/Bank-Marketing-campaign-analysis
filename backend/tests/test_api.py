import os
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

def test_health_endpoint(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'healthy'
    assert data['database'] == 'connected'

def test_dashboard_endpoint_empty_db(client):
    res = client.get('/api/dashboard')
    assert res.status_code == 200
    data = res.get_json()
    assert 'kpis' in data
    assert 'outcomeDistribution' in data

def test_upload_endpoint_valid_csv(client):
    csv_content = (
        "age,job,marital,education,default,balance,housing,loan,contact,day,month,duration,campaign,pdays,previous,poutcome,y\n"
        "28,student,single,tertiary,no,1200,no,no,cellular,15,may,240,1,-1,0,unknown,yes\n"
        "54,retired,married,secondary,no,4500,no,no,telephone,16,jun,360,2,180,1,success,yes\n"
        "36,technician,married,secondary,no,800,yes,no,cellular,17,may,150,4,-1,0,unknown,no\n"
    )
    data = {'file': (io.BytesIO(csv_content.encode('utf-8')), 'test_upload.csv')}
    res = client.post('/api/upload', data=data, content_type='multipart/form-data')
    assert res.status_code == 201
    json_data = res.get_json()
    assert json_data['success'] is True
    assert json_data['stats']['validRowsParsed'] == 3

    # Now verify dashboard reflects the 3 records
    dash_res = client.get('/api/dashboard')
    dash_data = dash_res.get_json()
    assert dash_data['kpis']['totalCustomers'] == 3
    assert dash_data['kpis']['successfulResponses'] == 2

def test_upload_missing_target_error(client):
    csv_content = "age,job,balance\n28,student,1200"
    data = {'file': (io.BytesIO(csv_content.encode('utf-8')), 'invalid.csv')}
    res = client.post('/api/upload', data=data, content_type='multipart/form-data')
    assert res.status_code == 422
    assert res.get_json()['success'] is False

def test_analytics_endpoints_after_upload(client):
    # Upload sample rows
    csv_content = (
        "age,job,marital,education,default,balance,housing,loan,contact,day,month,duration,campaign,pdays,previous,poutcome,y\n"
        "28,student,single,tertiary,no,1200,no,no,cellular,15,may,240,1,-1,0,unknown,yes\n"
        "54,retired,married,secondary,no,4500,no,no,telephone,16,jun,360,2,180,1,success,yes\n"
    )
    client.post('/api/upload', data={'file': (io.BytesIO(csv_content.encode('utf-8')), 'analytics_test.csv')}, content_type='multipart/form-data')

    # Period
    res_period = client.get('/api/analytics/period')
    assert res_period.status_code == 200
    assert 'periods' in res_period.get_json()

    # Channel
    res_channel = client.get('/api/analytics/channel')
    assert res_channel.status_code == 200
    assert 'channels' in res_channel.get_json()

    # Frequency
    res_freq = client.get('/api/analytics/frequency')
    assert res_freq.status_code == 200
    assert 'frequencies' in res_freq.get_json()

    # Segments
    res_seg = client.get('/api/analytics/segments')
    assert res_seg.status_code == 200
    assert 'jobs' in res_seg.get_json()

    # Insights
    res_ins = client.get('/api/insights')
    assert res_ins.status_code == 200
    assert 'insights' in res_ins.get_json()

    # Filters
    res_filt = client.get('/api/filters')
    assert res_filt.status_code == 200
    assert 'jobs' in res_filt.get_json()

    # Records
    res_rec = client.get('/api/data/records?page=1&page_size=10')
    assert res_rec.status_code == 200
    assert res_rec.get_json()['totalRecords'] == 2

    # CSV Export
    res_export = client.get('/api/reports/export?format=csv')
    assert res_export.status_code == 200
    assert 'text/csv' in res_export.content_type

    # PNG Export
    res_png = client.get('/api/reports/export?format=png')
    assert res_png.status_code == 200
    assert 'image/png' in res_png.content_type

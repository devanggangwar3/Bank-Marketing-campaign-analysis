"""
Unit Tests for Analytical Calculation Engine & Statistical Services
"""
import pandas as pd
import pytest
from backend.services.analytics_service import AnalyticsService

@pytest.fixture
def sample_dataframe():
    data = [
        {'id': 1, 'age': 25, 'job': 'student', 'education': 'tertiary', 'contact': 'cellular', 'month': 'may', 'campaign': 1, 'duration': 300, 'housing': 'no', 'poutcome': 'unknown', 'y': 'yes'},
        {'id': 2, 'age': 22, 'job': 'student', 'education': 'secondary', 'contact': 'cellular', 'month': 'may', 'campaign': 2, 'duration': 200, 'housing': 'no', 'poutcome': 'unknown', 'y': 'no'},
        {'id': 3, 'age': 65, 'job': 'retired', 'education': 'primary', 'contact': 'telephone', 'month': 'jun', 'campaign': 1, 'duration': 500, 'housing': 'no', 'poutcome': 'success', 'y': 'yes'},
        {'id': 4, 'age': 40, 'job': 'blue-collar', 'education': 'secondary', 'contact': 'cellular', 'month': 'may', 'campaign': 4, 'duration': 120, 'housing': 'yes', 'poutcome': 'failure', 'y': 'no'},
        {'id': 5, 'age': 45, 'job': 'blue-collar', 'education': 'secondary', 'contact': 'unknown', 'month': 'jun', 'campaign': 5, 'duration': 80, 'housing': 'yes', 'poutcome': 'unknown', 'y': 'no'},
    ]
    return pd.DataFrame(data)

def test_compute_kpis(sample_dataframe):
    kpis = AnalyticsService.compute_kpis(sample_dataframe)
    assert kpis['totalCustomers'] == 5
    assert kpis['successfulResponses'] == 2
    assert kpis['unsuccessfulResponses'] == 3
    assert kpis['responseRate'] == 40.0
    assert kpis['totalContacts'] == 13 # 1+2+1+4+5
    assert kpis['previousSuccessRate'] == 100.0 # 1 out of 1 converted

def test_zero_denominator_kpis():
    empty_df = pd.DataFrame()
    kpis = AnalyticsService.compute_kpis(empty_df)
    assert kpis['totalCustomers'] == 0
    assert kpis['responseRate'] == 0.0
    assert kpis['totalContacts'] == 0

def test_period_analysis(sample_dataframe):
    periods = AnalyticsService.compute_period_analysis(sample_dataframe)
    # Check months are returned
    months = [p['label'] for p in periods]
    assert 'may' in months
    assert 'jun' in months
    may_entry = next(p for p in periods if p['label'] == 'may')
    assert may_entry['total'] == 3
    assert may_entry['converted'] == 1
    assert may_entry['responseRate'] == 33.3

def test_channel_analysis(sample_dataframe):
    channels = AnalyticsService.compute_channel_analysis(sample_dataframe)
    labels = [c['label'] for c in channels]
    assert 'Cellular' in labels
    assert 'Telephone' in labels
    assert 'Unknown Channel' in labels

def test_frequency_fatigue_analysis(sample_dataframe):
    freq = AnalyticsService.compute_frequency_analysis(sample_dataframe)
    assert len(freq) == 6
    touch_1 = next(f for f in freq if f['label'] == '1 Contact')
    assert touch_1['total'] == 2 # rows 1 and 3
    assert touch_1['converted'] == 2 # both yes
    assert touch_1['responseRate'] == 100.0

def test_filtering(sample_dataframe):
    # Filter by job 'student'
    filtered = AnalyticsService.apply_filters(sample_dataframe, {'job': 'student'})
    assert len(filtered) == 2
    assert (filtered['job'] == 'student').all()

    # Filter by touches '4+'
    filtered_touches = AnalyticsService.apply_filters(sample_dataframe, {'touches': '4+'})
    assert len(filtered_touches) == 2
    assert (filtered_touches['campaign'] >= 4).all()

def test_insights_generation(sample_dataframe):
    # Under 10 rows returns insufficient sample warning
    insights = AnalyticsService.generate_insights(sample_dataframe)
    assert len(insights) > 0
    assert insights[0]['category'] == 'insufficient-data'

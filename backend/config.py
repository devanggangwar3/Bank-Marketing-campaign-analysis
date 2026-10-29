"""
Application Configuration Module for Bank Marketing Backend
"""
import os
from pathlib import Pathl

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'bank-pulse-secret-key-marketing-analytics-2026')
    DATABASE_PATH = os.environ.get('DATABASrun thisE_PATH', str(BASE_DIR / 'data' / 'bank_campaign.db'))
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)) # 16 MB
    ALLOWED_EXTENSIONS = {'csv'}
    
    # Industry benchmark conversion rate
    BENCHMARK_RESPONSE_RATE = 11.5

    # Standard expected columns for bank marketing datasets
    REQUIRED_COLUMNS = [
        'age', 'job', 'marital', 'education', 'default',
        'balance', 'housing', 'loan', 'contact', 'day',
        'month', 'duration', 'campaign', 'pdays', 'previous',
        'poutcome', 'y'
    ]

    # Friendly synonyms / aliases for incoming CSV headers
    COLUMN_ALIASES = {
        'y': ['y', 'deposit', 'subscribed', 'target', 'conversion', 'outcome', 'response'],
        'campaign': ['campaign', 'contacts', 'campaign_contacts', 'touches'],
        'duration': ['duration', 'call_duration', 'duration_sec', 'seconds'],
        'balance': ['balance', 'account_balance', 'avg_balance'],
        'housing': ['housing', 'housing_loan', 'home_loan'],
        'loan': ['loan', 'personal_loan'],
        'poutcome': ['poutcome', 'prev_outcome', 'previous_outcome']
    }

    MONTHS_ORDER = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

class TestingConfig(Config):
    TESTING = True
    DATABASE_PATH = str(BASE_DIR / 'data' / 'test_bank.db')

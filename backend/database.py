"""
SQLite Database Connection & Migration Management
"""
import sqlite3
import os
from pathlib import Path

def get_db_connection(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path):
    """Initializes tables if they do not exist."""
    db_file = Path(db_path)
    if db_path != ':memory:':
        db_file.parent.mkdir(parents=True, exist_ok=True)

    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS datasets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        total_rows INTEGER NOT NULL,
        valid_rows INTEGER NOT NULL,
        skipped_rows INTEGER DEFAULT 0,
        delimiter TEXT DEFAULT ',',
        is_active INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS campaign_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER NOT NULL,
        age INTEGER,
        job TEXT,
        marital TEXT,
        education TEXT,
        is_default TEXT,
        balance REAL,
        housing TEXT,
        loan TEXT,
        contact TEXT,
        day INTEGER,
        month TEXT,
        duration INTEGER,
        campaign INTEGER,
        pdays INTEGER,
        previous INTEGER,
        poutcome TEXT,
        y TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_dataset ON campaign_records(dataset_id);
    CREATE INDEX IF NOT EXISTS idx_records_outcome ON campaign_records(y);
    CREATE INDEX IF NOT EXISTS idx_records_month ON campaign_records(month);
    CREATE INDEX IF NOT EXISTS idx_records_job ON campaign_records(job);

    CREATE TABLE IF NOT EXISTS analysis_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER,
        filter_query TEXT,
        total_records INTEGER,
        response_rate REAL,
        analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()

def seed_default_dataset_if_empty(db_path, csv_path):
    """Seeds the database with benchmark records if no dataset is active."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS cnt FROM datasets WHERE is_active = 1")
    count = cursor.fetchone()['cnt']
    conn.close()

    if count == 0 and os.path.exists(csv_path):
        import pandas as pd
        df = pd.read_csv(csv_path, sep=None, engine='python')
        
        # Save to database
        conn = get_db_connection(db_path)
        cur = conn.cursor()
        cur.execute("UPDATE datasets SET is_active = 0")
        cur.execute(
            "INSERT INTO datasets (filename, total_rows, valid_rows, skipped_rows, delimiter, is_active, notes) VALUES (?, ?, ?, 0, ',', 1, ?)",
            ('sample_bank_marketing_data.csv', len(df), len(df), 'Preloaded Benchmark Cohort')
        )
        dataset_id = cur.lastrowid

        records = []
        for _, row in df.iterrows():
            y_val = str(row.get('y', 'no')).strip().lower()
            records.append((
                dataset_id,
                int(row.get('age', 0)),
                str(row.get('job', 'unknown')).strip().lower(),
                str(row.get('marital', 'unknown')).strip().lower(),
                str(row.get('education', 'unknown')).strip().lower(),
                str(row.get('default', 'no')).strip().lower(),
                float(row.get('balance', 0.0)),
                str(row.get('housing', 'no')).strip().lower(),
                str(row.get('loan', 'no')).strip().lower(),
                str(row.get('contact', 'unknown')).strip().lower(),
                int(row.get('day', 1)),
                str(row.get('month', 'jan')).strip().lower(),
                int(row.get('duration', 0)),
                int(row.get('campaign', 1)),
                int(row.get('pdays', -1)),
                int(row.get('previous', 0)),
                str(row.get('poutcome', 'unknown')).strip().lower(),
                'yes' if y_val in ['yes', 'y', '1', 'true', 'success'] else 'no'
            ))

        cur.executemany("""
            INSERT INTO campaign_records (
                dataset_id, age, job, marital, education, is_default,
                balance, housing, loan, contact, day, month,
                duration, campaign, pdays, previous, poutcome, y
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, records)

        conn.commit()
        conn.close()

"""
Data Access Layer for SQLite Dataset Operations
"""
import sqlite3
import pandas as pd
from backend.database import get_db_connection

class DatasetRepository:

    @staticmethod
    def get_active_dataset_metadata(db_path: str):
        conn = get_db_connection(db_path)
        cur = conn.cursor()
        cur.execute("SELECT * FROM datasets WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None

    @staticmethod
    def get_active_dataframe(db_path: str) -> pd.DataFrame:
        meta = DatasetRepository.get_active_dataset_metadata(db_path)
        if not meta:
            return pd.DataFrame()

        conn = get_db_connection(db_path)
        query = """
            SELECT id, age, job, marital, education, is_default,
                   balance, housing, loan, contact, day, month,
                   duration, campaign, pdays, previous, poutcome, y
            FROM campaign_records
            WHERE dataset_id = ?
            ORDER BY id ASC
        """
        df = pd.read_sql_query(query, conn, params=(meta['id'],))
        conn.close()
        return df

    @staticmethod
    def save_new_dataset(db_path: str, filename: str, df: pd.DataFrame, delimiter: str, skipped_rows: int = 0) -> int:
        conn = get_db_connection(db_path)
        cur = conn.cursor()

        # Set existing datasets to inactive
        cur.execute("UPDATE datasets SET is_active = 0")

        # Insert metadata
        cur.execute("""
            INSERT INTO datasets (filename, total_rows, valid_rows, skipped_rows, delimiter, is_active, notes)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        """, (filename, len(df) + skipped_rows, len(df), skipped_rows, delimiter, 'User Uploaded Dataset'))
        dataset_id = cur.lastrowid

        # Insert records in batch
        records = []
        for _, row in df.iterrows():
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
                str(row.get('y', 'no')).strip().lower()
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
        return dataset_id

    @staticmethod
    def append_single_record(db_path: str, record: dict) -> dict:
        conn = get_db_connection(db_path)
        cur = conn.cursor()
        meta = DatasetRepository.get_active_dataset_metadata(db_path)
        if not meta:
            cur.execute("""
                INSERT INTO datasets (filename, total_rows, valid_rows, skipped_rows, delimiter, is_active, notes)
                VALUES (?, 0, 0, 0, ',', 1, ?)
            """, ('Live Stream Session', 'Live Telemetry Stream'))
            dataset_id = cur.lastrowid
        else:
            dataset_id = meta['id']

        cur.execute("""
            INSERT INTO campaign_records (
                dataset_id, age, job, marital, education, is_default,
                balance, housing, loan, contact, day, month,
                duration, campaign, pdays, previous, poutcome, y
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dataset_id,
            int(record.get('age', 35)),
            str(record.get('job', 'management')).strip().lower(),
            str(record.get('marital', 'married')).strip().lower(),
            str(record.get('education', 'secondary')).strip().lower(),
            str(record.get('default', 'no')).strip().lower(),
            float(record.get('balance', 1000.0)),
            str(record.get('housing', 'no')).strip().lower(),
            str(record.get('loan', 'no')).strip().lower(),
            str(record.get('contact', 'cellular')).strip().lower(),
            int(record.get('day', 15)),
            str(record.get('month', 'may')).strip().lower(),
            int(record.get('duration', 250)),
            int(record.get('campaign', 1)),
            int(record.get('pdays', -1)),
            int(record.get('previous', 0)),
            str(record.get('poutcome', 'nonexistent')).strip().lower(),
            str(record.get('y', 'no')).strip().lower()
        ))
        new_id = cur.lastrowid
        cur.execute("UPDATE datasets SET total_rows = total_rows + 1, valid_rows = valid_rows + 1 WHERE id = ?", (dataset_id,))
        conn.commit()
        conn.close()

        record_copy = dict(record)
        record_copy['id'] = new_id
        return record_copy

    @staticmethod
    def log_analysis(db_path: str, dataset_id: int, filter_str: str, total_records: int, response_rate: float):
        try:
            conn = get_db_connection(db_path)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO analysis_history (dataset_id, filter_query, total_records, response_rate)
                VALUES (?, ?, ?, ?)
            """, (dataset_id, filter_str, total_records, response_rate))
            conn.commit()
            conn.close()
        except Exception:
            pass

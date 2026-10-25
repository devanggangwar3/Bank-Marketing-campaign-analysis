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

"""
CSV Dataset Validation & Cleaning Service
"""
import io
import csv
import pandas as pd
from backend.config import Config

class ValidationError(Exception):
    def __init__(self, message, details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

class CSVValidator:
    @staticmethod
    def detect_delimiter(sample_text: str) -> str:
        comma_count = sample_text.count(',')
        semicolon_count = sample_text.count(';')
        tab_count = sample_text.count('\t')

        if semicolon_count > comma_count and semicolon_count > tab_count:
            return ';'
        if tab_count > comma_count and tab_count > semicolon_count:
            return '\t'
        return ','

    @classmethod
    def map_columns(cls, columns):
        """Maps incoming headers to canonical schema names using aliases."""
        canonical_map = {}
        unmapped = []
        required = Config.REQUIRED_COLUMNS
        aliases = Config.COLUMN_ALIASES

        for col in columns:
            clean_col = str(col).strip().replace('"', '').replace("'", "").lower()
            matched = None

            if clean_col in required:
                matched = clean_col
            else:
                for canon, syns in aliases.items():
                    if clean_col in syns:
                        matched = canon
                        break

            if matched:
                canonical_map[col] = matched
            else:
                unmapped.append(col)

        # Check missing required columns
        mapped_values = set(canonical_map.values())
        missing = [col for col in required if col not in mapped_values]

        return canonical_map, unmapped, missing

    @classmethod
    def validate_and_clean(cls, file_stream, filename: str):
        """
        Validates file stream, decodes content, verifies schema, cleans data,
        and returns a standardized pandas DataFrame.
        """
        if not filename or not filename.lower().endswith('.csv'):
            raise ValidationError("File must have a .csv extension.")

        # Read bytes
        content_bytes = file_stream.read()
        if not content_bytes or len(content_bytes.strip()) == 0:
            raise ValidationError("The uploaded CSV file is empty.")

        # Decode with fallback
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                text_content = content_bytes.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValidationError("Unable to decode file encoding. Please ensure the CSV is UTF-8 encoded.")

        # Sample for delimiter
        sample = text_content[:4096]
        delimiter = cls.detect_delimiter(sample)

        # Parse CSV with pandas
        try:
            df_raw = pd.read_csv(io.StringIO(text_content), sep=delimiter, engine='python')
        except Exception as e:
            raise ValidationError(f"Failed to parse CSV format: {str(e)}")

        if df_raw.empty or len(df_raw.columns) == 0:
            raise ValidationError("The uploaded CSV contains no valid data rows or headers.")

        canonical_map, unmapped, missing = cls.map_columns(df_raw.columns)

        # The target outcome column 'y' is strictly required
        if 'y' in missing:
            raise ValidationError(
                f"Missing required target outcome column ('y', 'deposit', or 'subscribed'). Found columns: {list(df_raw.columns)}",
                details={'missing_columns': missing, 'found_columns': list(df_raw.columns)}
            )

        # Rename mapped columns
        df = df_raw.rename(columns=canonical_map)

        # Drop columns that are not part of canonical schema
        keep_cols = [c for c in Config.REQUIRED_COLUMNS if c in df.columns]
        df = df[keep_cols]

        # Add missing non-target columns with safe defaults
        for col in Config.REQUIRED_COLUMNS:
            if col not in df.columns:
                if col in ['age', 'balance', 'day', 'duration', 'campaign', 'pdays', 'previous']:
                    df[col] = 0
                else:
                    df[col] = 'unknown'

        total_rows = len(df)

        # Clean & standardize target column 'y'
        def standardize_y(val):
            s = str(val).strip().lower()
            if s in ['yes', 'y', '1', 'true', 'success', 'subscribed']:
                return 'yes'
            return 'no'

        df['y'] = df['y'].apply(standardize_y)

        # Numeric conversions with safe coercions
        numeric_cols = ['age', 'balance', 'day', 'duration', 'campaign', 'pdays', 'previous']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            if col in ['age', 'day', 'duration', 'campaign', 'pdays', 'previous']:
                df[col] = df[col].astype(int)

        # String columns cleanup
        str_cols = ['job', 'marital', 'education', 'default', 'housing', 'loan', 'contact', 'month', 'poutcome']
        for col in str_cols:
            df[col] = df[col].astype(str).str.strip().str.lower().replace({'nan': 'unknown', 'none': 'unknown', '': 'unknown'})

        # Drop exact duplicates if present
        initial_count = len(df)
        df = df.drop_duplicates()
        duplicates_removed = initial_count - len(df)

        return {
            'valid': True,
            'df': df,
            'total_rows': total_rows,
            'valid_rows': len(df),
            'duplicates_removed': duplicates_removed,
            'delimiter': delimiter,
            'missing_optional_columns': missing
        }

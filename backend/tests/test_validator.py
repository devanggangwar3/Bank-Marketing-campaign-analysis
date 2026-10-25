"""
Unit Tests for CSV Validator & Data Cleaning Service
"""
import io
import pytest
from backend.services.validator import CSVValidator, ValidationError

def test_detect_delimiter():
    assert CSVValidator.detect_delimiter("age,job,y\n30,student,yes") == ','
    assert CSVValidator.detect_delimiter("age;job;y\n30;student;yes") == ';'
    assert CSVValidator.detect_delimiter("age\tjob\ty\n30\tstudent\tyes") == '\t'

def test_validate_non_csv_extension():
    stream = io.BytesIO(b"dummy content")
    with pytest.raises(ValidationError, match="must have a .csv extension"):
        CSVValidator.validate_and_clean(stream, "data.xlsx")

def test_validate_empty_file():
    stream = io.BytesIO(b"")
    with pytest.raises(ValidationError, match="file is empty"):
        CSVValidator.validate_and_clean(stream, "empty.csv")

def test_validate_missing_target_column():
    csv_data = "age,job,balance\n30,student,1000\n45,retired,2000"
    stream = io.BytesIO(csv_data.encode('utf-8'))
    with pytest.raises(ValidationError, match="Missing required target outcome column"):
        CSVValidator.validate_and_clean(stream, "no_target.csv")

def test_validate_alias_mapping():
    # 'deposit' instead of 'y'
    csv_data = "age,job,marital,education,default,balance,housing,loan,contact,day,month,duration,campaign,pdays,previous,poutcome,deposit\n25,student,single,tertiary,no,800,no,no,cellular,12,may,180,1,-1,0,unknown,yes"
    stream = io.BytesIO(csv_data.encode('utf-8'))
    result = CSVValidator.validate_and_clean(stream, "alias_test.csv")
    assert result['valid'] is True
    assert 'y' in result['df'].columns
    assert result['df']['y'].iloc[0] == 'yes'

def test_validate_target_standardization():
    csv_data = "age,y\n30,yes\n35,no\n40,1\n45,0\n50,true\n55,false\n60,success"
    stream = io.BytesIO(csv_data.encode('utf-8'))
    result = CSVValidator.validate_and_clean(stream, "target_std.csv")
    df = result['df']
    assert set(df['y'].unique()) == {'yes', 'no'}
    assert df['y'].iloc[2] == 'yes' # 1 -> yes
    assert df['y'].iloc[3] == 'no'  # 0 -> no
    assert df['y'].iloc[4] == 'yes' # true -> yes

def test_duplicate_rows_removal():
    csv_data = "age,y\n30,yes\n30,yes\n40,no"
    stream = io.BytesIO(csv_data.encode('utf-8'))
    result = CSVValidator.validate_and_clean(stream, "duplicates.csv")
    assert result['duplicates_removed'] == 1
    assert len(result['df']) == 2

/**
 * Bank Marketing Campaign Analysis Dashboard
 * Robust CSV Parsing, Schema Validation & Template Generation Engine
 */

const CSVEngine = {
  /**
   * Detects delimiter: comma (,), semicolon (;), or tab (\t)
   */
  detectDelimiter(firstLine) {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return ',';
  },

  /**
   * Parse a single CSV line honoring double quotes and escaped quotes
   */
  parseLine(line, delimiter) {
    const result = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote: "" -> "
          cur += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  },

  /**
   * Normalizes header names and maps synonyms to canonical schema names
   */
  mapHeaders(headers) {
    const canonicalMap = {};
    const unmapped = [];
    const missing = [];
    const required = APP_CONFIG.schema.requiredColumns;
    const aliases = APP_CONFIG.schema.aliases;

    headers.forEach((h, idx) => {
      const cleanHeader = h.replace(/^["']|["']$/g, '').trim().toLowerCase();
      let matchedCanonical = null;

      // Direct match
      if (required.includes(cleanHeader)) {
        matchedCanonical = cleanHeader;
      } else {
        // Alias match
        for (const [canon, syns] of Object.entries(aliases)) {
          if (syns.includes(cleanHeader)) {
            matchedCanonical = canon;
            break;
          }
        }
      }

      if (matchedCanonical) {
        canonicalMap[idx] = matchedCanonical;
      } else {
        unmapped.push(cleanHeader);
      }
    });

    // Check which required fields are missing
    const mappedValues = Object.values(canonicalMap);
    required.forEach(req => {
      if (!mappedValues.includes(req)) {
        missing.push(req);
      }
    });

    return { canonicalMap, unmapped, missing };
  },

  /**
   * Main CSV string parser & validator
   */
  parse(csvText) {
    if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
      return {
        success: false,
        error: 'The uploaded file is empty.',
        records: [],
        stats: null
      };
    }

    const rawLines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (rawLines.length < 2) {
      return {
        success: false,
        error: 'CSV must contain at least a header row and one data record.',
        records: [],
        stats: null
      };
    }

    const delimiter = this.detectDelimiter(rawLines[0]);
    const headerRow = this.parseLine(rawLines[0], delimiter);
    const { canonicalMap, unmapped, missing } = this.mapHeaders(headerRow);

    // If critical outcome column 'y' is missing, report error
    if (missing.includes('y')) {
      return {
        success: false,
        error: `Missing required target outcome column ('y' or 'deposit' or 'subscribed'). Found columns: ${headerRow.join(', ')}`,
        missingColumns: missing,
        records: [],
        stats: null
      };
    }

    const validRecords = [];
    const errors = [];
    let rowId = 1;

    for (let i = 1; i < rawLines.length; i++) {
      const lineNum = i + 1;
      const values = this.parseLine(rawLines[i], delimiter);

      // Check column length consistency
      if (values.length < Object.keys(canonicalMap).length) {
        errors.push({
          row: lineNum,
          reason: `Insufficient columns (expected ${headerRow.length}, found ${values.length})`
        });
        continue;
      }

      const record = { id: rowId++ };

      // Map values
      for (const [idx, canonicalKey] of Object.entries(canonicalMap)) {
        let val = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';

        // Type conversion
        if (['age', 'balance', 'day', 'duration', 'campaign', 'pdays', 'previous'].includes(canonicalKey)) {
          const num = Number(val);
          val = isNaN(num) ? 0 : num;
        } else if (canonicalKey === 'y') {
          // Standardize outcome to 'yes' or 'no'
          const lower = val.toLowerCase();
          if (['yes', 'y', '1', 'true', 'success'].includes(lower)) {
            val = 'yes';
          } else {
            val = 'no';
          }
        } else {
          val = (val || 'unknown').toLowerCase();
        }

        record[canonicalKey] = val;
      }

      // Fill in safe defaults if any optional fields were unmapped
      APP_CONFIG.schema.requiredColumns.forEach(col => {
        if (record[col] === undefined) {
          if (['age', 'balance', 'day', 'duration', 'campaign', 'pdays', 'previous'].includes(col)) {
            record[col] = 0;
          } else {
            record[col] = 'unknown';
          }
        }
      });

      validRecords.push(record);
    }

    return {
      success: true,
      records: validRecords,
      stats: {
        totalRowsDetected: rawLines.length - 1,
        validRowsParsed: validRecords.length,
        invalidRowsSkipped: errors.length,
        errors: errors.slice(0, 10), // Limit top 10 error lines
        delimiter,
        missingColumnsWarning: missing
      }
    };
  },

  /**
   * Triggers download of sample benchmark CSV
   */
  downloadSampleTemplate() {
    // If window.DEMO_CAMPAIGN_DATA exists, generate from first 250 records
    const sampleRows = (window.DEMO_CAMPAIGN_DATA || []).slice(0, 300);
    const cols = APP_CONFIG.schema.requiredColumns;
    
    let csv = cols.join(',') + '\r\n';
    sampleRows.forEach(r => {
      const line = cols.map(c => {
        const val = r[c] !== undefined ? r[c] : '';
        // If string contains comma, quote it
        return String(val).includes(',') ? `"${val}"` : val;
      }).join(',');
      csv += line + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_bank_marketing_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Export array of records to downloadable CSV
   */
  exportRecordsToCsv(records, filename = 'bank_marketing_filtered_data.csv') {
    if (!records || records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const cols = APP_CONFIG.schema.requiredColumns;
    let csv = ['id', ...cols].join(',') + '\r\n';

    records.forEach(r => {
      const row = ['id', ...cols].map(c => {
        const val = r[c] !== undefined ? r[c] : '';
        return String(val).includes(',') ? `"${val}"` : val;
      }).join(',');
      csv += row + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

if (typeof window !== 'undefined') {
  window.CSVEngine = CSVEngine;
}

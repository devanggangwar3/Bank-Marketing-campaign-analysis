# Bank Marketing Campaign Analysis Dashboard & REST API

A modern, responsive, and professional Business Intelligence (BI) software for bank marketing teams to analyze campaign performance, customer response rates, marketing outreach fatigue, and demographic segments.

Built with a **Python Flask REST API** backed by **Pandas, NumPy, SQLite, and Matplotlib**, paired with an **interactive HTML5, CSS3, JavaScript, and Chart.js frontend**.

---

## 🌟 System Highlights

- **Full-Stack End-to-End Operation**: Real-time synchronization between the JavaScript BI frontend and the Python Flask backend.
- **Data-Driven Analysis**: Computes exact conversion rates, total contacts, call durations, and benchmark variances dynamically.
- **Marketing Fatigue Detection**: Analyzes response rate decay across contact attempts (1, 2, 3, 4, 5+ touches) to identify fatigue thresholds.
- **Actionable Observations to Test**: Automated insights formulated strictly as empirical hypotheses with sample sizes ($N=\dots$) rather than unsubstantiated claims.
- **Robust Ingestion Engine**: Validates uploaded CSV files against required schema columns, handles delimiters (`,` and `;`), removes duplicates, coerces types safely, and stores records in SQLite.
- **Dual Operating Modes**: Connected to Flask REST API by default with seamless offline in-memory fallback if the backend is stopped.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Python 3.13, Flask 3.1, Flask-CORS, Werkzeug |
| **Data Processing** | Pandas 2.2, NumPy 2.2 |
| **Database** | SQLite3 (Parameterized, metadata tracking, analysis history) |
| **Visual Reports** | Matplotlib (Headless PNG export), CSV RFC-4180 exporter |
| **Testing** | Pytest 8.3 (Unit tests for validation, analytics, and endpoints) |
| **Frontend UI** | HTML5, CSS3, Modern Navy Theme (`#0B1528`), Bootstrap 5.3, Bootstrap Icons |
| **Charts** | Chart.js 4.4 (Dynamic gradients, tooltips, responsive canvas) |

---

## 📂 Project Architecture

```
Bank-Marketing-campaign-analysis/
├── backend/                             # Python Flask Backend
│   ├── app.py                           # Application factory & runner (Port 5000)
│   ├── config.py                        # Configuration settings, benchmarks, schema
│   ├── database.py                      # SQLite initialization & auto-seeding
│   ├── requirements.txt                 # Backend Python dependencies
│   ├── .env.example                     # Environment configuration template
│   ├── models/
│   │   ├── __init__.py
│   │   └── dataset_metadata.py          # Data access layer & parameterized queries
│   ├── services/
│   │   ├── __init__.py
│   │   ├── validator.py                 # CSV validation, schema & type checker
│   │   ├── analytics_service.py         # Pandas/NumPy computational engine
│   │   └── report_service.py            # Matplotlib PNG & CSV report generator
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py                    # GET /api/health
│   │   ├── upload.py                    # POST /api/upload & POST /api/reset-demo
│   │   ├── dashboard.py                 # GET /api/dashboard
│   │   ├── analytics.py                 # GET /api/analytics/* (period, channel, etc.)
│   │   ├── insights.py                  # GET /api/insights
│   │   ├── reports.py                   # GET /api/reports/export
│   │   └── filters.py                   # GET /api/filters & GET /api/data/records
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_validator.py            # Tests for CSV parser, edge cases & duplicates
│   │   ├── test_analytics.py            # Tests for response rates, zero denominators
│   │   └── test_api.py                  # Integration tests for all Flask API endpoints
│   └── data/
│       └── bank_campaign.db             # SQLite database storing active datasets
├── assets/                              # Frontend Assets
│   ├── css/
│   │   ├── variables.css                # Color tokens, typography, radii, elevations
│   │   ├── layout.css                   # Sidebar, topbar, mobile drawer, print styles
│   │   ├── components.css               # KPI cards, filters, tables, dropzone, toasts
│   │   └── dashboard.css                # Chart wrappers, doughnut center, report layout
│   └── js/
│       ├── config.js                    # Schema rules, column aliases, benchmarks
│       ├── api.js                       # REST API client connecting to Flask
│       ├── state.js                     # Reactive state store & server sync
│       ├── csvParser.js                 # Client-side fallback CSV parser
│       ├── analytics.js                 # Client-side fallback analytics
│       ├── charts.js                    # Chart.js renderers
│       ├── ui.js                        # DOM manipulation, table pagination, toasts
│       ├── app.js                       # Bootstrap controller
│       └── data/
│           └── demoData.js              # Preloaded benchmark dataset (1,250 records)
├── sample_bank_marketing_data.csv       # Downloadable sample dataset (1,250 records)
├── server.js                            # Node static web server with auto-browser launch
├── package.json                         # NPM scripts for frontend, backend, and tests
├── index.html                           # Main SPA frontend
└── README.md                            # Complete documentation
```

---

## 🚀 How to Run Frontend and Backend Together

### Step 1: Start the Backend (Terminal 1)
```powershell
python backend/app.py
```
*(or using npm: `npm run backend`)*
- Runs at: `http://localhost:5000`
- Automatically initializes the SQLite database and seeds the 1,250 benchmark records.

### Step 2: Start the Frontend (Terminal 2)
```powershell
npm run dev
```
- Runs at: `http://localhost:3000`
- Automatically opens the dashboard in your default browser.
- Automatically connects to the Flask API at `http://localhost:5000/api`.

---

## 🧪 Running Automated Tests

Run the complete backend test suite (23 test cases):
```powershell
npm test
```
or
```powershell
python -m pytest backend/tests -v
```

Tests cover:
- CSV validation, delimiter detection (`,`, `;`, `\t`), empty files, non-CSV files, and missing target columns.
- Standardized outcome conversion (`1`/`0`, `yes`/`no`, `true`/`false`).
- Zero-denominator handling and safe division.
- Contact fatigue buckets and chronological month sorting.
- Campaign ROI & Budget simulations with touchpoint capping models.
- Financial balance tier segmentation and liquidity conversion analysis.
- Predictive lead scoring algorithms and single-lead propensity calculator.
- Cohort A/B comparative testing with two-proportion Z-tests and p-value statistical significance.
- Flask endpoints (`/api/health`, `/api/dashboard`, `/api/upload`, `/api/analytics/*`, `/api/insights`, `/api/reports/export`).

---

## 📡 REST API Documentation

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/health` | Checks backend health and active dataset status | None |
| `POST` | `/api/upload` | Ingests and validates a CSV dataset file into SQLite | Multipart form with `file` |
| `POST` | `/api/reset-demo` | Restores default benchmark cohort in database | None |
| `GET` | `/api/dashboard` | Returns overall campaign KPIs and outcome breakdown | `month`, `job`, `education`, `contact`, `outcome`, `marital`, `touches`, `search` |
| `GET` | `/api/analytics/period` | Returns monthly response rates and volumes | Same as dashboard |
| `GET` | `/api/analytics/channel` | Returns response rates by communication channel | Same as dashboard |
| `GET` | `/api/analytics/frequency`| Returns contact fatigue decay across touchpoints | Same as dashboard |
| `GET` | `/api/analytics/segments` | Returns breakdown by Job, Education, Age, Housing | Same as dashboard |
| `GET` | `/api/analytics/roi` | Simulates spend, gross revenue, net profit, ROI, and fatigue savings | `cost_per_contact`, `value_per_conversion`, `touch_cap`, plus filter params |
| `GET` | `/api/analytics/balance` | Returns breakdown by customer account balance brackets | Same as dashboard |
| `GET` | `/api/analytics/propensity` | Returns cohort-wide predictive lead propensity distribution | Same as dashboard |
| `POST` | `/api/analytics/propensity/score` | Scores single lead profile with conversion probability and strategy | JSON payload with customer attributes |
| `POST` | `/api/analytics/cohort-compare` | Head-to-head A/B cohort test with Z-test and p-value | JSON payload: `{"cohortA": "...", "cohortB": "..."}` or query params |
| `GET` | `/api/insights` | Returns dynamic observations and test recommendations | Same as dashboard |
| `GET` | `/api/filters` | Returns available distinct values for filter selects | None |
| `GET` | `/api/data/records` | Returns paginated, sorted customer records for table | `page`, `page_size`, `sort_by`, `sort_dir`, and filter params |
| `GET` | `/api/reports/export` | Exports filtered dataset (CSV) or Matplotlib chart (PNG) | `format=csv` (default) or `format=png`, plus filter params |

---

## 📋 Recognized Dataset Schema

The application supports the standard UCI Bank Marketing dataset format:
| Column | Type | Description |
|---|---|---|
| `age` | Numeric | Customer age (years) |
| `job` | String | Occupation (`management`, `technician`, `student`, `retired`, etc.) |
| `marital` | String | Marital status (`married`, `single`, `divorced`) |
| `education` | String | Education level (`tertiary`, `secondary`, `primary`, `unknown`) |
| `default` | String | Credit in default? (`yes`, `no`) |
| `balance` | Numeric | Average yearly balance ($ or €) |
| `housing` | String | Has housing loan? (`yes`, `no`) |
| `loan` | String | Has personal loan? (`yes`, `no`) |
| `contact` | String | Contact channel (`cellular`, `telephone`, `unknown`) |
| `day` | Numeric | Last contact day of month (1-31) |
| `month` | String | Last contact month (`jan` - `dec`) |
| `duration` | Numeric | Last contact duration (seconds) |
| `campaign` | Numeric | Number of contacts during this campaign |
| `pdays` | Numeric | Days since client was last contacted from prior campaign (-1 = none) |
| `previous` | Numeric | Number of contacts performed prior to this campaign |
| `poutcome` | String | Outcome of prior marketing campaign (`success`, `failure`, `unknown`) |
| **`y`** | String | **Target variable**: Subscribed to term deposit? (`yes`, `no`) |
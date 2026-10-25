# Bank Marketing Campaign Analysis Dashboard

A modern, responsive, and professional Business Intelligence (BI) frontend for analyzing bank marketing campaigns, customer conversion rates, marketing outreach fatigue, and demographic segments.

Built for bank marketing teams, analysts, and growth directors to evaluate campaign performance, test actionable hypotheses, compare customer cohorts, and optimize future outreach strategies.

---

## 🌟 Key Features

### 1. Executive Dashboard
- **Real-Time KPIs**: Total Customers ($N$), Campaign Outreach Contacts ($\sum \text{Touches}$), Successful Conversions ($y = \text{yes}$), and Overall Response Rate ($\%$) with variance against industry benchmarks (11.5%).
- **Contact Period Response Chart**: Bar chart tracking monthly conversion rates against benchmark targets.
- **Outcome Distribution**: Doughnut visualization of accepted vs. declined deposit subscriptions with animated center percentage.
- **Automated Insights**: Dynamic analytical cards formulated explicitly as **"Observations to Test"** with sample size ($N=\dots$) indicators.

### 2. Campaign Outreach & Fatigue Analytics
- **Contact Fatigue Curve**: Visualizes conversion decay across touchpoint counts (1, 2, 3, 4, 5+ touches) to identify diminishing returns and prevent prospect burnout.
- **Channel Effectiveness**: Response rates across cellular mobile, fixed landline, and unknown communication channels.
- **Secondary Metrics**: Unsuccessful response volume, average call duration, and repeat customer conversion rates.

### 3. Customer Demographic & Financial Segments
- **Occupational Breakdown**: Ranked horizontal bar chart comparing conversion rates across management, blue-collar, retired, student, and other job roles.
- **Education & Debt Correlation**: Cross-tabulation of education levels (Primary, Secondary, Tertiary) vs. existing housing loans.
- **Demographic Cohort Bars**: Interactive comparison bars for age brackets (<30, 30-45, 46-60, >60) and balance tiers.

### 4. Dataset Ingestion & Validation (CSV Upload)
- **Drag-and-Drop Dropzone**: Upload custom bank campaign datasets in `.csv` format (supports comma `,` and semicolon `;` delimiters).
- **Schema Validation Engine**: Checks required columns (`age`, `job`, `marital`, `education`, `default`, `balance`, `housing`, `loan`, `contact`, `day`, `month`, `duration`, `campaign`, `pdays`, `previous`, `poutcome`, `y`), with alias matching (`deposit`, `subscribed`, etc.).
- **Searchable, Sortable, Paginated Table**: Instant multi-column filtering, sortable column headers, custom page sizes (10, 25, 50, 100), and numbered page controls.
- **Sample Template Download**: Direct button to download `sample_bank_marketing_data.csv` for immediate testing.

### 5. Executive Reports
- **C-Suite Scorecard**: Performance metrics, sample sizes, and benchmark variances.
- **Print-Friendly Layout**: Dedicated `@media print` styling that formats the report cleanly for PDF export or printing (removes sidebars, navbars, and buttons).
- **CSV Data Export**: Export active filtered datasets for downstream modeling in Python, R, or Excel.

### 6. Settings & Future REST API Backend Connector
- Pre-configured API endpoint inputs (`/api/campaigns/analytics`, `/api/campaigns/upload`, `/api/campaigns/insights`) ready for immediate binding to Python (FastAPI/Flask), Node.js, or Django backends.
- In-memory cache reset button to restore default benchmark state at any time.

---

## 🛠️ Technology Stack

- **HTML5 & Vanilla CSS3**: Custom design tokens, elevations, responsive flex/grid layouts, and clean CSS variables.
- **Modern Color Theme**: Professional Navy Blue (`#0B1528`), Slate Gray (`#1E293B`, `#64748B`), and Emerald/Amber/Rose accents.
- **Bootstrap 5.3.3 & Bootstrap Icons 1.11.3**: Responsive mobile drawer and iconography.
- **Chart.js 4.4.2**: Interactive, accessible data visualizations with custom tooltips and gradients.
- **Pure JavaScript (ES6+)**: Zero framework lock-in, modular architecture with reactive state management.

---

## 📂 Project Architecture

```
Bank-Marketing-campaign-analysis/
├── index.html                           # Main SPA entry point & dashboard layout
├── sample_bank_marketing_data.csv       # Downloadable sample dataset (1,250 records)
├── README.md                            # Comprehensive documentation
├── assets/
│   ├── css/
│   │   ├── variables.css                # Color tokens, typography, radii, elevations
│   │   ├── layout.css                   # Sidebar, topbar, responsive drawer, print CSS
│   │   ├── components.css               # KPI cards, filters, tables, dropzone, toasts
│   │   └── dashboard.css                # Chart wrappers, doughnut center, report banner
│   └── js/
│       ├── config.js                    # Schema rules, column aliases, benchmarks
│       ├── state.js                     # Central reactive state store & subscriptions
│       ├── csvParser.js                 # RFC-compliant CSV parser & delimiter detector
│       ├── analytics.js                 # Statistical computation & insight generator
│       ├── charts.js                    # Chart.js renderers & lifecycle manager
│       ├── ui.js                        # DOM manipulation, table pagination, toasts
│       ├── app.js                       # Bootstrap controller & application entry
│       └── data/
│           └── demoData.js              # 1,250 benchmark bank marketing records
```

---

## 🚀 How to Run Locally

### Option A: Using NPM (Recommended)
Simply run:
```bash
npm run dev
```
or
```bash
npm start
```
This automatically starts the local server and **opens the dashboard directly in your default browser** at `http://localhost:3000`.

### Option B: Using Python
In PowerShell or terminal, run:
```bash
python -m http.server 8080
```
Then open your browser to `http://localhost:8080`.

### Option C: Direct File Open
Double-click [index.html](file:///c:/Users/devang/OneDrive/desktop/bank/Bank-Marketing-campaign-analysis/index.html) to open it directly in any modern browser.

---

## 📋 Recognized Dataset Schema

The CSV parser supports the standard UCI Bank Marketing schema:
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
| **`y`** | String | **Target variable**: Did client subscribe to term deposit? (`yes`, `no`) |
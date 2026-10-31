/**
 * BankPulse BI - REST API Client Module
 * Communicates with the Flask Python backend (http://localhost:5000/api)
 */

const ApiClient = {
  getBaseUrl() {
    return localStorage.getItem('BANK_BI_API_URL') || (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || 'http://localhost:5000/api';
  },

  setBaseUrl(url) {
    if (url) {
      localStorage.setItem('BANK_BI_API_URL', url.replace(/\/+$/, ''));
    }
  },

  buildQuery(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== 'all' && val !== '') {
        params.append(key, val);
      }
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  },

  async request(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      } else {
        const text = await res.text();
        return { ok: res.ok, status: res.status, data: text };
      }
    } catch (err) {
      return {
        ok: false,
        status: 0,
        error: err.message || 'Network connection failed'
      };
    }
  },

  // 1. Health Check
  async checkHealth() {
    return await this.request('/health');
  },

  // 2. Dashboard KPIs & Outcomes
  async fetchDashboard(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/dashboard${qs}`);
  },

  // 3. Analytics: Contact Period
  async fetchPeriodAnalytics(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/analytics/period${qs}`);
  },

  // 4. Analytics: Channel
  async fetchChannelAnalytics(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/analytics/channel${qs}`);
  },

  // 5. Analytics: Frequency / Fatigue
  async fetchFrequencyAnalytics(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/analytics/frequency${qs}`);
  },

  // 6. Analytics: Customer Segments
  async fetchSegmentAnalytics(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/analytics/segments${qs}`);
  },

  // 7. Dynamic Insights
  async fetchInsights(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/insights${qs}`);
  },

  // 8. Available Filters
  async fetchFilterOptions() {
    return await this.request('/filters');
  },

  // 8b. Analytics: Campaign ROI & Budget Simulator
  async fetchRoiAnalytics(cost = 4.5, value = 200, touchCap = null, filters = {}) {
    const qObj = { cost_per_contact: cost, value_per_conversion: value, ...filters };
    if (touchCap !== null && touchCap !== undefined) qObj.touch_cap = touchCap;
    const qs = this.buildQuery(qObj);
    return await this.request(`/analytics/roi${qs}`);
  },

  // 8c. Analytics: Financial Balance Tiers
  async fetchBalanceAnalytics(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/analytics/balance${qs}`);
  },

  // 8d. Analytics: Predictive Propensity Engine
  async fetchPropensityAnalytics(filters = {}) {
    const qs = this.buildQuery(filters);
    return await this.request(`/analytics/propensity${qs}`);
  },

  // 8e. Propensity: Score Single Lead Profile
  async scoreSingleLead(leadData) {
    return await this.request('/analytics/propensity/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });
  },

  // 8f. Analytics: Cohort A/B Comparison
  async fetchCohortComparison(cohortA = 'cellular', cohortB = 'telephone', filters = {}) {
    const qs = this.buildQuery({ cohortA, cohortB, ...filters });
    return await this.request(`/analytics/cohort-compare${qs}`);
  },

  // 9. Paginated & Sorted Records for Data Table
  async fetchRecords(page = 1, pageSize = 10, sortBy = 'id', sortDir = 'asc', filters = {}) {
    const queryObj = {
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_dir: sortDir,
      ...filters
    };
    const qs = this.buildQuery(queryObj);
    return await this.request(`/data/records${qs}`);
  },

  // 10. Upload CSV Dataset
  async uploadCsv(file) {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/upload`;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, error: err.message };
    }
  },

  // 11. Reset to Default Benchmark Dataset
  async resetDemo() {
    return await this.request('/reset-demo', { method: 'POST' });
  },

  // 12. Export Report (CSV / PNG)
  getExportUrl(filters = {}, format = 'csv') {
    const qs = this.buildQuery({ ...filters, format });
    return `${this.getBaseUrl()}/reports/export${qs}`;
  }
};

if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}

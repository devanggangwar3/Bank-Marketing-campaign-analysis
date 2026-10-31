/**
 * Bank Marketing Campaign Analysis Dashboard
 * Central State Store & Reactive Event Dispatcher
 * Seamlessly integrates with Python Flask REST backend (with graceful offline fallback)
 */

class AppStateStore {
  constructor() {
    this.state = {
      rawDataset: [],
      activeSource: 'demo', // 'demo' | 'upload'
      sourceDisplayName: 'Benchmark Cohort (Demo)',
      fileName: null,
      lastUpdated: new Date(),
      backendConnected: false,
      backendInfo: null,
      isLoading: false,

      // Filter settings
      filters: {
        month: 'all',
        job: 'all',
        education: 'all',
        contact: 'all',
        outcome: 'all', // 'all' | 'yes' | 'no'
        marital: 'all',
        housing: 'all', // 'all' | 'yes' | 'no'
        balanceTier: 'all', // 'all' | 'negative' | 'low' | 'mid' | 'high' | 'affluent'
        touches: 'all', // 'all' | '1' | '2' | '3' | '4+'
        searchQuery: ''
      },

      // ROI simulator parameters
      roiParams: {
        costPerContact: 4.50,
        valuePerConversion: 200.0,
        touchCap: 'all'
      },

      // Cohort comparison selection
      cohortParams: {
        cohortA: 'cellular',
        cohortB: 'telephone'
      },

      // Backend API aggregated cache
      apiData: {
        kpis: null,
        periods: null,
        channels: null,
        frequencies: null,
        segments: null,
        insights: null,
        tableRecords: null,
        totalRecords: 0,
        roi: null,
        balance: null,
        propensity: null,
        cohorts: null
      },

      // Table pagination and sorting
      table: {
        currentPage: 1,
        pageSize: 10,
        sortColumn: 'id',
        sortDirection: 'asc'
      },

      // Active view tab
      activeView: 'dashboard'
    };

    this.listeners = [];
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify(eventType = 'change') {
    this.listeners.forEach(fn => {
      try {
        fn(this.state, eventType);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  async checkBackendConnection() {
    try {
      const res = await ApiClient.checkHealth();
      if (res.ok && res.data && res.data.status === 'healthy') {
        this.state.backendConnected = true;
        this.state.backendInfo = res.data;
        if (res.data.activeDataset) {
          this.state.sourceDisplayName = `${res.data.activeDataset} (${(res.data.activeDatasetRows || 0).toLocaleString()} records)`;
        }
        await this.syncWithBackend();
        return true;
      }
    } catch (e) {
      console.warn('Backend API offline. Running in client-side in-memory mode.');
    }
    this.state.backendConnected = false;
    return false;
  }

  async syncWithBackend() {
    if (!this.state.backendConnected) return;

    this.state.isLoading = true;
    const f = {
      month: this.state.filters.month,
      job: this.state.filters.job,
      education: this.state.filters.education,
      contact: this.state.filters.contact,
      outcome: this.state.filters.outcome,
      marital: this.state.filters.marital,
      housing: this.state.filters.housing,
      balance_tier: this.state.filters.balanceTier,
      touches: this.state.filters.touches,
      search: this.state.filters.searchQuery
    };

    const roiP = this.state.roiParams;
    const cohortP = this.state.cohortParams;

    try {
      // Parallel fetch for speed
      const [dashRes, periodRes, channelRes, freqRes, segRes, insRes, recRes, roiRes, balRes, propRes, cohortRes] = await Promise.all([
        ApiClient.fetchDashboard(f),
        ApiClient.fetchPeriodAnalytics(f),
        ApiClient.fetchChannelAnalytics(f),
        ApiClient.fetchFrequencyAnalytics(f),
        ApiClient.fetchSegmentAnalytics(f),
        ApiClient.fetchInsights(f),
        ApiClient.fetchRecords(
          this.state.table.currentPage,
          this.state.table.pageSize,
          this.state.table.sortColumn,
          this.state.table.sortDirection,
          f
        ),
        ApiClient.fetchRoiAnalytics(roiP.costPerContact, roiP.valuePerConversion, roiP.touchCap === 'all' ? null : roiP.touchCap, f),
        ApiClient.fetchBalanceAnalytics(f),
        ApiClient.fetchPropensityAnalytics(f),
        ApiClient.fetchCohortComparison(cohortP.cohortA, cohortP.cohortB, f)
      ]);

      if (dashRes.ok && dashRes.data) {
        this.state.apiData.kpis = dashRes.data.kpis;
        this.state.apiData.outcomeDistribution = dashRes.data.outcomeDistribution;
        if (dashRes.data.activeDataset && dashRes.data.activeDataset.filename) {
          const fn = dashRes.data.activeDataset.filename;
          const count = dashRes.data.activeDataset.filteredRecords !== undefined
            ? dashRes.data.activeDataset.filteredRecords
            : dashRes.data.activeDataset.totalRecords;
          this.state.sourceDisplayName = `${fn} (${count.toLocaleString()} records)`;
        }
      }

      if (periodRes.ok && periodRes.data) this.state.apiData.periods = periodRes.data.periods;
      if (channelRes.ok && channelRes.data) this.state.apiData.channels = channelRes.data.channels;
      if (freqRes.ok && freqRes.data) this.state.apiData.frequencies = freqRes.data.frequencies;
      if (segRes.ok && segRes.data) this.state.apiData.segments = segRes.data;
      if (insRes.ok && insRes.data) this.state.apiData.insights = insRes.data.insights;
      if (recRes.ok && recRes.data) {
        this.state.apiData.tableRecords = recRes.data.records;
        this.state.apiData.totalRecords = recRes.data.totalRecords;
      }
      if (roiRes.ok && roiRes.data) this.state.apiData.roi = roiRes.data;
      if (balRes.ok && balRes.data) this.state.apiData.balance = balRes.data;
      if (propRes.ok && propRes.data) this.state.apiData.propensity = propRes.data;
      if (cohortRes.ok && cohortRes.data) this.state.apiData.cohorts = cohortRes.data;
    } catch (err) {
      console.error('Failed to sync with backend:', err);
    } finally {
      this.state.isLoading = false;
      this.notify('api_synced');
    }
  }

  setDataset(records, source = 'demo', fileName = null) {
    this.state.rawDataset = records;
    this.state.activeSource = source;
    this.state.fileName = fileName;
    this.state.sourceDisplayName = source === 'demo'
      ? `Benchmark Cohort (${records.length.toLocaleString()} records)`
      : `${fileName || 'Uploaded Dataset'} (${records.length.toLocaleString()} records)`;
    this.state.lastUpdated = new Date();
    
    this.resetFilters(false);
    this.state.table.currentPage = 1;

    if (this.state.backendConnected) {
      this.syncWithBackend();
    } else {
      this.notify('dataset_changed');
    }
  }

  setFilter(key, value) {
    if (this.state.filters[key] !== value) {
      this.state.filters[key] = value;
      this.state.table.currentPage = 1;
      if (this.state.backendConnected) {
        this.syncWithBackend();
      } else {
        this.notify('filters_changed');
      }
    }
  }

  setRoiParams(cost, value, cap) {
    if (cost !== undefined && cost !== null) this.state.roiParams.costPerContact = Number(cost);
    if (value !== undefined && value !== null) this.state.roiParams.valuePerConversion = Number(value);
    if (cap !== undefined && cap !== null) this.state.roiParams.touchCap = cap;

    if (this.state.backendConnected) {
      this.syncWithBackend();
    } else {
      this.notify('roi_changed');
    }
  }

  setCohortSelection(cohortA, cohortB) {
    if (cohortA) this.state.cohortParams.cohortA = cohortA;
    if (cohortB) this.state.cohortParams.cohortB = cohortB;

    if (this.state.backendConnected) {
      this.syncWithBackend();
    } else {
      this.notify('cohort_changed');
    }
  }

  resetFilters(notify = true) {
    this.state.filters = {
      month: 'all',
      job: 'all',
      education: 'all',
      contact: 'all',
      outcome: 'all',
      marital: 'all',
      housing: 'all',
      balanceTier: 'all',
      touches: 'all',
      searchQuery: ''
    };
    this.state.table.currentPage = 1;
    if (notify) {
      if (this.state.backendConnected) {
        this.syncWithBackend();
      } else {
        this.notify('filters_changed');
      }
    }
  }

  getActiveFilterCount() {
    let count = 0;
    const f = this.state.filters;
    if (f.month !== 'all') count++;
    if (f.job !== 'all') count++;
    if (f.education !== 'all') count++;
    if (f.contact !== 'all') count++;
    if (f.outcome !== 'all') count++;
    if (f.marital !== 'all') count++;
    if (f.housing !== 'all') count++;
    if (f.balanceTier !== 'all') count++;
    if (f.touches !== 'all') count++;
    if (f.searchQuery && f.searchQuery.trim().length > 0) count++;
    return count;
  }

  setActiveView(viewId) {
    if (this.state.activeView !== viewId) {
      this.state.activeView = viewId;
      this.notify('view_changed');
    }
  }

  setTablePage(page) {
    this.state.table.currentPage = page;
    if (this.state.backendConnected) {
      this.syncWithBackend();
    } else {
      this.notify('table_changed');
    }
  }

  setTablePageSize(size) {
    this.state.table.pageSize = parseInt(size, 10);
    this.state.table.currentPage = 1;
    if (this.state.backendConnected) {
      this.syncWithBackend();
    } else {
      this.notify('table_changed');
    }
  }

  setTableSort(column) {
    if (this.state.table.sortColumn === column) {
      this.state.table.sortDirection = this.state.table.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.table.sortColumn = column;
      this.state.table.sortDirection = 'asc';
    }
    if (this.state.backendConnected) {
      this.syncWithBackend();
    } else {
      this.notify('table_changed');
    }
  }

  // Client-side fallback filtered dataset
  getFilteredDataset() {
    const { rawDataset, filters } = this.state;
    if (!rawDataset || rawDataset.length === 0) return [];

    return rawDataset.filter(item => {
      if (filters.month !== 'all' && (item.month || '').toLowerCase() !== filters.month.toLowerCase()) return false;
      if (filters.job !== 'all' && (item.job || '').toLowerCase() !== filters.job.toLowerCase()) return false;
      if (filters.education !== 'all' && (item.education || '').toLowerCase() !== filters.education.toLowerCase()) return false;
      if (filters.contact !== 'all' && (item.contact || '').toLowerCase() !== filters.contact.toLowerCase()) return false;
      if (filters.outcome !== 'all' && (item.y || '').toLowerCase() !== filters.outcome.toLowerCase()) return false;
      if (filters.marital !== 'all' && (item.marital || '').toLowerCase() !== filters.marital.toLowerCase()) return false;
      if (filters.housing !== 'all' && (item.housing || '').toLowerCase() !== filters.housing.toLowerCase()) return false;

      if (filters.balanceTier !== 'all') {
        const bal = Number(item.balance) || 0;
        const bt = filters.balanceTier.toLowerCase();
        if (bt === 'negative' && bal >= 0) return false;
        if (bt === 'low' && (bal < 0 || bal > 1000)) return false;
        if (bt === 'mid' && (bal <= 1000 || bal > 5000)) return false;
        if (bt === 'high' && (bal <= 5000 || bal > 15000)) return false;
        if (bt === 'affluent' && bal <= 15000) return false;
      }

      if (filters.touches !== 'all') {
        const cmp = Number(item.campaign);
        if (filters.touches === '1' && cmp !== 1) return false;
        if (filters.touches === '2' && cmp !== 2) return false;
        if (filters.touches === '3' && cmp !== 3) return false;
        if (filters.touches === '4+' && cmp < 4) return false;
      }

      if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matches = 
          String(item.id || '').toLowerCase().includes(q) ||
          String(item.age || '').toLowerCase().includes(q) ||
          String(item.job || '').toLowerCase().includes(q) ||
          String(item.marital || '').toLowerCase().includes(q) ||
          String(item.education || '').toLowerCase().includes(q) ||
          String(item.month || '').toLowerCase().includes(q) ||
          String(item.contact || '').toLowerCase().includes(q) ||
          String(item.y || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }

  getPaginatedTableData() {
    // If backend data is ready, return it
    if (this.state.backendConnected && this.state.apiData.tableRecords) {
      const records = this.state.apiData.tableRecords;
      const totalRecords = this.state.apiData.totalRecords || records.length;
      const { currentPage, pageSize } = this.state.table;
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const startIndex = (currentPage - 1) * pageSize;
      return {
        records,
        totalRecords,
        totalPages,
        currentPage,
        pageSize,
        startIndex,
        endIndex: Math.min(startIndex + pageSize, totalRecords)
      };
    }

    // Client-side fallback
    const filtered = this.getFilteredDataset();
    const { sortColumn, sortDirection, currentPage, pageSize } = this.state.table;

    const sorted = [...filtered].sort((a, b) => {
      let valA = a[sortColumn] ?? '';
      let valB = b[sortColumn] ?? '';
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'string' && typeof valB !== 'string') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const totalRecords = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * pageSize;

    const sliced = sorted.slice(startIndex, startIndex + pageSize).map(r => {
      if (!r.propensityTier && typeof AnalyticsEngine !== 'undefined') {
        const scored = AnalyticsEngine.scoreSingleLead(r);
        return {
          ...r,
          propensityPercent: scored.propensityPercent,
          propensityTier: scored.tier,
          propensityClass: scored.tierClass
        };
      }
      return r;
    });

    return {
      records: sliced,
      totalRecords,
      totalPages,
      currentPage: safePage,
      pageSize,
      startIndex,
      endIndex: Math.min(startIndex + pageSize, totalRecords)
    };
  }
}

const appState = new AppStateStore();

if (typeof window !== 'undefined') {
  window.appState = appState;
}

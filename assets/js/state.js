/**
 * Bank Marketing Campaign Analysis Dashboard
 * Central State Store & Reactive Event Dispatcher
 */

class AppStateStore {
  constructor() {
    this.state = {
      rawDataset: [],
      activeSource: 'demo', // 'demo' | 'upload'
      sourceDisplayName: 'Benchmark Cohort (Demo)',
      fileName: null,
      lastUpdated: new Date(),

      // Filter settings
      filters: {
        month: 'all',
        job: 'all',
        education: 'all',
        contact: 'all',
        outcome: 'all', // 'all' | 'yes' | 'no'
        marital: 'all',
        touches: 'all', // 'all' | '1' | '2' | '3' | '4+'
        searchQuery: ''
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

  // Subscribe to state updates
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

  // Load a new dataset (either Demo or uploaded CSV)
  setDataset(records, source = 'demo', fileName = null) {
    this.state.rawDataset = records;
    this.state.activeSource = source;
    this.state.fileName = fileName;
    this.state.sourceDisplayName = source === 'demo'
      ? `Benchmark Cohort (${records.length.toLocaleString()} records)`
      : `${fileName || 'Uploaded Dataset'} (${records.length.toLocaleString()} records)`;
    this.state.lastUpdated = new Date();
    
    // Reset filters and table page
    this.resetFilters(false);
    this.state.table.currentPage = 1;
    this.notify('dataset_changed');
  }

  // Update specific filter
  setFilter(key, value) {
    if (this.state.filters[key] !== value) {
      this.state.filters[key] = value;
      this.state.table.currentPage = 1; // Reset to page 1 on filter change
      this.notify('filters_changed');
    }
  }

  // Reset all filters to default
  resetFilters(notify = true) {
    this.state.filters = {
      month: 'all',
      job: 'all',
      education: 'all',
      contact: 'all',
      outcome: 'all',
      marital: 'all',
      touches: 'all',
      searchQuery: ''
    };
    this.state.table.currentPage = 1;
    if (notify) {
      this.notify('filters_changed');
    }
  }

  // Count active non-default filters
  getActiveFilterCount() {
    let count = 0;
    const f = this.state.filters;
    if (f.month !== 'all') count++;
    if (f.job !== 'all') count++;
    if (f.education !== 'all') count++;
    if (f.contact !== 'all') count++;
    if (f.outcome !== 'all') count++;
    if (f.marital !== 'all') count++;
    if (f.touches !== 'all') count++;
    if (f.searchQuery && f.searchQuery.trim().length > 0) count++;
    return count;
  }

  // Set active page view (dashboard, analytics, segments, upload, reports, settings)
  setActiveView(viewId) {
    if (this.state.activeView !== viewId) {
      this.state.activeView = viewId;
      this.notify('view_changed');
    }
  }

  // Table pagination & sorting controls
  setTablePage(page) {
    this.state.table.currentPage = page;
    this.notify('table_changed');
  }

  setTablePageSize(size) {
    this.state.table.pageSize = parseInt(size, 10);
    this.state.table.currentPage = 1;
    this.notify('table_changed');
  }

  setTableSort(column) {
    if (this.state.table.sortColumn === column) {
      this.state.table.sortDirection = this.state.table.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.table.sortColumn = column;
      this.state.table.sortDirection = 'asc';
    }
    this.notify('table_changed');
  }

  // Returns dataset filtered by current user filters
  getFilteredDataset() {
    const { rawDataset, filters } = this.state;
    if (!rawDataset || rawDataset.length === 0) return [];

    return rawDataset.filter(item => {
      // Month filter
      if (filters.month !== 'all' && (item.month || '').toLowerCase() !== filters.month.toLowerCase()) {
        return false;
      }

      // Job filter
      if (filters.job !== 'all' && (item.job || '').toLowerCase() !== filters.job.toLowerCase()) {
        return false;
      }

      // Education filter
      if (filters.education !== 'all' && (item.education || '').toLowerCase() !== filters.education.toLowerCase()) {
        return false;
      }

      // Contact channel filter
      if (filters.contact !== 'all' && (item.contact || '').toLowerCase() !== filters.contact.toLowerCase()) {
        return false;
      }

      // Outcome filter ('yes' or 'no')
      if (filters.outcome !== 'all') {
        const itemY = (item.y || '').toLowerCase();
        if (itemY !== filters.outcome.toLowerCase()) {
          return false;
        }
      }

      // Marital status filter
      if (filters.marital !== 'all' && (item.marital || '').toLowerCase() !== filters.marital.toLowerCase()) {
        return false;
      }

      // Touches / campaign contacts filter
      if (filters.touches !== 'all') {
        const cmp = Number(item.campaign);
        if (filters.touches === '1' && cmp !== 1) return false;
        if (filters.touches === '2' && cmp !== 2) return false;
        if (filters.touches === '3' && cmp !== 3) return false;
        if (filters.touches === '4+' && cmp < 4) return false;
      }

      // Text search query across attributes
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

  // Returns paginated and sorted slice of filtered data for table view
  getPaginatedTableData() {
    const filtered = this.getFilteredDataset();
    const { sortColumn, sortDirection, currentPage, pageSize } = this.state.table;

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      // Numeric comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'string' && typeof valB !== 'string') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // String comparison
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
    const records = sorted.slice(startIndex, startIndex + pageSize);

    return {
      records,
      totalRecords,
      totalPages,
      currentPage: safePage,
      pageSize,
      startIndex,
      endIndex: Math.min(startIndex + pageSize, totalRecords)
    };
  }
}

// Global App State Instance
const appState = new AppStateStore();

if (typeof window !== 'undefined') {
  window.appState = appState;
}

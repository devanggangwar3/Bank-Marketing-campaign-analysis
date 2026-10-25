/**
 * Bank Marketing Campaign Analysis Dashboard
 * UI Orchestration, DOM Handlers, Toast Notifications & Table Interactions
 */

const UIEngine = {
  /**
   * Initializes all DOM event listeners and navigation
   */
  init() {
    this.bindNavigation();
    this.bindFilterEvents();
    this.bindTableEvents();
    this.bindUploadEvents();
    this.bindReportActions();
    this.bindMobileDrawer();
    this.bindSettings();
  },

  /**
   * Sidebar navigation links & active view switching
   */
  bindNavigation() {
    const navLinks = document.querySelectorAll('[data-view-target]');
    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view-target');
        appState.setActiveView(targetView);

        // Close mobile drawer if open
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.querySelector('.sidebar-backdrop')?.classList.remove('show');
      });
    });
  },

  /**
   * Mobile drawer hamburger toggle
   */
  bindMobileDrawer() {
    const toggleBtn = document.getElementById('mobile-drawer-toggle');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (toggleBtn && sidebar && backdrop) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        backdrop.classList.toggle('show');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('show');
      });
    }
  },

  /**
   * Filter controls (selects, search input, clear button)
   */
  bindFilterEvents() {
    const filterIds = [
      { id: 'filter-month', key: 'month' },
      { id: 'filter-job', key: 'job' },
      { id: 'filter-education', key: 'education' },
      { id: 'filter-contact', key: 'contact' },
      { id: 'filter-outcome', key: 'outcome' },
      { id: 'filter-marital', key: 'marital' },
      { id: 'filter-touches', key: 'touches' }
    ];

    filterIds.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', e => {
          appState.setFilter(key, e.target.value);
        });
      }
    });

    // Quick Month Filter in Topbar
    const quickMonth = document.getElementById('topbar-quick-month');
    if (quickMonth) {
      quickMonth.addEventListener('change', e => {
        appState.setFilter('month', e.target.value);
        // Sync filter bar select as well
        const monthFilter = document.getElementById('filter-month');
        if (monthFilter) monthFilter.value = e.target.value;
      });
    }

    // Debounced Search Query
    const searchInputs = [
      document.getElementById('table-global-search'),
      document.getElementById('topbar-search-input')
    ];

    let searchTimer = null;
    searchInputs.forEach(input => {
      if (!input) return;
      input.addEventListener('input', e => {
        clearTimeout(searchTimer);
        const val = e.target.value;
        searchTimer = setTimeout(() => {
          appState.setFilter('searchQuery', val);
          // Sync other search input
          searchInputs.forEach(other => {
            if (other && other !== input) other.value = val;
          });
        }, 250);
      });
    });

    // Reset Filters Button
    const resetButtons = document.querySelectorAll('.btn-reset-filters');
    resetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        appState.resetFilters();
        this.resetFilterFormValues();
        this.showToast('Filters Cleared', 'All campaign segment filters have been reset to default.', 'info');
      });
    });
  },

  /**
   * Resets select dropdown values in DOM
   */
  resetFilterFormValues() {
    const selects = ['filter-month', 'filter-job', 'filter-education', 'filter-contact', 'filter-outcome', 'filter-marital', 'filter-touches', 'topbar-quick-month'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });

    const search1 = document.getElementById('table-global-search');
    const search2 = document.getElementById('topbar-search-input');
    if (search1) search1.value = '';
    if (search2) search2.value = '';
  },

  /**
   * Table sorting and pagination event bindings
   */
  bindTableEvents() {
    // Sortable column headers
    const sortHeaders = document.querySelectorAll('th.sortable');
    sortHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (col) {
          appState.setTableSort(col);
        }
      });
    });

    // Page size selector
    const pageSizeSelect = document.getElementById('table-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', e => {
        appState.setTablePageSize(e.target.value);
      });
    }
  },

  /**
   * CSV Upload Dropzone & File Picker bindings
   */
  bindUploadEvents() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('csv-file-input');
    const sampleDownloadBtn = document.getElementById('btn-download-sample-csv');
    const switchDemoBtn = document.getElementById('btn-switch-to-demo');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      // Drag and drop visual cues
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, e => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, e => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-over');
        });
      });

      dropzone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.handleFileUpload(files[0]);
        }
      });

      fileInput.addEventListener('change', e => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }

    if (sampleDownloadBtn) {
      sampleDownloadBtn.addEventListener('click', () => {
        CSVEngine.downloadSampleTemplate();
        this.showToast('Sample Template Downloaded', 'Use this CSV structure to format your bank campaign datasets.', 'success');
      });
    }

    if (switchDemoBtn) {
      switchDemoBtn.addEventListener('click', () => {
        if (window.DEMO_CAMPAIGN_DATA) {
          appState.setDataset(window.DEMO_CAMPAIGN_DATA, 'demo');
          this.showToast('Benchmark Cohort Loaded', 'Restored the 1,250 record pre-loaded benchmark campaign dataset.', 'info');
        }
      });
    }
  },

  /**
   * Processes uploaded file with schema verification
   */
  handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      this.showToast('Invalid File Type', 'Please upload a comma-separated or semicolon-separated .csv file.', 'danger');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const parseResult = CSVEngine.parse(text);

      const alertContainer = document.getElementById('upload-status-alert');

      if (!parseResult.success) {
        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="card p-3 border-danger bg-danger-subtle">
              <div class="d-flex align-items-center gap-2 text-danger fw-bold mb-1">
                <i class="bi bi-exclamation-octagon-fill"></i> CSV Validation Failed
              </div>
              <div class="text-danger small">${parseResult.error}</div>
            </div>
          `;
          alertContainer.style.display = 'block';
        }
        this.showToast('Upload Validation Error', parseResult.error, 'danger');
        return;
      }

      // Successful parse
      const { records, stats } = parseResult;
      appState.setDataset(records, 'upload', file.name);

      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="card p-3 border-success bg-success-subtle">
            <div class="d-flex align-items-center gap-2 text-success fw-bold mb-1">
              <i class="bi bi-check-circle-fill"></i> Dataset Verified & Loaded Successfully!
            </div>
            <div class="text-secondary small">
              Parsed <strong>${stats.validRowsParsed.toLocaleString()}</strong> valid records from <em>${file.name}</em> (Delimiter: <code>${stats.delimiter === ';' ? 'Semicolon (;)' : 'Comma (,)'}</code>).
              ${stats.invalidRowsSkipped > 0 ? `<br><span class="text-warning">⚠️ Skipped ${stats.invalidRowsSkipped} inconsistent rows.</span>` : ''}
            </div>
          </div>
        `;
        alertContainer.style.display = 'block';
      }

      this.showToast('Dataset Activated', `Successfully loaded ${stats.validRowsParsed.toLocaleString()} customer records from ${file.name}.`, 'success');
      
      // Auto-switch to Dashboard after short delay
      setTimeout(() => {
        appState.setActiveView('dashboard');
      }, 900);
    };

    reader.onerror = () => {
      this.showToast('Read Error', 'Unable to read the selected file.', 'danger');
    };

    reader.readAsText(file);
  },

  /**
   * Reports Actions: CSV Export and Print Layout
   */
  bindReportActions() {
    const exportCsvBtn = document.getElementById('btn-export-report-csv');
    const printReportBtn = document.getElementById('btn-print-report');

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const filtered = appState.getFilteredDataset();
        CSVEngine.exportRecordsToCsv(filtered, `bank_campaign_report_${new Date().toISOString().slice(0, 10)}.csv`);
        this.showToast('CSV Export Ready', `Exported ${filtered.length.toLocaleString()} campaign records to CSV.`, 'success');
      });
    }

    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => {
        window.print();
      });
    }
  },

  /**
   * Settings page handlers
   */
  bindSettings() {
    const saveApiBtn = document.getElementById('btn-save-api-config');
    if (saveApiBtn) {
      saveApiBtn.addEventListener('click', e => {
        e.preventDefault();
        this.showToast('Settings Saved', 'REST API configuration updated for future backend connection.', 'success');
      });
    }

    const resetAllBtn = document.getElementById('btn-reset-everything');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to restore the default benchmark dataset and reset all filters?')) {
          if (window.DEMO_CAMPAIGN_DATA) {
            appState.setDataset(window.DEMO_CAMPAIGN_DATA, 'demo');
          }
          this.resetFilterFormValues();
          this.showToast('Reset Complete', 'Application restored to default benchmark state.', 'info');
        }
      });
    }
  },

  /**
   * Updates Topbar indicators (Active Dataset, Filter Badge)
   */
  updateHeaderIndicators(state) {
    const badgeText = document.getElementById('active-dataset-text');
    const pillContainer = document.querySelector('.active-dataset-indicator');

    if (badgeText) {
      badgeText.textContent = state.sourceDisplayName;
    }

    if (pillContainer) {
      if (state.activeSource === 'upload') {
        pillContainer.classList.add('is-uploaded');
      } else {
        pillContainer.classList.remove('is-uploaded');
      }
    }

    // Filter count badge in filter bar
    const filterCounter = document.getElementById('active-filter-count');
    const activeCount = appState.getActiveFilterCount();
    if (filterCounter) {
      filterCounter.textContent = activeCount > 0 ? `${activeCount} Active` : 'All Data';
      filterCounter.className = activeCount > 0 ? 'filter-badge-counter bg-primary text-white' : 'filter-badge-counter';
    }
  },

  /**
   * Updates All KPI Cards in the UI
   */
  updateKPIs(kpis) {
    // Total Customers
    const elCustomers = document.querySelectorAll('.kpi-val-customers');
    elCustomers.forEach(el => el.textContent = kpis.totalCustomers.toLocaleString());

    // Total Contacts
    const elContacts = document.querySelectorAll('.kpi-val-contacts');
    elContacts.forEach(el => el.textContent = kpis.totalContacts.toLocaleString());

    // Successful Responses
    const elSuccess = document.querySelectorAll('.kpi-val-success');
    elSuccess.forEach(el => el.textContent = kpis.successfulResponses.toLocaleString());

    // Overall Response Rate
    const elRate = document.querySelectorAll('.kpi-val-rate');
    elRate.forEach(el => el.textContent = `${kpis.responseRate}%`);

    // Trend vs Benchmark
    const elTrends = document.querySelectorAll('.kpi-trend-benchmark');
    elTrends.forEach(el => {
      const diff = kpis.benchmarkDiff;
      if (diff > 0) {
        el.className = 'kpi-trend positive';
        el.innerHTML = `<i class="bi bi-arrow-up-right"></i> +${diff}% vs Benchmark`;
      } else if (diff < 0) {
        el.className = 'kpi-trend negative';
        el.innerHTML = `<i class="bi bi-arrow-down-right"></i> ${diff}% vs Benchmark`;
      } else {
        el.className = 'kpi-trend neutral';
        el.innerHTML = `<i class="bi bi-dash"></i> On Benchmark (${APP_CONFIG.benchmarkResponseRate}%)`;
      }
    });

    // Secondary metrics
    const elUnsuccessful = document.getElementById('kpi-val-unsuccessful');
    if (elUnsuccessful) elUnsuccessful.textContent = kpis.unsuccessfulResponses.toLocaleString();

    const elAvgDuration = document.getElementById('kpi-val-duration');
    if (elAvgDuration) {
      const mins = Math.floor(kpis.avgDurationSeconds / 60);
      const secs = kpis.avgDurationSeconds % 60;
      elAvgDuration.textContent = `${mins}m ${secs}s`;
    }

    const elPrevSuccess = document.getElementById('kpi-val-prev-success');
    if (elPrevSuccess) elPrevSuccess.textContent = `${kpis.previousSuccessRate}%`;
  },

  /**
   * Renders Dynamic Campaign Insight Cards
   */
  renderInsights(insights) {
    const container = document.getElementById('insights-container');
    if (!container) return;

    if (!insights || insights.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-lightbulb"></i></div>
            <div class="empty-state-title">No Insights Generated for Current Filters</div>
            <div class="empty-state-text">Try widening your segment filters to calculate patterns across cohorts.</div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = insights.map(item => `
      <div class="insight-card">
        <div class="insight-card-top">
          <span class="insight-category-tag ${item.categoryClass || 'insight-tag-high-response'}">
            ${item.categoryLabel}
          </span>
          <span class="insight-sample-size">${item.sampleSize || ''}</span>
        </div>
        <div class="insight-title">${item.title}</div>
        <div class="insight-stat-highlight">
          <span class="insight-stat-number">${item.stat}</span>
          <span class="insight-stat-context">${item.context}</span>
        </div>
        <div class="insight-test-box">
          <strong>Actionable Observation to Test:</strong>
          ${item.testHypothesis}
        </div>
      </div>
    `).join('');
  },

  /**
   * Renders Customer Segments View Breakdown Bars
   */
  renderCustomerSegments(records) {
    const jobBarsContainer = document.getElementById('segment-job-bars');
    const ageBarsContainer = document.getElementById('segment-age-bars');

    if (jobBarsContainer) {
      const jobData = AnalyticsEngine.computeByJob(records);
      const maxRate = Math.max(...jobData.map(j => j.responseRate), 1);

      jobBarsContainer.innerHTML = jobData.map(j => {
        const widthPct = Math.min(100, Math.round((j.responseRate / maxRate) * 100));
        return `
          <div class="segment-bar-row">
            <div class="segment-name" title="${j.label}">${j.label}</div>
            <div class="segment-track">
              <div class="segment-fill" style="width: ${widthPct}%;"></div>
            </div>
            <div class="segment-rate">${j.responseRate}%</div>
            <div class="segment-count">(N=${j.total})</div>
          </div>
        `;
      }).join('');
    }

    if (ageBarsContainer) {
      const ageData = AnalyticsEngine.computeByAgeBracket(records);
      const maxAgeRate = Math.max(...ageData.map(a => a.responseRate), 1);

      ageBarsContainer.innerHTML = ageData.map(a => {
        const widthPct = Math.min(100, Math.round((a.responseRate / maxAgeRate) * 100));
        return `
          <div class="segment-bar-row">
            <div class="segment-name">${a.label}</div>
            <div class="segment-track">
              <div class="segment-fill" style="width: ${widthPct}%; background: linear-gradient(90deg, #10B981, #059669);"></div>
            </div>
            <div class="segment-rate">${a.responseRate}%</div>
            <div class="segment-count">(N=${a.total})</div>
          </div>
        `;
      }).join('');
    }
  },

  /**
   * Renders Data Table Rows & Pagination Controls
   */
  renderTable() {
    const tbody = document.getElementById('dataset-table-body');
    const paginationContainer = document.getElementById('table-pagination-controls');
    const tableInfo = document.getElementById('table-entry-info');
    if (!tbody) return;

    const { records, totalRecords, totalPages, currentPage, pageSize, startIndex, endIndex } = appState.getPaginatedTableData();

    // Table entries range label
    if (tableInfo) {
      tableInfo.textContent = totalRecords > 0
        ? `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords.toLocaleString()} entries`
        : 'Showing 0 entries';
    }

    // Empty state
    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-5">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="bi bi-search"></i></div>
              <div class="empty-state-title">No Matching Records Found</div>
              <div class="empty-state-text">No customer profiles match your current filter and search criteria.</div>
              <button class="btn btn-sm btn-outline-primary btn-reset-filters">
                <i class="bi bi-arrow-counterclockwise"></i> Reset Filters
              </button>
            </div>
          </td>
        </tr>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    // Render table rows
    tbody.innerHTML = records.map(r => {
      const isYes = (r.y || '').toLowerCase() === 'yes';
      const outcomeBadge = isYes
        ? `<span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Subscribed</span>`
        : `<span class="badge badge-neutral"><i class="bi bi-dash-circle"></i> Declined</span>`;

      return `
        <tr>
          <td><span class="font-monospace text-muted">#${r.id || '-'}</span></td>
          <td><strong>${r.age}</strong> yrs</td>
          <td><span class="text-capitalize">${r.job}</span></td>
          <td><span class="text-capitalize">${r.education}</span></td>
          <td><span class="font-monospace">$${(r.balance || 0).toLocaleString()}</span></td>
          <td><span class="text-capitalize badge ${r.housing === 'yes' ? 'badge-warning' : 'badge-neutral'}">${r.housing === 'yes' ? 'Has Loan' : 'No Loan'}</span></td>
          <td><span class="text-capitalize">${r.contact}</span></td>
          <td><span class="badge badge-info">${r.campaign} ${r.campaign === 1 ? 'touch' : 'touches'}</span></td>
          <td>${Math.round(r.duration / 60)}m ${r.duration % 60}s</td>
          <td>${outcomeBadge}</td>
        </tr>
      `;
    }).join('');

    // Update Sorting UI Icons on headers
    const { sortColumn, sortDirection } = appState.state.table;
    document.querySelectorAll('th.sortable').forEach(th => {
      const col = th.getAttribute('data-sort');
      const icon = th.querySelector('i.sort-icon');
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (icon) icon.className = 'bi bi-arrow-down-up sort-icon';

      if (col === sortColumn) {
        th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        if (icon) {
          icon.className = sortDirection === 'asc' ? 'bi bi-sort-up sort-icon' : 'bi bi-sort-down sort-icon';
        }
      }
    });

    // Render pagination buttons
    if (paginationContainer) {
      paginationContainer.innerHTML = this.buildPaginationHtml(currentPage, totalPages);

      // Bind click events on page buttons
      paginationContainer.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const p = parseInt(btn.getAttribute('data-page'), 10);
          if (!isNaN(p)) {
            appState.setTablePage(p);
          }
        });
      });
    }
  },

  /**
   * Builds clean pagination numbered buttons with ellipsis
   */
  buildPaginationHtml(current, total) {
    if (total <= 1) return '';

    let pages = [];
    const prevDisabled = current === 1 ? 'disabled' : '';
    const nextDisabled = current === total ? 'disabled' : '';

    let html = `
      <button class="page-btn" data-page="${current - 1}" ${prevDisabled} title="Previous Page">
        <i class="bi bi-chevron-left"></i>
      </button>
    `;

    // Smart pagination algorithm
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 4) {
        pages = [1, 2, 3, 4, 5, '...', total];
      } else if (current >= total - 3) {
        pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
      } else {
        pages = [1, '...', current - 1, current, current + 1, '...', total];
      }
    }

    pages.forEach(p => {
      if (p === '...') {
        html += `<span class="px-2 text-muted">...</span>`;
      } else {
        const isActive = p === current ? 'active' : '';
        html += `<button class="page-btn ${isActive}" data-page="${p}">${p}</button>`;
      }
    });

    html += `
      <button class="page-btn" data-page="${current + 1}" ${nextDisabled} title="Next Page">
        <i class="bi bi-chevron-right"></i>
      </button>
    `;

    return html;
  },

  /**
   * Updates Executive Report View Meta
   */
  updateReportView(state, kpis) {
    const reportDatasetName = document.getElementById('report-meta-dataset');
    const reportDate = document.getElementById('report-meta-date');

    if (reportDatasetName) {
      reportDatasetName.textContent = state.sourceDisplayName;
    }
    if (reportDate) {
      reportDate.textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  },

  /**
   * Floating Toast Notification
   */
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconMap = {
      success: 'bi-check-circle-fill',
      danger: 'bi-exclamation-octagon-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="bi ${iconMap[type] || 'bi-info-circle-fill'} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }
};

if (typeof window !== 'undefined') {
  window.UIEngine = UIEngine;
}

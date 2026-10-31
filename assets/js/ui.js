/**
 * Bank Marketing Campaign Analysis Dashboard
 * UI Orchestration, DOM Handlers, Toast Notifications, Table Interactions & API Binding
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
    this.bindRoiEvents();
    this.bindPropensityEvents();
    this.bindCohortEvents();
    this.bindExportLeadsAction();
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
      { id: 'filter-housing', key: 'housing' },
      { id: 'filter-balance', key: 'balanceTier' },
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
          searchInputs.forEach(other => {
            if (other && other !== input) other.value = val;
          });
        }, 300);
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

  resetFilterFormValues() {
    const selects = ['filter-month', 'filter-job', 'filter-education', 'filter-contact', 'filter-outcome', 'filter-marital', 'filter-housing', 'filter-balance', 'filter-touches', 'topbar-quick-month'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });

    const search1 = document.getElementById('table-global-search');
    const search2 = document.getElementById('topbar-search-input');
    if (search1) search1.value = '';
    if (search2) search2.value = '';
  },

  bindTableEvents() {
    const sortHeaders = document.querySelectorAll('th.sortable');
    sortHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (col) {
          appState.setTableSort(col);
        }
      });
    });

    const pageSizeSelect = document.getElementById('table-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', e => {
        appState.setTablePageSize(e.target.value);
      });
    }
  },

  bindUploadEvents() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('csv-file-input');
    const sampleDownloadBtn = document.getElementById('btn-download-sample-csv');
    const switchDemoBtn = document.getElementById('btn-switch-to-demo');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

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
      switchDemoBtn.addEventListener('click', async () => {
        if (appState.state.backendConnected) {
          this.showToast('Resetting Dataset', 'Requesting Flask API to restore benchmark cohort...', 'info');
          const res = await ApiClient.resetDemo();
          if (res.ok) {
            await appState.syncWithBackend();
            this.showToast('Benchmark Restored', 'Flask SQLite database restored to benchmark cohort.', 'success');
          } else {
            this.showToast('Reset Failed', res.error || 'Server error', 'danger');
          }
        } else if (window.DEMO_CAMPAIGN_DATA) {
          appState.setDataset(window.DEMO_CAMPAIGN_DATA, 'demo');
          this.showToast('Benchmark Cohort Loaded', 'Restored the 1,250 record pre-loaded benchmark campaign dataset.', 'info');
        }
      });
    }
  },

  /**
   * Processes uploaded file with backend API validation or client fallback
   */
  async handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      this.showToast('Invalid File Type', 'Please upload a comma-separated or semicolon-separated .csv file.', 'danger');
      return;
    }

    const alertContainer = document.getElementById('upload-status-alert');

    // 1. If Flask backend is connected, use backend validation and SQLite storage
    if (appState.state.backendConnected) {
      this.showToast('Validating Upload', `Uploading ${file.name} to Python Flask API...`, 'info');

      const res = await ApiClient.uploadCsv(file);
      if (!res.ok) {
        const errMessage = res.data && res.data.error ? res.data.error : (res.error || 'Validation error');
        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="card p-3 border-danger bg-danger-subtle">
              <div class="d-flex align-items-center gap-2 text-danger fw-bold mb-1">
                <i class="bi bi-exclamation-octagon-fill"></i> Backend Validation Failed
              </div>
              <div class="text-danger small">${errMessage}</div>
            </div>
          `;
          alertContainer.style.display = 'block';
        }
        this.showToast('Validation Error', errMessage, 'danger');
        return;
      }

      const stats = res.data.stats;
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="card p-3 border-success bg-success-subtle">
            <div class="d-flex align-items-center gap-2 text-success fw-bold mb-1">
              <i class="bi bi-check-circle-fill"></i> Dataset Verified & Stored in SQLite!
            </div>
            <div class="text-secondary small">
              Parsed <strong>${(stats.validRowsParsed || 0).toLocaleString()}</strong> valid rows from <em>${file.name}</em> (Delimiter: <code>${stats.delimiter}</code>).
              ${stats.duplicatesRemoved > 0 ? `<br><span class="text-warning">⚠️ Removed ${stats.duplicatesRemoved} duplicate records.</span>` : ''}
            </div>
          </div>
        `;
        alertContainer.style.display = 'block';
      }

      await appState.syncWithBackend();
      this.showToast('Dataset Activated', `Successfully loaded ${(stats.validRowsParsed || 0).toLocaleString()} customer records from ${file.name}.`, 'success');

      setTimeout(() => {
        appState.setActiveView('dashboard');
      }, 900);
      return;
    }

    // 2. Client-side fallback if backend offline
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const parseResult = CSVEngine.parse(text);

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
   * Reports Actions: CSV Export, Matplotlib Chart Export, and Print Layout
   */
  bindReportActions() {
    const exportCsvBtn = document.getElementById('btn-export-report-csv');
    const exportPngBtn = document.getElementById('btn-export-report-png');
    const printReportBtn = document.getElementById('btn-print-report');

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        if (appState.state.backendConnected) {
          const exportUrl = ApiClient.getExportUrl(appState.state.filters, 'csv');
          window.open(exportUrl, '_blank');
          this.showToast('CSV Download Started', 'Downloading filtered report from Python API...', 'success');
        } else {
          const filtered = appState.getFilteredDataset();
          CSVEngine.exportRecordsToCsv(filtered, `bank_campaign_report_${new Date().toISOString().slice(0, 10)}.csv`);
          this.showToast('CSV Export Ready', `Exported ${filtered.length.toLocaleString()} campaign records to CSV.`, 'success');
        }
      });
    }

    if (exportPngBtn) {
      exportPngBtn.addEventListener('click', () => {
        if (appState.state.backendConnected) {
          const exportUrl = ApiClient.getExportUrl(appState.state.filters, 'png');
          window.open(exportUrl, '_blank');
          this.showToast('Chart Export Started', 'Downloading Matplotlib analytical chart PNG...', 'success');
        } else {
          this.showToast('Feature Unavailable Offline', 'Please connect the Flask backend to generate high-res Matplotlib chart images.', 'warning');
        }
      });
    }

    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => {
        window.print();
      });
    }
  },

  bindSettings() {
    const apiUrlInput = document.getElementById('api-base-url');
    if (apiUrlInput) {
      apiUrlInput.value = ApiClient.getBaseUrl();
    }

    const saveApiBtn = document.getElementById('btn-save-api-config');
    if (saveApiBtn) {
      saveApiBtn.addEventListener('click', async e => {
        e.preventDefault();
        const newUrl = apiUrlInput ? apiUrlInput.value.trim() : '';
        ApiClient.setBaseUrl(newUrl);
        this.showToast('Testing Connection', `Connecting to ${newUrl}...`, 'info');

        const connected = await appState.checkBackendConnection();
        if (connected) {
          this.showToast('API Connected', 'Flask REST backend is online and synchronized!', 'success');
        } else {
          this.showToast('Connection Warning', 'Unable to reach backend at specified URL. Using client-side fallback mode.', 'warning');
        }
        UIEngine.updateHeaderIndicators(appState.state);
      });
    }

    const resetAllBtn = document.getElementById('btn-reset-everything');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to restore the default benchmark dataset and reset all filters?')) {
          if (appState.state.backendConnected) {
            await ApiClient.resetDemo();
            await appState.syncWithBackend();
          } else if (window.DEMO_CAMPAIGN_DATA) {
            appState.setDataset(window.DEMO_CAMPAIGN_DATA, 'demo');
          }
          this.resetFilterFormValues();
          this.showToast('Reset Complete', 'Application restored to default benchmark state.', 'info');
        }
      });
    }
  },

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

    const filterCounter = document.getElementById('active-filter-count');
    const activeCount = appState.getActiveFilterCount();
    if (filterCounter) {
      filterCounter.textContent = activeCount > 0 ? `${activeCount} Active` : 'All Data';
      filterCounter.className = activeCount > 0 ? 'filter-badge-counter bg-primary text-white' : 'filter-badge-counter';
    }

    // Backend status indicators in sidebar footer
    const statusLabel = document.querySelector('.status-label');
    const statusSub = document.querySelector('.status-sub');
    const statusDot = document.querySelector('.status-dot-pulse');

    if (statusLabel && statusSub) {
      if (state.backendConnected) {
        statusLabel.textContent = 'Flask API Online';
        statusSub.textContent = 'SQLite & Pandas Active';
        if (statusDot) statusDot.style.backgroundColor = '#10B981';
      } else {
        statusLabel.textContent = 'Client-Side Mode';
        statusSub.textContent = 'In-Memory Engine Active';
        if (statusDot) statusDot.style.backgroundColor = '#3B82F6';
      }
    }
  },

  updateKPIs(kpis) {
    if (!kpis) return;

    const elCustomers = document.querySelectorAll('.kpi-val-customers');
    elCustomers.forEach(el => el.textContent = (kpis.totalCustomers || 0).toLocaleString());

    const elContacts = document.querySelectorAll('.kpi-val-contacts');
    elContacts.forEach(el => el.textContent = (kpis.totalContacts || 0).toLocaleString());

    const elSuccess = document.querySelectorAll('.kpi-val-success');
    elSuccess.forEach(el => el.textContent = (kpis.successfulResponses || 0).toLocaleString());

    const elRate = document.querySelectorAll('.kpi-val-rate');
    elRate.forEach(el => el.textContent = `${kpis.responseRate || 0}%`);

    const elTrends = document.querySelectorAll('.kpi-trend-benchmark');
    elTrends.forEach(el => {
      const diff = kpis.benchmarkDiff !== undefined ? kpis.benchmarkDiff : 0;
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

    const elUnsuccessful = document.getElementById('kpi-val-unsuccessful');
    if (elUnsuccessful) elUnsuccessful.textContent = (kpis.unsuccessfulResponses || 0).toLocaleString();

    const elAvgDuration = document.getElementById('kpi-val-duration');
    if (elAvgDuration) {
      const secs = kpis.avgDurationSeconds || 0;
      const mins = Math.floor(secs / 60);
      elAvgDuration.textContent = `${mins}m ${secs % 60}s`;
    }

    const elPrevSuccess = document.getElementById('kpi-val-prev-success');
    if (elPrevSuccess) elPrevSuccess.textContent = `${kpis.previousSuccessRate || 0}%`;
  },

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

  renderCustomerSegments(segmentsOrRecords) {
    const jobBarsContainer = document.getElementById('segment-job-bars');
    const ageBarsContainer = document.getElementById('segment-age-bars');

    // If backend segments object passed
    if (segmentsOrRecords && segmentsOrRecords.jobs && segmentsOrRecords.ages) {
      if (jobBarsContainer) {
        const jobData = segmentsOrRecords.jobs;
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
        const ageData = segmentsOrRecords.ages;
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
      return;
    }

    // Client-side fallback
    if (Array.isArray(segmentsOrRecords)) {
      if (jobBarsContainer) {
        const jobData = AnalyticsEngine.computeByJob(segmentsOrRecords);
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
        const ageData = AnalyticsEngine.computeByAgeBracket(segmentsOrRecords);
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
    }
  },

  renderTable() {
    const tbody = document.getElementById('dataset-table-body');
    const paginationContainer = document.getElementById('table-pagination-controls');
    const tableInfo = document.getElementById('table-entry-info');
    if (!tbody) return;

    const { records, totalRecords, totalPages, currentPage, startIndex, endIndex } = appState.getPaginatedTableData();

    if (tableInfo) {
      tableInfo.textContent = totalRecords > 0
        ? `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords.toLocaleString()} entries`
        : 'Showing 0 entries';
    }

    if (!records || records.length === 0) {
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

    tbody.innerHTML = records.map(r => {
      const isYes = (r.y || '').toLowerCase() === 'yes';
      const outcomeBadge = isYes
        ? `<span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Subscribed</span>`
        : `<span class="badge badge-neutral"><i class="bi bi-dash-circle"></i> Declined</span>`;

      const pScore = r.propensityPercent !== undefined ? r.propensityPercent : 15;
      const pTier = r.propensityTier || (pScore >= 30 ? 'High' : (pScore >= 15 ? 'Moderate' : 'Low'));
      const pClass = r.propensityClass || (pScore >= 30 ? 'badge-success' : (pScore >= 15 ? 'badge-primary' : 'badge-neutral'));
      const propBadge = `<span class="badge ${pClass}" title="Predicted propensity">${pTier} (${pScore}%)</span>`;

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
          <td>${propBadge}</td>
          <td>${outcomeBadge}</td>
        </tr>
      `;
    }).join('');

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

    if (paginationContainer) {
      paginationContainer.innerHTML = this.buildPaginationHtml(currentPage, totalPages);
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

    // Update ROI metric indicators in report if available
    const roiMetrics = state.apiData.roi ? state.apiData.roi.metrics : (typeof AnalyticsEngine !== 'undefined' ? AnalyticsEngine.computeROISimulation(appState.getFilteredDataset()).metrics : null);
    if (roiMetrics) {
      const repSpend = document.getElementById('report-meta-spend');
      const repProfit = document.getElementById('report-meta-profit');
      const repRoi = document.getElementById('report-meta-roi');
      if (repSpend) repSpend.textContent = `$${roiMetrics.totalSpend.toLocaleString()}`;
      if (repProfit) repProfit.textContent = `$${roiMetrics.netProfit.toLocaleString()}`;
      if (repRoi) repRoi.textContent = `${roiMetrics.roiPercent}%`;
    }
  },

  /**
   * Bind ROI Simulator Controls
   */
  bindRoiEvents() {
    const costSlider = document.getElementById('roi-cost-slider');
    const costInput = document.getElementById('roi-cost-input');
    const valueSlider = document.getElementById('roi-value-slider');
    const valueInput = document.getElementById('roi-value-input');
    const touchCapSelect = document.getElementById('roi-touch-cap');

    if (costSlider && costInput) {
      costSlider.addEventListener('input', e => {
        costInput.value = e.target.value;
        appState.setRoiParams(e.target.value, undefined, undefined);
      });
      costInput.addEventListener('change', e => {
        costSlider.value = e.target.value;
        appState.setRoiParams(e.target.value, undefined, undefined);
      });
    }

    if (valueSlider && valueInput) {
      valueSlider.addEventListener('input', e => {
        valueInput.value = e.target.value;
        appState.setRoiParams(undefined, e.target.value, undefined);
      });
      valueInput.addEventListener('change', e => {
        valueSlider.value = e.target.value;
        appState.setRoiParams(undefined, e.target.value, undefined);
      });
    }

    if (touchCapSelect) {
      touchCapSelect.addEventListener('change', e => {
        appState.setRoiParams(undefined, undefined, e.target.value);
      });
    }
  },

  /**
   * Bind Interactive Lead Propensity Sandbox Calculator
   */
  bindPropensityEvents() {
    const form = document.getElementById('calc-lead-form');
    if (!form) return;

    const computeScore = async () => {
      const leadData = {
        age: Number(document.getElementById('calc-age')?.value) || 35,
        job: document.getElementById('calc-job')?.value || 'management',
        marital: document.getElementById('calc-marital')?.value || 'married',
        education: document.getElementById('calc-education')?.value || 'tertiary',
        balance: Number(document.getElementById('calc-balance')?.value) || 2000,
        housing: document.getElementById('calc-housing')?.value || 'no',
        loan: document.getElementById('calc-loan')?.value || 'no',
        contact: document.getElementById('calc-contact')?.value || 'cellular',
        poutcome: document.getElementById('calc-poutcome')?.value || 'unknown',
        campaign: Number(document.getElementById('calc-touches')?.value) || 1
      };

      let result;
      if (appState.state.backendConnected) {
        const res = await ApiClient.scoreSingleLead(leadData);
        result = res.ok && res.data ? res.data : AnalyticsEngine.scoreSingleLead(leadData);
      } else {
        result = AnalyticsEngine.scoreSingleLead(leadData);
      }

      const scoreEl = document.getElementById('calc-score-val');
      const badgeEl = document.getElementById('calc-tier-badge');
      const expectedEl = document.getElementById('calc-expected-val');
      const recEl = document.getElementById('calc-rec-text');

      if (scoreEl) scoreEl.textContent = `${result.propensityPercent}%`;
      if (badgeEl) {
        badgeEl.textContent = result.tier;
        badgeEl.className = `calc-tier-badge ${result.tierClass || 'badge-success'}`;
      }
      if (expectedEl) expectedEl.textContent = `$${result.expectedValue}`;
      if (recEl) recEl.textContent = result.recommendation;
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      computeScore();
    });

    form.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', computeScore);
    });

    // Run initial calculation
    setTimeout(computeScore, 100);
  },

  /**
   * Bind Cohort A/B Comparison Selection
   */
  bindCohortEvents() {
    const selectA = document.getElementById('cohort-a-select');
    const selectB = document.getElementById('cohort-b-select');

    if (selectA) {
      selectA.addEventListener('change', e => {
        appState.setCohortSelection(e.target.value, null);
      });
    }

    if (selectB) {
      selectB.addEventListener('change', e => {
        appState.setCohortSelection(null, e.target.value);
      });
    }
  },

  /**
   * Bind High-Propensity Leads CSV Exporter
   */
  bindExportLeadsAction() {
    const btn = document.getElementById('btn-export-priority-leads');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const dataset = appState.getFilteredDataset();
      const highLeads = dataset.filter(r => {
        const scored = AnalyticsEngine.scoreSingleLead(r);
        return scored.propensityPercent >= 30.0;
      });

      if (highLeads.length === 0) {
        this.showToast('No Priority Leads', 'No leads meet the high-propensity threshold under current filters.', 'warning');
        return;
      }

      CSVEngine.exportRecordsToCsv(highLeads, `high_propensity_leads_${new Date().toISOString().slice(0, 10)}.csv`);
      this.showToast('Priority Leads Exported', `Exported ${highLeads.length.toLocaleString()} high-propensity prospects to CSV.`, 'success');
    });
  },

  /**
   * Render ROI & Budget Simulator View
   */
  renderRoiView(roiData) {
    if (!roiData || !roiData.metrics) return;
    const m = roiData.metrics;

    const elSpend = document.getElementById('roi-val-spend');
    const elRevenue = document.getElementById('roi-val-revenue');
    const elProfit = document.getElementById('roi-val-profit');
    const elRoi = document.getElementById('roi-val-roi');
    const elCpa = document.getElementById('roi-val-cpa');
    const elSavings = document.getElementById('roi-val-fatigue-savings');

    if (elSpend) elSpend.textContent = `$${m.totalSpend.toLocaleString()}`;
    if (elRevenue) elRevenue.textContent = `$${m.grossRevenue.toLocaleString()}`;
    if (elProfit) {
      elProfit.textContent = `$${m.netProfit.toLocaleString()}`;
      elProfit.className = m.netProfit >= 0 ? 'fs-3 fw-bold text-success mt-1' : 'fs-3 fw-bold text-danger mt-1';
    }
    if (elRoi) elRoi.textContent = `${m.roiPercent}%`;
    if (elCpa) elCpa.textContent = `$${m.cpa}`;
    if (elSavings) elSavings.textContent = `$${m.fatigueWastedSpend.toLocaleString()}`;

    // Render Scenarios Table
    const tbody = document.getElementById('roi-scenarios-table-body');
    if (tbody && roiData.scenarios) {
      tbody.innerHTML = roiData.scenarios.map(s => {
        const isCurrent = (m.touchCap === null && s.cap === null) || (m.touchCap === s.cap);
        const rowClass = isCurrent ? 'table-primary fw-semibold' : '';
        return `
          <tr class="${rowClass}">
            <td><strong>${s.name}</strong> ${isCurrent ? '<span class="badge badge-primary ms-1">Active Policy</span>' : ''}</td>
            <td>${s.totalContacts.toLocaleString()}</td>
            <td>${s.conversions.toLocaleString()} (${s.conversionRate}%)</td>
            <td>$${s.totalSpend.toLocaleString()}</td>
            <td>$${s.grossRevenue.toLocaleString()}</td>
            <td class="${s.netProfit >= 0 ? 'text-success' : 'text-danger'} fw-bold">$${s.netProfit.toLocaleString()}</td>
            <td><span class="badge ${s.roiPercent >= 100 ? 'badge-success' : (s.roiPercent > 0 ? 'badge-info' : 'badge-danger')}">${s.roiPercent}%</span></td>
            <td>$${s.cpa}</td>
          </tr>
        `;
      }).join('');
    }
  },

  /**
   * Render Financial Balance Tiers View
   */
  renderBalanceView(balanceData) {
    if (!balanceData || !balanceData.summary) return;
    const s = balanceData.summary;

    const elPool = document.getElementById('balance-pool-val');
    const elAvg = document.getElementById('balance-avg-val');
    const elRatio = document.getElementById('balance-multiplier-val');

    if (elPool) elPool.textContent = `$${s.totalBalancePool.toLocaleString()}`;
    if (elAvg) elAvg.textContent = `$${s.avgBalance.toLocaleString()}`;
    if (elRatio) elRatio.textContent = `${s.highVsLowRatio}x`;

    const tbody = document.getElementById('balance-tiers-table-body');
    if (tbody && balanceData.tiers) {
      tbody.innerHTML = balanceData.tiers.map(t => `
        <tr>
          <td><strong>${t.label}</strong></td>
          <td>${t.total.toLocaleString()} prospects</td>
          <td>${t.converted.toLocaleString()} (${t.responseRate}%)</td>
          <td>$${t.avgBalance.toLocaleString()}</td>
          <td>$${t.totalBalance.toLocaleString()}</td>
          <td>${t.avgTouches} dials</td>
        </tr>
      `).join('');
    }
  },

  /**
   * Render Lead Propensity Scoring View
   */
  renderPropensityView(propData) {
    if (!propData || !propData.summary) return;
    const s = propData.summary;

    const elHighCount = document.getElementById('prop-high-count');
    const elHighRate = document.getElementById('prop-high-rate');
    const elMidCount = document.getElementById('prop-mid-count');
    const elMidRate = document.getElementById('prop-mid-rate');
    const elLowCount = document.getElementById('prop-low-count');
    const elLowRate = document.getElementById('prop-low-rate');

    const dist = propData.distribution || [];
    const high = dist.find(d => d.tier === 'High Propensity') || { count: 0, actualConversionRate: 0, percentage: 0 };
    const mid = dist.find(d => d.tier === 'Moderate Propensity') || { count: 0, actualConversionRate: 0, percentage: 0 };
    const low = dist.find(d => d.tier === 'Low Propensity') || { count: 0, actualConversionRate: 0, percentage: 0 };

    if (elHighCount) elHighCount.textContent = `${high.count.toLocaleString()} (${high.percentage}%)`;
    if (elHighRate) elHighRate.textContent = `${high.actualConversionRate}%`;
    if (elMidCount) elMidCount.textContent = `${mid.count.toLocaleString()} (${mid.percentage}%)`;
    if (elMidRate) elMidRate.textContent = `${mid.actualConversionRate}%`;
    if (elLowCount) elLowCount.textContent = `${low.count.toLocaleString()} (${low.percentage}%)`;
    if (elLowRate) elLowRate.textContent = `${low.actualConversionRate}%`;

    const tbody = document.getElementById('prop-table-body');
    if (tbody) {
      tbody.innerHTML = dist.map(d => `
        <tr>
          <td><span class="badge ${d.badgeClass}">${d.tier}</span></td>
          <td>${d.count.toLocaleString()} prospects</td>
          <td>${d.percentage}%</td>
          <td><strong>${d.actualConversionRate}%</strong></td>
        </tr>
      `).join('');
    }
  },

  /**
   * Render Cohort A/B Comparison View
   */
  renderCohortComparisonView(cohortData) {
    if (!cohortData || !cohortData.comparison) return;
    const a = cohortData.cohortA;
    const b = cohortData.cohortB;
    const comp = cohortData.comparison;

    const nameA = document.querySelectorAll('.cohort-a-name-display');
    const nameB = document.querySelectorAll('.cohort-b-name-display');
    nameA.forEach(el => el.textContent = a.name || 'Cohort A');
    nameB.forEach(el => el.textContent = b.name || 'Cohort B');

    // Values in head-to-head table
    const elSizeA = document.getElementById('cohort-a-size');
    const elSizeB = document.getElementById('cohort-b-size');
    const elConvA = document.getElementById('cohort-a-conv');
    const elConvB = document.getElementById('cohort-b-conv');
    const elRateA = document.getElementById('cohort-a-rate');
    const elRateB = document.getElementById('cohort-b-rate');
    const elTouchesA = document.getElementById('cohort-a-touches');
    const elTouchesB = document.getElementById('cohort-b-touches');
    const elDurA = document.getElementById('cohort-a-dur');
    const elDurB = document.getElementById('cohort-b-dur');
    const elBalA = document.getElementById('cohort-a-bal');
    const elBalB = document.getElementById('cohort-b-bal');

    if (elSizeA) elSizeA.textContent = a.count.toLocaleString();
    if (elSizeB) elSizeB.textContent = b.count.toLocaleString();
    if (elConvA) elConvA.textContent = a.conversions.toLocaleString();
    if (elConvB) elConvB.textContent = b.conversions.toLocaleString();
    if (elRateA) elRateA.textContent = `${a.conversionRate}%`;
    if (elRateB) elRateB.textContent = `${b.conversionRate}%`;
    if (elTouchesA) elTouchesA.textContent = a.avgTouches;
    if (elTouchesB) elTouchesB.textContent = b.avgTouches;
    if (elDurA) elDurA.textContent = `${Math.floor(a.avgDuration / 60)}m ${a.avgDuration % 60}s`;
    if (elDurB) elDurB.textContent = `${Math.floor(b.avgDuration / 60)}m ${b.avgDuration % 60}s`;
    if (elBalA) elBalA.textContent = `$${a.avgBalance.toLocaleString()}`;
    if (elBalB) elBalB.textContent = `$${b.avgBalance.toLocaleString()}`;

    // Uplift and significance
    const elDiff = document.getElementById('cohort-metric-diff');
    const elLift = document.getElementById('cohort-metric-lift');
    if (elDiff) elDiff.textContent = `${comp.absoluteDifference >= 0 ? '+' : ''}${comp.absoluteDifference}%`;
    if (elLift) elLift.textContent = `${comp.relativeLift >= 0 ? '+' : ''}${comp.relativeLift}%`;

    const banner = document.getElementById('cohort-sig-banner');
    if (banner) {
      banner.className = `sig-banner ${comp.isSignificant ? 'significant' : 'insignificant'}`;
      banner.innerHTML = `
        <div>
          <div class="fw-bold mb-1">
            <i class="bi ${comp.isSignificant ? 'bi-patch-check-fill text-success' : 'bi-info-circle-fill text-warning'} me-1"></i>
            ${comp.isSignificant ? 'Statistically Significant Outcome' : 'Inconclusive / Neutral Variance'}
          </div>
          <div class="small">${comp.significanceLabel}</div>
        </div>
        <div class="text-end font-monospace small">
          <div>Z-Score: <strong>${comp.zScore}</strong></div>
          <div>p-value: <strong>${comp.pValue}</strong></div>
        </div>
      `;
    }
  },

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

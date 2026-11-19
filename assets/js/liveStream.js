/**
 * Bank Marketing Campaign Analysis Dashboard
 * Real-Time Outbound Campaign Telemetry & Live Data Streaming Engine
 * 
 * Supports both Flask Backend API (SQLite persistence) and client-side fallback.
 */

const LiveStreamEngine = {
  isRunning: true,
  speedMs: 3000,
  timerId: null,
  eventCount: 0,
  maxFeedRows: 30,

  jobs: ['management', 'technician', 'blue-collar', 'admin.', 'retired', 'services', 'self-employed', 'student', 'unemployed', 'entrepreneur', 'housemaid'],
  jobWeights: [0.22, 0.18, 0.18, 0.11, 0.08, 0.07, 0.04, 0.04, 0.03, 0.03, 0.02],

  months: ['may', 'jul', 'aug', 'jun', 'nov', 'apr', 'feb', 'jan', 'oct', 'sep', 'mar', 'dec'],

  /**
   * Initialize live telemetry stream controller & event listeners
   */
  init() {
    this.bindControls();
    this.updateControlsUI();

    // Auto-start streaming on load so user sees live campaign data immediately
    this.start();
  },

  /**
   * Bind topbar buttons, speed selectors, and simulation triggers
   */
  bindControls() {
    // 1. Topbar live toggle button
    const topbarBtn = document.getElementById('btn-toggle-live-topbar');
    if (topbarBtn) {
      topbarBtn.addEventListener('click', () => this.toggle());
    }

    // 2. Banner stream play/pause toggle
    const bannerToggleBtn = document.getElementById('btn-toggle-stream');
    if (bannerToggleBtn) {
      bannerToggleBtn.addEventListener('click', () => this.toggle());
    }

    // 3. Manual simulate call button
    const simulateBtn = document.getElementById('btn-simulate-call');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => {
        this.simulateContact();
        if (typeof UIEngine !== 'undefined') {
          UIEngine.showToast('Outbound Contact Dispatched', 'Simulated 1 live outbound dialer contact.', 'info');
        }
      });
    }

    // 4. Stream Speed buttons
    const speedButtons = document.querySelectorAll('.btn-speed');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt(btn.getAttribute('data-speed'), 10);
        if (speed && !isNaN(speed)) {
          this.setSpeed(speed);
        }
      });
    });

    // 5. Clear Live Feed Log button
    const clearLogBtn = document.getElementById('btn-clear-live-log');
    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        const tbody = document.getElementById('live-stream-tbody');
        if (tbody) {
          tbody.innerHTML = `
            <tr class="live-empty-row text-center text-muted py-4">
              <td colspan="9">Feed cleared. Waiting for next live campaign contact...</td>
            </tr>
          `;
        }
        this.eventCount = 0;
        const counter = document.getElementById('live-feed-counter');
        if (counter) counter.textContent = '0 events received';
      });
    }
  },

  /**
   * Start or resume live streaming
   */
  start() {
    if (this.timerId) clearInterval(this.timerId);
    this.isRunning = true;
    this.timerId = setInterval(() => {
      this.simulateContact();
    }, this.speedMs);

    this.updateControlsUI();
  },

  /**
   * Pause live streaming
   */
  pause() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.updateControlsUI();
  },

  /**
   * Toggle between play and pause
   */
  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  },

  /**
   * Adjust streaming frequency speed (3000ms, 1500ms, 600ms)
   */
  setSpeed(ms) {
    this.speedMs = ms;
    document.querySelectorAll('.btn-speed').forEach(btn => {
      const btnSpeed = parseInt(btn.getAttribute('data-speed'), 10);
      btn.classList.toggle('active', btnSpeed === ms);
    });

    if (this.isRunning) {
      this.start();
    }
  },

  /**
   * Update UI buttons, badges, and toggle indicators across the page
   */
  updateControlsUI() {
    // 1. Topbar live toggle button
    const topbarText = document.getElementById('topbar-live-text');
    const topbarBtn = document.getElementById('btn-toggle-live-topbar');
    if (topbarBtn) {
      topbarBtn.classList.toggle('is-active', this.isRunning);
    }
    if (topbarText) {
      topbarText.innerHTML = this.isRunning ? 'Live: <strong>LIVE</strong>' : 'Live: <strong>PAUSED</strong>';
    }

    // 2. Banner play/pause button
    const streamToggleText = document.getElementById('stream-toggle-text');
    const streamToggleIcon = document.getElementById('stream-toggle-icon');
    if (streamToggleText && streamToggleIcon) {
      if (this.isRunning) {
        streamToggleText.textContent = 'Pause Stream';
        streamToggleIcon.className = 'bi bi-pause-fill';
      } else {
        streamToggleText.textContent = 'Resume Stream';
        streamToggleIcon.className = 'bi bi-play-fill';
      }
    }

    // 3. Banner status badge
    const statusBadge = document.getElementById('telemetry-status-badge');
    const statusText = document.getElementById('telemetry-status-text');
    if (statusBadge && statusText) {
      if (this.isRunning) {
        statusBadge.className = 'telemetry-status-badge active';
        statusText.textContent = 'LIVE STREAMING ACTIVE';
      } else {
        statusBadge.className = 'telemetry-status-badge paused';
        statusText.textContent = 'STREAM PAUSED';
      }
    }
  },

  /**
   * Generates a realistic bank outreach contact with probabilistic propensity
   */
  generateContact() {
    // Weighted job category
    const rand = Math.random();
    let cum = 0;
    let job = this.jobs[0];
    for (let i = 0; i < this.jobs.length; i++) {
      cum += this.jobWeights[i];
      if (rand <= cum) {
        job = this.jobs[i];
        break;
      }
    }

    const educations = ['secondary', 'tertiary', 'primary', 'unknown'];
    const education = educations[Math.floor(Math.random() * educations.length)];

    const age = Math.floor(Math.random() * 55) + 20; // 20 - 75
    const contact = Math.random() < 0.82 ? 'cellular' : 'telephone';
    const housing = Math.random() < 0.54 ? 'yes' : 'no';
    const loan = Math.random() < 0.16 ? 'yes' : 'no';
    const marital = Math.random() < 0.60 ? 'married' : (Math.random() < 0.70 ? 'single' : 'divorced');
    const balance = Math.floor(Math.random() * 8500) - 200;
    const touches = Math.random() < 0.50 ? 1 : (Math.random() < 0.75 ? 2 : (Math.random() < 0.90 ? 3 : 4));
    const duration = Math.floor(Math.random() * 520) + 45;
    const month = this.months[Math.floor(Math.random() * this.months.length)];
    const day = Math.floor(Math.random() * 28) + 1;

    // Realistic conversion calculation
    let propensity = 0.115; // Benchmark 11.5%
    if (job === 'retired' || job === 'student') propensity += 0.22;
    else if (job === 'management') propensity += 0.05;
    else if (job === 'blue-collar') propensity -= 0.04;

    if (housing === 'no') propensity += 0.08;
    if (contact === 'cellular') propensity += 0.05;
    if (duration > 300) propensity += 0.20;
    else if (duration < 90) propensity -= 0.09;
    if (touches > 3) propensity -= 0.08;

    propensity = Math.max(0.02, Math.min(0.85, propensity));
    const converted = Math.random() < propensity;
    const y = converted ? 'yes' : 'no';

    return {
      age,
      job,
      marital,
      education,
      default: 'no',
      balance,
      housing,
      loan,
      contact,
      day,
      month,
      duration,
      campaign: touches,
      pdays: -1,
      previous: 0,
      poutcome: 'nonexistent',
      y
    };
  },

  /**
   * Dispatches a single contact interaction to backend (if online) and updates frontend state
   */
  async simulateContact(explicitRecord = null) {
    const contact = explicitRecord || this.generateContact();

    // 1. If backend connected, persist into SQLite database via REST API
    if (typeof appState !== 'undefined' && appState.state.backendConnected && typeof ApiClient !== 'undefined') {
      try {
        const res = await ApiClient.simulateLiveInteraction(contact);
        if (res.ok && res.data && res.data.record) {
          this.processSavedContact(res.data.record, res.data.kpis);
          return;
        }
      } catch (err) {
        console.warn('Backend live simulation failed, falling back to local store:', err);
      }
    }

    // 2. Client-side local processing
    this.processSavedContact(contact);
  },

  /**
   * Ingests the saved/generated contact, updates KPIs, chart, ticker, and table feed
   */
  processSavedContact(record, serverKpis = null) {
    this.eventCount++;

    // A. Append to AppState
    if (typeof appState !== 'undefined') {
      appState.appendLiveRecord(record);
    }

    // B. Calculate/Get KPIs
    const kpis = serverKpis || (typeof AnalyticsEngine !== 'undefined' && typeof appState !== 'undefined'
      ? AnalyticsEngine.computeKPIs(appState.getFilteredDataset())
      : null);

    // C. Update KPI counters with subtle pulse effect
    if (kpis && typeof UIEngine !== 'undefined') {
      UIEngine.updateKPIs(kpis);
      UIEngine.pulseKPIs();
    }

    // D. Update Outcome Doughnut Chart without page flicker
    if (kpis && typeof ChartsEngine !== 'undefined') {
      ChartsEngine.updateLiveOutcome(kpis);
    }

    // E. Prepend to Live Outbound Outreach Stream Table
    this.appendFeedRow(record);

    // F. Update Telemetry Banner Ticker
    this.updateBannerTicker(record);

    // G. Update Feed Counter Badge
    const counter = document.getElementById('live-feed-counter');
    if (counter) {
      counter.textContent = `${this.eventCount.toLocaleString()} events received`;
    }
  },

  /**
   * Prepend a live outreach row into the live stream table
   */
  appendFeedRow(record) {
    const tbody = document.getElementById('live-stream-tbody');
    if (!tbody) return;

    // Remove empty placeholder row if present
    const emptyRow = tbody.querySelector('.live-empty-row');
    if (emptyRow) emptyRow.remove();

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Format Propensity score
    let scoreInfo = { tier: 'Moderate Propensity', tierClass: 'badge-primary', propensityPercent: 18 };
    if (typeof AnalyticsEngine !== 'undefined' && AnalyticsEngine.scoreSingleLead) {
      scoreInfo = AnalyticsEngine.scoreSingleLead(record);
    }

    const isConverted = (record.y || '').toLowerCase() === 'yes';
    const outcomeBadge = isConverted
      ? `<span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Converted (Yes)</span>`
      : `<span class="badge badge-neutral"><i class="bi bi-x-circle"></i> No Outcome</span>`;

    const housingBadge = (record.housing || '').toLowerCase() === 'yes'
      ? `<span class="badge badge-outline-warning">Housing Loan</span>`
      : `<span class="badge badge-outline-success">No Mortgage</span>`;

    const channelBadge = (record.contact || '').toLowerCase() === 'cellular'
      ? `<span class="badge badge-info"><i class="bi bi-phone"></i> Cellular</span>`
      : `<span class="badge badge-neutral"><i class="bi bi-telephone"></i> Telephone</span>`;

    const jobFormatted = record.job ? record.job.charAt(0).toUpperCase() + record.job.slice(1) : 'Unknown';
    const durationMin = Math.floor(record.duration / 60);
    const durationSec = record.duration % 60;
    const durationStr = `${record.duration}s <span class="text-muted small">(${durationMin}m ${durationSec}s)</span>`;

    const row = document.createElement('tr');
    row.className = `live-feed-row live-row-enter ${isConverted ? 'row-converted' : ''}`;
    row.innerHTML = `
      <td class="text-nowrap text-muted font-monospace small"><i class="bi bi-clock"></i> ${timeStr}</td>
      <td class="fw-bold text-navy-950 font-monospace">#${record.id || (5000 + this.eventCount)}</td>
      <td>
        <span class="fw-semibold">${jobFormatted}</span>
        <span class="text-muted small">(${record.age} yrs)</span>
      </td>
      <td>${housingBadge}</td>
      <td>
        <span class="badge badge-outline">${record.campaign || 1} touch${(record.campaign || 1) > 1 ? 'es' : ''}</span>
      </td>
      <td>${durationStr}</td>
      <td>${channelBadge}</td>
      <td>
        <span class="badge ${scoreInfo.tierClass}">${scoreInfo.propensityPercent}%</span>
      </td>
      <td>${outcomeBadge}</td>
    `;

    tbody.insertBefore(row, tbody.firstChild);

    // Limit visible rows to maxFeedRows
    while (tbody.children.length > this.maxFeedRows) {
      tbody.removeChild(tbody.lastChild);
    }

    // Remove animation class after transition
    setTimeout(() => {
      row.classList.remove('live-row-enter');
    }, 1200);
  },

  /**
   * Update the live ticker banner text
   */
  updateBannerTicker(record) {
    const ticker = document.getElementById('telemetry-latest-text');
    if (!ticker) return;

    const jobFormatted = record.job ? record.job.charAt(0).toUpperCase() + record.job.slice(1) : 'Unknown';
    const isConverted = (record.y || '').toLowerCase() === 'yes';
    const outcomeText = isConverted ? '<strong class="text-success">CONVERTED (YES)</strong>' : '<span class="text-muted">Not Converted</span>';

    ticker.innerHTML = `Contact <strong>#${record.id || (5000 + this.eventCount)}</strong> • ${jobFormatted} (Age ${record.age}) • ${record.contact} • Duration ${record.duration}s • Outcome: ${outcomeText}`;
  }
};

if (typeof window !== 'undefined') {
  window.LiveStreamEngine = LiveStreamEngine;
}

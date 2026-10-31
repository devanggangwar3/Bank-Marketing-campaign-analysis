/**
 * Bank Marketing Campaign Analysis Dashboard
 * Application Bootstrap & Main Controller (Flask Backend + Client Fallback)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize UI Handlers
  UIEngine.init();

  // 2. Render helper function
  const renderDashboardViews = (state) => {
    const isApi = state.backendConnected && state.apiData.kpis;

    // A. KPIs
    const kpis = isApi ? state.apiData.kpis : AnalyticsEngine.computeKPIs(appState.getFilteredDataset());
    UIEngine.updateKPIs(kpis);

    // B. Header indicators
    UIEngine.updateHeaderIndicators(state);

    // C. Dynamic Insights
    const insights = isApi && state.apiData.insights
      ? state.apiData.insights
      : AnalyticsEngine.generateInsights(appState.getFilteredDataset());
    UIEngine.renderInsights(insights);

    // D. Charts
    if (isApi) {
      if (state.apiData.periods) ChartsEngine.renderPeriodChart('chart-period', state.apiData.periods);
      if (state.apiData.outcomeDistribution) ChartsEngine.renderOutcomeChart('chart-outcome', 'doughnut-center-rate', state.apiData.outcomeDistribution);
      if (state.apiData.channels) ChartsEngine.renderChannelChart('chart-channel', state.apiData.channels);
      if (state.apiData.frequencies) ChartsEngine.renderFatigueChart('chart-fatigue', state.apiData.frequencies);
      if (state.apiData.segments && state.apiData.segments.jobs) ChartsEngine.renderJobSegmentChart('chart-job-segments', state.apiData.segments.jobs);
      ChartsEngine.renderEducationHousingChart('chart-education-housing', appState.getFilteredDataset());
    } else {
      ChartsEngine.renderAll(appState.getFilteredDataset());
    }

    // E. Customer Segments View
    if (isApi && state.apiData.segments) {
      UIEngine.renderCustomerSegments(state.apiData.segments);
    } else {
      UIEngine.renderCustomerSegments(appState.getFilteredDataset());
    }

    // F. Financial Balance Tiers View & Chart
    if (isApi && state.apiData.balance) {
      UIEngine.renderBalanceView(state.apiData.balance);
      ChartsEngine.renderBalanceChart('chart-balance-tiers', state.apiData.balance);
    } else {
      const balData = AnalyticsEngine.computeBalanceAnalysis(appState.getFilteredDataset());
      UIEngine.renderBalanceView(balData);
      ChartsEngine.renderBalanceChart('chart-balance-tiers', balData);
    }

    // G. ROI & Budget Simulator View & Chart
    if (isApi && state.apiData.roi) {
      UIEngine.renderRoiView(state.apiData.roi);
      ChartsEngine.renderRoiChart('chart-roi-simulation', state.apiData.roi);
    } else {
      const roiData = AnalyticsEngine.computeROISimulation(
        appState.getFilteredDataset(),
        state.roiParams.costPerContact,
        state.roiParams.valuePerConversion,
        state.roiParams.touchCap === 'all' ? null : state.roiParams.touchCap
      );
      UIEngine.renderRoiView(roiData);
      ChartsEngine.renderRoiChart('chart-roi-simulation', roiData);
    }

    // H. Lead Propensity View & Chart
    if (isApi && state.apiData.propensity) {
      UIEngine.renderPropensityView(state.apiData.propensity);
      ChartsEngine.renderPropensityChart('chart-propensity-dist', state.apiData.propensity);
    } else {
      const propData = AnalyticsEngine.computePropensityAnalysis(appState.getFilteredDataset());
      UIEngine.renderPropensityView(propData);
      ChartsEngine.renderPropensityChart('chart-propensity-dist', propData);
    }

    // I. Cohort A/B Comparison View
    if (isApi && state.apiData.cohorts) {
      UIEngine.renderCohortComparisonView(state.apiData.cohorts);
    } else {
      const cohortData = AnalyticsEngine.computeCohortComparison(
        appState.getFilteredDataset(),
        state.cohortParams.cohortA,
        state.cohortParams.cohortB
      );
      UIEngine.renderCohortComparisonView(cohortData);
    }

    // J. Data Table
    UIEngine.renderTable();

    // K. Report View
    UIEngine.updateReportView(state, kpis);
  };

  // 3. Subscribe to state updates
  appState.subscribe((state, eventType) => {
    // Handle view tab switching
    if (eventType === 'view_changed') {
      const activeView = state.activeView;

      document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        if (link.getAttribute('data-view-target') === activeView) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      document.querySelectorAll('.page-view').forEach(view => {
        if (view.id === `view-${activeView}`) {
          view.classList.add('active-view');
        } else {
          view.classList.remove('active-view');
        }
      });

      const contentArea = document.querySelector('.content-area');
      if (contentArea) contentArea.scrollTop = 0;
    }

    renderDashboardViews(state);
  });

  // 4. Initialize Data Source: Check Flask Backend first
  const connected = await appState.checkBackendConnection();

  if (connected) {
    UIEngine.showToast(
      'Flask Backend Online',
      'Connected to Python Flask REST API & SQLite database (Port 5000).',
      'success'
    );
  } else {
    // Fallback to client-side benchmark dataset
    if (typeof window.DEMO_CAMPAIGN_DATA !== 'undefined' && Array.isArray(window.DEMO_CAMPAIGN_DATA)) {
      appState.setDataset(window.DEMO_CAMPAIGN_DATA, 'demo');
      UIEngine.showToast(
        'Client-Side Mode Active',
        'Backend not detected on :5000. Operating in in-memory client mode with benchmark dataset.',
        'info'
      );
    } else {
      appState.setDataset([], 'demo');
    }
  }
});

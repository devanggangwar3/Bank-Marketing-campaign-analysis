/**
 * Bank Marketing Campaign Analysis Dashboard
 * Application Bootstrap & Main Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize UI Handlers
  UIEngine.init();

  // 2. Subscribe Controller to State Updates
  appState.subscribe((state, eventType) => {
    // A. Handle View Changes (switching between Dashboard, Analytics, Segments, Upload, Reports, Settings)
    if (eventType === 'view_changed' || eventType === 'dataset_changed') {
      const activeView = state.activeView;

      // Update sidebar active links
      document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        if (link.getAttribute('data-view-target') === activeView) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // Show the selected page view
      document.querySelectorAll('.page-view').forEach(view => {
        if (view.id === `view-${activeView}`) {
          view.classList.add('active-view');
        } else {
          view.classList.remove('active-view');
        }
      });

      // Scroll smoothly to top of content area
      const contentArea = document.querySelector('.content-area');
      if (contentArea) contentArea.scrollTop = 0;
    }

    // B. Calculate Filtered Data & Analytics
    const filteredRecords = appState.getFilteredDataset();
    const kpis = AnalyticsEngine.computeKPIs(filteredRecords);
    const insights = AnalyticsEngine.generateInsights(filteredRecords);

    // C. Update Topbar & Indicators
    UIEngine.updateHeaderIndicators(state);

    // D. Update KPI Values Across Views
    UIEngine.updateKPIs(kpis);

    // E. Render Dynamic Insight Cards
    UIEngine.renderInsights(insights);

    // F. Render Interactive Charts
    ChartsEngine.renderAll(filteredRecords);

    // G. Render Customer Segments View
    UIEngine.renderCustomerSegments(filteredRecords);

    // H. Render Data Table & Pagination
    UIEngine.renderTable();

    // I. Update Executive Report View Meta
    UIEngine.updateReportView(state, kpis);
  });

  // 3. Pre-load benchmark dataset
  if (typeof window.DEMO_CAMPAIGN_DATA !== 'undefined' && Array.isArray(window.DEMO_CAMPAIGN_DATA)) {
    appState.setDataset(window.DEMO_CAMPAIGN_DATA, 'demo');
    UIEngine.showToast(
      'Bank Marketing BI Initialized',
      'Loaded 1,250 benchmark campaign records. You can filter, explore segments, or upload your own CSV.',
      'info'
    );
  } else {
    console.warn('DEMO_CAMPAIGN_DATA not found. Starting with empty dataset.');
    appState.setDataset([], 'demo');
  }
});

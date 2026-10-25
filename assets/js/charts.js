/**
 * Bank Marketing Campaign Analysis Dashboard
 * Chart.js Integration & Visual Data Visualizations
 * Supports both Flask Backend API aggregated structures and Client-side fallback arrays.
 */

const ChartsEngine = {
  instances: {},

  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  getDefaultOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            usePointStyle: true,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11,
              weight: '600'
            },
            color: '#475569'
          }
        },
        tooltip: {
          backgroundColor: '#0F172A',
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          padding: 10,
          cornerRadius: 8,
          boxPadding: 4,
          callbacks: {
            label(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
              return `${label}: ${value}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#64748B'
          }
        },
        y: {
          border: { dash: [4, 4] },
          grid: { color: '#E2E8F0' },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#64748B',
            callback: value => `${value}%`
          }
        }
      }
    };
  },

  /**
   * 1. Contact Period Response Rate Chart
   */
  renderPeriodChart(canvasId, input) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const periodData = Array.isArray(input) && input.length > 0 && input[0].fullName
      ? input
      : AnalyticsEngine.computeByPeriod(input || []);

    const labels = periodData.map(p => p.fullName || p.label);
    const rates = periodData.map(p => p.responseRate);

    const ctx = canvas.getContext('2d');
    const primaryGrad = ctx.createLinearGradient(0, 0, 0, 300);
    primaryGrad.addColorStop(0, 'rgba(37, 99, 235, 0.85)');
    primaryGrad.addColorStop(1, 'rgba(37, 99, 235, 0.35)');

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Response Rate (%)',
            data: rates,
            backgroundColor: primaryGrad,
            borderColor: '#2563EB',
            borderWidth: 1.5,
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Target Benchmark (11.5%)',
            data: labels.map(() => APP_CONFIG.benchmarkResponseRate),
            borderColor: '#F59E0B',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        ...this.getDefaultOptions(),
        plugins: {
          ...this.getDefaultOptions().plugins,
          tooltip: {
            ...this.getDefaultOptions().plugins.tooltip,
            callbacks: {
              afterBody(items) {
                const idx = items[0].dataIndex;
                const item = periodData[idx];
                return item ? [
                  `Total Outreach Volume: ${item.total} contacts`,
                  `Converted: ${item.converted} (${item.responseRate}%)`
                ] : [];
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            suggestedMax: 35,
            grid: { color: '#F1F5F9' },
            ticks: { callback: v => `${v}%` }
          }
        }
      }
    });
  },

  /**
   * 2. Communication Channel Response Rate Chart
   */
  renderChannelChart(canvasId, input) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const channelData = Array.isArray(input) && input.length > 0 && input[0].label && input[0].responseRate !== undefined
      ? input
      : AnalyticsEngine.computeByChannel(input || []);

    const labels = channelData.map(c => c.label);
    const rates = channelData.map(c => c.responseRate);
    const colors = ['#2563EB', '#10B981', '#64748B'];

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Response Rate (%)',
          data: rates,
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 8,
          borderWidth: 0,
          maxBarThickness: 45
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        plugins: {
          ...this.getDefaultOptions().plugins,
          tooltip: {
            callbacks: {
              afterBody(items) {
                const idx = items[0].dataIndex;
                const item = channelData[idx];
                return item ? [
                  `Sample Size: N = ${item.total}`,
                  `Conversions: ${item.converted} / ${item.total}`
                ] : [];
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: v => `${v}%` }
          }
        }
      }
    });
  },

  /**
   * 3. Response Rate by Number of Contacts (Fatigue Analysis)
   */
  renderFatigueChart(canvasId, input) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const fatigueData = Array.isArray(input) && input.length > 0 && input[0].label && input[0].responseRate !== undefined
      ? input
      : AnalyticsEngine.computeByContacts(input || []);

    const labels = fatigueData.map(f => f.label);
    const rates = fatigueData.map(f => f.responseRate);

    const ctx = canvas.getContext('2d');
    const lineGrad = ctx.createLinearGradient(0, 0, 0, 250);
    lineGrad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    lineGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    this.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Response Rate Decay (%)',
          data: rates,
          borderColor: '#EF4444',
          backgroundColor: lineGrad,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#EF4444',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        plugins: {
          ...this.getDefaultOptions().plugins,
          tooltip: {
            callbacks: {
              afterBody(items) {
                const idx = items[0].dataIndex;
                const item = fatigueData[idx];
                return item ? [
                  `Contact Volume: ${item.total} prospects`,
                  `Conversions: ${item.converted}`,
                  idx >= 3 ? '⚠️ Marketing Fatigue Zone' : '✅ Effective Engagement Window'
                ] : [];
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: v => `${v}%` }
          }
        }
      }
    });
  },

  /**
   * 4. Outcome Distribution Doughnut Chart (Accepted vs Not Accepted)
   */
  renderOutcomeChart(canvasId, centerMetricId, input) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const outcomeData = input && input.labels && input.counts
      ? input
      : AnalyticsEngine.computeOutcomeDistribution(input || []);

    const centerEl = document.getElementById(centerMetricId);
    if (centerEl && outcomeData.rates && outcomeData.rates.length > 0) {
      centerEl.textContent = `${outcomeData.rates[0]}%`;
    }

    this.instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: outcomeData.labels,
        datasets: [{
          data: outcomeData.counts,
          backgroundColor: ['#10B981', '#E2E8F0'],
          hoverBackgroundColor: ['#059669', '#CBD5E1'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
          cutout: '72%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label(context) {
                const val = context.parsed;
                const total = outcomeData.total || 1;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${val.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * 5. Segment Comparison: Job Category Response Rates
   */
  renderJobSegmentChart(canvasId, input) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const jobData = Array.isArray(input) && input.length > 0 && input[0].label && input[0].responseRate !== undefined
      ? input
      : AnalyticsEngine.computeByJob(input || []);

    const labels = jobData.map(j => j.label);
    const rates = jobData.map(j => j.responseRate);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Response Rate (%)',
          data: rates,
          backgroundColor: rates.map(r => r >= APP_CONFIG.benchmarkResponseRate ? '#2563EB' : '#94A3B8'),
          borderRadius: 5,
          borderWidth: 0,
          maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        ...this.getDefaultOptions(),
        plugins: {
          ...this.getDefaultOptions().plugins,
          tooltip: {
            callbacks: {
              afterBody(items) {
                const idx = items[0].dataIndex;
                const item = jobData[idx];
                return item ? [
                  `Sample Size: N = ${item.total}`,
                  `Converted: ${item.converted}`,
                  `Declined: ${item.declined || (item.total - item.converted)}`
                ] : [];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { callback: v => `${v}%` }
          },
          y: { grid: { display: false } }
        }
      }
    });
  },

  /**
   * 6. Segment Comparison: Education vs Housing Loan Propensity
   */
  renderEducationHousingChart(canvasId, records) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const educations = ['Primary', 'Secondary', 'Tertiary', 'Unknown'];
    const withHousingRates = [];
    const noHousingRates = [];

    const recs = Array.isArray(records) ? records : [];

    educations.forEach(ed => {
      const edLow = ed.toLowerCase();
      const withH = recs.filter(r => (r.education || '').toLowerCase() === edLow && (r.housing || '').toLowerCase() === 'yes');
      const noH = recs.filter(r => (r.education || '').toLowerCase() === edLow && (r.housing || '').toLowerCase() === 'no');

      withHousingRates.push(AnalyticsEngine.computeKPIs(withH).responseRate);
      noHousingRates.push(AnalyticsEngine.computeKPIs(noH).responseRate);
    });

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: educations,
        datasets: [
          {
            label: 'No Housing Debt',
            data: noHousingRates,
            backgroundColor: '#10B981',
            borderRadius: 6,
            maxBarThickness: 32
          },
          {
            label: 'Has Housing Loan',
            data: withHousingRates,
            backgroundColor: '#64748B',
            borderRadius: 6,
            maxBarThickness: 32
          }
        ]
      },
      options: {
        ...this.getDefaultOptions(),
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: v => `${v}%` }
          }
        }
      }
    });
  },

  renderAll(records) {
    this.renderPeriodChart('chart-period', records);
    this.renderChannelChart('chart-channel', records);
    this.renderFatigueChart('chart-fatigue', records);
    this.renderOutcomeChart('chart-outcome', 'doughnut-center-rate', records);
    this.renderJobSegmentChart('chart-job-segments', records);
    this.renderEducationHousingChart('chart-education-housing', records);
  }
};

if (typeof window !== 'undefined') {
  window.ChartsEngine = ChartsEngine;
}

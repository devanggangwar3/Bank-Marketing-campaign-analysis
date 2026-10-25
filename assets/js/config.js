/**
 * Bank Marketing Campaign Analysis Dashboard
 * Application Configuration & Dataset Schema Definition
 */

const APP_CONFIG = {
  appName: 'BankPulse BI',
  appVersion: '2.4.0',
  benchmarkResponseRate: 11.5, // Industry benchmark percentage
  
  // Standard schema columns expected in the Bank Marketing dataset (UCI standard)
  schema: {
    requiredColumns: [
      'age',
      'job',
      'marital',
      'education',
      'default',
      'balance',
      'housing',
      'loan',
      'contact',
      'day',
      'month',
      'duration',
      'campaign',
      'pdays',
      'previous',
      'poutcome',
      'y'
    ],
    // Flexible aliases to support alternate column namings from different CRM exports
    aliases: {
      'y': ['y', 'deposit', 'subscribed', 'target', 'conversion', 'outcome', 'response'],
      'campaign': ['campaign', 'contacts', 'campaign_contacts', 'touches'],
      'duration': ['duration', 'call_duration', 'duration_sec', 'seconds'],
      'balance': ['balance', 'account_balance', 'avg_balance'],
      'housing': ['housing', 'housing_loan', 'home_loan'],
      'loan': ['loan', 'personal_loan'],
      'poutcome': ['poutcome', 'prev_outcome', 'previous_outcome']
    }
  },

  // Canonical month order for chronologically accurate charts
  monthsOrder: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  
  monthNames: {
    'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
    'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
    'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
  },

  // Color tokens for Chart.js
  chartColors: {
    navyDark: '#0B1528',
    navyMid: '#1E293B',
    primary: '#2563EB',
    primaryGlow: 'rgba(37, 99, 235, 0.2)',
    emerald: '#10B981',
    emeraldGlow: 'rgba(16, 185, 129, 0.2)',
    amber: '#F59E0B',
    rose: '#EF4444',
    indigo: '#6366F1',
    teal: '#14B8A6',
    slateBorder: '#E2E8F0',
    slateText: '#64748B',
    palette: [
      '#2563EB', '#10B981', '#6366F1', '#F59E0B',
      '#EC4899', '#14B8A6', '#8B5CF6', '#F97316',
      '#06B6D4', '#84CC16', '#64748B', '#D946EF'
    ]
  }
};

if (typeof window !== 'undefined') {
  window.APP_CONFIG = APP_CONFIG;
}

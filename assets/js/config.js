/**
 * Bank Marketing Campaign Analysis Dashboard
 * Application Configuration & Dataset Schema Definition
 */

const APP_CONFIG = {
  appName: 'BankPulse BI',
  appVersion: '2.4.0',
  benchmarkResponseRate: 11.5, // Industry benchmark percentage
  apiBaseUrl: 'http://localhost:5000/api', // Flask backend endpoint
  
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
    navyDark: '#142B25',
    navyMid: '#2B3A34',
    primary: '#16796B',
    primaryGlow: 'rgba(22, 121, 107, 0.2)',
    emerald: '#2B8A68',
    emeraldGlow: 'rgba(43, 138, 104, 0.2)',
    amber: '#D99A2B',
    rose: '#D76750',
    indigo: '#537F88',
    teal: '#279582',
    slateBorder: '#DCE3DD',
    slateText: '#748179',
    palette: [
      '#16796B', '#B7D979', '#D99A2B', '#D76750',
      '#537F88', '#79B5A2', '#53695F', '#E6B75A',
      '#7D9C93', '#A8C66C', '#64746C', '#C9826A'
    ]
  }
};

if (typeof window !== 'undefined') {
  window.APP_CONFIG = APP_CONFIG;
}

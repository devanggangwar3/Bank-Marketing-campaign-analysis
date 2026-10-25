/**
 * Bank Marketing Campaign Analysis Dashboard
 * Analytical Computation Engine & Dynamic Insight Generator
 */

const AnalyticsEngine = {
  /**
   * Computes top-level executive KPI metrics
   */
  computeKPIs(records = []) {
    const totalCustomers = records.length;
    if (totalCustomers === 0) {
      return {
        totalCustomers: 0,
        totalContacts: 0,
        successfulResponses: 0,
        unsuccessfulResponses: 0,
        responseRate: 0,
        avgContactsPerCustomer: 0,
        avgDurationSeconds: 0,
        avgDurationSuccessful: 0,
        previousSuccessRate: 0
      };
    }

    let successfulCount = 0;
    let totalContacts = 0;
    let totalDuration = 0;
    let successfulDuration = 0;
    let prevSuccessTotal = 0;
    let prevSuccessConverted = 0;

    for (let i = 0; i < totalCustomers; i++) {
      const r = records[i];
      const isYes = (r.y || '').toLowerCase() === 'yes';
      const contacts = Number(r.campaign) || 1;
      const duration = Number(r.duration) || 0;

      totalContacts += contacts;
      totalDuration += duration;

      if (isYes) {
        successfulCount++;
        successfulDuration += duration;
      }

      if ((r.poutcome || '').toLowerCase() === 'success') {
        prevSuccessTotal++;
        if (isYes) prevSuccessConverted++;
      }
    }

    const unsuccessfulCount = totalCustomers - successfulCount;
    const responseRate = (successfulCount / totalCustomers) * 100;
    const avgContacts = totalContacts / totalCustomers;
    const avgDuration = totalDuration / totalCustomers;
    const avgDurationSuccess = successfulCount > 0 ? successfulDuration / successfulCount : 0;
    const prevSuccessRate = prevSuccessTotal > 0 ? (prevSuccessConverted / prevSuccessTotal) * 100 : 0;

    return {
      totalCustomers,
      totalContacts,
      successfulResponses: successfulCount,
      unsuccessfulResponses: unsuccessfulCount,
      responseRate: Number(responseRate.toFixed(2)),
      avgContactsPerCustomer: Number(avgContacts.toFixed(1)),
      avgDurationSeconds: Math.round(avgDuration),
      avgDurationSuccessful: Math.round(avgDurationSuccess),
      previousSuccessRate: Number(prevSuccessRate.toFixed(1)),
      benchmarkDiff: Number((responseRate - APP_CONFIG.benchmarkResponseRate).toFixed(2))
    };
  },

  /**
   * Helper to aggregate records by a key and compute response statistics
   */
  aggregateByKey(records, keyExtractor) {
    const map = new Map();

    records.forEach(r => {
      const key = keyExtractor(r);
      if (!map.has(key)) {
        map.set(key, { key, total: 0, converted: 0, declined: 0, totalDuration: 0 });
      }
      const entry = map.get(key);
      entry.total++;
      entry.totalDuration += Number(r.duration) || 0;
      if ((r.y || '').toLowerCase() === 'yes') {
        entry.converted++;
      } else {
        entry.declined++;
      }
    });

    const results = [];
    for (const [key, val] of map.entries()) {
      const rate = val.total > 0 ? (val.converted / val.total) * 100 : 0;
      const avgDuration = val.total > 0 ? Math.round(val.totalDuration / val.total) : 0;
      results.push({
        label: key,
        total: val.total,
        converted: val.converted,
        declined: val.declined,
        responseRate: Number(rate.toFixed(1)),
        avgDuration
      });
    }

    return results;
  },

  /**
   * Response rate by contact period (months)
   */
  computeByPeriod(records = []) {
    const raw = this.aggregateByKey(records, r => (r.month || 'unknown').toLowerCase());
    const order = APP_CONFIG.monthsOrder;

    // Sort chronologically by standard calendar months
    return raw.sort((a, b) => {
      const idxA = order.indexOf(a.label);
      const idxB = order.indexOf(b.label);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.label.localeCompare(b.label);
    }).map(item => ({
      ...item,
      fullName: APP_CONFIG.monthNames[item.label] || item.label.toUpperCase()
    }));
  },

  /**
   * Response rate by contact communication channel (cellular, telephone, unknown)
   */
  computeByChannel(records = []) {
    const raw = this.aggregateByKey(records, r => {
      const c = (r.contact || 'unknown').toLowerCase();
      if (c === 'cellular') return 'Cellular';
      if (c === 'telephone') return 'Telephone';
      return 'Unknown Channel';
    });

    return raw.sort((a, b) => b.total - a.total);
  },

  /**
   * Response rate by number of campaign contacts (Marketing Fatigue Analysis)
   * Groups: 1 contact, 2 contacts, 3, 4, 5, 6+
   */
  computeByContacts(records = []) {
    const raw = this.aggregateByKey(records, r => {
      const c = Number(r.campaign) || 1;
      if (c === 1) return '1 Contact';
      if (c === 2) return '2 Contacts';
      if (c === 3) return '3 Contacts';
      if (c === 4) return '4 Contacts';
      if (c === 5) return '5 Contacts';
      return '6+ Contacts';
    });

    const order = ['1 Contact', '2 Contacts', '3 Contacts', '4 Contacts', '5 Contacts', '6+ Contacts'];
    return raw.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  },

  /**
   * Outcome Distribution (Doughnut chart)
   */
  computeOutcomeDistribution(records = []) {
    const kpis = this.computeKPIs(records);
    return {
      labels: ['Successful Subscription (Yes)', 'Declined / No Outcome (No)'],
      counts: [kpis.successfulResponses, kpis.unsuccessfulResponses],
      rates: [
        kpis.responseRate,
        Number((100 - kpis.responseRate).toFixed(1))
      ],
      total: kpis.totalCustomers
    };
  },

  /**
   * Segment comparison: Job Categories
   */
  computeByJob(records = []) {
    const raw = this.aggregateByKey(records, r => {
      const j = (r.job || 'unknown').toLowerCase();
      return j.charAt(0).toUpperCase() + j.slice(1);
    });

    return raw.sort((a, b) => b.responseRate - a.responseRate);
  },

  /**
   * Segment comparison: Education Levels
   */
  computeByEducation(records = []) {
    const raw = this.aggregateByKey(records, r => {
      const ed = (r.education || 'unknown').toLowerCase();
      return ed.charAt(0).toUpperCase() + ed.slice(1);
    });

    return raw.sort((a, b) => b.responseRate - a.responseRate);
  },

  /**
   * Segment comparison: Age Brackets
   */
  computeByAgeBracket(records = []) {
    const raw = this.aggregateByKey(records, r => {
      const age = Number(r.age) || 0;
      if (age < 30) return '< 30 Years';
      if (age <= 45) return '30 - 45 Years';
      if (age <= 60) return '46 - 60 Years';
      return '> 60 Years';
    });

    const order = ['< 30 Years', '30 - 45 Years', '46 - 60 Years', '> 60 Years'];
    return raw.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  },

  /**
   * Segment comparison: Housing Loan vs No Housing Loan
   */
  computeByHousing(records = []) {
    const raw = this.aggregateByKey(records, r => {
      return (r.housing || '').toLowerCase() === 'yes' ? 'Has Housing Loan' : 'No Housing Loan';
    });

    return raw.sort((a, b) => b.responseRate - a.responseRate);
  },

  /**
   * Automatically generate Campaign Insight Cards
   * Highlights high-response segments, low-response segments,
   * fatigue thresholds, and channel effectiveness with sample size (N=...)
   * Formulates all recommendations as "Observations to Test", not guaranteed outcomes!
   */
  generateInsights(records = []) {
    if (!records || records.length < 10) {
      return [
        {
          category: 'insufficient-data',
          categoryLabel: 'Sample Size Low',
          title: 'Awaiting Sufficient Campaign Data',
          stat: 'N < 10',
          context: 'Dataset too small for reliable statistical patterns',
          testHypothesis: 'Observation to Test: Load a larger cohort (N > 100) to uncover statistically meaningful segment variances.'
        }
      ];
    }

    const insights = [];
    const overall = this.computeKPIs(records);
    const avgRate = overall.responseRate;

    // 1. High-Response Segment: Job Roles (sample size >= 15)
    const jobStats = this.computeByJob(records).filter(j => j.total >= 15);
    if (jobStats.length > 0) {
      const topJob = jobStats[0];
      const diff = (topJob.responseRate - avgRate).toFixed(1);
      insights.push({
        id: 'top-job-segment',
        category: 'high-response',
        categoryClass: 'insight-tag-high-response',
        categoryLabel: 'High-Response Segment',
        title: `${topJob.label} Segment Shows Strongest Engagement`,
        stat: `${topJob.responseRate}%`,
        sampleSize: `N = ${topJob.total}`,
        context: `+${diff}% higher than portfolio average (${avgRate}%)`,
        testHypothesis: `Observation to Test: Evaluate dedicated deposit packages tailored for ${topJob.label.toLowerCase()} profiles, prioritizing personalized messaging on liquidity or yield.`
      });
    }

    // 2. Low-Response / High-Volume Segment
    if (jobStats.length > 1) {
      const lowestJob = jobStats[jobStats.length - 1];
      const diff = (avgRate - lowestJob.responseRate).toFixed(1);
      insights.push({
        id: 'low-job-segment',
        category: 'low-response',
        categoryClass: 'insight-tag-low-response',
        categoryLabel: 'Low-Response Segment',
        title: `${lowestJob.label} Converting Below Benchmark`,
        stat: `${lowestJob.responseRate}%`,
        sampleSize: `N = ${lowestJob.total}`,
        context: `-${diff}% below portfolio average (${avgRate}%)`,
        testHypothesis: `Observation to Test: Test alternative communication channels (e.g. digital SMS/email teaser) before telemarketing calls to improve initial receptivity for ${lowestJob.label.toLowerCase()} prospects.`
      });
    }

    // 3. Campaign Contact Fatigue Analysis (Crucial Marketing Insight)
    const contactStats = this.computeByContacts(records);
    const firstTouch = contactStats.find(c => c.label === '1 Contact');
    const lateTouches = contactStats.find(c => c.label === '4 Contacts' || c.label === '5 Contacts' || c.label === '6+ Contacts');

    if (firstTouch && lateTouches && lateTouches.total >= 10) {
      const fatigueDrop = (firstTouch.responseRate - lateTouches.responseRate).toFixed(1);
      insights.push({
        id: 'contact-fatigue',
        category: 'fatigue',
        categoryClass: 'insight-tag-fatigue',
        categoryLabel: 'Fatigue Threshold',
        title: 'Diminishing Returns After 3 Contact Touches',
        stat: `${lateTouches.responseRate}%`,
        sampleSize: `N = ${lateTouches.total}`,
        context: `Substantial drop from initial touch conversion (${firstTouch.responseRate}%)`,
        testHypothesis: `Observation to Test: Cap telemarketing touchpoints at a maximum of 3 attempts per campaign wave. Test cooling off non-respondents for 90 days rather than continuing outreach.`
      });
    }

    // 4. Communication Channel Efficiency
    const channelStats = this.computeByChannel(records);
    const cellular = channelStats.find(c => c.label === 'Cellular');
    const telephone = channelStats.find(c => c.label === 'Telephone');

    if (cellular && cellular.total >= 20) {
      const telRate = telephone ? `${telephone.responseRate}%` : 'unknown';
      insights.push({
        id: 'channel-efficiency',
        category: 'channel',
        categoryClass: 'insight-tag-channel',
        categoryLabel: 'Channel Effectiveness',
        title: 'Cellular Channel Consistently Outperforms Fixed Lines',
        stat: `${cellular.responseRate}%`,
        sampleSize: `N = ${cellular.total}`,
        context: `Compared to ${telRate} on landline telephone (N=${telephone ? telephone.total : 0})`,
        testHypothesis: `Observation to Test: Verify phone type verification prior to dialer queue assignment. Prioritize cellular contacts during peak daytime contact hours.`
      });
    }

    // 5. Prior Campaign Success Indicator
    const prevSuccessList = records.filter(r => (r.poutcome || '').toLowerCase() === 'success');
    if (prevSuccessList.length >= 10) {
      const prevSuccessKpis = this.computeKPIs(prevSuccessList);
      insights.push({
        id: 'prior-campaign-lift',
        category: 'high-response',
        categoryClass: 'insight-tag-high-response',
        categoryLabel: 'Retention & Repurchase',
        title: 'Past Campaign Responders Yield Exceptional Conversion',
        stat: `${prevSuccessKpis.responseRate}%`,
        sampleSize: `N = ${prevSuccessList.length}`,
        context: `Nearly ${Math.round(prevSuccessKpis.responseRate / (avgRate || 1))}x the general audience conversion rate`,
        testHypothesis: `Observation to Test: Test immediate early-bird renewal campaigns for customers who subscribed to previous products before opening campaigns to cold prospects.`
      });
    }

    // 6. Housing Loan Liquidity Correlation
    const housingStats = this.computeByHousing(records);
    const noHousing = housingStats.find(h => h.label === 'No Housing Loan');
    const withHousing = housingStats.find(h => h.label === 'Has Housing Loan');

    if (noHousing && withHousing && noHousing.total >= 20 && withHousing.total >= 20) {
      insights.push({
        id: 'housing-loan-disposable',
        category: 'demographic',
        categoryClass: 'insight-tag-channel',
        categoryLabel: 'Financial Profile',
        title: 'Clients Without Housing Debt Exhibit Higher Propensity',
        stat: `${noHousing.responseRate}%`,
        sampleSize: `N = ${noHousing.total}`,
        context: `vs ${withHousing.responseRate}% for clients with existing mortgage debt (N=${withHousing.total})`,
        testHypothesis: `Observation to Test: Filter campaign lists to prioritize unencumbered balance holders for long-term fixed deposit products.`
      });
    }

    return insights;
  }
};

if (typeof window !== 'undefined') {
  window.AnalyticsEngine = AnalyticsEngine;
}

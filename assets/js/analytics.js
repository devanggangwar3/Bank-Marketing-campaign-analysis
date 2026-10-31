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
  },

  /**
   * 7. Campaign ROI & Budget Simulator (Client-side fallback)
   */
  computeROISimulation(records = [], costPerContact = 4.50, valuePerConversion = 200.0, touchCap = null) {
    const totalCustomers = records.length;
    costPerContact = Number(costPerContact) || 4.50;
    valuePerConversion = Number(valuePerConversion) || 200.0;

    const evalScenario = (cap, name) => {
      let totContacts = 0;
      let conversions = 0;

      for (let i = 0; i < totalCustomers; i++) {
        const r = records[i];
        const actualTouches = Number(r.campaign) || 1;
        const capped = cap ? Math.min(actualTouches, cap) : actualTouches;
        totContacts += capped;

        const isYes = (r.y || '').toLowerCase() === 'yes';
        if (cap) {
          if (actualTouches <= cap && isYes) conversions++;
        } else {
          if (isYes) conversions++;
        }
      }

      const spend = Number((totContacts * costPerContact).toFixed(2));
      const revenue = Number((conversions * valuePerConversion).toFixed(2));
      const profit = Number((revenue - spend).toFixed(2));
      const roi = spend > 0 ? Number(((profit / spend) * 100).toFixed(1)) : 0;
      const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0;
      const convRate = totalCustomers > 0 ? Number(((conversions / totalCustomers) * 100).toFixed(2)) : 0;

      return {
        name,
        cap,
        totalContacts: totContacts,
        conversions,
        conversionRate: convRate,
        totalSpend: spend,
        grossRevenue: revenue,
        netProfit: profit,
        roiPercent: roi,
        cpa
      };
    };

    const scenarios = [
      evalScenario(null, 'Unlimited (Current Baseline)'),
      evalScenario(3, 'Cap at 3 Touches (Optimal Cutoff)'),
      evalScenario(2, 'Cap at 2 Touches (High Efficiency)'),
      evalScenario(1, 'Single Touch Only (Conservative)')
    ];

    let activeCap = null;
    let activeEval = scenarios[0];
    if (touchCap !== null && touchCap !== undefined && String(touchCap).match(/^\d+$/)) {
      activeCap = parseInt(touchCap, 10);
      activeEval = evalScenario(activeCap, `Custom Cap (${activeCap} Touches)`);
    }

    let wastedContacts = 0;
    for (let i = 0; i < totalCustomers; i++) {
      const cmp = Number(records[i].campaign) || 1;
      if (cmp > 3) wastedContacts += (cmp - 3);
    }
    const wastedSpend = Number((wastedContacts * costPerContact).toFixed(2));

    return {
      metrics: {
        totalCustomers,
        totalContacts: activeEval.totalContacts,
        conversions: activeEval.conversions,
        conversionRate: activeEval.conversionRate,
        costPerContact,
        valuePerConversion,
        totalSpend: activeEval.totalSpend,
        grossRevenue: activeEval.grossRevenue,
        netProfit: activeEval.netProfit,
        roiPercent: activeEval.roiPercent,
        cpa: activeEval.cpa,
        fatigueWastedContacts: wastedContacts,
        fatigueWastedSpend: wastedSpend,
        touchCap: activeCap
      },
      scenarios
    };
  },

  /**
   * 8. Financial Balance Tier Segmentation
   */
  computeBalanceAnalysis(records = []) {
    const totalCustomers = records.length;
    if (totalCustomers === 0) {
      return { tiers: [], summary: { totalBalancePool: 0, avgBalance: 0, highVsLowRatio: 1.0 } };
    }

    const tiersDef = [
      { key: 'negative', label: 'Negative / In Debt', min: -Infinity, max: -0.01 },
      { key: 'low', label: 'Low Balance ($0-$1k)', min: 0, max: 1000 },
      { key: 'mid', label: 'Mid Balance ($1k-$5k)', min: 1000.01, max: 5000 },
      { key: 'high', label: 'High Balance ($5k-$15k)', min: 5000.01, max: 15000 },
      { key: 'affluent', label: 'Affluent ($15k+)', min: 15000.01, max: Infinity }
    ];

    const stats = tiersDef.map(t => ({
      ...t,
      total: 0,
      converted: 0,
      declined: 0,
      totalBalance: 0,
      totalTouches: 0
    }));

    let grandBalance = 0;

    records.forEach(r => {
      const bal = Number(r.balance) || 0;
      const cmp = Number(r.campaign) || 1;
      const isYes = (r.y || '').toLowerCase() === 'yes';
      grandBalance += bal;

      const target = stats.find(t => bal >= t.min && bal <= t.max);
      if (target) {
        target.total++;
        target.totalBalance += bal;
        target.totalTouches += cmp;
        if (isYes) target.converted++;
        else target.declined++;
      }
    });

    const tiers = stats.map(s => {
      const rate = s.total > 0 ? (s.converted / s.total) * 100 : 0;
      const avgBal = s.total > 0 ? Math.round(s.totalBalance / s.total) : 0;
      const avgTouches = s.total > 0 ? Number((s.totalTouches / s.total).toFixed(1)) : 1.0;
      return {
        key: s.key,
        label: s.label,
        total: s.total,
        converted: s.converted,
        declined: s.declined,
        responseRate: Number(rate.toFixed(1)),
        avgBalance: avgBal,
        totalBalance: Math.round(s.totalBalance),
        avgTouches
      };
    });

    const highTier = tiers.find(t => t.key === 'high') || { responseRate: 10 };
    const lowTier = tiers.find(t => t.key === 'low') || { responseRate: 5 };
    const ratio = Number((highTier.responseRate / Math.max(lowTier.responseRate, 0.1)).toFixed(1));

    return {
      tiers,
      summary: {
        totalBalancePool: Math.round(grandBalance),
        avgBalance: Math.round(grandBalance / totalCustomers),
        highVsLowRatio: ratio
      }
    };
  },

  /**
   * 9. Single Lead Propensity Scoring
   */
  scoreSingleLead(lead = {}) {
    let score = 0.10;

    // Previous outcome
    const poutcome = (lead.poutcome || '').toLowerCase();
    if (poutcome === 'success') score += 0.42;
    else if (poutcome === 'failure') score += 0.04;

    // Housing loan
    const housing = (lead.housing || '').toLowerCase();
    if (housing === 'no') score += 0.08;
    else if (housing === 'yes') score -= 0.05;

    // Personal loan
    const loan = (lead.loan || '').toLowerCase();
    if (loan === 'no') score += 0.02;
    else if (loan === 'yes') score -= 0.04;

    // Channel
    const contact = (lead.contact || '').toLowerCase();
    if (contact === 'cellular') score += 0.06;
    else if (contact === 'telephone') score -= 0.02;
    else if (contact === 'unknown') score -= 0.06;

    // Job
    const job = (lead.job || '').toLowerCase();
    if (['student', 'retired'].includes(job)) score += 0.16;
    else if (job === 'management') score += 0.04;
    else if (['blue-collar', 'services'].includes(job)) score -= 0.04;
    else if (['entrepreneur', 'housemaid'].includes(job)) score -= 0.03;

    // Age
    const age = Number(lead.age) || 35;
    if (age < 30) score += 0.07;
    else if (age > 60) score += 0.12;

    // Balance
    const balance = Number(lead.balance) || 1000;
    if (balance < 0) score -= 0.08;
    else if (balance <= 1000) score -= 0.02;
    else if (balance <= 5000) score += 0.05;
    else if (balance <= 15000) score += 0.12;
    else score += 0.18;

    // Touches
    const cmp = Number(lead.campaign) || 1;
    if (cmp === 1) score += 0.03;
    else if (cmp === 2) score += 0.01;
    else if (cmp === 3) score -= 0.03;
    else if (cmp >= 4) score -= 0.10;

    const clamped = Math.max(0.02, Math.min(0.96, score));
    const pct = Number((clamped * 100).toFixed(1));

    let tier = 'Low Propensity';
    let tierClass = 'badge-neutral';
    let rec = 'Low responsiveness probability. Avoid costly telemarketing dials; cycle through low-cost automated email campaigns instead.';

    if (pct >= 30.0) {
      tier = 'High Propensity';
      tierClass = 'badge-success';
      rec = 'Prime conversion prospect. Recommend immediate priority cellular outreach with specialized high-yield term deposit offerings.';
    } else if (pct >= 15.0) {
      tier = 'Moderate Propensity';
      tierClass = 'badge-primary';
      rec = 'Moderate receptivity. Recommend introductory digital notification or SMS teaser before secondary outbound contact.';
    }

    return {
      propensityPercent: pct,
      tier,
      tierClass,
      expectedValue: Number((clamped * 200).toFixed(2)),
      recommendation: rec
    };
  },

  /**
   * 10. Cohort-Wide Propensity Distribution
   */
  computePropensityAnalysis(records = []) {
    const totalLeads = records.length;
    if (totalLeads === 0) {
      return { distribution: [], summary: { totalLeads: 0, highCount: 0, highShare: 0, actualHighConvRate: 0 } };
    }

    const counts = {
      'High Propensity': { count: 0, converted: 0, badgeClass: 'badge-success' },
      'Moderate Propensity': { count: 0, converted: 0, badgeClass: 'badge-primary' },
      'Low Propensity': { count: 0, converted: 0, badgeClass: 'badge-neutral' }
    };

    records.forEach(r => {
      const scored = this.scoreSingleLead(r);
      const isYes = (r.y || '').toLowerCase() === 'yes';
      if (counts[scored.tier]) {
        counts[scored.tier].count++;
        if (isYes) counts[scored.tier].converted++;
      }
    });

    const dist = Object.entries(counts).map(([tier, data]) => {
      const pct = Number(((data.count / totalLeads) * 100).toFixed(1));
      const actualConv = data.count > 0 ? Number(((data.converted / data.count) * 100).toFixed(1)) : 0;
      return {
        tier,
        count: data.count,
        percentage: pct,
        actualConversionRate: actualConv,
        badgeClass: data.badgeClass
      };
    });

    const high = counts['High Propensity'];
    return {
      distribution: dist,
      summary: {
        totalLeads,
        highCount: high.count,
        highShare: Number(((high.count / totalLeads) * 100).toFixed(1)),
        actualHighConvRate: high.count > 0 ? Number(((high.converted / high.count) * 100).toFixed(1)) : 0
      }
    };
  },

  /**
   * 11. Head-to-Head Cohort Comparison with Z-Test
   */
  computeCohortComparison(records = [], cohortAType = 'cellular', cohortBType = 'telephone') {
    const filterPreset = (cType) => {
      const c = (cType || '').toLowerCase().trim();
      let sub = [];
      let label = 'All Prospects';

      if (c === 'cellular') {
        sub = records.filter(r => (r.contact || '').toLowerCase() === 'cellular');
        label = 'Cellular Mobile Outreach';
      } else if (c === 'telephone') {
        sub = records.filter(r => (r.contact || '').toLowerCase() === 'telephone');
        label = 'Fixed Landline Telephone';
      } else if (c === 'no_housing') {
        sub = records.filter(r => (r.housing || '').toLowerCase() === 'no');
        label = 'No Housing Debt / Mortgage';
      } else if (c === 'has_housing') {
        sub = records.filter(r => (r.housing || '').toLowerCase() === 'yes');
        label = 'Active Housing Mortgage';
      } else if (c === 'prev_success') {
        sub = records.filter(r => (r.poutcome || '').toLowerCase() === 'success');
        label = 'Prior Campaign Responders';
      } else if (c === 'no_prev_contact') {
        sub = records.filter(r => (r.poutcome || '').toLowerCase() !== 'success');
        label = 'Cold / No Prior Success';
      } else if (c === 'high_balance') {
        sub = records.filter(r => (Number(r.balance) || 0) > 2500);
        label = 'High Balance (> $2,500)';
      } else if (c === 'low_balance') {
        sub = records.filter(r => (Number(r.balance) || 0) <= 1000);
        label = 'Low Balance (<= $1,000)';
      } else if (c === 'youth_senior') {
        sub = records.filter(r => {
          const a = Number(r.age) || 40;
          return a < 30 || a > 60;
        });
        label = 'Young (<30) & Senior (>60)';
      } else if (c === 'middle_aged') {
        sub = records.filter(r => {
          const a = Number(r.age) || 40;
          return a >= 30 && a <= 60;
        });
        label = 'Middle-Aged (30 - 60 Years)';
      } else {
        sub = records;
        label = 'All Prospects';
      }
      return { sub, label };
    };

    const cA = filterPreset(cohortAType);
    const cB = filterPreset(cohortBType);

    const getStats = (sub, name, key) => {
      const n = sub.length;
      if (n === 0) {
        return { key, name, count: 0, conversions: 0, conversionRate: 0, avgTouches: 0, avgDuration: 0, avgBalance: 0 };
      }
      let conv = 0;
      let totTouches = 0;
      let totDur = 0;
      let totBal = 0;
      sub.forEach(r => {
        if ((r.y || '').toLowerCase() === 'yes') conv++;
        totTouches += Number(r.campaign) || 1;
        totDur += Number(r.duration) || 0;
        totBal += Number(r.balance) || 0;
      });
      return {
        key,
        name,
        count: n,
        conversions: conv,
        conversionRate: Number(((conv / n) * 100).toFixed(2)),
        avgTouches: Number((totTouches / n).toFixed(1)),
        avgDuration: Math.round(totDur / n),
        avgBalance: Math.round(totBal / n)
      };
    };

    const resA = getStats(cA.sub, cA.label, cohortAType);
    const resB = getStats(cB.sub, cB.label, cohortBType);

    const n1 = resA.count;
    const n2 = resB.count;
    const x1 = resA.conversions;
    const x2 = resB.conversions;

    const absDiff = Number((resA.conversionRate - resB.conversionRate).toFixed(2));
    const relLift = resB.conversionRate > 0
      ? Number((((resA.conversionRate - resB.conversionRate) / resB.conversionRate) * 100).toFixed(1))
      : 0;

    let zScore = 0;
    let pValue = 1.0;
    let isSignificant = false;
    let sigLabel = 'Insufficient Sample Size';

    if (n1 >= 10 && n2 >= 10) {
      const pPooled = (x1 + x2) / (n1 + n2);
      if (pPooled > 0 && pPooled < 1) {
        const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
        if (se > 0) {
          const p1 = x1 / n1;
          const p2 = x2 / n2;
          zScore = Number(((p1 - p2) / se).toFixed(3));
          // Approximate erf for two-tailed p-value
          const absZ = Math.abs(zScore);
          // Standard numerical approximation of erf
          const t = 1.0 / (1.0 + 0.3275911 * (absZ / Math.SQRT2));
          const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
          const erfVal = 1.0 - poly * Math.exp(-0.5 * absZ * absZ);
          pValue = Number(Math.max(0, 1.0 - erfVal).toFixed(4));

          if (absZ >= 2.576) {
            isSignificant = true;
            sigLabel = `Statistically Significant (p < 0.01, 99% Confidence, Z = ${zScore})`;
          } else if (absZ >= 1.96) {
            isSignificant = true;
            sigLabel = `Statistically Significant (p < 0.05, 95% Confidence, Z = ${zScore})`;
          } else {
            isSignificant = false;
            sigLabel = `Not Statistically Significant (p = ${pValue}, Z = ${zScore})`;
          }
        }
      }
    }

    return {
      cohortA: resA,
      cohortB: resB,
      comparison: {
        absoluteDifference: absDiff,
        relativeLift: relLift,
        zScore,
        pValue,
        isSignificant,
        significanceLabel: sigLabel
      }
    };
  }
};

if (typeof window !== 'undefined') {
  window.AnalyticsEngine = AnalyticsEngine;
}

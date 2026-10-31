"""
Pandas & NumPy Analytical Computation Engine for Bank Marketing Data
"""
import math
import pandas as pd
import numpy as np
from backend.config import Config

class AnalyticsService:

    @staticmethod
    def apply_filters(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
        """Applies query filters dynamically to a pandas DataFrame."""
        if df.empty:
            return df

        filtered = df.copy()

        # Month filter
        month = filters.get('month')
        if month and month.lower() != 'all':
            filtered = filtered[filtered['month'].str.lower() == month.lower()]

        # Job filter
        job = filters.get('job')
        if job and job.lower() != 'all':
            filtered = filtered[filtered['job'].str.lower() == job.lower()]

        # Education filter
        education = filters.get('education')
        if education and education.lower() != 'all':
            filtered = filtered[filtered['education'].str.lower() == education.lower()]

        # Contact channel filter
        contact = filters.get('contact')
        if contact and contact.lower() != 'all':
            filtered = filtered[filtered['contact'].str.lower() == contact.lower()]

        # Outcome filter
        outcome = filters.get('outcome')
        if outcome and outcome.lower() != 'all':
            filtered = filtered[filtered['y'].str.lower() == outcome.lower()]

        # Marital filter
        marital = filters.get('marital')
        if marital and marital.lower() != 'all':
            filtered = filtered[filtered['marital'].str.lower() == marital.lower()]

        # Housing loan filter
        housing = filters.get('housing')
        if housing and housing.lower() != 'all':
            filtered = filtered[filtered['housing'].str.lower() == housing.lower()]

        # Balance tier filter
        balance_tier = filters.get('balance_tier') or filters.get('balanceTier')
        if balance_tier and balance_tier.lower() != 'all':
            bt = balance_tier.lower()
            if bt == 'negative':
                filtered = filtered[filtered['balance'] < 0]
            elif bt == 'low':
                filtered = filtered[(filtered['balance'] >= 0) & (filtered['balance'] <= 1000)]
            elif bt == 'mid':
                filtered = filtered[(filtered['balance'] > 1000) & (filtered['balance'] <= 5000)]
            elif bt == 'high':
                filtered = filtered[(filtered['balance'] > 5000) & (filtered['balance'] <= 15000)]
            elif bt == 'affluent':
                filtered = filtered[filtered['balance'] > 15000]

        # Touches / Campaign contacts filter
        touches = filters.get('touches')
        if touches and touches.lower() != 'all':
            if touches == '1':
                filtered = filtered[filtered['campaign'] == 1]
            elif touches == '2':
                filtered = filtered[filtered['campaign'] == 2]
            elif touches == '3':
                filtered = filtered[filtered['campaign'] == 3]
            elif touches == '4+':
                filtered = filtered[filtered['campaign'] >= 4]

        # Text search query across attributes
        search = filters.get('search')
        if search and search.strip():
            q = search.strip().lower()
            mask = (
                filtered['job'].str.contains(q, case=False, na=False) |
                filtered['education'].str.contains(q, case=False, na=False) |
                filtered['marital'].str.contains(q, case=False, na=False) |
                filtered['month'].str.contains(q, case=False, na=False) |
                filtered['contact'].str.contains(q, case=False, na=False) |
                filtered['y'].str.contains(q, case=False, na=False)
            )
            filtered = filtered[mask]

        return filtered

    @staticmethod
    def compute_kpis(df: pd.DataFrame) -> dict:
        """Calculates top-level executive KPIs."""
        total_customers = len(df)
        if total_customers == 0:
            return {
                'totalCustomers': 0,
                'totalContacts': 0,
                'successfulResponses': 0,
                'unsuccessfulResponses': 0,
                'responseRate': 0.0,
                'avgContactsPerCustomer': 0.0,
                'avgDurationSeconds': 0,
                'avgDurationSuccessful': 0,
                'previousSuccessRate': 0.0,
                'benchmarkDiff': -Config.BENCHMARK_RESPONSE_RATE
            }

        successful_df = df[df['y'] == 'yes']
        successful_count = len(successful_df)
        unsuccessful_count = total_customers - successful_count
        response_rate = (successful_count / total_customers) * 100.0

        total_contacts = int(df['campaign'].sum())
        avg_contacts = float(df['campaign'].mean())
        avg_duration = int(round(df['duration'].mean())) if not df['duration'].empty else 0
        avg_duration_succ = int(round(successful_df['duration'].mean())) if not successful_df.empty else 0

        # Prior campaign success rate
        prev_success_cohort = df[df['poutcome'] == 'success']
        if len(prev_success_cohort) > 0:
            prev_success_rate = (len(prev_success_cohort[prev_success_cohort['y'] == 'yes']) / len(prev_success_cohort)) * 100.0
        else:
            prev_success_rate = 0.0

        return {
            'totalCustomers': total_customers,
            'totalContacts': total_contacts,
            'successfulResponses': successful_count,
            'unsuccessfulResponses': unsuccessful_count,
            'responseRate': round(response_rate, 2),
            'avgContactsPerCustomer': round(avg_contacts, 1),
            'avgDurationSeconds': avg_duration,
            'avgDurationSuccessful': avg_duration_succ,
            'previousSuccessRate': round(prev_success_rate, 1),
            'benchmarkDiff': round(response_rate - Config.BENCHMARK_RESPONSE_RATE, 2)
        }

    @staticmethod
    def compute_period_analysis(df: pd.DataFrame) -> list:
        """Calculates response rates by contact period (months)."""
        if df.empty:
            return []

        grouped = df.groupby('month').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum())
        ).reset_index()

        grouped['declined'] = grouped['total'] - grouped['converted']
        grouped['responseRate'] = np.where(
            grouped['total'] > 0,
            np.round((grouped['converted'] / grouped['total']) * 100.0, 1),
            0.0
        )

        month_names = {
            'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
            'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
            'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
        }

        # Order chronologically
        order_map = {m: i for i, m in enumerate(Config.MONTHS_ORDER)}
        grouped['order'] = grouped['month'].map(lambda m: order_map.get(m.lower(), 99))
        grouped = grouped.sort_values('order').drop(columns=['order'])

        results = []
        for _, row in grouped.iterrows():
            m = str(row['month']).lower()
            results.append({
                'label': m,
                'fullName': month_names.get(m, m.upper()),
                'total': int(row['total']),
                'converted': int(row['converted']),
                'declined': int(row['declined']),
                'responseRate': float(row['responseRate'])
            })

        return results

    @staticmethod
    def compute_channel_analysis(df: pd.DataFrame) -> list:
        """Calculates response rates by contact communication channel."""
        if df.empty:
            return []

        def channel_label(c):
            s = str(c).lower().strip()
            if s == 'cellular':
                return 'Cellular'
            if s == 'telephone':
                return 'Telephone'
            return 'Unknown Channel'

        temp_df = df.copy()
        temp_df['channel_clean'] = temp_df['contact'].apply(channel_label)

        grouped = temp_df.groupby('channel_clean').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum())
        ).reset_index()

        grouped['declined'] = grouped['total'] - grouped['converted']
        grouped['responseRate'] = np.where(
            grouped['total'] > 0,
            np.round((grouped['converted'] / grouped['total']) * 100.0, 1),
            0.0
        )

        grouped = grouped.sort_values('total', ascending=False)
        return [
            {
                'label': row['channel_clean'],
                'total': int(row['total']),
                'converted': int(row['converted']),
                'declined': int(row['declined']),
                'responseRate': float(row['responseRate'])
            }
            for _, row in grouped.iterrows()
        ]

    @staticmethod
    def compute_frequency_analysis(df: pd.DataFrame) -> list:
        """Analyzes response rate decay across contact touches (fatigue curve)."""
        if df.empty:
            return []

        def touch_bucket(c):
            try:
                num = int(c)
                if num == 1: return '1 Contact'
                if num == 2: return '2 Contacts'
                if num == 3: return '3 Contacts'
                if num == 4: return '4 Contacts'
                if num == 5: return '5 Contacts'
                return '6+ Contacts'
            except:
                return '1 Contact'

        temp_df = df.copy()
        temp_df['touch_group'] = temp_df['campaign'].apply(touch_bucket)

        order = ['1 Contact', '2 Contacts', '3 Contacts', '4 Contacts', '5 Contacts', '6+ Contacts']
        grouped = temp_df.groupby('touch_group').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum())
        ).reindex(order).fillna(0).reset_index()

        grouped['declined'] = grouped['total'] - grouped['converted']
        grouped['responseRate'] = np.where(
            grouped['total'] > 0,
            np.round((grouped['converted'] / grouped['total']) * 100.0, 1),
            0.0
        )

        return [
            {
                'label': row['touch_group'],
                'total': int(row['total']),
                'converted': int(row['converted']),
                'declined': int(row['declined']),
                'responseRate': float(row['responseRate'])
            }
            for _, row in grouped.iterrows()
        ]

    @staticmethod
    def compute_outcome_distribution(df: pd.DataFrame) -> dict:
        """Doughnut chart distribution of accepted vs declined responses."""
        kpis = AnalyticsService.compute_kpis(df)
        total = kpis['totalCustomers']
        return {
            'labels': ['Successful Subscription (Yes)', 'Declined / No Outcome (No)'],
            'counts': [kpis['successfulResponses'], kpis['unsuccessfulResponses']],
            'rates': [
                kpis['responseRate'],
                round(100.0 - kpis['responseRate'], 1) if total > 0 else 0.0
            ],
            'total': total
        }

    @staticmethod
    def compute_segments(df: pd.DataFrame) -> dict:
        """Segment comparisons across Job, Education, Age brackets, and Housing Loan."""
        if df.empty:
            return {'jobs': [], 'educations': [], 'ages': [], 'housing': []}

        # Jobs
        job_grp = df.groupby('job').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum())
        ).reset_index()
        job_grp['label'] = job_grp['job'].str.capitalize()
        job_grp['responseRate'] = np.where(
            job_grp['total'] > 0,
            np.round((job_grp['converted'] / job_grp['total']) * 100.0, 1),
            0.0
        )
        jobs = job_grp.sort_values('responseRate', ascending=False).to_dict(orient='records')

        # Education
        ed_grp = df.groupby('education').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum())
        ).reset_index()
        ed_grp['label'] = ed_grp['education'].str.capitalize()
        ed_grp['responseRate'] = np.where(
            ed_grp['total'] > 0,
            np.round((ed_grp['converted'] / ed_grp['total']) * 100.0, 1),
            0.0
        )
        educations = ed_grp.sort_values('responseRate', ascending=False).to_dict(orient='records')

        # Age brackets
        def age_bracket(age):
            if age < 30: return '< 30 Years'
            if age <= 45: return '30 - 45 Years'
            if age <= 60: return '46 - 60 Years'
            return '> 60 Years'

        temp_df = df.copy()
        temp_df['age_group'] = temp_df['age'].apply(age_bracket)
        age_order = ['< 30 Years', '30 - 45 Years', '46 - 60 Years', '> 60 Years']
        age_grp = temp_df.groupby('age_group').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum())
        ).reindex(age_order).fillna(0).reset_index()
        age_grp['label'] = age_grp['age_group']
        age_grp['responseRate'] = np.where(
            age_grp['total'] > 0,
            np.round((age_grp['converted'] / age_grp['total']) * 100.0, 1),
            0.0
        )
        ages = age_grp.to_dict(orient='records')

        # Housing loan
        housing_grp = df.groupby('housing').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum())
        ).reset_index()
        housing_grp['label'] = np.where(housing_grp['housing'] == 'yes', 'Has Housing Loan', 'No Housing Loan')
        housing_grp['responseRate'] = np.where(
            housing_grp['total'] > 0,
            np.round((housing_grp['converted'] / housing_grp['total']) * 100.0, 1),
            0.0
        )
        housing = housing_grp.sort_values('responseRate', ascending=False).to_dict(orient='records')

        return {
            'jobs': [{'label': r['label'], 'total': int(r['total']), 'converted': int(r['converted']), 'responseRate': float(r['responseRate'])} for r in jobs],
            'educations': [{'label': r['label'], 'total': int(r['total']), 'converted': int(r['converted']), 'responseRate': float(r['responseRate'])} for r in educations],
            'ages': [{'label': r['label'], 'total': int(r['total']), 'converted': int(r['converted']), 'responseRate': float(r['responseRate'])} for r in ages],
            'housing': [{'label': r['label'], 'total': int(r['total']), 'converted': int(r['converted']), 'responseRate': float(r['responseRate'])} for r in housing]
        }

    @staticmethod
    def generate_insights(df: pd.DataFrame) -> list:
        """
        Dynamically derives actionable insights formulated as 'Observations to Test'.
        Includes sample size (N) and benchmarks.
        """
        if df.empty or len(df) < 10:
            return [{
                'id': 'low-sample',
                'category': 'insufficient-data',
                'categoryClass': 'insight-tag-high-response',
                'categoryLabel': 'Sample Size Insufficient',
                'title': 'Awaiting Sufficient Campaign Data',
                'stat': f'N = {len(df)}',
                'sampleSize': f'N = {len(df)}',
                'context': 'Need at least 10 records to generate reliable segment patterns.',
                'testHypothesis': 'Observation to Test: Load or select a broader cohort to observe statistical segment variance.'
            }]

        kpis = AnalyticsService.compute_kpis(df)
        avg_rate = kpis['responseRate']
        insights = []

        # 1. Job Role High Response
        job_segments = AnalyticsService.compute_segments(df)['jobs']
        valid_jobs = [j for j in job_segments if j['total'] >= 15]
        if valid_jobs:
            top_job = valid_jobs[0]
            diff = round(top_job['responseRate'] - avg_rate, 1)
            insights.append({
                'id': 'top-job-segment',
                'category': 'high-response',
                'categoryClass': 'insight-tag-high-response',
                'categoryLabel': 'High-Response Segment',
                'title': f"{top_job['label']} Segment Shows Strongest Engagement",
                'stat': f"{top_job['responseRate']}%",
                'sampleSize': f"N = {top_job['total']}",
                'context': f"+{diff}% higher than portfolio average ({avg_rate}%)",
                'testHypothesis': f"Observation to Test: Evaluate dedicated deposit packages tailored for {top_job['label'].lower()} profiles, prioritizing personalized messaging on liquidity or yield."
            })

            if len(valid_jobs) > 1:
                low_job = valid_jobs[-1]
                diff_low = round(avg_rate - low_job['responseRate'], 1)
                insights.append({
                    'id': 'low-job-segment',
                    'category': 'low-response',
                    'categoryClass': 'insight-tag-low-response',
                    'categoryLabel': 'Low-Response Segment',
                    'title': f"{low_job['label']} Converting Below Benchmark",
                    'stat': f"{low_job['responseRate']}%",
                    'sampleSize': f"N = {low_job['total']}",
                    'context': f"-{diff_low}% below portfolio average ({avg_rate}%)",
                    'testHypothesis': f"Observation to Test: Test alternative communication channels (e.g. digital SMS/email teaser) before telemarketing calls to improve initial receptivity for {low_job['label'].lower()} prospects."
                })

        # 2. Contact Fatigue Threshold
        freq = AnalyticsService.compute_frequency_analysis(df)
        touch_1 = next((f for f in freq if f['label'] == '1 Contact'), None)
        touch_late = next((f for f in freq if f['label'] in ['4 Contacts', '5 Contacts', '6+ Contacts'] and f['total'] >= 10), None)

        if touch_1 and touch_late:
            drop = round(touch_1['responseRate'] - touch_late['responseRate'], 1)
            insights.append({
                'id': 'contact-fatigue',
                'category': 'fatigue',
                'categoryClass': 'insight-tag-fatigue',
                'categoryLabel': 'Fatigue Threshold',
                'title': 'Diminishing Returns After 3 Contact Touches',
                'stat': f"{touch_late['responseRate']}%",
                'sampleSize': f"N = {touch_late['total']}",
                'context': f"Substantial drop from initial touch conversion ({touch_1['responseRate']}%)",
                'testHypothesis': 'Observation to Test: Cap telemarketing touchpoints at a maximum of 3 attempts per campaign wave. Test cooling off non-respondents for 90 days rather than continuing outreach.'
            })

        # 3. Channel Efficacy
        channels = AnalyticsService.compute_channel_analysis(df)
        cellular = next((c for c in channels if c['label'] == 'Cellular'), None)
        telephone = next((c for c in channels if c['label'] == 'Telephone'), None)

        if cellular and cellular['total'] >= 20:
            tel_rate = f"{telephone['responseRate']}%" if telephone else 'N/A'
            insights.append({
                'id': 'channel-efficiency',
                'category': 'channel',
                'categoryClass': 'insight-tag-channel',
                'categoryLabel': 'Channel Effectiveness',
                'title': 'Cellular Channel Consistently Outperforms Fixed Lines',
                'stat': f"{cellular['responseRate']}%",
                'sampleSize': f"N = {cellular['total']}",
                'context': f"Compared to {tel_rate} on landline telephone (N={telephone['total'] if telephone else 0})",
                'testHypothesis': 'Observation to Test: Verify phone type verification prior to dialer queue assignment. Prioritize cellular contacts during peak daytime contact hours.'
            })

        # 4. Repeat Customer / Prior Success
        prev_success = df[df['poutcome'] == 'success']
        if len(prev_success) >= 10:
            prev_kpis = AnalyticsService.compute_kpis(prev_success)
            ratio = round(prev_kpis['responseRate'] / max(avg_rate, 0.1), 1)
            insights.append({
                'id': 'prior-campaign-lift',
                'category': 'high-response',
                'categoryClass': 'insight-tag-high-response',
                'categoryLabel': 'Retention & Repurchase',
                'title': 'Past Campaign Responders Yield Exceptional Conversion',
                'stat': f"{prev_kpis['responseRate']}%",
                'sampleSize': f"N = {len(prev_success)}",
                'context': f"Nearly {ratio}x the general audience conversion rate",
                'testHypothesis': 'Observation to Test: Test immediate early-bird renewal campaigns for customers who subscribed to previous products before opening campaigns to cold prospects.'
            })

        return insights

    @staticmethod
    def compute_roi_simulation(df: pd.DataFrame, cost_per_contact: float = 4.50, value_per_conversion: float = 200.0, touch_cap=None) -> dict:
        """
        Simulates campaign marketing spend, gross revenue, net profit, ROI %,
        cost per acquisition (CPA), and contact fatigue savings.
        """
        if df.empty:
            return {
                'metrics': {
                    'totalCustomers': 0,
                    'totalContacts': 0,
                    'conversions': 0,
                    'costPerContact': cost_per_contact,
                    'valuePerConversion': value_per_conversion,
                    'totalSpend': 0.0,
                    'grossRevenue': 0.0,
                    'netProfit': 0.0,
                    'roiPercent': 0.0,
                    'cpa': 0.0,
                    'fatigueWastedContacts': 0,
                    'fatigueWastedSpend': 0.0,
                    'touchCap': touch_cap
                },
                'scenarios': []
            }

        cost_per_contact = float(cost_per_contact) if cost_per_contact and float(cost_per_contact) > 0 else 4.50
        value_per_conversion = float(value_per_conversion) if value_per_conversion and float(value_per_conversion) > 0 else 200.0

        # Base / Current metrics
        total_customers = len(df)
        actual_campaign = df['campaign'].fillna(1).astype(int)

        def eval_scenario(cap, name):
            if cap:
                capped_contacts = np.minimum(actual_campaign, cap)
                # Conversions that occurred within cap
                conversions = int(((df['campaign'] <= cap) & (df['y'] == 'yes')).sum())
            else:
                capped_contacts = actual_campaign
                conversions = int((df['y'] == 'yes').sum())

            tot_contacts = int(capped_contacts.sum())
            spend = round(tot_contacts * cost_per_contact, 2)
            revenue = round(conversions * value_per_conversion, 2)
            profit = round(revenue - spend, 2)
            roi = round((profit / spend * 100.0), 1) if spend > 0 else 0.0
            cpa = round(spend / conversions, 2) if conversions > 0 else 0.0
            conv_rate = round((conversions / total_customers * 100.0), 2) if total_customers > 0 else 0.0

            return {
                'name': name,
                'cap': cap,
                'totalContacts': tot_contacts,
                'conversions': conversions,
                'conversionRate': conv_rate,
                'totalSpend': spend,
                'grossRevenue': revenue,
                'netProfit': profit,
                'roiPercent': roi,
                'cpa': cpa
            }

        scenarios = [
            eval_scenario(None, 'Unlimited (Current Baseline)'),
            eval_scenario(3, 'Cap at 3 Touches (Optimal Cutoff)'),
            eval_scenario(2, 'Cap at 2 Touches (High Efficiency)'),
            eval_scenario(1, 'Single Touch Only (Conservative)')
        ]

        # Active scenario according to touch_cap argument
        if touch_cap is not None and str(touch_cap).isdigit():
            active_cap = int(touch_cap)
            active_eval = eval_scenario(active_cap, f'Custom Cap ({active_cap} Touches)')
        else:
            active_cap = None
            active_eval = scenarios[0]

        # Contacts beyond 3 touches
        wasted_contacts = int(np.maximum(0, actual_campaign - 3).sum())
        wasted_spend = round(wasted_contacts * cost_per_contact, 2)

        metrics = {
            'totalCustomers': total_customers,
            'totalContacts': active_eval['totalContacts'],
            'conversions': active_eval['conversions'],
            'conversionRate': active_eval['conversionRate'],
            'costPerContact': cost_per_contact,
            'valuePerConversion': value_per_conversion,
            'totalSpend': active_eval['totalSpend'],
            'grossRevenue': active_eval['grossRevenue'],
            'netProfit': active_eval['netProfit'],
            'roiPercent': active_eval['roiPercent'],
            'cpa': active_eval['cpa'],
            'fatigueWastedContacts': wasted_contacts,
            'fatigueWastedSpend': wasted_spend,
            'touchCap': active_cap
        }

        return {
            'metrics': metrics,
            'scenarios': scenarios
        }

    @staticmethod
    def compute_balance_analysis(df: pd.DataFrame) -> dict:
        """
        Segments customers into balance brackets and computes conversion propensities.
        """
        if df.empty:
            return {'tiers': [], 'summary': {'totalBalancePool': 0, 'avgBalance': 0, 'highVsLowRatio': 1.0}}

        temp_df = df.copy()
        temp_df['balance_num'] = pd.to_numeric(temp_df['balance'], errors='coerce').fillna(0)

        def get_bracket(b):
            if b < 0:
                return 'Negative / In Debt'
            elif b <= 1000:
                return 'Low Balance ($0-$1k)'
            elif b <= 5000:
                return 'Mid Balance ($1k-$5k)'
            elif b <= 15000:
                return 'High Balance ($5k-$15k)'
            else:
                return 'Affluent ($15k+)'

        temp_df['bracket'] = temp_df['balance_num'].apply(get_bracket)
        order = ['Negative / In Debt', 'Low Balance ($0-$1k)', 'Mid Balance ($1k-$5k)', 'High Balance ($5k-$15k)', 'Affluent ($15k+)']
        key_map = {
            'Negative / In Debt': 'negative',
            'Low Balance ($0-$1k)': 'low',
            'Mid Balance ($1k-$5k)': 'mid',
            'High Balance ($5k-$15k)': 'high',
            'Affluent ($15k+)': 'affluent'
        }

        grouped = temp_df.groupby('bracket').agg(
            total=('y', 'count'),
            converted=('y', lambda s: (s == 'yes').sum()),
            total_balance=('balance_num', 'sum'),
            avg_balance=('balance_num', 'mean'),
            avg_touches=('campaign', 'mean')
        ).reindex(order).fillna(0).reset_index()

        grouped['declined'] = grouped['total'] - grouped['converted']
        grouped['responseRate'] = np.where(
            grouped['total'] > 0,
            np.round((grouped['converted'] / grouped['total']) * 100.0, 1),
            0.0
        )

        tiers = []
        for _, row in grouped.iterrows():
            b_name = row['bracket']
            tiers.append({
                'label': b_name,
                'key': key_map.get(b_name, 'unknown'),
                'total': int(row['total']),
                'converted': int(row['converted']),
                'declined': int(row['declined']),
                'responseRate': float(row['responseRate']),
                'avgBalance': int(round(row['avg_balance'])),
                'totalBalance': int(round(row['total_balance'])),
                'avgTouches': round(float(row['avg_touches']), 1)
            })

        tot_pool = int(temp_df['balance_num'].sum())
        avg_bal = int(round(temp_df['balance_num'].mean()))

        high_rate = next((t['responseRate'] for t in tiers if t['key'] == 'high'), 10.0)
        low_rate = next((t['responseRate'] for t in tiers if t['key'] == 'low'), 5.0)
        ratio = round(high_rate / max(low_rate, 0.1), 1)

        return {
            'tiers': tiers,
            'summary': {
                'totalBalancePool': tot_pool,
                'avgBalance': avg_bal,
                'highVsLowRatio': ratio
            }
        }

    @staticmethod
    def score_single_lead(lead: dict) -> dict:
        """
        Predictive Lead Propensity Model for an individual lead profile.
        Returns conversion probability score (0-100%), priority tier, and recommendations.
        """
        score = 0.10  # Baseline 10%

        # 1. Previous campaign outcome (dominant driver)
        poutcome = str(lead.get('poutcome', '')).lower()
        if poutcome == 'success':
            score += 0.42
        elif poutcome == 'failure':
            score += 0.04

        # 2. Housing loan
        housing = str(lead.get('housing', '')).lower()
        if housing == 'no':
            score += 0.08
        elif housing == 'yes':
            score -= 0.05

        # 3. Personal loan
        loan = str(lead.get('loan', '')).lower()
        if loan == 'no':
            score += 0.02
        elif loan == 'yes':
            score -= 0.04

        # 4. Contact channel
        contact = str(lead.get('contact', '')).lower()
        if contact == 'cellular':
            score += 0.06
        elif contact == 'telephone':
            score -= 0.02
        elif contact == 'unknown':
            score -= 0.06

        # 5. Job category
        job = str(lead.get('job', '')).lower()
        if job in ['student', 'retired']:
            score += 0.16
        elif job in ['management']:
            score += 0.04
        elif job in ['blue-collar', 'services']:
            score -= 0.04
        elif job in ['entrepreneur', 'housemaid']:
            score -= 0.03

        # 6. Age
        try:
            age = float(lead.get('age', 35))
            if age < 30:
                score += 0.07
            elif age > 60:
                score += 0.12
        except (ValueError, TypeError):
            pass

        # 7. Balance
        try:
            balance = float(lead.get('balance', 1000))
            if balance < 0:
                score -= 0.08
            elif balance <= 1000:
                score -= 0.02
            elif balance <= 5000:
                score += 0.05
            elif balance <= 15000:
                score += 0.12
            else:
                score += 0.18
        except (ValueError, TypeError):
            pass

        # 8. Campaign touches
        try:
            campaign = int(lead.get('campaign', 1))
            if campaign == 1:
                score += 0.03
            elif campaign == 2:
                score += 0.01
            elif campaign == 3:
                score -= 0.03
            elif campaign >= 4:
                score -= 0.10
        except (ValueError, TypeError):
            pass

        clamped = max(0.02, min(0.96, score))
        pct = round(clamped * 100.0, 1)

        if pct >= 30.0:
            tier = 'High Propensity'
            tier_class = 'badge-success'
            rec = 'Prime conversion prospect. Recommend immediate priority cellular outreach with specialized high-yield term deposit offerings.'
        elif pct >= 15.0:
            tier = 'Moderate Propensity'
            tier_class = 'badge-primary'
            rec = 'Moderate receptivity. Recommend introductory digital notification or SMS teaser before secondary outbound contact.'
        else:
            tier = 'Low Propensity'
            tier_class = 'badge-neutral'
            rec = 'Low responsiveness probability. Avoid costly telemarketing dials; cycle through low-cost automated email campaigns instead.'

        expected_value = round(clamped * 200.0, 2)

        return {
            'propensityPercent': pct,
            'tier': tier,
            'tierClass': tier_class,
            'expectedValue': expected_value,
            'recommendation': rec
        }

    @staticmethod
    def compute_propensity_analysis(df: pd.DataFrame) -> dict:
        """
        Runs the predictive propensity engine across all records in the cohort.
        Returns distribution breakdown (High/Medium/Low tiers) and actual conversion validation.
        """
        if df.empty:
            return {
                'distribution': [],
                'summary': {
                    'totalLeads': 0,
                    'highCount': 0,
                    'highShare': 0.0,
                    'actualHighConvRate': 0.0
                }
            }

        scores = []
        for _, row in df.iterrows():
            res = AnalyticsService.score_single_lead(row.to_dict())
            scores.append((res['propensityPercent'], res['tier'], row['y']))

        score_df = pd.DataFrame(scores, columns=['score', 'tier', 'y'])
        total_leads = len(score_df)

        tiers_order = ['High Propensity', 'Moderate Propensity', 'Low Propensity']
        dist = []
        for t in tiers_order:
            sub = score_df[score_df['tier'] == t]
            cnt = len(sub)
            pct = round((cnt / total_leads * 100.0), 1) if total_leads > 0 else 0.0
            actual_conv = round(((sub['y'] == 'yes').sum() / cnt * 100.0), 1) if cnt > 0 else 0.0
            dist.append({
                'tier': t,
                'count': cnt,
                'percentage': pct,
                'actualConversionRate': actual_conv,
                'badgeClass': 'badge-success' if t == 'High Propensity' else ('badge-primary' if t == 'Moderate Propensity' else 'badge-neutral')
            })

        high_sub = score_df[score_df['tier'] == 'High Propensity']
        high_cnt = len(high_sub)
        high_share = round((high_cnt / total_leads * 100.0), 1) if total_leads > 0 else 0.0
        actual_high_conv = round(((high_sub['y'] == 'yes').sum() / high_cnt * 100.0), 1) if high_cnt > 0 else 0.0

        return {
            'distribution': dist,
            'summary': {
                'totalLeads': total_leads,
                'highCount': high_cnt,
                'highShare': high_share,
                'actualHighConvRate': actual_high_conv
            }
        }

    @staticmethod
    def compute_cohort_comparison(df: pd.DataFrame, cohort_a_type: str = 'cellular', cohort_b_type: str = 'telephone') -> dict:
        """
        Head-to-head A/B cohort comparison with statistical significance testing (Two-proportion Z-test).
        Supported presets:
        - 'cellular' vs 'telephone'
        - 'no_housing' vs 'has_housing'
        - 'prev_success' vs 'no_prev_contact'
        - 'high_balance' vs 'low_balance'
        - 'youth_senior' vs 'middle_aged'
        """
        if df.empty:
            return {'cohortA': {}, 'cohortB': {}, 'comparison': {}}

        def filter_preset(c_type):
            c = c_type.lower().strip()
            if c == 'cellular':
                sub = df[df['contact'].str.lower() == 'cellular']
                label = 'Cellular Mobile Outreach'
            elif c == 'telephone':
                sub = df[df['contact'].str.lower() == 'telephone']
                label = 'Fixed Landline Telephone'
            elif c == 'no_housing':
                sub = df[df['housing'].str.lower() == 'no']
                label = 'No Housing Debt / Mortgage'
            elif c == 'has_housing':
                sub = df[df['housing'].str.lower() == 'yes']
                label = 'Active Housing Mortgage'
            elif c == 'prev_success':
                sub = df[df['poutcome'].str.lower() == 'success']
                label = 'Prior Campaign Responders'
            elif c == 'no_prev_contact':
                sub = df[df['poutcome'].str.lower() != 'success']
                label = 'Cold / No Prior Success'
            elif c == 'high_balance':
                bal = pd.to_numeric(df['balance'], errors='coerce').fillna(0)
                sub = df[bal > 2500]
                label = 'High Balance (> $2,500)'
            elif c == 'low_balance':
                bal = pd.to_numeric(df['balance'], errors='coerce').fillna(0)
                sub = df[bal <= 1000]
                label = 'Low Balance (<= $1,000)'
            elif c == 'youth_senior':
                age = pd.to_numeric(df['age'], errors='coerce').fillna(40)
                sub = df[(age < 30) | (age > 60)]
                label = 'Young (<30) & Senior (>60)'
            elif c == 'middle_aged':
                age = pd.to_numeric(df['age'], errors='coerce').fillna(40)
                sub = df[(age >= 30) & (age <= 60)]
                label = 'Middle-Aged (30 - 60 Years)'
            else:
                sub = df
                label = 'All Prospects'
            return sub, label

        sub_a, label_a = filter_preset(cohort_a_type)
        sub_b, label_b = filter_preset(cohort_b_type)

        def get_cohort_stats(sub, name, key):
            n = len(sub)
            if n == 0:
                return {
                    'key': key, 'name': name, 'count': 0, 'conversions': 0,
                    'conversionRate': 0.0, 'avgTouches': 0.0, 'avgDuration': 0, 'avgBalance': 0
                }
            conv = int((sub['y'] == 'yes').sum())
            rate = round((conv / n * 100.0), 2)
            touches = round(float(sub['campaign'].mean()), 1) if 'campaign' in sub.columns else 1.0
            dur = int(round(sub['duration'].mean())) if 'duration' in sub.columns else 0
            bal = int(round(pd.to_numeric(sub['balance'], errors='coerce').mean())) if 'balance' in sub.columns else 0
            return {
                'key': key, 'name': name, 'count': n, 'conversions': conv,
                'conversionRate': rate, 'avgTouches': touches, 'avgDuration': dur, 'avgBalance': bal
            }

        res_a = get_cohort_stats(sub_a, label_a, cohort_a_type)
        res_b = get_cohort_stats(sub_b, label_b, cohort_b_type)

        # Statistical significance: Two-proportion Z-test
        n1 = res_a['count']
        n2 = res_b['count']
        x1 = res_a['conversions']
        x2 = res_b['conversions']

        abs_diff = round(res_a['conversionRate'] - res_b['conversionRate'], 2)
        rel_lift = round(((res_a['conversionRate'] - res_b['conversionRate']) / max(res_b['conversionRate'], 0.01)) * 100.0, 1) if res_b['conversionRate'] > 0 else 0.0

        z_score = 0.0
        p_value = 1.0
        is_significant = False
        sig_label = 'Insufficient Sample Size'

        if n1 >= 10 and n2 >= 10:
            p_pooled = (x1 + x2) / (n1 + n2)
            if 0 < p_pooled < 1:
                se = math.sqrt(p_pooled * (1 - p_pooled) * (1.0 / n1 + 1.0 / n2))
                if se > 0:
                    p1 = x1 / n1
                    p2 = x2 / n2
                    z_score = round((p1 - p2) / se, 3)
                    # Two-tailed p-value via math.erf
                    p_value = round(1.0 - math.erf(abs(z_score) / math.sqrt(2)), 4)
                    if abs(z_score) >= 2.576:
                        is_significant = True
                        sig_label = f'Statistically Significant (p < 0.01, 99% Confidence, Z = {z_score})'
                    elif abs(z_score) >= 1.96:
                        is_significant = True
                        sig_label = f'Statistically Significant (p < 0.05, 95% Confidence, Z = {z_score})'
                    else:
                        is_significant = False
                        sig_label = f'Not Statistically Significant (p = {p_value}, Z = {z_score})'

        return {
            'cohortA': res_a,
            'cohortB': res_b,
            'comparison': {
                'absoluteDifference': abs_diff,
                'relativeLift': rel_lift,
                'zScore': z_score,
                'pValue': p_value,
                'isSignificant': is_significant,
                'significanceLabel': sig_label
            }
        }

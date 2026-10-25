"""
Pandas & NumPy Analytical Computation Engine for Bank Marketing Data
"""
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

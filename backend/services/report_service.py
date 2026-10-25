"""
Report Generation & Export Service (CSV and Matplotlib visual charts)
"""
import io
import matplotlib
matplotlib.use('Agg') # Headless backend
import matplotlib.pyplot as plt
import pandas as pd
from backend.services.analytics_service import AnalyticsService

class ReportService:

    @staticmethod
    def generate_csv_export(df: pd.DataFrame) -> str:
        """Exports dataframe records to CSV string."""
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        return buffer.getvalue()

    @staticmethod
    def generate_chart_png(df: pd.DataFrame) -> bytes:
        """
        Generates a summary analytical chart using matplotlib and returns PNG bytes.
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5), dpi=150)
        fig.patch.set_facecolor('#F8FAFC')

        # 1. Period Performance
        periods = AnalyticsService.compute_period_analysis(df)
        if periods:
            labels = [p['fullName'][:3] for p in periods]
            rates = [p['responseRate'] for p in periods]
            colors = ['#2563EB' if r >= 11.5 else '#94A3B8' for r in rates]

            ax1.bar(labels, rates, color=colors, width=0.6, edgecolor='none', zorder=3)
            ax1.axhline(11.5, color='#F59E0B', linestyle='--', linewidth=1.5, label='Benchmark (11.5%)', zorder=4)
            ax1.set_title('Response Rates by Outreach Month', fontsize=12, fontweight='bold', color='#0F172A', pad=12)
            ax1.set_ylabel('Response Rate (%)', fontsize=10, color='#64748B')
            ax1.set_facecolor('#FFFFFF')
            ax1.grid(axis='y', linestyle=':', alpha=0.6, zorder=0)
            ax1.legend(frameon=False, fontsize=9)
            ax1.tick_params(colors='#64748B')
        else:
            ax1.text(0.5, 0.5, 'No Data Available', ha='center', va='center')

        # 2. Channel Efficacy
        channels = AnalyticsService.compute_channel_analysis(df)
        if channels:
            ch_labels = [c['label'] for c in channels]
            ch_rates = [c['responseRate'] for c in channels]
            ch_colors = ['#2563EB', '#10B981', '#64748B']

            ax2.bar(ch_labels, ch_rates, color=ch_colors[:len(ch_labels)], width=0.5, zorder=3)
            ax2.set_title('Response Rate by Contact Channel', fontsize=12, fontweight='bold', color='#0F172A', pad=12)
            ax2.set_ylabel('Response Rate (%)', fontsize=10, color='#64748B')
            ax2.set_facecolor('#FFFFFF')
            ax2.grid(axis='y', linestyle=':', alpha=0.6, zorder=0)
            ax2.tick_params(colors='#64748B')
        else:
            ax2.text(0.5, 0.5, 'No Data Available', ha='center', va='center')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

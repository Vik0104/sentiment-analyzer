"""
Analytics Engine Module
Provides trend analysis, key driver analysis, and statistical insights.
Implements the WHO/WHERE/WHEN layer of the Analytics Pyramid Framework.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')


class AnalyticsEngine:
    """
    Analytics engine for e-commerce sentiment data.
    Provides trend analysis, segmentation, and key driver identification.
    """

    def __init__(self):
        """Initialize the analytics engine."""
        pass

    def calculate_sentiment_trends(self, df: pd.DataFrame, date_column: str,
                                  sentiment_column: str = 'sentiment_compound',
                                  freq: str = 'W') -> pd.DataFrame:
        """
        Calculate sentiment trends over time.

        Args:
            df: DataFrame with sentiment data
            date_column: Name of date column
            sentiment_column: Name of sentiment score column
            freq: Frequency for grouping ('D', 'W', 'M')

        Returns:
            DataFrame with trend data
        """
        df = df.copy()
        df[date_column] = pd.to_datetime(df[date_column])

        # Group by time period
        trends = df.groupby(df[date_column].dt.to_period(freq)).agg({
            sentiment_column: ['mean', 'std', 'count'],
            'sentiment_label': lambda x: (x == 'positive').sum() / len(x) * 100 if len(x) > 0 else 0
        }).round(3)

        trends.columns = ['avg_sentiment', 'std_sentiment', 'review_count', 'positive_pct']
        trends = trends.reset_index()
        trends[date_column] = trends[date_column].astype(str)

        # Calculate moving average
        trends['moving_avg'] = trends['avg_sentiment'].rolling(window=3, min_periods=1).mean().round(3)

        # Calculate week-over-week change
        trends['wow_change'] = trends['avg_sentiment'].diff().round(3)
        trends['wow_change_pct'] = (trends['avg_sentiment'].pct_change() * 100).round(1)

        return trends

    def detect_sentiment_anomalies(self, df: pd.DataFrame, date_column: str,
                                   sentiment_column: str = 'sentiment_compound',
                                   threshold: float = 2.0) -> pd.DataFrame:
        """
        Detect anomalies in sentiment trends (sudden spikes/drops).

        Args:
            df: DataFrame with sentiment data
            date_column: Name of date column
            sentiment_column: Name of sentiment score column
            threshold: Z-score threshold for anomaly detection

        Returns:
            DataFrame with anomaly flags
        """
        trends = self.calculate_sentiment_trends(df, date_column, sentiment_column)

        # Calculate z-scores
        mean_sentiment = trends['avg_sentiment'].mean()
        std_sentiment = trends['avg_sentiment'].std()

        if std_sentiment > 0:
            trends['z_score'] = ((trends['avg_sentiment'] - mean_sentiment) / std_sentiment).round(2)
            trends['is_anomaly'] = abs(trends['z_score']) > threshold
            trends['anomaly_type'] = trends.apply(
                lambda x: 'positive_spike' if x['z_score'] > threshold
                else ('negative_spike' if x['z_score'] < -threshold else 'normal'),
                axis=1
            )
        else:
            trends['z_score'] = 0
            trends['is_anomaly'] = False
            trends['anomaly_type'] = 'normal'

        return trends

    def segment_by_rating(self, df: pd.DataFrame, rating_column: str = 'rating') -> Dict:
        """
        Segment sentiment analysis by customer rating.

        Args:
            df: DataFrame with sentiment and rating data
            rating_column: Name of rating column

        Returns:
            Dictionary with segmentation analysis
        """
        if rating_column not in df.columns:
            return {'error': 'Rating column not found'}

        segments = {}
        for rating in sorted(df[rating_column].unique()):
            segment_df = df[df[rating_column] == rating]
            segments[f'{rating}_star'] = {
                'count': len(segment_df),
                'avg_sentiment': round(segment_df['sentiment_compound'].mean(), 3),
                'positive_pct': round((segment_df['sentiment_label'] == 'positive').sum() / len(segment_df) * 100, 1),
                'negative_pct': round((segment_df['sentiment_label'] == 'negative').sum() / len(segment_df) * 100, 1)
            }

        return segments

    def segment_by_category(self, df: pd.DataFrame, category_column: str) -> pd.DataFrame:
        """
        Segment sentiment by product category.

        Args:
            df: DataFrame with sentiment and category data
            category_column: Name of category column

        Returns:
            DataFrame with category sentiment summary
        """
        if category_column not in df.columns:
            return pd.DataFrame()

        summary = df.groupby(category_column).agg({
            'sentiment_compound': ['mean', 'std', 'count'],
            'sentiment_label': lambda x: (x == 'positive').sum() / len(x) * 100 if len(x) > 0 else 0
        }).round(3)

        summary.columns = ['avg_sentiment', 'std_sentiment', 'review_count', 'positive_pct']
        summary = summary.reset_index().sort_values('avg_sentiment', ascending=False)

        return summary

    def calculate_key_drivers(self, df: pd.DataFrame, aspect_column: str = 'aspect_details',
                             overall_sentiment_column: str = 'sentiment_compound') -> pd.DataFrame:
        """
        Calculate key driver analysis - which aspects most impact overall sentiment.

        Args:
            df: DataFrame with aspect and overall sentiment data
            aspect_column: Name of column containing aspect details
            overall_sentiment_column: Name of overall sentiment column

        Returns:
            DataFrame with driver importance scores
        """
        # Extract aspect sentiments and correlate with overall
        aspect_scores = defaultdict(list)
        overall_scores = []

        for idx, row in df.iterrows():
            aspects = row.get(aspect_column, {})
            if isinstance(aspects, dict) and aspects:
                overall = row[overall_sentiment_column]
                for aspect_name, aspect_data in aspects.items():
                    if isinstance(aspect_data, dict):
                        aspect_scores[aspect_name].append(aspect_data.get('compound_score', 0))
                        if len(overall_scores) < len(aspect_scores[aspect_name]):
                            overall_scores.append(overall)

        # Calculate correlations (simplified - using mean comparison)
        driver_data = []
        for aspect_name, scores in aspect_scores.items():
            if len(scores) >= 5:  # Minimum sample size
                avg_aspect_score = np.mean(scores)
                mention_count = len(scores)

                # Calculate impact score (simplified key driver analysis)
                # High mention count + strong sentiment = high impact
                impact_score = mention_count * abs(avg_aspect_score)

                driver_data.append({
                    'aspect': aspect_name,
                    'avg_sentiment': round(avg_aspect_score, 3),
                    'mention_count': mention_count,
                    'impact_score': round(impact_score, 2),
                    'priority': self._get_priority_quadrant(avg_aspect_score, impact_score)
                })

        driver_df = pd.DataFrame(driver_data)
        if not driver_df.empty:
            driver_df = driver_df.sort_values('impact_score', ascending=False)

        return driver_df

    def _get_priority_quadrant(self, sentiment: float, impact: float,
                               sentiment_threshold: float = 0.0,
                               impact_threshold: float = 5.0) -> str:
        """
        Determine priority quadrant for key driver analysis.

        Returns: 'fix_now', 'maintain', 'monitor', or 'deprioritize'
        """
        high_impact = impact >= impact_threshold
        positive_sentiment = sentiment >= sentiment_threshold

        if high_impact and not positive_sentiment:
            return 'fix_now'
        elif high_impact and positive_sentiment:
            return 'maintain'
        elif not high_impact and not positive_sentiment:
            return 'monitor'
        else:
            return 'deprioritize'

    def calculate_nps_proxy(self, df: pd.DataFrame, sentiment_column: str = 'sentiment_compound') -> Dict:
        """
        Calculate a Net Promoter Score proxy based on sentiment.

        Promoters: sentiment >= 0.5
        Passives: -0.2 < sentiment < 0.5
        Detractors: sentiment <= -0.2

        Args:
            df: DataFrame with sentiment data
            sentiment_column: Name of sentiment column

        Returns:
            Dictionary with NPS proxy metrics
        """
        total = len(df)
        if total == 0:
            return {'nps_proxy': 0, 'promoters': 0, 'passives': 0, 'detractors': 0}

        promoters = len(df[df[sentiment_column] >= 0.5])
        detractors = len(df[df[sentiment_column] <= -0.2])
        passives = total - promoters - detractors

        nps_proxy = ((promoters - detractors) / total) * 100

        return {
            'nps_proxy': round(nps_proxy, 1),
            'promoters': promoters,
            'promoters_pct': round(promoters / total * 100, 1),
            'passives': passives,
            'passives_pct': round(passives / total * 100, 1),
            'detractors': detractors,
            'detractors_pct': round(detractors / total * 100, 1),
            'total': total
        }

    def generate_executive_summary(self, df: pd.DataFrame, date_column: str = None) -> Dict:
        """
        Generate an executive summary of sentiment analysis.

        Args:
            df: DataFrame with analyzed sentiment data
            date_column: Optional date column for trend analysis

        Returns:
            Dictionary with executive summary metrics
        """
        summary = {
            'overview': {
                'total_reviews': len(df),
                'avg_sentiment': round(df['sentiment_compound'].mean(), 3),
                'sentiment_distribution': df['sentiment_label'].value_counts().to_dict()
            },
            'nps_proxy': self.calculate_nps_proxy(df)
        }

        # Add rating correlation if available
        if 'rating' in df.columns:
            summary['rating_sentiment_correlation'] = round(
                df['sentiment_compound'].corr(df['rating']), 3
            )

        # Add recent trend if date available
        if date_column and date_column in df.columns:
            df_copy = df.copy()
            df_copy[date_column] = pd.to_datetime(df_copy[date_column])
            recent = df_copy.sort_values(date_column).tail(100)  # Last 100 reviews

            summary['recent_trend'] = {
                'recent_avg_sentiment': round(recent['sentiment_compound'].mean(), 3),
                'recent_positive_pct': round(
                    (recent['sentiment_label'] == 'positive').sum() / len(recent) * 100, 1
                )
            }

        return summary

    def compare_periods(self, df: pd.DataFrame, date_column: str,
                       period1_start: str, period1_end: str,
                       period2_start: str, period2_end: str) -> Dict:
        """
        Compare sentiment between two time periods.

        Args:
            df: DataFrame with sentiment and date data
            date_column: Name of date column
            period1_start/end: First period boundaries
            period2_start/end: Second period boundaries

        Returns:
            Dictionary with period comparison
        """
        df = df.copy()
        df[date_column] = pd.to_datetime(df[date_column])

        period1 = df[(df[date_column] >= period1_start) & (df[date_column] <= period1_end)]
        period2 = df[(df[date_column] >= period2_start) & (df[date_column] <= period2_end)]

        if len(period1) == 0 or len(period2) == 0:
            return {'error': 'Insufficient data for comparison'}

        comparison = {
            'period1': {
                'date_range': f'{period1_start} to {period1_end}',
                'review_count': len(period1),
                'avg_sentiment': round(period1['sentiment_compound'].mean(), 3),
                'positive_pct': round((period1['sentiment_label'] == 'positive').sum() / len(period1) * 100, 1)
            },
            'period2': {
                'date_range': f'{period2_start} to {period2_end}',
                'review_count': len(period2),
                'avg_sentiment': round(period2['sentiment_compound'].mean(), 3),
                'positive_pct': round((period2['sentiment_label'] == 'positive').sum() / len(period2) * 100, 1)
            }
        }

        # Calculate changes
        sentiment_change = comparison['period2']['avg_sentiment'] - comparison['period1']['avg_sentiment']
        positive_change = comparison['period2']['positive_pct'] - comparison['period1']['positive_pct']

        comparison['changes'] = {
            'sentiment_change': round(sentiment_change, 3),
            'sentiment_change_pct': round(sentiment_change / abs(comparison['period1']['avg_sentiment']) * 100, 1) if comparison['period1']['avg_sentiment'] != 0 else 0,
            'positive_pct_change': round(positive_change, 1),
            'trend': 'improving' if sentiment_change > 0.05 else ('declining' if sentiment_change < -0.05 else 'stable')
        }

        return comparison

    def get_alert_conditions(self, df: pd.DataFrame, date_column: str = None,
                            sentiment_drop_threshold: float = 0.15,
                            volume_spike_threshold: float = 1.5) -> List[Dict]:
        """
        Check for alert conditions that might need attention.

        Args:
            df: DataFrame with sentiment data
            date_column: Optional date column
            sentiment_drop_threshold: Threshold for sentiment drop alert
            volume_spike_threshold: Multiplier for volume spike alert

        Returns:
            List of alert conditions
        """
        alerts = []

        # Check overall sentiment level
        avg_sentiment = df['sentiment_compound'].mean()
        if avg_sentiment < 0:
            alerts.append({
                'type': 'critical',
                'message': f'Overall sentiment is negative ({avg_sentiment:.2f})',
                'metric': 'avg_sentiment',
                'value': round(avg_sentiment, 3)
            })
        elif avg_sentiment < 0.2:
            alerts.append({
                'type': 'warning',
                'message': f'Overall sentiment is below healthy threshold ({avg_sentiment:.2f})',
                'metric': 'avg_sentiment',
                'value': round(avg_sentiment, 3)
            })

        # Check negative review percentage
        neg_pct = (df['sentiment_label'] == 'negative').sum() / len(df) * 100
        if neg_pct > 30:
            alerts.append({
                'type': 'critical',
                'message': f'High percentage of negative reviews ({neg_pct:.1f}%)',
                'metric': 'negative_percentage',
                'value': round(neg_pct, 1)
            })
        elif neg_pct > 20:
            alerts.append({
                'type': 'warning',
                'message': f'Elevated negative review rate ({neg_pct:.1f}%)',
                'metric': 'negative_percentage',
                'value': round(neg_pct, 1)
            })

        # Check for recent trend if date available
        if date_column and date_column in df.columns:
            trends = self.calculate_sentiment_trends(df, date_column)
            if len(trends) >= 2:
                recent_change = trends['wow_change'].iloc[-1]
                if recent_change < -sentiment_drop_threshold:
                    alerts.append({
                        'type': 'warning',
                        'message': f'Significant sentiment drop in recent period ({recent_change:.2f})',
                        'metric': 'recent_change',
                        'value': round(recent_change, 3)
                    })

        return alerts

    def create_sentiment_heatmap_data(self, df: pd.DataFrame, date_column: str,
                                     category_column: str) -> pd.DataFrame:
        """
        Create data for sentiment heatmap (category x time).

        Args:
            df: DataFrame with sentiment, date, and category data
            date_column: Name of date column
            category_column: Name of category column

        Returns:
            Pivot table for heatmap visualization
        """
        if category_column not in df.columns:
            return pd.DataFrame()

        df = df.copy()
        df[date_column] = pd.to_datetime(df[date_column])
        df['period'] = df[date_column].dt.to_period('W').astype(str)

        heatmap_data = df.pivot_table(
            values='sentiment_compound',
            index=category_column,
            columns='period',
            aggfunc='mean'
        ).round(3)

        return heatmap_data

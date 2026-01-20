"""
Analysis service that orchestrates NLP modules for sentiment analysis.
"""

from typing import Optional
import pandas as pd
from concurrent.futures import ThreadPoolExecutor

from app.nlp import (
    SentimentAnalyzer,
    TopicExtractor,
    AspectAnalyzer,
    AnalyticsEngine
)


class AnalysisService:
    """
    Service for running sentiment analysis pipeline.
    Wraps NLP modules and provides async-compatible interface.
    """

    def __init__(self):
        """Initialize analyzers (loaded once at startup)."""
        self.sentiment_analyzer = SentimentAnalyzer()
        self.topic_extractor = TopicExtractor(n_topics=6)
        self.analytics_engine = AnalyticsEngine()
        self._aspect_analyzers: dict[str, AspectAnalyzer] = {}
        self._executor = ThreadPoolExecutor(max_workers=2)

    def get_aspect_analyzer(self, industry: str = 'general') -> AspectAnalyzer:
        """
        Get or create AspectAnalyzer for specified industry.

        Args:
            industry: Industry type ('general', 'fashion', 'beauty', 'electronics', 'food')

        Returns:
            AspectAnalyzer instance for the industry
        """
        if industry not in self._aspect_analyzers:
            self._aspect_analyzers[industry] = AspectAnalyzer(industry=industry)
        return self._aspect_analyzers[industry]

    def _run_analysis_sync(
        self,
        reviews: list[dict],
        industry: str = 'general',
        include_topics: bool = True,
        include_aspects: bool = True,
        include_trends: bool = True
    ) -> dict:
        """
        Run full analysis pipeline synchronously.

        Args:
            reviews: List of normalized review dictionaries
            industry: Industry for aspect analysis
            include_topics: Whether to run topic extraction
            include_aspects: Whether to run aspect analysis
            include_trends: Whether to calculate trends

        Returns:
            Complete analysis results dictionary
        """
        # Convert to DataFrame
        df = pd.DataFrame(reviews)
        text_column = 'review_text'

        if text_column not in df.columns or df.empty:
            return {"error": "No review text found"}

        # Run sentiment analysis
        df = self.sentiment_analyzer.analyze_dataframe(df, text_column)
        sentiment_dist = self.sentiment_analyzer.get_sentiment_distribution(df)

        # Build results
        results = {
            "review_count": len(df),
            "overview": {
                "avg_sentiment": float(df['sentiment_compound'].mean()),
                "positive_pct": sentiment_dist['percentages'].get('positive', 0),
                "negative_pct": sentiment_dist['percentages'].get('negative', 0),
                "neutral_pct": sentiment_dist['percentages'].get('neutral', 0),
                "distribution": sentiment_dist['counts']
            },
            "nps": self.analytics_engine.calculate_nps_proxy(df)
        }

        # Topic extraction
        if include_topics:
            texts = df[text_column].tolist()
            keywords = self.topic_extractor.extract_keywords(texts, top_n=20)
            bigrams = self.topic_extractor.get_ngrams(texts, n=2, top_k=15)
            topic_results = self.topic_extractor.extract_topics(texts)

            results["topics"] = {
                "keywords": [{"keyword": k, "score": float(s)} for k, s in keywords],
                "bigrams": [{"phrase": p, "count": c} for p, c in bigrams],
                "clusters": []
            }

            if 'topics' in topic_results:
                for topic_name, topic_data in topic_results['topics'].items():
                    results["topics"]["clusters"].append({
                        "name": topic_name,
                        "words": topic_data['word_list'][:5],
                        "document_count": topic_data['document_count']
                    })

        # Aspect analysis
        if include_aspects:
            aspect_analyzer = self.get_aspect_analyzer(industry)
            df = aspect_analyzer.analyze_dataframe(df, text_column)
            aspect_summary = aspect_analyzer.get_aspect_summary(df, text_column)

            results["aspects"] = []
            if not aspect_summary.empty:
                for _, row in aspect_summary.iterrows():
                    results["aspects"].append({
                        "aspect": row['aspect'],
                        "aspect_key": row['aspect_key'],
                        "avg_sentiment": float(row['avg_sentiment']),
                        "mentions": int(row['total_mentions']),
                        "reviews_with_aspect": int(row['reviews_with_aspect']),
                        "positive_pct": float(row['positive_pct']),
                        "negative_pct": float(row['negative_pct'])
                    })

            # Pain points
            pain_points = aspect_analyzer.identify_pain_points(df, text_column)
            results["pain_points"] = []
            for aspect_key, data in list(pain_points.items())[:5]:
                results["pain_points"].append({
                    "aspect": data['label'],
                    "negative_mentions": data['negative_mention_count'],
                    "avg_score": float(data['avg_negative_score']),
                    "examples": [ex['text'] for ex in data['example_complaints'][:3]]
                })

            # Key drivers
            driver_df = self.analytics_engine.calculate_key_drivers(df)
            results["key_drivers"] = []
            if not driver_df.empty:
                for _, row in driver_df.iterrows():
                    results["key_drivers"].append({
                        "aspect": row['aspect'],
                        "avg_sentiment": float(row['avg_sentiment']),
                        "mention_count": int(row['mention_count']),
                        "impact_score": float(row['impact_score']),
                        "priority": row['priority']
                    })

        # Trends (if date column exists)
        if include_trends and 'date' in df.columns:
            try:
                trends = self.analytics_engine.calculate_sentiment_trends(df, 'date', freq='W')
                anomalies = self.analytics_engine.detect_sentiment_anomalies(df, 'date')

                results["trends"] = {
                    "periods": trends['date'].tolist(),
                    "sentiment": trends['avg_sentiment'].tolist(),
                    "moving_avg": trends['moving_avg'].tolist(),
                    "volume": trends['review_count'].tolist()
                }

                results["anomalies"] = []
                anomaly_rows = anomalies[anomalies['is_anomaly']]
                for _, row in anomaly_rows.iterrows():
                    results["anomalies"].append({
                        "period": row['date'],
                        "type": row['anomaly_type'],
                        "z_score": float(row['z_score'])
                    })
            except Exception:
                results["trends"] = None
                results["anomalies"] = []

        # Alerts
        alerts = self.analytics_engine.get_alert_conditions(
            df, 'date' if 'date' in df.columns else None
        )
        results["alerts"] = alerts

        # Sample reviews
        extreme = self.sentiment_analyzer.identify_extreme_reviews(df, threshold=0.7)
        results["sample_reviews"] = {
            "positive": [],
            "negative": []
        }

        for _, row in extreme['highly_positive'].head(3).iterrows():
            results["sample_reviews"]["positive"].append({
                "text": row[text_column],
                "score": float(row['sentiment_compound'])
            })

        for _, row in extreme['highly_negative'].head(3).iterrows():
            results["sample_reviews"]["negative"].append({
                "text": row[text_column],
                "score": float(row['sentiment_compound'])
            })

        return results

    async def run_full_analysis(
        self,
        reviews: list[dict],
        industry: str = 'general',
        include_topics: bool = True,
        include_aspects: bool = True,
        include_trends: bool = True
    ) -> dict:
        """
        Run full analysis pipeline asynchronously.

        Uses thread pool to run CPU-bound NLP operations without
        blocking the event loop.

        Args:
            reviews: List of normalized review dictionaries
            industry: Industry for aspect analysis
            include_topics: Whether to run topic extraction
            include_aspects: Whether to run aspect analysis
            include_trends: Whether to calculate trends

        Returns:
            Complete analysis results dictionary
        """
        import asyncio

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            self._run_analysis_sync,
            reviews,
            industry,
            include_topics,
            include_aspects,
            include_trends
        )

    async def run_sentiment_only(self, reviews: list[dict]) -> dict:
        """
        Run sentiment analysis only (faster, for basic tier).

        Args:
            reviews: List of normalized review dictionaries

        Returns:
            Sentiment-only analysis results
        """
        return await self.run_full_analysis(
            reviews,
            include_topics=False,
            include_aspects=False,
            include_trends=False
        )

    def get_available_industries(self) -> list[str]:
        """Get list of available industry configurations."""
        return ['general', 'fashion', 'beauty', 'electronics', 'food']


# Singleton instance (initialized at startup)
analysis_service: Optional[AnalysisService] = None


def get_analysis_service() -> AnalysisService:
    """Get or create the analysis service singleton."""
    global analysis_service
    if analysis_service is None:
        analysis_service = AnalysisService()
    return analysis_service


def init_analysis_service() -> AnalysisService:
    """Initialize the analysis service (call at startup)."""
    global analysis_service
    analysis_service = AnalysisService()
    return analysis_service

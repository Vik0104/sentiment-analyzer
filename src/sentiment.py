"""
Sentiment Analysis Module
Uses VADER (Valence Aware Dictionary and sEntiment Reasoner) for e-commerce review sentiment analysis.
VADER is optimized for social media and informal text, making it suitable for customer reviews.
"""

import pandas as pd
import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import Dict, List, Tuple, Union
import re


class SentimentAnalyzer:
    """
    Sentiment analyzer for e-commerce reviews using VADER.
    Provides sentiment classification, intensity scoring, and confidence levels.
    """

    def __init__(self):
        """Initialize the VADER sentiment analyzer."""
        self.analyzer = SentimentIntensityAnalyzer()

        # E-commerce specific lexicon additions
        self._add_ecommerce_lexicon()

    def _add_ecommerce_lexicon(self):
        """Add e-commerce specific terms to VADER's lexicon."""
        ecommerce_terms = {
            # Positive terms
            'love': 3.0,
            'perfect': 3.0,
            'excellent': 3.0,
            'amazing': 3.0,
            'worth': 2.0,
            'recommend': 2.5,
            'fast shipping': 2.5,
            'great quality': 3.0,
            'true to size': 2.0,
            'fits perfectly': 3.0,
            'exceeded expectations': 3.5,
            'best purchase': 3.0,
            'highly recommend': 3.0,
            'great value': 2.5,
            'beautiful': 2.5,
            'sturdy': 2.0,
            'durable': 2.0,

            # Negative terms
            'cheap': -2.0,
            'flimsy': -2.5,
            'poor quality': -3.0,
            'never arrived': -3.5,
            'wrong size': -2.5,
            'runs small': -1.5,
            'runs large': -1.5,
            'not as described': -3.0,
            'false advertising': -3.5,
            'waste of money': -3.5,
            'disappointed': -2.5,
            'returned': -1.5,
            'refund': -1.5,
            'defective': -3.0,
            'broken': -3.0,
            'damaged': -2.5,
            'late delivery': -2.0,
            'terrible': -3.0,
            'horrible': -3.0,
            'awful': -3.0,
            'overpriced': -2.0,
            'scam': -3.5,
            'fake': -3.0,
        }

        self.analyzer.lexicon.update(ecommerce_terms)

    def analyze_text(self, text: str) -> Dict:
        """
        Analyze sentiment of a single text.

        Args:
            text: The review text to analyze

        Returns:
            Dictionary containing sentiment scores and classification
        """
        if not text or not isinstance(text, str):
            return {
                'compound': 0.0,
                'positive': 0.0,
                'negative': 0.0,
                'neutral': 0.0,
                'sentiment': 'neutral',
                'confidence': 0.0
            }

        # Clean text
        cleaned_text = self._preprocess_text(text)

        # Get VADER scores
        scores = self.analyzer.polarity_scores(cleaned_text)

        # Classify sentiment based on compound score
        sentiment, confidence = self._classify_sentiment(scores['compound'])

        return {
            'compound': scores['compound'],
            'positive': scores['pos'],
            'negative': scores['neg'],
            'neutral': scores['neu'],
            'sentiment': sentiment,
            'confidence': confidence
        }

    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text for sentiment analysis.

        Args:
            text: Raw text

        Returns:
            Cleaned text
        """
        # Convert to lowercase for consistency
        text = text.lower()

        # Remove URLs
        text = re.sub(r'http\S+|www\.\S+', '', text)

        # Remove extra whitespace
        text = ' '.join(text.split())

        return text

    def _classify_sentiment(self, compound_score: float) -> Tuple[str, float]:
        """
        Classify sentiment based on compound score.

        Args:
            compound_score: VADER compound score (-1 to 1)

        Returns:
            Tuple of (sentiment_label, confidence_score)
        """
        # Thresholds for classification
        if compound_score >= 0.05:
            sentiment = 'positive'
            # Confidence scales with distance from threshold
            confidence = min(1.0, (compound_score - 0.05) / 0.95 * 0.5 + 0.5)
        elif compound_score <= -0.05:
            sentiment = 'negative'
            confidence = min(1.0, (abs(compound_score) - 0.05) / 0.95 * 0.5 + 0.5)
        else:
            sentiment = 'neutral'
            # Low confidence for neutral (ambiguous)
            confidence = 0.5 - abs(compound_score) * 5

        return sentiment, round(confidence, 3)

    def analyze_dataframe(self, df: pd.DataFrame, text_column: str) -> pd.DataFrame:
        """
        Analyze sentiment for all reviews in a DataFrame.

        Args:
            df: DataFrame containing reviews
            text_column: Name of the column containing review text

        Returns:
            DataFrame with added sentiment columns
        """
        df = df.copy()

        # Analyze each review
        sentiment_results = df[text_column].apply(self.analyze_text)

        # Extract results into separate columns
        df['sentiment_compound'] = sentiment_results.apply(lambda x: x['compound'])
        df['sentiment_positive'] = sentiment_results.apply(lambda x: x['positive'])
        df['sentiment_negative'] = sentiment_results.apply(lambda x: x['negative'])
        df['sentiment_neutral'] = sentiment_results.apply(lambda x: x['neutral'])
        df['sentiment_label'] = sentiment_results.apply(lambda x: x['sentiment'])
        df['sentiment_confidence'] = sentiment_results.apply(lambda x: x['confidence'])

        return df

    def get_sentiment_distribution(self, df: pd.DataFrame) -> Dict:
        """
        Get the distribution of sentiments in analyzed DataFrame.

        Args:
            df: DataFrame with sentiment_label column

        Returns:
            Dictionary with sentiment distribution
        """
        if 'sentiment_label' not in df.columns:
            raise ValueError("DataFrame must have 'sentiment_label' column. Run analyze_dataframe first.")

        distribution = df['sentiment_label'].value_counts().to_dict()
        total = len(df)

        return {
            'counts': distribution,
            'percentages': {k: round(v/total*100, 2) for k, v in distribution.items()},
            'total': total,
            'average_compound': round(df['sentiment_compound'].mean(), 3)
        }

    def get_sentiment_by_rating(self, df: pd.DataFrame, rating_column: str = 'rating') -> pd.DataFrame:
        """
        Analyze sentiment distribution by rating level.

        Args:
            df: DataFrame with sentiment and rating columns
            rating_column: Name of the rating column

        Returns:
            DataFrame with sentiment stats by rating
        """
        if rating_column not in df.columns:
            return pd.DataFrame()

        stats = df.groupby(rating_column).agg({
            'sentiment_compound': ['mean', 'std', 'count'],
            'sentiment_label': lambda x: (x == 'positive').sum() / len(x) * 100
        }).round(3)

        stats.columns = ['avg_sentiment', 'std_sentiment', 'count', 'positive_pct']
        return stats.reset_index()

    def identify_extreme_reviews(self, df: pd.DataFrame, threshold: float = 0.8) -> Dict[str, pd.DataFrame]:
        """
        Identify highly positive and highly negative reviews.

        Args:
            df: Analyzed DataFrame
            threshold: Compound score threshold for extreme classification

        Returns:
            Dictionary with 'highly_positive' and 'highly_negative' DataFrames
        """
        highly_positive = df[df['sentiment_compound'] >= threshold].copy()
        highly_negative = df[df['sentiment_compound'] <= -threshold].copy()

        return {
            'highly_positive': highly_positive.sort_values('sentiment_compound', ascending=False),
            'highly_negative': highly_negative.sort_values('sentiment_compound', ascending=True)
        }

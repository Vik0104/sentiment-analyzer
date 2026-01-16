"""
Utility functions for the Sentiment Analyzer.
Contains helper functions for data processing and formatting.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
import re


def clean_text(text: str) -> str:
    """
    Clean and normalize text for analysis.

    Args:
        text: Raw text string

    Returns:
        Cleaned text string
    """
    if not isinstance(text, str):
        return ""

    # Lowercase
    text = text.lower()

    # Remove URLs
    text = re.sub(r'http\S+|www\.\S+', '', text)

    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)

    # Remove extra whitespace
    text = ' '.join(text.split())

    return text.strip()


def validate_dataframe(df: pd.DataFrame, required_columns: List[str]) -> Dict:
    """
    Validate a DataFrame has required columns.

    Args:
        df: DataFrame to validate
        required_columns: List of required column names

    Returns:
        Dictionary with validation results
    """
    missing = [col for col in required_columns if col not in df.columns]

    return {
        'valid': len(missing) == 0,
        'missing_columns': missing,
        'available_columns': list(df.columns)
    }


def format_percentage(value: float, decimal_places: int = 1) -> str:
    """Format a decimal as a percentage string."""
    return f"{value * 100:.{decimal_places}f}%"


def format_sentiment_score(score: float) -> str:
    """Format sentiment score with appropriate label."""
    if score >= 0.5:
        return f"{score:.2f} (Very Positive)"
    elif score >= 0.05:
        return f"{score:.2f} (Positive)"
    elif score <= -0.5:
        return f"{score:.2f} (Very Negative)"
    elif score <= -0.05:
        return f"{score:.2f} (Negative)"
    else:
        return f"{score:.2f} (Neutral)"


def parse_date_column(df: pd.DataFrame, date_column: str) -> pd.DataFrame:
    """
    Parse and standardize a date column.

    Args:
        df: DataFrame with date column
        date_column: Name of date column

    Returns:
        DataFrame with parsed date column
    """
    df = df.copy()

    try:
        df[date_column] = pd.to_datetime(df[date_column])
    except Exception:
        # Try common date formats
        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d']:
            try:
                df[date_column] = pd.to_datetime(df[date_column], format=fmt)
                break
            except Exception:
                continue

    return df


def get_date_range(df: pd.DataFrame, date_column: str) -> Dict:
    """
    Get the date range of a DataFrame.

    Args:
        df: DataFrame with date column
        date_column: Name of date column

    Returns:
        Dictionary with min, max dates and span
    """
    if date_column not in df.columns:
        return {'error': 'Date column not found'}

    df = parse_date_column(df, date_column)

    min_date = df[date_column].min()
    max_date = df[date_column].max()
    span = (max_date - min_date).days

    return {
        'min_date': min_date.strftime('%Y-%m-%d') if pd.notna(min_date) else None,
        'max_date': max_date.strftime('%Y-%m-%d') if pd.notna(max_date) else None,
        'span_days': span
    }


def calculate_review_velocity(df: pd.DataFrame, date_column: str) -> float:
    """
    Calculate average reviews per day.

    Args:
        df: DataFrame with date column
        date_column: Name of date column

    Returns:
        Average reviews per day
    """
    date_range = get_date_range(df, date_column)

    if 'error' in date_range or date_range['span_days'] == 0:
        return len(df)

    return len(df) / max(date_range['span_days'], 1)


def sample_reviews_by_sentiment(df: pd.DataFrame, text_column: str,
                               n_per_sentiment: int = 3) -> Dict[str, List[str]]:
    """
    Sample representative reviews for each sentiment category.

    Args:
        df: DataFrame with sentiment analysis
        text_column: Name of text column
        n_per_sentiment: Number of reviews to sample per sentiment

    Returns:
        Dictionary mapping sentiment to sample reviews
    """
    samples = {}

    for sentiment in ['positive', 'negative', 'neutral']:
        sentiment_df = df[df['sentiment_label'] == sentiment]
        if not sentiment_df.empty:
            sample_size = min(n_per_sentiment, len(sentiment_df))
            samples[sentiment] = sentiment_df.sample(sample_size)[text_column].tolist()
        else:
            samples[sentiment] = []

    return samples


def generate_summary_stats(df: pd.DataFrame) -> Dict:
    """
    Generate comprehensive summary statistics for analyzed DataFrame.

    Args:
        df: DataFrame with sentiment analysis

    Returns:
        Dictionary with summary statistics
    """
    stats = {
        'total_reviews': len(df),
        'sentiment': {
            'mean': df['sentiment_compound'].mean(),
            'std': df['sentiment_compound'].std(),
            'min': df['sentiment_compound'].min(),
            'max': df['sentiment_compound'].max(),
            'median': df['sentiment_compound'].median()
        },
        'distribution': df['sentiment_label'].value_counts().to_dict()
    }

    # Add rating stats if available
    if 'rating' in df.columns:
        stats['rating'] = {
            'mean': df['rating'].mean(),
            'distribution': df['rating'].value_counts().sort_index().to_dict()
        }

    # Add category stats if available
    if 'category' in df.columns:
        stats['categories'] = {
            'unique': df['category'].nunique(),
            'top': df['category'].value_counts().head(5).to_dict()
        }

    return stats


def export_to_excel(df: pd.DataFrame, filepath: str,
                   sheet_name: str = 'Analysis Results') -> bool:
    """
    Export DataFrame to Excel file.

    Args:
        df: DataFrame to export
        filepath: Path for output file
        sheet_name: Name of Excel sheet

    Returns:
        True if successful, False otherwise
    """
    try:
        df.to_excel(filepath, sheet_name=sheet_name, index=False)
        return True
    except Exception:
        return False


def truncate_text(text: str, max_length: int = 100) -> str:
    """Truncate text to specified length with ellipsis."""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."

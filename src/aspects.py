"""
Aspect-Based Sentiment Analysis (ABSA) Module
Extracts sentiment for specific e-commerce aspects like quality, shipping, customer service.
Implements the "WHY" layer of the Analytics Pyramid Framework.
"""

import pandas as pd
import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import Dict, List, Tuple, Optional
import re
from collections import defaultdict


class AspectAnalyzer:
    """
    Aspect-based sentiment analyzer for e-commerce reviews.
    Identifies mentions of predefined aspects and determines sentiment for each.
    """

    def __init__(self, industry: str = 'general'):
        """
        Initialize the aspect analyzer.

        Args:
            industry: Industry type for aspect configuration
                     Options: 'general', 'fashion', 'beauty', 'electronics', 'food'
        """
        self.industry = industry
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        self.aspects = self._get_aspect_definitions(industry)

    def _get_aspect_definitions(self, industry: str) -> Dict:
        """
        Get aspect definitions for the specified industry.

        Returns:
            Dictionary mapping aspect categories to their keyword patterns
        """
        # Base aspects common to all e-commerce
        base_aspects = {
            'product_quality': {
                'keywords': ['quality', 'material', 'made', 'construction', 'build',
                            'craftsmanship', 'durable', 'durability', 'sturdy', 'flimsy',
                            'cheap', 'premium', 'well-made', 'poorly made', 'authentic',
                            'genuine', 'fake', 'real', 'solid'],
                'label': 'Product Quality'
            },
            'shipping': {
                'keywords': ['shipping', 'delivery', 'arrived', 'package', 'packaging',
                            'shipped', 'deliver', 'courier', 'carrier', 'tracking',
                            'fast', 'slow', 'late', 'early', 'on time', 'delayed',
                            'lost', 'damaged in transit', 'box', 'wrapped'],
                'label': 'Shipping & Delivery'
            },
            'customer_service': {
                'keywords': ['customer service', 'support', 'response', 'help', 'helpful',
                            'representative', 'rep', 'contact', 'refund', 'return',
                            'exchange', 'warranty', 'replacement', 'resolved', 'issue',
                            'problem', 'complaint', 'responsive', 'rude', 'friendly'],
                'label': 'Customer Service'
            },
            'value': {
                'keywords': ['price', 'value', 'worth', 'money', 'expensive', 'cheap',
                            'affordable', 'overpriced', 'bargain', 'deal', 'discount',
                            'cost', 'pay', 'paid', 'budget', 'premium price'],
                'label': 'Value for Money'
            },
            'description_accuracy': {
                'keywords': ['description', 'described', 'picture', 'photo', 'image',
                            'expected', 'expect', 'advertised', 'shown', 'looks like',
                            'different', 'same as', 'accurate', 'misleading', 'false'],
                'label': 'Description Accuracy'
            }
        }

        # Industry-specific aspects
        industry_aspects = {
            'fashion': {
                'fit_sizing': {
                    'keywords': ['fit', 'fits', 'size', 'sizing', 'small', 'large', 'big',
                                'tight', 'loose', 'comfortable', 'uncomfortable', 'true to size',
                                'runs small', 'runs large', 'length', 'width', 'waist',
                                'measurements', 'petite', 'plus size'],
                    'label': 'Fit & Sizing'
                },
                'appearance': {
                    'keywords': ['color', 'colour', 'looks', 'style', 'design', 'pattern',
                                'beautiful', 'ugly', 'cute', 'gorgeous', 'stunning',
                                'flattering', 'fashionable', 'trendy', 'classic'],
                    'label': 'Appearance & Style'
                },
                'fabric': {
                    'keywords': ['fabric', 'material', 'cotton', 'polyester', 'silk', 'linen',
                                'soft', 'scratchy', 'itchy', 'breathable', 'stretchy',
                                'texture', 'feel', 'lightweight', 'heavy'],
                    'label': 'Fabric & Material'
                }
            },
            'beauty': {
                'efficacy': {
                    'keywords': ['works', 'effective', 'results', 'improvement', 'difference',
                                'before after', 'visible', 'noticeable', 'miracle', 'amazing results'],
                    'label': 'Efficacy & Results'
                },
                'skin_reaction': {
                    'keywords': ['skin', 'reaction', 'irritation', 'breakout', 'sensitive',
                                'allergy', 'allergic', 'rash', 'redness', 'burning',
                                'gentle', 'harsh', 'moisturizing', 'drying'],
                    'label': 'Skin Compatibility'
                },
                'application': {
                    'keywords': ['apply', 'application', 'blend', 'blends', 'smooth',
                                'streaky', 'coverage', 'pigment', 'buildable', 'easy to use'],
                    'label': 'Application & Texture'
                }
            },
            'electronics': {
                'performance': {
                    'keywords': ['performance', 'fast', 'slow', 'speed', 'powerful',
                                'lag', 'laggy', 'smooth', 'responsive', 'efficient',
                                'battery', 'battery life', 'processor', 'memory'],
                    'label': 'Performance'
                },
                'ease_of_use': {
                    'keywords': ['easy', 'difficult', 'intuitive', 'complicated', 'setup',
                                'install', 'user-friendly', 'confusing', 'simple',
                                'instructions', 'manual', 'learning curve'],
                    'label': 'Ease of Use'
                },
                'connectivity': {
                    'keywords': ['connect', 'connection', 'bluetooth', 'wifi', 'wireless',
                                'pair', 'pairing', 'compatible', 'compatibility', 'sync'],
                    'label': 'Connectivity'
                }
            },
            'food': {
                'taste': {
                    'keywords': ['taste', 'flavor', 'delicious', 'tasty', 'yummy',
                                'disgusting', 'bland', 'sweet', 'salty', 'spicy',
                                'fresh', 'stale', 'rich', 'light'],
                    'label': 'Taste & Flavor'
                },
                'freshness': {
                    'keywords': ['fresh', 'freshness', 'expired', 'shelf life', 'stale',
                                'mold', 'spoiled', 'rotten', 'preservatives'],
                    'label': 'Freshness'
                },
                'packaging_food': {
                    'keywords': ['sealed', 'leak', 'leaking', 'spill', 'crushed',
                                'intact', 'damaged', 'broken seal', 'vacuum sealed'],
                    'label': 'Food Packaging'
                }
            }
        }

        # Combine base with industry-specific
        aspects = base_aspects.copy()
        if industry in industry_aspects:
            aspects.update(industry_aspects[industry])

        return aspects

    def _extract_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.

        Args:
            text: Review text

        Returns:
            List of sentences
        """
        if not isinstance(text, str):
            return []

        # Split on sentence boundaries
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences

    def _find_aspect_mentions(self, text: str) -> Dict[str, List[str]]:
        """
        Find which aspects are mentioned in the text.

        Args:
            text: Review text

        Returns:
            Dictionary mapping aspect names to relevant text snippets
        """
        text_lower = text.lower()
        sentences = self._extract_sentences(text)

        aspect_mentions = defaultdict(list)

        for sentence in sentences:
            sentence_lower = sentence.lower()
            for aspect_name, aspect_data in self.aspects.items():
                for keyword in aspect_data['keywords']:
                    if keyword.lower() in sentence_lower:
                        aspect_mentions[aspect_name].append(sentence)
                        break  # Only add sentence once per aspect

        return dict(aspect_mentions)

    def analyze_aspects(self, text: str) -> Dict:
        """
        Analyze sentiment for each aspect mentioned in the text.

        Args:
            text: Review text

        Returns:
            Dictionary with aspect-level sentiment analysis
        """
        if not text or not isinstance(text, str):
            return {'aspects': {}, 'summary': {}}

        aspect_mentions = self._find_aspect_mentions(text)

        results = {}
        for aspect_name, sentences in aspect_mentions.items():
            # Combine all sentences for this aspect
            aspect_text = ' '.join(sentences)

            # Get sentiment
            scores = self.sentiment_analyzer.polarity_scores(aspect_text)

            # Classify
            compound = scores['compound']
            if compound >= 0.05:
                sentiment = 'positive'
            elif compound <= -0.05:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'

            results[aspect_name] = {
                'label': self.aspects[aspect_name]['label'],
                'sentiment': sentiment,
                'compound_score': round(compound, 3),
                'mentions': len(sentences),
                'sample_text': sentences[0] if sentences else ''
            }

        # Calculate summary statistics
        summary = self._calculate_aspect_summary(results)

        return {
            'aspects': results,
            'summary': summary,
            'total_aspects_mentioned': len(results)
        }

    def _calculate_aspect_summary(self, aspect_results: Dict) -> Dict:
        """
        Calculate summary statistics for aspect analysis.

        Args:
            aspect_results: Dictionary of aspect analysis results

        Returns:
            Summary statistics
        """
        if not aspect_results:
            return {}

        sentiments = [r['sentiment'] for r in aspect_results.values()]
        scores = [r['compound_score'] for r in aspect_results.values()]

        return {
            'positive_aspects': sentiments.count('positive'),
            'negative_aspects': sentiments.count('negative'),
            'neutral_aspects': sentiments.count('neutral'),
            'average_score': round(np.mean(scores), 3) if scores else 0,
            'most_positive': max(aspect_results.items(),
                               key=lambda x: x[1]['compound_score'])[0] if aspect_results else None,
            'most_negative': min(aspect_results.items(),
                               key=lambda x: x[1]['compound_score'])[0] if aspect_results else None
        }

    def analyze_dataframe(self, df: pd.DataFrame, text_column: str) -> pd.DataFrame:
        """
        Analyze aspects for all reviews in a DataFrame.

        Args:
            df: DataFrame with reviews
            text_column: Name of text column

        Returns:
            DataFrame with aspect analysis columns
        """
        df = df.copy()

        # Analyze each review
        aspect_results = df[text_column].apply(self.analyze_aspects)

        # Extract key metrics
        df['aspects_mentioned'] = aspect_results.apply(lambda x: x['total_aspects_mentioned'])
        df['positive_aspects'] = aspect_results.apply(lambda x: x['summary'].get('positive_aspects', 0))
        df['negative_aspects'] = aspect_results.apply(lambda x: x['summary'].get('negative_aspects', 0))
        df['aspect_details'] = aspect_results.apply(lambda x: x['aspects'])

        return df

    def get_aspect_summary(self, df: pd.DataFrame, text_column: str) -> pd.DataFrame:
        """
        Get aggregated aspect sentiment summary across all reviews.

        Args:
            df: DataFrame with reviews
            text_column: Name of text column

        Returns:
            DataFrame with aspect-level aggregated metrics
        """
        # Analyze all reviews
        all_aspects = defaultdict(lambda: {'positive': 0, 'negative': 0, 'neutral': 0,
                                           'scores': [], 'total_mentions': 0})

        for text in df[text_column]:
            result = self.analyze_aspects(text)
            for aspect_name, aspect_data in result['aspects'].items():
                sentiment = aspect_data['sentiment']
                all_aspects[aspect_name][sentiment] += 1
                all_aspects[aspect_name]['scores'].append(aspect_data['compound_score'])
                all_aspects[aspect_name]['total_mentions'] += aspect_data['mentions']

        # Create summary DataFrame
        summary_data = []
        for aspect_name, data in all_aspects.items():
            total = data['positive'] + data['negative'] + data['neutral']
            if total > 0:
                summary_data.append({
                    'aspect': self.aspects[aspect_name]['label'],
                    'aspect_key': aspect_name,
                    'total_mentions': data['total_mentions'],
                    'reviews_with_aspect': total,
                    'positive_count': data['positive'],
                    'negative_count': data['negative'],
                    'neutral_count': data['neutral'],
                    'positive_pct': round(data['positive'] / total * 100, 1),
                    'negative_pct': round(data['negative'] / total * 100, 1),
                    'avg_sentiment': round(np.mean(data['scores']), 3) if data['scores'] else 0
                })

        summary_df = pd.DataFrame(summary_data)
        if not summary_df.empty:
            summary_df = summary_df.sort_values('total_mentions', ascending=False)

        return summary_df

    def get_aspect_trends(self, df: pd.DataFrame, text_column: str,
                         date_column: str, freq: str = 'W') -> pd.DataFrame:
        """
        Get aspect sentiment trends over time.

        Args:
            df: DataFrame with reviews and dates
            text_column: Name of text column
            date_column: Name of date column
            freq: Frequency for grouping ('D', 'W', 'M')

        Returns:
            DataFrame with aspect trends over time
        """
        df = df.copy()
        df[date_column] = pd.to_datetime(df[date_column])

        # Group by time period
        df['period'] = df[date_column].dt.to_period(freq)

        trends_data = []
        for period, group in df.groupby('period'):
            period_aspects = defaultdict(list)

            for text in group[text_column]:
                result = self.analyze_aspects(text)
                for aspect_name, aspect_data in result['aspects'].items():
                    period_aspects[aspect_name].append(aspect_data['compound_score'])

            for aspect_name, scores in period_aspects.items():
                trends_data.append({
                    'period': str(period),
                    'aspect': self.aspects[aspect_name]['label'],
                    'avg_sentiment': round(np.mean(scores), 3),
                    'mention_count': len(scores)
                })

        return pd.DataFrame(trends_data)

    def identify_pain_points(self, df: pd.DataFrame, text_column: str,
                            threshold: float = -0.2) -> Dict:
        """
        Identify key pain points (negative aspects) from reviews.

        Args:
            df: DataFrame with reviews
            text_column: Name of text column
            threshold: Sentiment threshold for pain point classification

        Returns:
            Dictionary with pain points and example reviews
        """
        pain_points = defaultdict(lambda: {'count': 0, 'avg_score': [], 'examples': []})

        for idx, text in enumerate(df[text_column]):
            result = self.analyze_aspects(text)
            for aspect_name, aspect_data in result['aspects'].items():
                if aspect_data['compound_score'] <= threshold:
                    pain_points[aspect_name]['count'] += 1
                    pain_points[aspect_name]['avg_score'].append(aspect_data['compound_score'])
                    if len(pain_points[aspect_name]['examples']) < 5:
                        pain_points[aspect_name]['examples'].append({
                            'text': aspect_data['sample_text'],
                            'score': aspect_data['compound_score']
                        })

        # Format results
        results = {}
        for aspect_name, data in pain_points.items():
            results[aspect_name] = {
                'label': self.aspects[aspect_name]['label'],
                'negative_mention_count': data['count'],
                'avg_negative_score': round(np.mean(data['avg_score']), 3),
                'example_complaints': data['examples']
            }

        # Sort by count
        results = dict(sorted(results.items(),
                             key=lambda x: x[1]['negative_mention_count'],
                             reverse=True))

        return results

    def get_available_industries(self) -> List[str]:
        """Get list of available industry configurations."""
        return ['general', 'fashion', 'beauty', 'electronics', 'food']

    def get_aspect_labels(self) -> Dict[str, str]:
        """Get mapping of aspect keys to display labels."""
        return {k: v['label'] for k, v in self.aspects.items()}

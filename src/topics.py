"""
Topic Extraction Module
Uses TF-IDF and keyword analysis for theme extraction from e-commerce reviews.
Provides topic clustering and keyword identification.
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.decomposition import NMF, LatentDirichletAllocation
from sklearn.cluster import KMeans
from collections import Counter
from typing import Dict, List, Tuple, Optional
import re
import string


class TopicExtractor:
    """
    Topic and theme extractor for e-commerce reviews.
    Uses TF-IDF for keyword extraction and NMF/LDA for topic modeling.
    """

    def __init__(self, n_topics: int = 8, method: str = 'nmf'):
        """
        Initialize the topic extractor.

        Args:
            n_topics: Number of topics to extract
            method: 'nmf' or 'lda' for topic modeling
        """
        self.n_topics = n_topics
        self.method = method

        # E-commerce specific stop words
        self.custom_stopwords = self._get_ecommerce_stopwords()

        # Initialize vectorizers
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95
        )

        self.count_vectorizer = CountVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95
        )

        # Topic model
        if method == 'nmf':
            self.topic_model = NMF(
                n_components=n_topics,
                random_state=42,
                max_iter=200
            )
        else:
            self.topic_model = LatentDirichletAllocation(
                n_components=n_topics,
                random_state=42,
                max_iter=20
            )

        self.feature_names = None
        self.topics = None

    def _get_ecommerce_stopwords(self) -> set:
        """Get e-commerce specific stop words to filter out."""
        return {
            'product', 'item', 'order', 'ordered', 'buy', 'bought', 'purchase',
            'purchased', 'get', 'got', 'use', 'used', 'using', 'would', 'could',
            'one', 'also', 'really', 'just', 'like', 'even', 'still', 'much',
            'well', 'good', 'great', 'nice', 'love', 'loved', 'best', 'better',
            'amazon', 'seller', 'review', 'star', 'stars', 'rating', 'recommend'
        }

    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text for topic extraction.

        Args:
            text: Raw text

        Returns:
            Cleaned text
        """
        if not isinstance(text, str):
            return ""

        # Lowercase
        text = text.lower()

        # Remove URLs
        text = re.sub(r'http\S+|www\.\S+', '', text)

        # Remove punctuation but keep important e-commerce terms
        text = re.sub(r'[^\w\s-]', ' ', text)

        # Remove numbers (but keep product-related patterns like "5 stars")
        text = re.sub(r'\b\d+\b', '', text)

        # Remove extra whitespace
        text = ' '.join(text.split())

        # Remove custom stop words
        words = text.split()
        words = [w for w in words if w not in self.custom_stopwords and len(w) > 2]

        return ' '.join(words)

    def extract_keywords(self, texts: List[str], top_n: int = 20) -> List[Tuple[str, float]]:
        """
        Extract top keywords using TF-IDF.

        Args:
            texts: List of review texts
            top_n: Number of top keywords to return

        Returns:
            List of (keyword, score) tuples
        """
        # Preprocess texts
        processed_texts = [self._preprocess_text(t) for t in texts]
        processed_texts = [t for t in processed_texts if t]  # Remove empty

        if not processed_texts:
            return []

        # Fit TF-IDF
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(processed_texts)
        self.feature_names = self.tfidf_vectorizer.get_feature_names_out()

        # Get average TF-IDF scores
        avg_scores = np.array(tfidf_matrix.mean(axis=0)).flatten()

        # Get top keywords
        top_indices = avg_scores.argsort()[-top_n:][::-1]
        keywords = [(self.feature_names[i], round(avg_scores[i], 4)) for i in top_indices]

        return keywords

    def extract_topics(self, texts: List[str], words_per_topic: int = 10) -> Dict:
        """
        Extract topics using NMF or LDA.

        Args:
            texts: List of review texts
            words_per_topic: Number of words to show per topic

        Returns:
            Dictionary with topic information
        """
        # Preprocess texts
        processed_texts = [self._preprocess_text(t) for t in texts]
        processed_texts = [t for t in processed_texts if t]

        if len(processed_texts) < self.n_topics:
            return {'error': 'Not enough texts for topic modeling'}

        # Create document-term matrix
        if self.method == 'nmf':
            doc_term_matrix = self.tfidf_vectorizer.fit_transform(processed_texts)
        else:
            doc_term_matrix = self.count_vectorizer.fit_transform(processed_texts)

        feature_names = (self.tfidf_vectorizer.get_feature_names_out()
                        if self.method == 'nmf'
                        else self.count_vectorizer.get_feature_names_out())

        # Fit topic model
        doc_topics = self.topic_model.fit_transform(doc_term_matrix)

        # Extract topics
        topics = {}
        for topic_idx, topic in enumerate(self.topic_model.components_):
            top_word_indices = topic.argsort()[-words_per_topic:][::-1]
            top_words = [(feature_names[i], round(topic[i], 4)) for i in top_word_indices]
            topics[f'Topic {topic_idx + 1}'] = {
                'words': top_words,
                'word_list': [w[0] for w in top_words],
                'document_count': int((doc_topics.argmax(axis=1) == topic_idx).sum())
            }

        self.topics = topics

        return {
            'topics': topics,
            'n_documents': len(processed_texts),
            'document_topics': doc_topics
        }

    def get_topic_for_text(self, text: str) -> Dict:
        """
        Get the dominant topic for a single text.

        Args:
            text: Review text

        Returns:
            Dictionary with topic assignment
        """
        processed = self._preprocess_text(text)
        if not processed:
            return {'topic': None, 'confidence': 0.0}

        try:
            if self.method == 'nmf':
                vec = self.tfidf_vectorizer.transform([processed])
            else:
                vec = self.count_vectorizer.transform([processed])

            topic_dist = self.topic_model.transform(vec)[0]
            dominant_topic = topic_dist.argmax()
            confidence = topic_dist[dominant_topic] / topic_dist.sum() if topic_dist.sum() > 0 else 0

            return {
                'topic': f'Topic {dominant_topic + 1}',
                'topic_id': dominant_topic,
                'confidence': round(float(confidence), 3),
                'distribution': topic_dist.tolist()
            }
        except Exception:
            return {'topic': None, 'confidence': 0.0}

    def assign_topics_to_dataframe(self, df: pd.DataFrame, text_column: str) -> pd.DataFrame:
        """
        Assign topics to all reviews in a DataFrame.

        Args:
            df: DataFrame with reviews
            text_column: Name of text column

        Returns:
            DataFrame with topic assignments
        """
        df = df.copy()

        # First extract topics to fit the model
        texts = df[text_column].tolist()
        self.extract_topics(texts)

        # Assign topics
        topic_results = df[text_column].apply(self.get_topic_for_text)
        df['topic'] = topic_results.apply(lambda x: x['topic'])
        df['topic_confidence'] = topic_results.apply(lambda x: x['confidence'])

        return df

    def get_word_frequencies(self, texts: List[str], top_n: int = 50) -> Dict[str, int]:
        """
        Get word frequencies for word cloud generation.

        Args:
            texts: List of review texts
            top_n: Number of top words to return

        Returns:
            Dictionary of word frequencies
        """
        processed_texts = [self._preprocess_text(t) for t in texts]
        all_words = ' '.join(processed_texts).split()

        # Count frequencies
        word_counts = Counter(all_words)

        # Get top words
        top_words = dict(word_counts.most_common(top_n))

        return top_words

    def get_ngrams(self, texts: List[str], n: int = 2, top_k: int = 20) -> List[Tuple[str, int]]:
        """
        Extract top n-grams from texts.

        Args:
            texts: List of review texts
            n: n-gram size (2 for bigrams, 3 for trigrams)
            top_k: Number of top n-grams to return

        Returns:
            List of (n-gram, count) tuples
        """
        processed_texts = [self._preprocess_text(t) for t in texts]

        ngram_vectorizer = CountVectorizer(
            ngram_range=(n, n),
            stop_words='english',
            max_features=500
        )

        try:
            ngram_matrix = ngram_vectorizer.fit_transform(processed_texts)
            ngram_counts = np.array(ngram_matrix.sum(axis=0)).flatten()
            ngram_names = ngram_vectorizer.get_feature_names_out()

            # Sort by count
            top_indices = ngram_counts.argsort()[-top_k:][::-1]
            top_ngrams = [(ngram_names[i], int(ngram_counts[i])) for i in top_indices]

            return top_ngrams
        except Exception:
            return []

    def get_topic_summary(self) -> pd.DataFrame:
        """
        Get a summary DataFrame of all topics.

        Returns:
            DataFrame with topic summaries
        """
        if not self.topics:
            return pd.DataFrame()

        summary = []
        for topic_name, topic_data in self.topics.items():
            summary.append({
                'topic': topic_name,
                'top_words': ', '.join(topic_data['word_list'][:5]),
                'document_count': topic_data['document_count']
            })

        return pd.DataFrame(summary)

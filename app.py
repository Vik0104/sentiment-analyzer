"""
Sentiment Analytics for E-commerce - MVP Streamlit App
A comprehensive sentiment analysis dashboard for retail and e-commerce businesses.

Features:
- Sentiment Classification (WHAT layer)
- Aspect-Based Sentiment Analysis (WHY layer)
- Topic/Theme Extraction
- Trend Analysis (WHEN layer)
- Key Driver Analysis
- Executive Summary & Alerts
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sentiment import SentimentAnalyzer
from topics import TopicExtractor
from aspects import AspectAnalyzer
from analytics import AnalyticsEngine

# Page configuration
st.set_page_config(
    page_title="E-commerce Sentiment Analyzer",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 1rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
    }
    .positive { color: #28a745; }
    .negative { color: #dc3545; }
    .neutral { color: #6c757d; }
    .stTabs [data-baseweb="tab-list"] {
        gap: 24px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        padding-left: 20px;
        padding-right: 20px;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def load_analyzers(industry: str = 'general'):
    """Load and cache analyzers."""
    sentiment_analyzer = SentimentAnalyzer()
    topic_extractor = TopicExtractor(n_topics=6)
    aspect_analyzer = AspectAnalyzer(industry=industry)
    analytics_engine = AnalyticsEngine()
    return sentiment_analyzer, topic_extractor, aspect_analyzer, analytics_engine


@st.cache_data
def load_sample_data():
    """Load sample review data."""
    sample_path = os.path.join(os.path.dirname(__file__), 'data', 'sample_reviews.csv')
    if os.path.exists(sample_path):
        return pd.read_csv(sample_path)
    return None


@st.cache_data
def analyze_reviews(_sentiment_analyzer, _topic_extractor, _aspect_analyzer,
                   df: pd.DataFrame, text_column: str):
    """Run full analysis pipeline on reviews."""
    # Sentiment analysis
    df = _sentiment_analyzer.analyze_dataframe(df, text_column)

    # Topic extraction
    texts = df[text_column].tolist()
    keywords = _topic_extractor.extract_keywords(texts, top_n=30)
    topic_results = _topic_extractor.extract_topics(texts)
    df = _topic_extractor.assign_topics_to_dataframe(df, text_column)

    # Aspect analysis
    df = _aspect_analyzer.analyze_dataframe(df, text_column)
    aspect_summary = _aspect_analyzer.get_aspect_summary(df, text_column)

    return df, keywords, topic_results, aspect_summary


def create_sentiment_gauge(score: float, title: str = "Overall Sentiment"):
    """Create a gauge chart for sentiment score."""
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=score,
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': title, 'font': {'size': 20}},
        gauge={
            'axis': {'range': [-1, 1], 'tickwidth': 1},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [-1, -0.3], 'color': "#ff6b6b"},
                {'range': [-0.3, 0.3], 'color': "#ffd93d"},
                {'range': [0.3, 1], 'color': "#6bcb77"}
            ],
            'threshold': {
                'line': {'color': "black", 'width': 4},
                'thickness': 0.75,
                'value': score
            }
        }
    ))
    fig.update_layout(height=280, margin=dict(l=20, r=20, t=60, b=20))
    return fig


def create_sentiment_distribution_chart(df: pd.DataFrame):
    """Create a pie chart for sentiment distribution."""
    dist = df['sentiment_label'].value_counts()
    colors = {'positive': '#6bcb77', 'negative': '#ff6b6b', 'neutral': '#ffd93d'}

    fig = px.pie(
        values=dist.values,
        names=dist.index,
        color=dist.index,
        color_discrete_map=colors,
        title="Sentiment Distribution"
    )
    fig.update_layout(height=300)
    return fig


def create_trend_chart(trends_df: pd.DataFrame, date_col: str):
    """Create a sentiment trend line chart."""
    fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Sentiment trend line
    fig.add_trace(
        go.Scatter(
            x=trends_df[date_col],
            y=trends_df['avg_sentiment'],
            name="Avg Sentiment",
            line=dict(color='#1f77b4', width=2)
        ),
        secondary_y=False
    )

    # Moving average
    fig.add_trace(
        go.Scatter(
            x=trends_df[date_col],
            y=trends_df['moving_avg'],
            name="Moving Avg (3-period)",
            line=dict(color='#ff7f0e', width=2, dash='dash')
        ),
        secondary_y=False
    )

    # Review volume bars
    fig.add_trace(
        go.Bar(
            x=trends_df[date_col],
            y=trends_df['review_count'],
            name="Review Count",
            marker_color='rgba(150, 150, 150, 0.3)'
        ),
        secondary_y=True
    )

    fig.update_layout(
        title="Sentiment Trend Over Time",
        xaxis_title="Period",
        hovermode="x unified",
        height=400
    )
    fig.update_yaxes(title_text="Sentiment Score", secondary_y=False)
    fig.update_yaxes(title_text="Review Count", secondary_y=True)

    return fig


def create_aspect_chart(aspect_summary: pd.DataFrame):
    """Create aspect sentiment bar chart."""
    if aspect_summary.empty:
        return None

    fig = go.Figure()

    # Sort by average sentiment
    aspect_summary = aspect_summary.sort_values('avg_sentiment', ascending=True)

    # Color based on sentiment
    colors = ['#ff6b6b' if x < 0 else '#6bcb77' for x in aspect_summary['avg_sentiment']]

    fig.add_trace(go.Bar(
        y=aspect_summary['aspect'],
        x=aspect_summary['avg_sentiment'],
        orientation='h',
        marker_color=colors,
        text=[f"{x:.2f}" for x in aspect_summary['avg_sentiment']],
        textposition='outside'
    ))

    fig.update_layout(
        title="Aspect Sentiment Scores",
        xaxis_title="Average Sentiment",
        yaxis_title="Aspect",
        height=400,
        xaxis_range=[-1, 1]
    )

    return fig


def create_wordcloud(word_freq: dict):
    """Create a word cloud visualization."""
    if not word_freq:
        return None

    wc = WordCloud(
        width=800,
        height=400,
        background_color='white',
        colormap='viridis',
        max_words=100
    ).generate_from_frequencies(word_freq)

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.imshow(wc, interpolation='bilinear')
    ax.axis('off')
    return fig


def create_nps_gauge(nps_data: dict):
    """Create NPS proxy gauge."""
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=nps_data['nps_proxy'],
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': "NPS Proxy Score", 'font': {'size': 18}},
        delta={'reference': 0},
        gauge={
            'axis': {'range': [-100, 100]},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [-100, 0], 'color': "#ffcccc"},
                {'range': [0, 50], 'color': "#ffffcc"},
                {'range': [50, 100], 'color': "#ccffcc"}
            ]
        }
    ))
    fig.update_layout(height=280, margin=dict(l=20, r=20, t=60, b=20))
    return fig


def main():
    """Main application."""

    # Header
    st.markdown('<h1 class="main-header">E-commerce Sentiment Analyzer</h1>',
                unsafe_allow_html=True)
    st.markdown("*Powered by the Analytics Pyramid Framework: WHAT > WHY > WHO/WHERE/WHEN*")
    st.divider()

    # Sidebar
    with st.sidebar:
        st.header("Configuration")

        # Industry selection
        industry = st.selectbox(
            "Select Industry",
            options=['general', 'fashion', 'beauty', 'electronics', 'food'],
            help="Choose industry for specialized aspect analysis"
        )

        # Data source
        st.subheader("Data Source")
        data_source = st.radio(
            "Choose data source:",
            options=["Sample Data", "Upload CSV"]
        )

        uploaded_file = None
        if data_source == "Upload CSV":
            uploaded_file = st.file_uploader(
                "Upload your reviews CSV",
                type=['csv'],
                help="CSV should have columns: review_text, date (optional), rating (optional)"
            )

        # Analysis settings
        st.subheader("Analysis Settings")
        n_topics = st.slider("Number of Topics", 3, 10, 6)
        trend_freq = st.selectbox("Trend Frequency", ['D', 'W', 'M'], index=1,
                                  format_func=lambda x: {'D': 'Daily', 'W': 'Weekly', 'M': 'Monthly'}[x])

    # Load analyzers
    sentiment_analyzer, topic_extractor, aspect_analyzer, analytics_engine = load_analyzers(industry)

    # Update topic extractor settings
    topic_extractor.n_topics = n_topics

    # Load data
    df = None
    if data_source == "Sample Data":
        df = load_sample_data()
        text_column = 'review_text'
        date_column = 'date'
        st.info("Using sample e-commerce review data (100 reviews)")
    elif uploaded_file:
        try:
            df = pd.read_csv(uploaded_file)
            st.success(f"Loaded {len(df)} reviews from uploaded file")

            # Let user select columns
            text_column = st.selectbox("Select review text column:", df.columns.tolist())
            date_cols = ['None'] + [c for c in df.columns if 'date' in c.lower() or 'time' in c.lower()]
            date_column = st.selectbox("Select date column (optional):", date_cols)
            if date_column == 'None':
                date_column = None
        except Exception as e:
            st.error(f"Error loading file: {e}")
            return

    if df is None:
        st.warning("Please upload a CSV file or use sample data to begin analysis.")

        # Show expected format
        st.subheader("Expected CSV Format")
        sample_format = pd.DataFrame({
            'review_text': ['Great product! Loved it.', 'Terrible quality, very disappointed.'],
            'date': ['2024-01-01', '2024-01-02'],
            'rating': [5, 1],
            'category': ['Electronics', 'Fashion']
        })
        st.dataframe(sample_format)
        return

    # Run analysis
    with st.spinner("Analyzing reviews..."):
        df_analyzed, keywords, topic_results, aspect_summary = analyze_reviews(
            sentiment_analyzer, topic_extractor, aspect_analyzer, df, text_column
        )

    # Create tabs for different views
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "Overview", "Sentiment Analysis", "Topics & Themes",
        "Aspect Analysis", "Trends & Insights"
    ])

    # Tab 1: Overview / Executive Summary
    with tab1:
        st.header("Executive Summary")

        # Key metrics row
        col1, col2, col3, col4 = st.columns(4)

        avg_sentiment = df_analyzed['sentiment_compound'].mean()
        total_reviews = len(df_analyzed)
        positive_pct = (df_analyzed['sentiment_label'] == 'positive').sum() / total_reviews * 100
        negative_pct = (df_analyzed['sentiment_label'] == 'negative').sum() / total_reviews * 100

        with col1:
            st.metric("Total Reviews", f"{total_reviews:,}",
                     help="Total count of reviews in the dataset. This is a simple count of all review entries processed.")
        with col2:
            st.metric("Avg Sentiment", f"{avg_sentiment:.2f}",
                     delta=f"{'Good' if avg_sentiment > 0.3 else 'Needs Attention'}",
                     help="Average sentiment score calculated using VADER (Valence Aware Dictionary and sEntiment Reasoner). "
                          "Scores range from -1 (most negative) to +1 (most positive). "
                          "Calculated as the mean of all individual review compound scores.")
        with col3:
            st.metric("Positive Reviews", f"{positive_pct:.1f}%",
                     help="Percentage of reviews classified as positive by VADER sentiment analysis. "
                          "A review is labeled 'positive' when its compound score is >= 0.05.")
        with col4:
            st.metric("Negative Reviews", f"{negative_pct:.1f}%",
                     help="Percentage of reviews classified as negative by VADER sentiment analysis. "
                          "A review is labeled 'negative' when its compound score is <= -0.05.")

        st.divider()

        # Gauges row
        col1, col2 = st.columns(2)

        with col1:
            st.plotly_chart(create_sentiment_gauge(avg_sentiment), use_container_width=True)
            st.caption("📊 **VADER Sentiment Analysis**: Uses a lexicon and rule-based model optimized for social media and e-commerce text. "
                      "Incorporates custom e-commerce terms (e.g., 'fast shipping', 'great quality').")

        with col2:
            nps_data = analytics_engine.calculate_nps_proxy(df_analyzed)
            st.plotly_chart(create_nps_gauge(nps_data), use_container_width=True)
            st.caption("📊 **NPS Proxy Formula**: ((Promoters - Detractors) / Total) × 100. "
                      "Ranges from -100 to +100. Scores >0 are favorable, >50 are excellent.")

        # NPS breakdown
        st.subheader("Customer Satisfaction Breakdown")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Promoters", f"{nps_data['promoters_pct']:.1f}%",
                     help="Customers classified as Promoters based on VADER sentiment analysis. "
                          "Threshold: compound sentiment score >= 0.5. "
                          "These customers are likely to recommend your products.")
        with col2:
            st.metric("Passives", f"{nps_data['passives_pct']:.1f}%",
                     help="Customers classified as Passives based on VADER sentiment analysis. "
                          "Threshold: compound sentiment score between -0.2 and 0.5. "
                          "These customers are satisfied but not enthusiastic.")
        with col3:
            st.metric("Detractors", f"{nps_data['detractors_pct']:.1f}%",
                     help="Customers classified as Detractors based on VADER sentiment analysis. "
                          "Threshold: compound sentiment score <= -0.2. "
                          "These customers are unlikely to recommend and may discourage others.")

        # Alerts
        if date_column and date_column in df_analyzed.columns:
            alerts = analytics_engine.get_alert_conditions(df_analyzed, date_column)
            if alerts:
                st.subheader("Alerts")
                for alert in alerts:
                    if alert['type'] == 'critical':
                        st.error(f"**CRITICAL:** {alert['message']}")
                    else:
                        st.warning(f"**WARNING:** {alert['message']}")

    # Tab 2: Sentiment Analysis (WHAT layer)
    with tab2:
        st.header("Sentiment Analysis (WHAT)")
        st.markdown("*Understanding what customers feel about your products*")

        col1, col2 = st.columns(2)

        with col1:
            st.plotly_chart(create_sentiment_distribution_chart(df_analyzed),
                          use_container_width=True)

        with col2:
            # Sentiment by rating if available
            if 'rating' in df_analyzed.columns:
                rating_sentiment = sentiment_analyzer.get_sentiment_by_rating(df_analyzed)
                if not rating_sentiment.empty:
                    fig = px.bar(
                        rating_sentiment,
                        x='rating',
                        y='avg_sentiment',
                        title="Sentiment by Rating",
                        color='avg_sentiment',
                        color_continuous_scale=['red', 'yellow', 'green']
                    )
                    st.plotly_chart(fig, use_container_width=True)

        # Sentiment by category if available
        if 'category' in df_analyzed.columns:
            st.subheader("Sentiment by Category")
            category_sentiment = analytics_engine.segment_by_category(
                df_analyzed, 'category'
            )
            if not category_sentiment.empty:
                fig = px.bar(
                    category_sentiment.head(10),
                    x='category',
                    y='avg_sentiment',
                    color='positive_pct',
                    title="Top Categories by Sentiment",
                    color_continuous_scale='RdYlGn'
                )
                st.plotly_chart(fig, use_container_width=True)

        # Sample reviews
        st.subheader("Sample Reviews by Sentiment")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Most Positive Reviews**")
            extreme = sentiment_analyzer.identify_extreme_reviews(df_analyzed, threshold=0.7)
            if not extreme['highly_positive'].empty:
                for _, row in extreme['highly_positive'].head(3).iterrows():
                    with st.expander(f"Score: {row['sentiment_compound']:.2f}"):
                        st.write(row[text_column])

        with col2:
            st.markdown("**Most Negative Reviews**")
            if not extreme['highly_negative'].empty:
                for _, row in extreme['highly_negative'].head(3).iterrows():
                    with st.expander(f"Score: {row['sentiment_compound']:.2f}"):
                        st.write(row[text_column])

    # Tab 3: Topics & Themes
    with tab3:
        st.header("Topics & Themes")
        st.markdown("*Discovering what customers are talking about*")

        # Word cloud
        st.subheader("Key Terms Word Cloud")
        st.caption("📊 **Word Frequency Analysis**: Word sizes represent relative frequency in the review corpus. "
                  "Generated using the WordCloud library with TF (Term Frequency) weighting.")
        word_freq = topic_extractor.get_word_frequencies(df_analyzed[text_column].tolist())
        if word_freq:
            fig = create_wordcloud(word_freq)
            if fig:
                st.pyplot(fig)

        # Top keywords
        col1, col2 = st.columns(2)

        with col1:
            st.subheader("Top Keywords")
            st.caption("📊 **TF-IDF (Term Frequency-Inverse Document Frequency)**: Identifies important words by balancing "
                      "frequency with uniqueness. Higher scores indicate more distinctive terms. Uses scikit-learn TfidfVectorizer.")
            keywords_df = pd.DataFrame(keywords[:15], columns=['Keyword', 'Score'])
            fig = px.bar(
                keywords_df,
                x='Score',
                y='Keyword',
                orientation='h',
                title="Top Keywords by TF-IDF Score"
            )
            fig.update_layout(yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.subheader("Top Bigrams")
            st.caption("📊 **N-gram Analysis**: Extracts common 2-word phrases using CountVectorizer. "
                      "Helps identify recurring themes and product mentions that single words might miss.")
            bigrams = topic_extractor.get_ngrams(df_analyzed[text_column].tolist(), n=2, top_k=15)
            if bigrams:
                bigrams_df = pd.DataFrame(bigrams, columns=['Bigram', 'Count'])
                fig = px.bar(
                    bigrams_df,
                    x='Count',
                    y='Bigram',
                    orientation='h',
                    title="Top 2-word Phrases"
                )
                fig.update_layout(yaxis={'categoryorder': 'total ascending'})
                st.plotly_chart(fig, use_container_width=True)

        # Topics
        st.subheader("Discovered Topics")
        st.caption("📊 **NMF Topic Modeling (Non-negative Matrix Factorization)**: Automatically discovers hidden themes "
                  "by decomposing the TF-IDF document-term matrix. Each topic is characterized by its most representative words.")
        if 'topics' in topic_results:
            topic_summary = topic_extractor.get_topic_summary()
            if not topic_summary.empty:
                st.dataframe(
                    topic_summary,
                    column_config={
                        'topic': 'Topic',
                        'top_words': 'Key Words',
                        'document_count': 'Reviews'
                    },
                    hide_index=True,
                    use_container_width=True
                )

    # Tab 4: Aspect Analysis (WHY layer)
    with tab4:
        st.header("Aspect-Based Analysis (WHY)")
        st.markdown("*Understanding why customers feel the way they do*")
        st.caption("📊 **Aspect-Based Sentiment Analysis (ABSA)**: Uses keyword matching with industry-specific lexicons "
                  "to identify product aspects (e.g., quality, shipping, service). Each aspect's sentiment is calculated "
                  "using VADER on sentences containing aspect keywords.")

        # Aspect sentiment chart
        if not aspect_summary.empty:
            col1, col2 = st.columns([2, 1])

            with col1:
                fig = create_aspect_chart(aspect_summary)
                if fig:
                    st.plotly_chart(fig, use_container_width=True)

            with col2:
                st.subheader("Aspect Details")
                st.dataframe(
                    aspect_summary[['aspect', 'reviews_with_aspect', 'positive_pct', 'negative_pct']].round(1),
                    column_config={
                        'aspect': 'Aspect',
                        'reviews_with_aspect': 'Mentions',
                        'positive_pct': 'Positive %',
                        'negative_pct': 'Negative %'
                    },
                    hide_index=True
                )

        # Pain points
        st.subheader("Key Pain Points")
        pain_points = aspect_analyzer.identify_pain_points(df_analyzed, text_column)

        if pain_points:
            for aspect_name, data in list(pain_points.items())[:5]:
                with st.expander(f"{data['label']} - {data['negative_mention_count']} negative mentions (avg: {data['avg_negative_score']:.2f})"):
                    for example in data['example_complaints'][:3]:
                        st.markdown(f"- *\"{example['text']}\"* (score: {example['score']:.2f})")
        else:
            st.success("No significant pain points identified!")

        # Key Driver Analysis
        st.subheader("Key Driver Analysis")
        st.caption("📊 **Impact-Sentiment Quadrant**: Impact Score = mention_count × |avg_sentiment|. "
                  "Aspects are prioritized into quadrants: Fix Now (high impact, negative), Maintain (high impact, positive), "
                  "Monitor (low impact, negative), Deprioritize (low impact, positive).")
        driver_df = analytics_engine.calculate_key_drivers(df_analyzed)

        if not driver_df.empty:
            # Priority quadrant visualization
            fig = px.scatter(
                driver_df,
                x='avg_sentiment',
                y='impact_score',
                size='mention_count',
                color='priority',
                hover_data=['aspect'],
                title="Key Driver Quadrant Analysis",
                color_discrete_map={
                    'fix_now': '#ff6b6b',
                    'monitor': '#ffd93d',
                    'maintain': '#6bcb77',
                    'deprioritize': '#cccccc'
                }
            )
            fig.add_vline(x=0, line_dash="dash", line_color="gray")
            fig.add_hline(y=driver_df['impact_score'].median(), line_dash="dash", line_color="gray")
            st.plotly_chart(fig, use_container_width=True)

            # Priority recommendations
            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**Fix Now (High Impact, Negative)**")
                fix_now = driver_df[driver_df['priority'] == 'fix_now']
                if not fix_now.empty:
                    for _, row in fix_now.iterrows():
                        st.error(f"- {row['aspect']}: {row['avg_sentiment']:.2f}")
                else:
                    st.success("No critical issues!")

            with col2:
                st.markdown("**Maintain (High Impact, Positive)**")
                maintain = driver_df[driver_df['priority'] == 'maintain']
                if not maintain.empty:
                    for _, row in maintain.iterrows():
                        st.success(f"- {row['aspect']}: {row['avg_sentiment']:.2f}")

    # Tab 5: Trends & Insights (WHEN layer)
    with tab5:
        st.header("Trends & Insights (WHEN)")
        st.markdown("*Tracking sentiment changes over time*")

        if date_column and date_column in df_analyzed.columns:
            # Sentiment trend
            trends = analytics_engine.calculate_sentiment_trends(
                df_analyzed, date_column, freq=trend_freq
            )

            if not trends.empty:
                st.plotly_chart(create_trend_chart(trends, date_column), use_container_width=True)

                # Trend statistics
                col1, col2, col3 = st.columns(3)

                with col1:
                    recent_sentiment = trends['avg_sentiment'].iloc[-1] if len(trends) > 0 else 0
                    st.metric("Latest Period Sentiment", f"{recent_sentiment:.2f}",
                             help="Average VADER compound sentiment score for the most recent time period. "
                                  "Aggregated using pandas time-series groupby on the selected frequency (Daily/Weekly/Monthly).")

                with col2:
                    if len(trends) > 1:
                        change = trends['wow_change'].iloc[-1]
                        st.metric("Period-over-Period Change", f"{change:.3f}",
                                 delta=f"{'Up' if change > 0 else 'Down'}",
                                 help="Change in average sentiment compared to the previous period. "
                                      "Calculated as: current_period_avg - previous_period_avg. "
                                      "Uses pandas diff() for period-over-period comparison.")

                with col3:
                    avg_volume = trends['review_count'].mean()
                    st.metric("Avg Reviews per Period", f"{avg_volume:.0f}",
                             help="Average number of reviews received per time period. "
                                  "Calculated using pandas groupby count aggregation across all periods.")

                # Anomaly detection
                st.subheader("Anomaly Detection")
                st.caption("📊 **Z-Score Statistical Method**: Identifies periods where sentiment deviates significantly from the mean. "
                          "Threshold: |z-score| > 2.0 (approximately 2 standard deviations). "
                          "Positive spikes indicate unusually positive periods; negative spikes indicate sentiment drops.")
                anomalies = analytics_engine.detect_sentiment_anomalies(
                    df_analyzed, date_column
                )

                anomaly_periods = anomalies[anomalies['is_anomaly']]
                if not anomaly_periods.empty:
                    st.warning(f"Detected {len(anomaly_periods)} anomalous periods:")
                    for _, row in anomaly_periods.iterrows():
                        st.markdown(f"- **{row[date_column]}**: {row['anomaly_type']} (z-score: {row['z_score']:.2f})")
                else:
                    st.success("No sentiment anomalies detected!")

                # Aspect trends over time
                if not aspect_summary.empty:
                    st.subheader("Aspect Trends Over Time")
                    aspect_trends = aspect_analyzer.get_aspect_trends(
                        df_analyzed, text_column, date_column, freq=trend_freq
                    )

                    if not aspect_trends.empty:
                        fig = px.line(
                            aspect_trends,
                            x='period',
                            y='avg_sentiment',
                            color='aspect',
                            title="Aspect Sentiment Over Time"
                        )
                        st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Upload data with a date column to see trend analysis.")

        # Data explorer
        st.subheader("Data Explorer")

        # Filters
        col1, col2, col3 = st.columns(3)

        with col1:
            sentiment_filter = st.multiselect(
                "Filter by Sentiment",
                options=['positive', 'neutral', 'negative'],
                default=['positive', 'neutral', 'negative']
            )

        with col2:
            if 'category' in df_analyzed.columns:
                categories = ['All'] + df_analyzed['category'].unique().tolist()
                category_filter = st.selectbox("Filter by Category", categories)

        with col3:
            if 'rating' in df_analyzed.columns:
                ratings = ['All'] + sorted(df_analyzed['rating'].unique().tolist())
                rating_filter = st.selectbox("Filter by Rating", ratings)

        # Apply filters
        filtered_df = df_analyzed[df_analyzed['sentiment_label'].isin(sentiment_filter)]

        if 'category' in df_analyzed.columns and category_filter != 'All':
            filtered_df = filtered_df[filtered_df['category'] == category_filter]

        if 'rating' in df_analyzed.columns and rating_filter != 'All':
            filtered_df = filtered_df[filtered_df['rating'] == rating_filter]

        st.dataframe(
            filtered_df[[text_column, 'sentiment_label', 'sentiment_compound'] +
                       ([date_column] if date_column and date_column in df_analyzed.columns else []) +
                       (['rating'] if 'rating' in df_analyzed.columns else []) +
                       (['category'] if 'category' in df_analyzed.columns else [])].head(50),
            use_container_width=True
        )

        # Download analyzed data
        st.subheader("Export Results")
        csv = df_analyzed.to_csv(index=False)
        st.download_button(
            label="Download Analyzed Data (CSV)",
            data=csv,
            file_name="sentiment_analysis_results.csv",
            mime="text/csv"
        )


if __name__ == "__main__":
    main()

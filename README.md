# E-commerce Sentiment Analyzer

A comprehensive sentiment analysis dashboard for retail and e-commerce businesses, built with Streamlit and Python NLP libraries.

## Features

### Analytics Pyramid Framework

This MVP implements the Analytics Pyramid Framework for sentiment analysis:

```
                    ┌─────────────────┐
                    │      WHAT?      │  ← Sentiment Classification
                    │   (Detection)   │     Topic/Theme Extraction
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │      WHY?       │  ← Aspect-Based Sentiment (ABSA)
                    │    (Drivers)    │     Key Driver Analysis
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     WHEN?       │  ← Time Series & Trend Detection
                    │    (Trends)     │     Anomaly Detection
                    └─────────────────┘
```

### Core Capabilities

- **Sentiment Classification**: VADER-based sentiment analysis with e-commerce-specific lexicon
- **Topic Extraction**: TF-IDF and NMF-based topic modeling to identify key themes
- **Aspect-Based Analysis**: Identify sentiment for specific aspects (quality, shipping, service, etc.)
- **Trend Analysis**: Track sentiment changes over time with anomaly detection
- **Key Driver Analysis**: Identify which aspects most impact customer satisfaction
- **NPS Proxy Calculation**: Estimate Net Promoter Score from sentiment data

### Industry-Specific Support

Pre-configured aspect definitions for:
- General retail
- Fashion & apparel
- Beauty & cosmetics
- Electronics
- Food & consumables

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sentiment-analyzer
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Download NLTK data (first run only):
```python
import nltk
nltk.download('vader_lexicon')
```

## Usage

### Running the Streamlit App

```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`

### Using the Modules Directly

```python
from src.sentiment import SentimentAnalyzer
from src.aspects import AspectAnalyzer
from src.topics import TopicExtractor
from src.analytics import AnalyticsEngine

# Initialize analyzers
sentiment_analyzer = SentimentAnalyzer()
aspect_analyzer = AspectAnalyzer(industry='fashion')

# Analyze a single review
result = sentiment_analyzer.analyze_text("Great product! Fast shipping and excellent quality.")
print(f"Sentiment: {result['sentiment']} (score: {result['compound']})")

# Analyze aspects
aspects = aspect_analyzer.analyze_aspects("Love the fit but shipping took too long")
for aspect, data in aspects['aspects'].items():
    print(f"{data['label']}: {data['sentiment']}")
```

### Analyzing a CSV File

```python
import pandas as pd
from src.sentiment import SentimentAnalyzer

# Load data
df = pd.read_csv('your_reviews.csv')

# Analyze
analyzer = SentimentAnalyzer()
df_analyzed = analyzer.analyze_dataframe(df, text_column='review_text')

# Get distribution
distribution = analyzer.get_sentiment_distribution(df_analyzed)
print(f"Positive: {distribution['percentages']['positive']}%")
```

## Data Format

### Required CSV Columns

| Column | Required | Description |
|--------|----------|-------------|
| `review_text` | Yes | The review/feedback text |
| `date` | No | Review date (for trend analysis) |
| `rating` | No | Star rating (1-5) |
| `category` | No | Product category |

### Sample Data

Sample e-commerce review data is included in `data/sample_reviews.csv` for testing.

## Dashboard Sections

### 1. Overview
- Key metrics (total reviews, avg sentiment, positive/negative percentages)
- NPS proxy gauge
- Alert conditions

### 2. Sentiment Analysis (WHAT)
- Sentiment distribution pie chart
- Sentiment by rating/category
- Sample positive and negative reviews

### 3. Topics & Themes
- Word cloud visualization
- Top keywords and bigrams
- Discovered topic clusters

### 4. Aspect Analysis (WHY)
- Aspect sentiment scores
- Pain point identification
- Key driver quadrant analysis

### 5. Trends & Insights (WHEN)
- Sentiment trend over time
- Moving averages
- Anomaly detection
- Aspect trends

## Project Structure

```
sentiment-analyzer/
├── app.py                    # Main Streamlit application
├── requirements.txt          # Python dependencies
├── README.md                 # This file
├── src/
│   ├── __init__.py
│   ├── sentiment.py          # Sentiment analysis (VADER)
│   ├── topics.py             # Topic extraction (TF-IDF, NMF)
│   ├── aspects.py            # Aspect-based sentiment
│   ├── analytics.py          # Trend & driver analysis
│   └── utils.py              # Helper functions
└── data/
    └── sample_reviews.csv    # Sample dataset
```

## Technology Stack

- **Frontend**: Streamlit
- **Sentiment Analysis**: VADER (vaderSentiment)
- **Topic Modeling**: scikit-learn (TF-IDF, NMF)
- **Data Processing**: pandas, numpy
- **Visualization**: Plotly, WordCloud, Matplotlib

## Future Enhancements

For a production-ready version, consider:

1. **Enhanced NLP**: Fine-tuned BERT/RoBERTa models for higher accuracy
2. **BERTopic**: Advanced neural topic modeling
3. **Real-time Integration**: Shopify, social media, support ticket APIs
4. **Database**: PostgreSQL or MongoDB for data persistence
5. **Authentication**: User accounts and multi-tenant support
6. **Alerting**: Email/Slack notifications for sentiment anomalies
7. **Caching**: Redis for improved performance

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

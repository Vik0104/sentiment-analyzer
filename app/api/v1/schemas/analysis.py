"""
Pydantic schemas for analysis API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class OverviewMetrics(BaseModel):
    """Overview metrics from sentiment analysis."""
    avg_sentiment: float = Field(..., ge=-1, le=1)
    positive_pct: float = Field(..., ge=0, le=100)
    negative_pct: float = Field(..., ge=0, le=100)
    neutral_pct: float = Field(..., ge=0, le=100)
    distribution: dict[str, int]


class NPSMetrics(BaseModel):
    """NPS proxy metrics."""
    nps_proxy: float
    promoters: int
    promoters_pct: float
    passives: int
    passives_pct: float
    detractors: int
    detractors_pct: float
    total: int


class KeywordItem(BaseModel):
    """Keyword with TF-IDF score."""
    keyword: str
    score: float


class BigramItem(BaseModel):
    """Bigram phrase with count."""
    phrase: str
    count: int


class TopicCluster(BaseModel):
    """Topic cluster from NMF/LDA."""
    name: str
    words: list[str]
    document_count: int


class TopicsResult(BaseModel):
    """Topic extraction results."""
    keywords: list[KeywordItem]
    bigrams: list[BigramItem]
    clusters: list[TopicCluster]


class AspectItem(BaseModel):
    """Individual aspect analysis result."""
    aspect: str
    aspect_key: str
    avg_sentiment: float
    mentions: int
    reviews_with_aspect: int
    positive_pct: float
    negative_pct: float


class PainPointItem(BaseModel):
    """Pain point identified from negative aspects."""
    aspect: str
    negative_mentions: int
    avg_score: float
    examples: list[str]


class KeyDriverItem(BaseModel):
    """Key driver analysis result."""
    aspect: str
    avg_sentiment: float
    mention_count: int
    impact_score: float
    priority: str  # 'fix_now', 'maintain', 'monitor', 'deprioritize'


class TrendsResult(BaseModel):
    """Sentiment trends over time."""
    periods: list[str]
    sentiment: list[float]
    moving_avg: list[float]
    volume: list[int]


class AnomalyItem(BaseModel):
    """Detected sentiment anomaly."""
    period: str
    type: str  # 'positive_spike' or 'negative_spike'
    z_score: float


class AlertItem(BaseModel):
    """Alert condition."""
    type: str  # 'critical' or 'warning'
    message: str
    metric: str
    value: float


class SampleReview(BaseModel):
    """Sample review with sentiment score."""
    text: str
    score: float


class SampleReviews(BaseModel):
    """Sample positive and negative reviews."""
    positive: list[SampleReview]
    negative: list[SampleReview]


class FullAnalysisResponse(BaseModel):
    """Complete analysis response."""
    shop_domain: Optional[str] = None
    analysis_date: datetime = Field(default_factory=datetime.utcnow)
    review_count: int
    overview: OverviewMetrics
    nps: NPSMetrics
    topics: Optional[TopicsResult] = None
    aspects: Optional[list[AspectItem]] = None
    pain_points: Optional[list[PainPointItem]] = None
    key_drivers: Optional[list[KeyDriverItem]] = None
    trends: Optional[TrendsResult] = None
    anomalies: Optional[list[AnomalyItem]] = None
    alerts: list[AlertItem] = []
    sample_reviews: Optional[SampleReviews] = None


class SentimentOnlyResponse(BaseModel):
    """Sentiment-only analysis response (for free tier)."""
    shop_domain: Optional[str] = None
    analysis_date: datetime = Field(default_factory=datetime.utcnow)
    review_count: int
    overview: OverviewMetrics
    nps: NPSMetrics
    alerts: list[AlertItem] = []


class AnalysisRequest(BaseModel):
    """Request to run analysis."""
    industry: str = Field(default='general')
    include_topics: bool = True
    include_aspects: bool = True
    include_trends: bool = True
    force_refresh: bool = False


class ExportFormat(BaseModel):
    """Export format options."""
    format: str = Field(default='json', pattern='^(json|csv)$')

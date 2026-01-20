"""
Analysis API routes for sentiment analysis.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime
import io
import csv
import json

from app.core.dependencies import get_current_user, require_tier
from app.core.config import get_settings
from app.services.judgeme import judgeme_service
from app.services.analysis import get_analysis_service
from app.db.supabase import get_db
from app.api.v1.schemas.analysis import (
    FullAnalysisResponse,
    SentimentOnlyResponse,
    AnalysisRequest
)

router = APIRouter()
settings = get_settings()


async def _fetch_and_analyze(
    user: dict,
    industry: str = 'general',
    include_topics: bool = True,
    include_aspects: bool = True,
    include_trends: bool = True,
    force_refresh: bool = False
) -> dict:
    """
    Helper to fetch reviews and run analysis.

    Args:
        user: Current user dict from JWT
        industry: Industry for aspect analysis
        include_topics: Whether to include topic analysis
        include_aspects: Whether to include aspect analysis
        include_trends: Whether to include trend analysis
        force_refresh: Whether to bypass cache

    Returns:
        Analysis results dictionary
    """
    db = get_db()
    analysis_service = get_analysis_service()

    user_id = user['sub']
    shop_domain = user.get('shop_domain', '')
    tier = user.get('tier', 'free')

    # Check cache first (unless force refresh)
    if not force_refresh:
        analysis_type = 'full' if include_topics and include_aspects else 'sentiment_only'
        cached = await db.get_cached_analysis(user_id, analysis_type)
        if cached:
            return cached['results']

    # Get subscription to check limits
    subscription = await db.get_subscription(user_id)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No subscription found"
        )

    reviews_limit = subscription.get('reviews_limit', settings.free_reviews_limit)
    reviews_used = subscription.get('reviews_used', 0)

    if reviews_used >= reviews_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Monthly review limit reached ({reviews_limit}). Upgrade to analyze more reviews."
        )

    # Get user's decrypted Judge.me token
    user_record = await db.get_user_by_id(user_id)
    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    access_token = db.get_decrypted_token(user_record)

    # Fetch reviews from Judge.me
    try:
        reviews = await judgeme_service.fetch_all_reviews(
            access_token=access_token,
            shop_domain=shop_domain,
            max_reviews=min(reviews_limit - reviews_used, 1000)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch reviews from Judge.me: {str(e)}"
        )

    if not reviews:
        return {
            "review_count": 0,
            "overview": {
                "avg_sentiment": 0,
                "positive_pct": 0,
                "negative_pct": 0,
                "neutral_pct": 0,
                "distribution": {}
            },
            "nps": {
                "nps_proxy": 0,
                "promoters": 0,
                "promoters_pct": 0,
                "passives": 0,
                "passives_pct": 0,
                "detractors": 0,
                "detractors_pct": 0,
                "total": 0
            },
            "alerts": []
        }

    # Normalize reviews
    normalized_reviews = judgeme_service.normalize_reviews(reviews)

    # Run analysis
    results = await analysis_service.run_full_analysis(
        reviews=normalized_reviews,
        industry=industry,
        include_topics=include_topics,
        include_aspects=include_aspects,
        include_trends=include_trends
    )

    # Add metadata
    results['shop_domain'] = shop_domain
    results['analysis_date'] = datetime.utcnow().isoformat()

    # Update reviews used counter
    await db.increment_reviews_used(user_id, len(reviews))

    # Cache results
    analysis_type = 'full' if include_topics and include_aspects else 'sentiment_only'
    await db.save_analysis_result(
        user_id=user_id,
        results=results,
        analysis_type=analysis_type,
        review_count=len(reviews),
        expires_hours=24 if tier == 'free' else 168  # 1 day for free, 7 days for paid
    )

    return results


@router.get("/dashboard", response_model=FullAnalysisResponse)
async def get_dashboard(
    industry: str = Query(default='general'),
    force_refresh: bool = Query(default=False),
    current_user: dict = Depends(get_current_user)
):
    """
    Get full dashboard analysis data.

    Returns complete sentiment analysis including overview, topics,
    aspects, trends, and alerts.
    """
    results = await _fetch_and_analyze(
        user=current_user,
        industry=industry,
        include_topics=True,
        include_aspects=True,
        include_trends=True,
        force_refresh=force_refresh
    )

    return results


@router.get("/sentiment", response_model=SentimentOnlyResponse)
async def get_sentiment_only(
    force_refresh: bool = Query(default=False),
    current_user: dict = Depends(get_current_user)
):
    """
    Get sentiment analysis only (faster, for free tier).

    Returns basic sentiment metrics without topics or aspects.
    """
    results = await _fetch_and_analyze(
        user=current_user,
        include_topics=False,
        include_aspects=False,
        include_trends=False,
        force_refresh=force_refresh
    )

    return SentimentOnlyResponse(
        shop_domain=results.get('shop_domain'),
        analysis_date=results.get('analysis_date', datetime.utcnow()),
        review_count=results['review_count'],
        overview=results['overview'],
        nps=results['nps'],
        alerts=results.get('alerts', [])
    )


@router.get("/aspects")
async def get_aspects(
    industry: str = Query(default='general'),
    force_refresh: bool = Query(default=False),
    current_user: dict = Depends(require_tier('starter'))
):
    """
    Get aspect-based sentiment analysis.

    Requires Starter tier or higher.
    """
    results = await _fetch_and_analyze(
        user=current_user,
        industry=industry,
        include_topics=False,
        include_aspects=True,
        include_trends=False,
        force_refresh=force_refresh
    )

    return {
        "shop_domain": results.get('shop_domain'),
        "review_count": results['review_count'],
        "aspects": results.get('aspects', []),
        "pain_points": results.get('pain_points', []),
        "key_drivers": results.get('key_drivers', [])
    }


@router.get("/topics")
async def get_topics(
    force_refresh: bool = Query(default=False),
    current_user: dict = Depends(require_tier('starter'))
):
    """
    Get topic extraction results.

    Requires Starter tier or higher.
    """
    results = await _fetch_and_analyze(
        user=current_user,
        include_topics=True,
        include_aspects=False,
        include_trends=False,
        force_refresh=force_refresh
    )

    return {
        "shop_domain": results.get('shop_domain'),
        "review_count": results['review_count'],
        "topics": results.get('topics', {})
    }


@router.get("/trends")
async def get_trends(
    force_refresh: bool = Query(default=False),
    current_user: dict = Depends(require_tier('starter'))
):
    """
    Get sentiment trends over time.

    Requires Starter tier or higher.
    """
    results = await _fetch_and_analyze(
        user=current_user,
        include_topics=False,
        include_aspects=False,
        include_trends=True,
        force_refresh=force_refresh
    )

    return {
        "shop_domain": results.get('shop_domain'),
        "review_count": results['review_count'],
        "trends": results.get('trends'),
        "anomalies": results.get('anomalies', [])
    }


@router.post("/refresh")
async def refresh_analysis(
    request: AnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger a fresh analysis (bypasses cache).
    """
    results = await _fetch_and_analyze(
        user=current_user,
        industry=request.industry,
        include_topics=request.include_topics,
        include_aspects=request.include_aspects,
        include_trends=request.include_trends,
        force_refresh=True
    )

    return results


@router.get("/export")
async def export_analysis(
    format: str = Query(default='json', pattern='^(json|csv)$'),
    current_user: dict = Depends(require_tier('pro'))
):
    """
    Export analysis results.

    Requires Pro tier.
    """
    results = await _fetch_and_analyze(
        user=current_user,
        include_topics=True,
        include_aspects=True,
        include_trends=True,
        force_refresh=False
    )

    if format == 'json':
        return results

    # CSV export
    output = io.StringIO()
    writer = csv.writer(output)

    # Write overview
    writer.writerow(['Metric', 'Value'])
    writer.writerow(['Total Reviews', results['review_count']])
    writer.writerow(['Average Sentiment', results['overview']['avg_sentiment']])
    writer.writerow(['Positive %', results['overview']['positive_pct']])
    writer.writerow(['Negative %', results['overview']['negative_pct']])
    writer.writerow(['NPS Proxy', results['nps']['nps_proxy']])
    writer.writerow([])

    # Write aspects
    if results.get('aspects'):
        writer.writerow(['Aspect', 'Avg Sentiment', 'Mentions', 'Positive %', 'Negative %'])
        for aspect in results['aspects']:
            writer.writerow([
                aspect['aspect'],
                aspect['avg_sentiment'],
                aspect['mentions'],
                aspect['positive_pct'],
                aspect['negative_pct']
            ])
        writer.writerow([])

    # Write keywords
    if results.get('topics', {}).get('keywords'):
        writer.writerow(['Keyword', 'Score'])
        for kw in results['topics']['keywords']:
            writer.writerow([kw['keyword'], kw['score']])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sentiment_analysis.csv"}
    )


@router.get("/industries")
async def get_available_industries():
    """
    Get list of available industry configurations for aspect analysis.
    """
    analysis_service = get_analysis_service()
    return {"industries": analysis_service.get_available_industries()}

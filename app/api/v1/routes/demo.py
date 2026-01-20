"""
Demo routes for testing the analytics dashboard without authentication.
"""

from fastapi import APIRouter
from app.services.demo_data import demo_data_generator

router = APIRouter()


@router.get("/dashboard")
async def get_demo_dashboard():
    """
    Get demo dashboard data with sample reviews and analytics.
    No authentication required.
    """
    return demo_data_generator.generate_demo_dashboard()


@router.get("/sentiment")
async def get_demo_sentiment():
    """Get demo sentiment analysis data."""
    dashboard = demo_data_generator.generate_demo_dashboard()
    return {
        "sentiment": dashboard["sentiment"],
        "sentiment_over_time": dashboard["sentiment_over_time"],
        "is_demo": True,
    }


@router.get("/topics")
async def get_demo_topics():
    """Get demo topic extraction data."""
    dashboard = demo_data_generator.generate_demo_dashboard()
    return {
        "topics": dashboard["topics"],
        "keywords": dashboard["keywords"],
        "is_demo": True,
    }


@router.get("/aspects")
async def get_demo_aspects():
    """Get demo aspect analysis data."""
    dashboard = demo_data_generator.generate_demo_dashboard()
    return {
        "aspects": dashboard["aspects"],
        "is_demo": True,
    }


@router.get("/trends")
async def get_demo_trends():
    """Get demo trends data."""
    dashboard = demo_data_generator.generate_demo_dashboard()
    return {
        "sentiment_over_time": dashboard["sentiment_over_time"],
        "rating_distribution": dashboard["rating_distribution"],
        "is_demo": True,
    }

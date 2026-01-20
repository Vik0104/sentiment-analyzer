"""
Sentiment Analyzer API - FastAPI Application Entry Point

A Judge.me integrated sentiment analysis SaaS for e-commerce businesses.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.services.analysis import init_analysis_service
from app.api.v1.routes import auth, analysis, billing
from app.api.webhooks import stripe as stripe_webhooks

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Initializes NLP models at startup to avoid cold start latency.
    """
    # Startup: Load NLP models
    print("Initializing NLP analysis service...")
    app.state.analysis_service = init_analysis_service()
    print("NLP models loaded successfully")

    yield

    # Shutdown: Cleanup if needed
    print("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    ## Sentiment Analyzer API for Judge.me

    AI-powered sentiment analysis for e-commerce product reviews.

    ### Features
    - **Sentiment Classification**: Positive, negative, neutral scoring using VADER
    - **Topic Extraction**: Discover themes using TF-IDF and NMF
    - **Aspect Analysis**: Industry-specific sentiment by product aspect
    - **Trend Detection**: Track sentiment over time with anomaly detection
    - **Key Driver Analysis**: Identify what impacts customer satisfaction

    ### Authentication
    Connect your Judge.me account via OAuth to analyze your reviews.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

app.include_router(
    analysis.router,
    prefix="/api/v1/analysis",
    tags=["Analysis"]
)

app.include_router(
    billing.router,
    prefix="/api/v1/billing",
    tags=["Billing"]
)

app.include_router(
    stripe_webhooks.router,
    prefix="/webhooks",
    tags=["Webhooks"]
)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for deployment monitoring.

    Returns service status and version.
    """
    return {
        "status": "healthy",
        "version": settings.app_version,
        "service": "sentiment-analyzer-api"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

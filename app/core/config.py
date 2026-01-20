"""
Application configuration using Pydantic settings.
Loads environment variables with validation.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Sentiment Analyzer API"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = Field(..., description="Secret key for JWT encoding")

    # Server
    host: str = "0.0.0.0"
    port: int = 8080

    # Judge.me OAuth
    judgeme_client_id: str = Field(..., description="Judge.me OAuth client ID")
    judgeme_client_secret: str = Field(..., description="Judge.me OAuth client secret")
    judgeme_redirect_uri: str = Field(..., description="OAuth callback URL")
    judgeme_api_base: str = "https://judge.me/api/v1"
    judgeme_auth_url: str = "https://app.judge.me/oauth/authorize"
    judgeme_token_url: str = "https://judge.me/oauth/token"

    # Supabase
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_key: str = Field(..., description="Supabase anon/service key")

    # Stripe
    stripe_secret_key: str = Field(..., description="Stripe secret key")
    stripe_webhook_secret: str = Field(..., description="Stripe webhook signing secret")
    stripe_price_starter: str = Field(default="", description="Stripe Price ID for Starter plan")
    stripe_price_pro: str = Field(default="", description="Stripe Price ID for Pro plan")

    # Redis (optional, for caching)
    redis_url: Optional[str] = None

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "https://localhost:3000"]

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Analysis limits by plan
    free_reviews_limit: int = 100
    starter_reviews_limit: int = 1000
    pro_reviews_limit: int = 10000

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

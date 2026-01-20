"""
Pydantic schemas for user and auth endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema."""
    shop_domain: str
    email: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema."""
    id: str
    shop_domain: str
    email: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    subscription_tier: str = 'free'
    reviews_limit: int
    reviews_used: int


class TokenResponse(BaseModel):
    """OAuth token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthorizationURLResponse(BaseModel):
    """Authorization URL response."""
    authorization_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request parameters."""
    code: str
    state: str


class LoginResponse(BaseModel):
    """Login response with JWT token."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

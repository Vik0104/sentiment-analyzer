"""
Pydantic schemas for billing endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SubscriptionStatus(BaseModel):
    """Current subscription status."""
    plan_tier: str
    status: str
    reviews_limit: int
    reviews_used: int
    reviews_remaining: int
    billing_period_start: Optional[datetime] = None
    billing_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False


class CheckoutRequest(BaseModel):
    """Request to create checkout session."""
    plan: str = Field(..., pattern='^(starter|pro)$')
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    """Checkout session response."""
    checkout_url: str


class PortalRequest(BaseModel):
    """Request to create customer portal session."""
    return_url: str


class PortalResponse(BaseModel):
    """Customer portal session response."""
    portal_url: str


class PlanInfo(BaseModel):
    """Information about a subscription plan."""
    name: str
    tier: str
    price_monthly: float
    reviews_limit: int
    features: list[str]


class PlansResponse(BaseModel):
    """Available plans response."""
    plans: list[PlanInfo]

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
    """Request to create Razorpay subscription checkout."""
    plan: str = Field(..., pattern='^(starter|pro)$')
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    """Razorpay checkout response with hosted payment page URL."""
    checkout_url: str


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

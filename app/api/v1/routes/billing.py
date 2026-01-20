"""
Billing routes for Stripe subscription management.
"""

from fastapi import APIRouter, HTTPException, status, Depends

from app.core.dependencies import get_current_user
from app.core.config import get_settings
from app.services.stripe_service import stripe_service
from app.db.supabase import get_db
from app.api.v1.schemas.billing import (
    SubscriptionStatus,
    CheckoutRequest,
    CheckoutResponse,
    PortalRequest,
    PortalResponse,
    PlansResponse,
    PlanInfo
)

router = APIRouter()
settings = get_settings()


@router.get("/status", response_model=SubscriptionStatus)
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """
    Get current subscription status including usage.
    """
    db = get_db()
    user_id = current_user['sub']

    subscription = await db.get_subscription(user_id)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    reviews_remaining = max(0, subscription['reviews_limit'] - subscription['reviews_used'])

    return SubscriptionStatus(
        plan_tier=subscription['plan_tier'],
        status=subscription['status'],
        reviews_limit=subscription['reviews_limit'],
        reviews_used=subscription['reviews_used'],
        reviews_remaining=reviews_remaining,
        billing_period_start=subscription.get('billing_period_start'),
        billing_period_end=subscription.get('billing_period_end'),
        cancel_at_period_end=subscription.get('cancel_at_period_end', False)
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Stripe Checkout session for subscription upgrade.
    """
    db = get_db()
    user_id = current_user['sub']

    user = await db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    try:
        checkout_url = await stripe_service.create_checkout_session(
            user_id=user_id,
            user_email=user.get('email', ''),
            plan=request.plan,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )

        return CheckoutResponse(checkout_url=checkout_url)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    request: PortalRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Stripe Customer Portal session for subscription management.
    """
    db = get_db()
    user_id = current_user['sub']

    subscription = await db.get_subscription(user_id)
    if not subscription or not subscription.get('stripe_customer_id'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer found. Please subscribe first."
        )

    try:
        portal_url = await stripe_service.create_customer_portal_session(
            customer_id=subscription['stripe_customer_id'],
            return_url=request.return_url
        )

        return PortalResponse(portal_url=portal_url)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create portal session: {str(e)}"
        )


@router.get("/plans", response_model=PlansResponse)
async def get_available_plans():
    """
    Get list of available subscription plans.
    """
    plans = [
        PlanInfo(
            name="Free",
            tier="free",
            price_monthly=0,
            reviews_limit=settings.free_reviews_limit,
            features=[
                "Basic sentiment analysis",
                "Up to 100 reviews/month",
                "7-day analysis history",
                "NPS proxy score"
            ]
        ),
        PlanInfo(
            name="Starter",
            tier="starter",
            price_monthly=19,
            reviews_limit=settings.starter_reviews_limit,
            features=[
                "Full sentiment analysis",
                "Up to 1,000 reviews/month",
                "30-day analysis history",
                "Topic extraction",
                "Aspect-based analysis",
                "Trend analysis",
                "Pain point identification"
            ]
        ),
        PlanInfo(
            name="Pro",
            tier="pro",
            price_monthly=49,
            reviews_limit=settings.pro_reviews_limit,
            features=[
                "Everything in Starter",
                "Up to 10,000 reviews/month",
                "Unlimited analysis history",
                "CSV/JSON export",
                "API access",
                "Priority processing",
                "Email support"
            ]
        )
    ]

    return PlansResponse(plans=plans)


@router.post("/cancel")
async def cancel_subscription(
    at_period_end: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel current subscription.

    By default, cancels at the end of the billing period.
    """
    db = get_db()
    user_id = current_user['sub']

    subscription = await db.get_subscription(user_id)
    if not subscription or not subscription.get('stripe_subscription_id'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found"
        )

    try:
        result = await stripe_service.cancel_subscription(
            subscription_id=subscription['stripe_subscription_id'],
            at_period_end=at_period_end
        )

        # Update database
        await db.update_subscription(
            user_id=user_id,
            status='cancelling' if at_period_end else 'cancelled'
        )

        return {
            "message": "Subscription cancelled",
            "cancel_at_period_end": result.get('cancel_at_period_end', True)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )

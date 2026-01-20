"""
Billing routes for Razorpay subscription management.
"""

from fastapi import APIRouter, HTTPException, status, Depends

from app.core.dependencies import get_current_user
from app.core.config import get_settings
from app.services.razorpay_service import razorpay_service
from app.db.supabase import get_db
from app.api.v1.schemas.billing import (
    SubscriptionStatus,
    CheckoutRequest,
    CheckoutResponse,
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


@router.post("/checkout")
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Razorpay subscription for upgrade.
    Returns a checkout URL that redirects to Razorpay's hosted checkout page.
    Also returns subscription_id for verification after payment.
    """
    db = get_db()
    user_id = current_user['sub']

    user = await db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get existing Razorpay customer ID if available
    subscription = await db.get_subscription(user_id)
    existing_customer_id = subscription.get('razorpay_customer_id') if subscription else None

    try:
        result = await razorpay_service.create_subscription(
            user_id=user_id,
            user_email=user.get('email', ''),
            plan=request.plan,
            customer_id=existing_customer_id
        )

        # Store pending subscription ID in database for verification later
        await db.update_subscription(
            user_id=user_id,
            razorpay_subscription_id=result['subscription_id'],
            razorpay_customer_id=result['customer_id'],
            status='pending'
        )

        # Return checkout URL and subscription_id for verification
        return {
            "checkout_url": result['short_url'],
            "subscription_id": result['subscription_id']
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subscription: {str(e)}"
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
    at_cycle_end: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel current subscription.

    By default, cancels at the end of the billing cycle.
    """
    db = get_db()
    user_id = current_user['sub']

    subscription = await db.get_subscription(user_id)
    if not subscription or not subscription.get('razorpay_subscription_id'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found"
        )

    try:
        result = await razorpay_service.cancel_subscription(
            subscription_id=subscription['razorpay_subscription_id'],
            at_cycle_end=at_cycle_end
        )

        # Update database
        await db.update_subscription(
            user_id=user_id,
            status='cancelling' if at_cycle_end else 'cancelled'
        )

        return {
            "message": "Subscription cancelled",
            "cancel_at_cycle_end": result.get('cancel_at_cycle_end', True)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.post("/pause")
async def pause_subscription(current_user: dict = Depends(get_current_user)):
    """
    Pause current subscription.

    Razorpay allows pausing subscriptions, which can be resumed later.
    """
    db = get_db()
    user_id = current_user['sub']

    subscription = await db.get_subscription(user_id)
    if not subscription or not subscription.get('razorpay_subscription_id'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found"
        )

    if subscription.get('status') != 'active':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only pause active subscriptions"
        )

    try:
        await razorpay_service.pause_subscription(
            subscription_id=subscription['razorpay_subscription_id']
        )

        await db.update_subscription(
            user_id=user_id,
            status='paused'
        )

        return {"message": "Subscription paused"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pause subscription: {str(e)}"
        )


@router.post("/resume")
async def resume_subscription(current_user: dict = Depends(get_current_user)):
    """
    Resume a paused subscription.
    """
    db = get_db()
    user_id = current_user['sub']

    subscription = await db.get_subscription(user_id)
    if not subscription or not subscription.get('razorpay_subscription_id'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscription found"
        )

    if subscription.get('status') != 'paused':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only resume paused subscriptions"
        )

    try:
        await razorpay_service.resume_subscription(
            subscription_id=subscription['razorpay_subscription_id']
        )

        await db.update_subscription(
            user_id=user_id,
            status='active'
        )

        return {"message": "Subscription resumed"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume subscription: {str(e)}"
        )


@router.post("/verify")
async def verify_subscription(
    subscription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Verify subscription status directly with Razorpay (no webhook needed).
    Called after user returns from Razorpay checkout.
    """
    db = get_db()
    user_id = current_user['sub']

    try:
        # Fetch subscription status from Razorpay
        razorpay_sub = await razorpay_service.get_subscription(subscription_id)

        if razorpay_sub['status'] in ['active', 'authenticated']:
            # Subscription is active, update database
            plan = razorpay_sub.get('plan', 'starter')
            reviews_limit = razorpay_service.get_reviews_limit(plan)

            await db.update_subscription(
                user_id=user_id,
                plan_tier=plan,
                status='active',
                razorpay_subscription_id=subscription_id,
                razorpay_customer_id=razorpay_sub.get('customer_id'),
                reviews_limit=reviews_limit,
                billing_period_start=razorpay_sub.get('current_start'),
                billing_period_end=razorpay_sub.get('current_end')
            )

            return {
                "success": True,
                "message": "Subscription activated successfully",
                "plan": plan,
                "status": "active"
            }
        else:
            return {
                "success": False,
                "message": f"Subscription status: {razorpay_sub['status']}",
                "status": razorpay_sub['status']
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify subscription: {str(e)}"
        )


@router.get("/sync")
async def sync_subscription(current_user: dict = Depends(get_current_user)):
    """
    Sync subscription status with Razorpay.
    Use this to refresh subscription status from Razorpay.
    """
    db = get_db()
    user_id = current_user['sub']

    subscription = await db.get_subscription(user_id)
    if not subscription or not subscription.get('razorpay_subscription_id'):
        return {"message": "No Razorpay subscription to sync", "synced": False}

    try:
        # Fetch latest status from Razorpay
        razorpay_sub = await razorpay_service.get_subscription(
            subscription['razorpay_subscription_id']
        )

        # Map Razorpay status to our status
        status_map = {
            'created': 'pending',
            'authenticated': 'active',
            'active': 'active',
            'pending': 'payment_failed',
            'halted': 'halted',
            'cancelled': 'cancelled',
            'completed': 'cancelled',
            'expired': 'cancelled',
            'paused': 'paused'
        }

        new_status = status_map.get(razorpay_sub['status'], 'active')
        plan = razorpay_sub.get('plan', subscription.get('plan_tier', 'free'))

        await db.update_subscription(
            user_id=user_id,
            status=new_status,
            billing_period_start=razorpay_sub.get('current_start'),
            billing_period_end=razorpay_sub.get('current_end')
        )

        return {
            "message": "Subscription synced",
            "synced": True,
            "status": new_status,
            "plan": plan
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync subscription: {str(e)}"
        )

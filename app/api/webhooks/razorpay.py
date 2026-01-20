"""
Razorpay webhook handlers.
"""

import json
from fastapi import APIRouter, Request, HTTPException, status, Header
from datetime import datetime, timezone

from app.services.razorpay_service import razorpay_service
from app.db.supabase import get_db

router = APIRouter()


@router.post("/razorpay")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature")
):
    """
    Handle incoming Razorpay webhook events.

    Processes subscription lifecycle events:
    - subscription.authenticated
    - subscription.activated
    - subscription.charged
    - subscription.completed
    - subscription.updated
    - subscription.pending
    - subscription.halted
    - subscription.paused
    - subscription.resumed
    - subscription.cancelled
    """
    if not x_razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Razorpay-Signature header"
        )

    payload = await request.body()

    # Verify webhook signature
    if not razorpay_service.verify_webhook_signature(payload, x_razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature"
        )

    # Parse JSON payload
    event_data = json.loads(payload.decode('utf-8'))
    event_type = event_data.get('event')

    db = get_db()

    try:
        if event_type == 'subscription.activated':
            # New subscription activated after first payment
            result = await razorpay_service.handle_subscription_activated(event_data)

            if result.get('user_id'):
                await db.update_subscription(
                    user_id=result['user_id'],
                    razorpay_customer_id=result['customer_id'],
                    razorpay_subscription_id=result['subscription_id'],
                    plan_tier=result.get('plan', 'starter'),
                    status='active',
                    billing_period_start=datetime.now(timezone.utc)
                )
                await db.reset_reviews_used(result['user_id'])

        elif event_type == 'subscription.charged':
            # Subscription charged (recurring payment)
            result = await razorpay_service.handle_subscription_charged(event_data)

            subscription = await _get_subscription_by_razorpay_id(
                db, result['subscription_id']
            )

            if subscription:
                period_end = datetime.fromtimestamp(
                    result['current_end'],
                    tz=timezone.utc
                ) if result.get('current_end') else None

                await db.update_subscription(
                    user_id=subscription['user_id'],
                    status='active',
                    billing_period_end=period_end
                )
                # Reset usage counter for new billing period
                await db.reset_reviews_used(subscription['user_id'])

        elif event_type == 'subscription.cancelled':
            # Subscription cancelled
            result = await razorpay_service.handle_subscription_cancelled(event_data)

            subscription = await _get_subscription_by_razorpay_id(
                db, result['subscription_id']
            )

            if subscription:
                # Downgrade to free tier
                await db.update_subscription(
                    user_id=subscription['user_id'],
                    plan_tier='free',
                    status='cancelled',
                    razorpay_subscription_id=None
                )

        elif event_type == 'subscription.pending':
            # Payment failed but subscription still active (retry period)
            result = await razorpay_service.handle_subscription_pending(event_data)

            subscription = await _get_subscription_by_razorpay_id(
                db, result['subscription_id']
            )

            if subscription:
                await db.update_subscription(
                    user_id=subscription['user_id'],
                    status='payment_failed'
                )

        elif event_type == 'subscription.halted':
            # Payment retries exhausted, subscription halted
            result = await razorpay_service.handle_subscription_halted(event_data)

            subscription = await _get_subscription_by_razorpay_id(
                db, result['subscription_id']
            )

            if subscription:
                await db.update_subscription(
                    user_id=subscription['user_id'],
                    status='halted'
                )

        elif event_type == 'subscription.paused':
            # Subscription paused by customer/merchant
            result = await razorpay_service.handle_subscription_paused(event_data)

            subscription = await _get_subscription_by_razorpay_id(
                db, result['subscription_id']
            )

            if subscription:
                await db.update_subscription(
                    user_id=subscription['user_id'],
                    status='paused'
                )

        elif event_type == 'subscription.resumed':
            # Subscription resumed from paused state
            result = await razorpay_service.handle_subscription_resumed(event_data)

            subscription = await _get_subscription_by_razorpay_id(
                db, result['subscription_id']
            )

            if subscription:
                await db.update_subscription(
                    user_id=subscription['user_id'],
                    status='active'
                )

    except Exception as e:
        # Log error but return 200 to prevent Razorpay retries
        # In production, log to monitoring service
        print(f"Webhook handling error: {str(e)}")

    return {"status": "received"}


async def _get_subscription_by_razorpay_id(db, razorpay_subscription_id: str) -> dict:
    """
    Helper to find subscription by Razorpay subscription ID.

    Note: This is a simplified implementation. In production,
    you'd have an index on razorpay_subscription_id.
    """
    result = db.client.table('subscriptions').select('*').eq(
        'razorpay_subscription_id', razorpay_subscription_id
    ).execute()

    return result.data[0] if result.data else None

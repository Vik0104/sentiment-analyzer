"""
Stripe webhook handlers.
"""

from fastapi import APIRouter, Request, HTTPException, status, Header
from datetime import datetime, timezone

from app.services.stripe_service import stripe_service
from app.db.supabase import get_db

router = APIRouter()


@router.post("/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    """
    Handle incoming Stripe webhook events.

    Processes subscription lifecycle events like:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_failed
    """
    if not stripe_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header"
        )

    payload = await request.body()

    try:
        event = stripe_service.construct_webhook_event(payload, stripe_signature)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid webhook signature: {str(e)}"
        )

    db = get_db()
    event_type = event['type']
    data = event['data']['object']

    try:
        if event_type == 'checkout.session.completed':
            # New subscription created
            result = await stripe_service.handle_checkout_completed(data)

            await db.update_subscription(
                user_id=result['user_id'],
                stripe_customer_id=result['customer_id'],
                stripe_subscription_id=result['subscription_id'],
                plan_tier=result['plan'],
                status='active',
                billing_period_start=datetime.now(timezone.utc)
            )

            # Reset usage for new subscription
            await db.reset_reviews_used(result['user_id'])

        elif event_type == 'customer.subscription.updated':
            # Subscription changed (upgrade, downgrade, renewal)
            result = await stripe_service.handle_subscription_updated(data)

            # Find user by Stripe customer ID
            # Note: In production, maintain a customer_id -> user_id mapping
            subscription = await _get_subscription_by_stripe_id(
                db, result['subscription_id']
            )

            if subscription:
                period_end = datetime.fromtimestamp(
                    result['current_period_end'],
                    tz=timezone.utc
                ) if result.get('current_period_end') else None

                await db.update_subscription(
                    user_id=subscription['user_id'],
                    status=result['status'],
                    billing_period_end=period_end
                )

        elif event_type == 'customer.subscription.deleted':
            # Subscription cancelled
            result = await stripe_service.handle_subscription_deleted(data)

            subscription = await _get_subscription_by_stripe_id(
                db, result['subscription_id']
            )

            if subscription:
                # Downgrade to free tier
                await db.update_subscription(
                    user_id=subscription['user_id'],
                    plan_tier='free',
                    status='cancelled',
                    stripe_subscription_id=None
                )

        elif event_type == 'invoice.payment_failed':
            # Payment failed
            result = await stripe_service.handle_invoice_payment_failed(data)

            if result.get('subscription_id'):
                subscription = await _get_subscription_by_stripe_id(
                    db, result['subscription_id']
                )

                if subscription:
                    await db.update_subscription(
                        user_id=subscription['user_id'],
                        status='payment_failed'
                    )

        elif event_type == 'invoice.paid':
            # Invoice paid (subscription renewed)
            subscription_id = data.get('subscription')
            if subscription_id:
                subscription = await _get_subscription_by_stripe_id(
                    db, subscription_id
                )

                if subscription:
                    # Reset usage counter for new billing period
                    await db.reset_reviews_used(subscription['user_id'])

                    await db.update_subscription(
                        user_id=subscription['user_id'],
                        status='active',
                        billing_period_start=datetime.now(timezone.utc)
                    )

    except Exception as e:
        # Log error but return 200 to prevent Stripe retries
        # In production, log to monitoring service
        print(f"Webhook handling error: {str(e)}")

    return {"status": "received"}


async def _get_subscription_by_stripe_id(db, stripe_subscription_id: str) -> dict:
    """
    Helper to find subscription by Stripe subscription ID.

    Note: This is a simplified implementation. In production,
    you'd have an index on stripe_subscription_id.
    """
    # This is a workaround - Supabase doesn't support direct query here
    # In production, add proper indexing and query support
    result = db.client.table('subscriptions').select('*').eq(
        'stripe_subscription_id', stripe_subscription_id
    ).execute()

    return result.data[0] if result.data else None

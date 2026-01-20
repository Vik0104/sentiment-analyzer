"""
Stripe payment service for subscription management.
"""

from typing import Optional
import stripe

from app.core.config import get_settings

settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key


class StripeService:
    """
    Service for handling Stripe payments and subscriptions.
    """

    PRICE_IDS = {
        'starter': settings.stripe_price_starter,
        'pro': settings.stripe_price_pro
    }

    PLAN_LIMITS = {
        'free': settings.free_reviews_limit,
        'starter': settings.starter_reviews_limit,
        'pro': settings.pro_reviews_limit
    }

    async def create_checkout_session(
        self,
        user_id: str,
        user_email: str,
        plan: str,
        success_url: str,
        cancel_url: str
    ) -> str:
        """
        Create a Stripe Checkout session for subscription.

        Args:
            user_id: Internal user ID
            user_email: User's email address
            plan: Plan tier ('starter' or 'pro')
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is cancelled

        Returns:
            Checkout session URL

        Raises:
            ValueError: If plan is invalid
        """
        if plan not in self.PRICE_IDS:
            raise ValueError(f"Invalid plan: {plan}. Must be 'starter' or 'pro'")

        price_id = self.PRICE_IDS[plan]
        if not price_id:
            raise ValueError(f"Price ID not configured for plan: {plan}")

        session = stripe.checkout.Session.create(
            customer_email=user_email,
            mode='subscription',
            line_items=[{
                'price': price_id,
                'quantity': 1
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': user_id,
                'plan': plan
            }
        )

        return session.url

    async def create_customer_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> str:
        """
        Create a Stripe Customer Portal session for subscription management.

        Args:
            customer_id: Stripe customer ID
            return_url: URL to return to after portal session

        Returns:
            Portal session URL
        """
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )
        return session.url

    async def get_subscription(self, subscription_id: str) -> dict:
        """
        Get subscription details from Stripe.

        Args:
            subscription_id: Stripe subscription ID

        Returns:
            Subscription details dictionary
        """
        subscription = stripe.Subscription.retrieve(subscription_id)
        return {
            'id': subscription.id,
            'status': subscription.status,
            'current_period_start': subscription.current_period_start,
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end,
            'plan': self._get_plan_from_price(subscription.items.data[0].price.id)
        }

    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> dict:
        """
        Cancel a subscription.

        Args:
            subscription_id: Stripe subscription ID
            at_period_end: If True, cancel at end of billing period

        Returns:
            Updated subscription details
        """
        if at_period_end:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
        else:
            subscription = stripe.Subscription.delete(subscription_id)

        return {
            'id': subscription.id,
            'status': subscription.status,
            'cancel_at_period_end': getattr(subscription, 'cancel_at_period_end', True)
        }

    def construct_webhook_event(
        self,
        payload: bytes,
        signature: str
    ) -> stripe.Event:
        """
        Construct and verify a Stripe webhook event.

        Args:
            payload: Raw request body
            signature: Stripe signature header

        Returns:
            Verified Stripe Event object

        Raises:
            stripe.error.SignatureVerificationError: If signature is invalid
        """
        return stripe.Webhook.construct_event(
            payload,
            signature,
            settings.stripe_webhook_secret
        )

    async def handle_checkout_completed(self, session: dict) -> dict:
        """
        Handle checkout.session.completed webhook event.

        Args:
            session: Checkout session data from webhook

        Returns:
            Processed subscription data
        """
        return {
            'user_id': session['metadata']['user_id'],
            'plan': session['metadata']['plan'],
            'customer_id': session['customer'],
            'subscription_id': session['subscription'],
            'status': 'active'
        }

    async def handle_subscription_updated(self, subscription: dict) -> dict:
        """
        Handle customer.subscription.updated webhook event.

        Args:
            subscription: Subscription data from webhook

        Returns:
            Processed subscription data
        """
        return {
            'subscription_id': subscription['id'],
            'customer_id': subscription['customer'],
            'status': subscription['status'],
            'cancel_at_period_end': subscription.get('cancel_at_period_end', False),
            'current_period_end': subscription['current_period_end']
        }

    async def handle_subscription_deleted(self, subscription: dict) -> dict:
        """
        Handle customer.subscription.deleted webhook event.

        Args:
            subscription: Subscription data from webhook

        Returns:
            Processed subscription data
        """
        return {
            'subscription_id': subscription['id'],
            'customer_id': subscription['customer'],
            'status': 'cancelled'
        }

    async def handle_invoice_payment_failed(self, invoice: dict) -> dict:
        """
        Handle invoice.payment_failed webhook event.

        Args:
            invoice: Invoice data from webhook

        Returns:
            Processed failure data
        """
        return {
            'customer_id': invoice['customer'],
            'subscription_id': invoice.get('subscription'),
            'amount_due': invoice['amount_due'],
            'status': 'payment_failed'
        }

    def _get_plan_from_price(self, price_id: str) -> str:
        """Map Stripe price ID to plan name."""
        for plan, pid in self.PRICE_IDS.items():
            if pid == price_id:
                return plan
        return 'free'

    def get_reviews_limit(self, plan: str) -> int:
        """Get reviews limit for a plan."""
        return self.PLAN_LIMITS.get(plan, settings.free_reviews_limit)


# Singleton instance
stripe_service = StripeService()

"""
Razorpay payment service for subscription management.
"""

from typing import Optional
import razorpay

from app.core.config import get_settings

settings = get_settings()

# Initialize Razorpay client
client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


class RazorpayService:
    """
    Service for handling Razorpay payments and subscriptions.
    """

    PLAN_IDS = {
        'starter': settings.razorpay_plan_starter,
        'pro': settings.razorpay_plan_pro
    }

    PLAN_LIMITS = {
        'free': settings.free_reviews_limit,
        'starter': settings.starter_reviews_limit,
        'pro': settings.pro_reviews_limit
    }

    async def create_subscription(
        self,
        user_id: str,
        user_email: str,
        plan: str,
        customer_id: Optional[str] = None
    ) -> dict:
        """
        Create a Razorpay subscription for a customer.

        Args:
            user_id: Internal user ID
            user_email: User's email address
            plan: Plan tier ('starter' or 'pro')
            customer_id: Existing Razorpay customer ID (optional)

        Returns:
            Subscription details including short_url for checkout

        Raises:
            ValueError: If plan is invalid
        """
        if plan not in self.PLAN_IDS:
            raise ValueError(f"Invalid plan: {plan}. Must be 'starter' or 'pro'")

        plan_id = self.PLAN_IDS[plan]
        if not plan_id:
            raise ValueError(f"Plan ID not configured for plan: {plan}")

        # Create customer if not exists
        if not customer_id:
            customer = client.customer.create({
                "email": user_email,
                "notes": {"user_id": user_id}
            })
            customer_id = customer['id']

        # Create subscription
        subscription_data = {
            "plan_id": plan_id,
            "customer_id": customer_id,
            "customer_notify": 1,
            "total_count": 120,  # Maximum billing cycles
            "notes": {
                "user_id": user_id,
                "plan": plan
            }
        }

        subscription = client.subscription.create(subscription_data)

        return {
            "subscription_id": subscription['id'],
            "customer_id": customer_id,
            "short_url": subscription['short_url'],
            "status": subscription['status']
        }

    async def get_subscription(self, subscription_id: str) -> dict:
        """
        Get subscription details from Razorpay.

        Args:
            subscription_id: Razorpay subscription ID

        Returns:
            Subscription details dictionary
        """
        subscription = client.subscription.fetch(subscription_id)
        return {
            'id': subscription['id'],
            'status': subscription['status'],
            'current_start': subscription.get('current_start'),
            'current_end': subscription.get('current_end'),
            'ended_at': subscription.get('ended_at'),
            'plan_id': subscription['plan_id'],
            'total_count': subscription.get('total_count'),
            'paid_count': subscription.get('paid_count'),
            'remaining_count': subscription.get('remaining_count'),
            'plan': self._get_plan_from_id(subscription['plan_id'])
        }

    async def cancel_subscription(
        self,
        subscription_id: str,
        at_cycle_end: bool = True
    ) -> dict:
        """
        Cancel a subscription.

        Args:
            subscription_id: Razorpay subscription ID
            at_cycle_end: If True, cancel at end of billing cycle

        Returns:
            Updated subscription details
        """
        options = {"cancel_at_cycle_end": 1 if at_cycle_end else 0}
        subscription = client.subscription.cancel(subscription_id, options)

        return {
            'id': subscription['id'],
            'status': subscription['status'],
            'ended_at': subscription.get('ended_at'),
            'cancel_at_cycle_end': at_cycle_end
        }

    async def pause_subscription(self, subscription_id: str) -> dict:
        """
        Pause a subscription.

        Args:
            subscription_id: Razorpay subscription ID

        Returns:
            Updated subscription details
        """
        subscription = client.subscription.pause(subscription_id, {"pause_initiated_by": "customer"})
        return {
            'id': subscription['id'],
            'status': subscription['status']
        }

    async def resume_subscription(self, subscription_id: str) -> dict:
        """
        Resume a paused subscription.

        Args:
            subscription_id: Razorpay subscription ID

        Returns:
            Updated subscription details
        """
        subscription = client.subscription.resume(subscription_id)
        return {
            'id': subscription['id'],
            'status': subscription['status']
        }

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """
        Verify Razorpay webhook signature.

        Args:
            payload: Raw request body
            signature: X-Razorpay-Signature header

        Returns:
            True if signature is valid
        """
        try:
            client.utility.verify_webhook_signature(
                payload.decode('utf-8'),
                signature,
                settings.razorpay_webhook_secret
            )
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

    async def handle_subscription_activated(self, payload: dict) -> dict:
        """
        Handle subscription.activated webhook event.

        Args:
            payload: Webhook payload

        Returns:
            Processed subscription data
        """
        subscription = payload['payload']['subscription']['entity']
        return {
            'subscription_id': subscription['id'],
            'customer_id': subscription.get('customer_id'),
            'plan_id': subscription['plan_id'],
            'status': 'active',
            'user_id': subscription.get('notes', {}).get('user_id'),
            'plan': subscription.get('notes', {}).get('plan')
        }

    async def handle_subscription_charged(self, payload: dict) -> dict:
        """
        Handle subscription.charged webhook event.

        Args:
            payload: Webhook payload

        Returns:
            Processed subscription data
        """
        subscription = payload['payload']['subscription']['entity']
        payment = payload['payload'].get('payment', {}).get('entity', {})
        return {
            'subscription_id': subscription['id'],
            'customer_id': subscription.get('customer_id'),
            'status': subscription['status'],
            'payment_id': payment.get('id'),
            'amount': payment.get('amount'),
            'current_start': subscription.get('current_start'),
            'current_end': subscription.get('current_end')
        }

    async def handle_subscription_cancelled(self, payload: dict) -> dict:
        """
        Handle subscription.cancelled webhook event.

        Args:
            payload: Webhook payload

        Returns:
            Processed subscription data
        """
        subscription = payload['payload']['subscription']['entity']
        return {
            'subscription_id': subscription['id'],
            'customer_id': subscription.get('customer_id'),
            'status': 'cancelled',
            'ended_at': subscription.get('ended_at')
        }

    async def handle_subscription_paused(self, payload: dict) -> dict:
        """
        Handle subscription.paused webhook event.

        Args:
            payload: Webhook payload

        Returns:
            Processed subscription data
        """
        subscription = payload['payload']['subscription']['entity']
        return {
            'subscription_id': subscription['id'],
            'status': 'paused'
        }

    async def handle_subscription_resumed(self, payload: dict) -> dict:
        """
        Handle subscription.resumed webhook event.

        Args:
            payload: Webhook payload

        Returns:
            Processed subscription data
        """
        subscription = payload['payload']['subscription']['entity']
        return {
            'subscription_id': subscription['id'],
            'status': 'active'
        }

    async def handle_subscription_halted(self, payload: dict) -> dict:
        """
        Handle subscription.halted webhook event (payment failures exhausted).

        Args:
            payload: Webhook payload

        Returns:
            Processed subscription data
        """
        subscription = payload['payload']['subscription']['entity']
        return {
            'subscription_id': subscription['id'],
            'status': 'halted'
        }

    async def handle_subscription_pending(self, payload: dict) -> dict:
        """
        Handle subscription.pending webhook event (payment failed).

        Args:
            payload: Webhook payload

        Returns:
            Processed subscription data
        """
        subscription = payload['payload']['subscription']['entity']
        return {
            'subscription_id': subscription['id'],
            'status': 'pending'
        }

    def _get_plan_from_id(self, plan_id: str) -> str:
        """Map Razorpay plan ID to plan name."""
        for plan, pid in self.PLAN_IDS.items():
            if pid == plan_id:
                return plan
        return 'free'

    def get_reviews_limit(self, plan: str) -> int:
        """Get reviews limit for a plan."""
        return self.PLAN_LIMITS.get(plan, settings.free_reviews_limit)


# Singleton instance
razorpay_service = RazorpayService()

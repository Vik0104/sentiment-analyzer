"""
Supabase database client and operations.
"""

from typing import Optional
from datetime import datetime, timezone
from supabase import create_client, Client

from app.core.config import get_settings
from app.core.security import encrypt_token, decrypt_token

settings = get_settings()


class SupabaseClient:
    """
    Database client for Supabase operations.
    Handles user, subscription, and analysis result management.
    """

    def __init__(self):
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    # ==================== User Operations ====================

    async def create_user(
        self,
        shop_domain: str,
        access_token: str,
        email: Optional[str] = None
    ) -> dict:
        """
        Create a new user (shop) in the database.

        Args:
            shop_domain: Judge.me shop domain
            access_token: OAuth access token (will be encrypted)
            email: Optional email address

        Returns:
            Created user record
        """
        encrypted_token = encrypt_token(access_token)

        result = self.client.table('users').insert({
            'judgeme_shop_domain': shop_domain,
            'judgeme_access_token': encrypted_token,
            'email': email,
            'last_login': datetime.now(timezone.utc).isoformat()
        }).execute()

        return result.data[0] if result.data else None

    async def get_user_by_shop_domain(self, shop_domain: str) -> Optional[dict]:
        """
        Get user by shop domain.

        Args:
            shop_domain: Judge.me shop domain

        Returns:
            User record or None
        """
        result = self.client.table('users').select('*').eq(
            'judgeme_shop_domain', shop_domain
        ).execute()

        return result.data[0] if result.data else None

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        Get user by ID.

        Args:
            user_id: User UUID

        Returns:
            User record or None
        """
        result = self.client.table('users').select('*').eq(
            'id', user_id
        ).execute()

        return result.data[0] if result.data else None

    async def update_user_token(
        self,
        user_id: str,
        access_token: str
    ) -> dict:
        """
        Update user's access token.

        Args:
            user_id: User UUID
            access_token: New access token (will be encrypted)

        Returns:
            Updated user record
        """
        encrypted_token = encrypt_token(access_token)

        result = self.client.table('users').update({
            'judgeme_access_token': encrypted_token,
            'judgeme_token_created_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', user_id).execute()

        return result.data[0] if result.data else None

    async def update_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp."""
        self.client.table('users').update({
            'last_login': datetime.now(timezone.utc).isoformat()
        }).eq('id', user_id).execute()

    def get_decrypted_token(self, user: dict) -> str:
        """
        Get decrypted access token from user record.

        Args:
            user: User record with encrypted token

        Returns:
            Decrypted access token
        """
        return decrypt_token(user['judgeme_access_token'])

    # ==================== Subscription Operations ====================

    async def create_subscription(
        self,
        user_id: str,
        plan_tier: str = 'free'
    ) -> dict:
        """
        Create subscription record for user.

        Args:
            user_id: User UUID
            plan_tier: Subscription tier

        Returns:
            Created subscription record
        """
        result = self.client.table('subscriptions').insert({
            'user_id': user_id,
            'plan_tier': plan_tier,
            'reviews_limit': settings.free_reviews_limit if plan_tier == 'free' else (
                settings.starter_reviews_limit if plan_tier == 'starter' else settings.pro_reviews_limit
            ),
            'reviews_used': 0,
            'status': 'active'
        }).execute()

        return result.data[0] if result.data else None

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        """
        Get user's subscription.

        Args:
            user_id: User UUID

        Returns:
            Subscription record or None
        """
        result = self.client.table('subscriptions').select('*').eq(
            'user_id', user_id
        ).execute()

        return result.data[0] if result.data else None

    async def update_subscription(
        self,
        user_id: str,
        stripe_customer_id: Optional[str] = None,
        stripe_subscription_id: Optional[str] = None,
        plan_tier: Optional[str] = None,
        status: Optional[str] = None,
        billing_period_start: Optional[datetime] = None,
        billing_period_end: Optional[datetime] = None
    ) -> dict:
        """
        Update subscription details.

        Args:
            user_id: User UUID
            stripe_customer_id: Stripe customer ID
            stripe_subscription_id: Stripe subscription ID
            plan_tier: New plan tier
            status: Subscription status
            billing_period_start: Billing period start
            billing_period_end: Billing period end

        Returns:
            Updated subscription record
        """
        update_data = {}

        if stripe_customer_id is not None:
            update_data['stripe_customer_id'] = stripe_customer_id
        if stripe_subscription_id is not None:
            update_data['stripe_subscription_id'] = stripe_subscription_id
        if plan_tier is not None:
            update_data['plan_tier'] = plan_tier
            update_data['reviews_limit'] = (
                settings.free_reviews_limit if plan_tier == 'free' else (
                    settings.starter_reviews_limit if plan_tier == 'starter' else settings.pro_reviews_limit
                )
            )
        if status is not None:
            update_data['status'] = status
        if billing_period_start is not None:
            update_data['billing_period_start'] = billing_period_start.isoformat()
        if billing_period_end is not None:
            update_data['billing_period_end'] = billing_period_end.isoformat()

        result = self.client.table('subscriptions').update(
            update_data
        ).eq('user_id', user_id).execute()

        return result.data[0] if result.data else None

    async def increment_reviews_used(self, user_id: str, count: int = 1) -> None:
        """Increment the reviews used counter."""
        subscription = await self.get_subscription(user_id)
        if subscription:
            new_count = subscription['reviews_used'] + count
            self.client.table('subscriptions').update({
                'reviews_used': new_count
            }).eq('user_id', user_id).execute()

    async def reset_reviews_used(self, user_id: str) -> None:
        """Reset reviews used counter (for new billing period)."""
        self.client.table('subscriptions').update({
            'reviews_used': 0
        }).eq('user_id', user_id).execute()

    # ==================== Analysis Results Operations ====================

    async def save_analysis_result(
        self,
        user_id: str,
        results: dict,
        analysis_type: str = 'full',
        review_count: int = 0,
        expires_hours: int = 24
    ) -> dict:
        """
        Save analysis results to cache.

        Args:
            user_id: User UUID
            results: Analysis results JSON
            analysis_type: Type of analysis performed
            review_count: Number of reviews analyzed
            expires_hours: Hours until cache expires

        Returns:
            Created analysis result record
        """
        expires_at = datetime.now(timezone.utc)
        expires_at = expires_at.replace(hour=expires_at.hour + expires_hours)

        result = self.client.table('analysis_results').insert({
            'user_id': user_id,
            'analysis_type': analysis_type,
            'review_count': review_count,
            'results': results,
            'expires_at': expires_at.isoformat()
        }).execute()

        return result.data[0] if result.data else None

    async def get_cached_analysis(
        self,
        user_id: str,
        analysis_type: str = 'full'
    ) -> Optional[dict]:
        """
        Get cached analysis results if not expired.

        Args:
            user_id: User UUID
            analysis_type: Type of analysis to retrieve

        Returns:
            Cached analysis results or None
        """
        result = self.client.table('analysis_results').select('*').eq(
            'user_id', user_id
        ).eq(
            'analysis_type', analysis_type
        ).gte(
            'expires_at', datetime.now(timezone.utc).isoformat()
        ).order(
            'created_at', desc=True
        ).limit(1).execute()

        return result.data[0] if result.data else None

    async def delete_expired_analysis(self) -> int:
        """
        Delete expired analysis results.

        Returns:
            Number of deleted records
        """
        result = self.client.table('analysis_results').delete().lt(
            'expires_at', datetime.now(timezone.utc).isoformat()
        ).execute()

        return len(result.data) if result.data else 0


# Singleton instance
db: Optional[SupabaseClient] = None


def get_db() -> SupabaseClient:
    """Get or create database client singleton."""
    global db
    if db is None:
        db = SupabaseClient()
    return db

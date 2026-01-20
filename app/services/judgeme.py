"""
Judge.me API service for OAuth and review data fetching.
"""

from typing import Optional
from urllib.parse import urlencode
import httpx

from app.core.config import get_settings
from app.core.security import generate_state_token

settings = get_settings()


class JudgemeService:
    """
    Service for interacting with Judge.me API.
    Handles OAuth flow and review data retrieval.
    """

    def __init__(self):
        self.client_id = settings.judgeme_client_id
        self.client_secret = settings.judgeme_client_secret
        self.redirect_uri = settings.judgeme_redirect_uri
        self.api_base = settings.judgeme_api_base
        self.auth_url = settings.judgeme_auth_url
        self.token_url = settings.judgeme_token_url

    def get_authorization_url(self, state: Optional[str] = None) -> tuple[str, str]:
        """
        Generate Judge.me OAuth authorization URL.

        Args:
            state: Optional CSRF state token (generated if not provided)

        Returns:
            Tuple of (authorization_url, state_token)
        """
        if state is None:
            state = generate_state_token()

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "read_reviews read_products",
            "state": state
        }

        auth_url = f"{self.auth_url}?{urlencode(params)}"
        return auth_url, state

    async def exchange_code_for_token(self, code: str, state: str) -> dict:
        """
        Exchange authorization code for access token.

        Args:
            code: Authorization code from OAuth callback
            state: State token for CSRF verification

        Returns:
            Token response containing access_token, token_type, scope, created_at

        Raises:
            httpx.HTTPStatusError: If token exchange fails
        """
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "grant_type": "authorization_code"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            return response.json()

    async def fetch_reviews(
        self,
        access_token: str,
        shop_domain: str,
        page: int = 1,
        per_page: int = 100,
        product_id: Optional[str] = None
    ) -> dict:
        """
        Fetch reviews from Judge.me API.

        Args:
            access_token: OAuth access token
            shop_domain: Shop's myshopify.com domain
            page: Page number for pagination
            per_page: Number of reviews per page
            product_id: Optional product ID to filter reviews

        Returns:
            Dictionary containing reviews and pagination info
        """
        params = {
            "shop_domain": shop_domain,
            "api_token": access_token,
            "page": page,
            "per_page": per_page
        }

        if product_id:
            params["product_id"] = product_id

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/reviews",
                params=params,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            return response.json()

    async def fetch_all_reviews(
        self,
        access_token: str,
        shop_domain: str,
        max_reviews: int = 1000
    ) -> list[dict]:
        """
        Fetch all reviews with pagination handling.

        Args:
            access_token: OAuth access token
            shop_domain: Shop's myshopify.com domain
            max_reviews: Maximum number of reviews to fetch

        Returns:
            List of review dictionaries
        """
        all_reviews = []
        page = 1
        per_page = 100

        while len(all_reviews) < max_reviews:
            response = await self.fetch_reviews(
                access_token=access_token,
                shop_domain=shop_domain,
                page=page,
                per_page=per_page
            )

            reviews = response.get("reviews", [])
            if not reviews:
                break

            all_reviews.extend(reviews)
            page += 1

            # Check if we've reached the last page
            if len(reviews) < per_page:
                break

        return all_reviews[:max_reviews]

    async def fetch_products(
        self,
        access_token: str,
        shop_domain: str,
        page: int = 1,
        per_page: int = 100
    ) -> dict:
        """
        Fetch products from Judge.me API.

        Args:
            access_token: OAuth access token
            shop_domain: Shop's myshopify.com domain
            page: Page number
            per_page: Products per page

        Returns:
            Dictionary containing products list
        """
        params = {
            "shop_domain": shop_domain,
            "api_token": access_token,
            "page": page,
            "per_page": per_page
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/products",
                params=params,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            return response.json()

    async def get_shop_info(self, access_token: str, shop_domain: str) -> dict:
        """
        Get shop information from Judge.me.

        Args:
            access_token: OAuth access token
            shop_domain: Shop's myshopify.com domain

        Returns:
            Shop information dictionary
        """
        params = {
            "shop_domain": shop_domain,
            "api_token": access_token
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/shops/-1",
                params=params,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    def normalize_review(review: dict) -> dict:
        """
        Normalize a Judge.me review to internal format.

        Args:
            review: Raw Judge.me review dictionary

        Returns:
            Normalized review dictionary for analysis
        """
        return {
            "id": review.get("id"),
            "review_text": review.get("body", ""),
            "title": review.get("title", ""),
            "rating": review.get("rating"),
            "date": review.get("created_at"),
            "reviewer_name": review.get("reviewer", {}).get("name", "Anonymous"),
            "verified": review.get("verified_purchase", False),
            "product_id": review.get("product_id"),
            "product_title": review.get("product", {}).get("title", ""),
        }

    @staticmethod
    def normalize_reviews(reviews: list[dict]) -> list[dict]:
        """
        Normalize a list of Judge.me reviews.

        Args:
            reviews: List of raw Judge.me reviews

        Returns:
            List of normalized review dictionaries
        """
        return [JudgemeService.normalize_review(r) for r in reviews]


# Singleton instance
judgeme_service = JudgemeService()

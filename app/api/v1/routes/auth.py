"""
Authentication routes for Judge.me OAuth.
"""

import json
import base64
import httpx
from fastapi import APIRouter, HTTPException, status, Depends, Response, Query
from fastapi.responses import RedirectResponse
from typing import Optional

from app.core.config import get_settings
from app.core.security import create_access_token, generate_state_token
from app.core.dependencies import get_current_user
from app.services.judgeme import judgeme_service
from app.db.supabase import get_db
from app.api.v1.schemas.user import (
    AuthorizationURLResponse,
    LoginResponse,
    UserResponse
)

router = APIRouter()
settings = get_settings()

# In-memory state storage (use Redis in production)
# Now stores shop_domain along with validity
_oauth_states: dict[str, dict] = {}


@router.get("/judgeme/authorize", response_model=AuthorizationURLResponse)
async def get_authorization_url(shop_domain: str = Query(..., description="Shop domain (e.g., yourstore.myshopify.com)")):
    """
    Get Judge.me OAuth authorization URL.

    Returns the URL to redirect users to for OAuth authorization.
    The shop_domain is stored with the state token and retrieved during callback.
    """
    auth_url, state = judgeme_service.get_authorization_url()

    # Store state with shop_domain for validation and retrieval
    _oauth_states[state] = {
        "valid": True,
        "shop_domain": shop_domain
    }

    return AuthorizationURLResponse(
        authorization_url=auth_url,
        state=state
    )


@router.get("/judgeme/callback")
async def oauth_callback(code: str, state: str):
    """
    Handle Judge.me OAuth callback.

    Exchanges authorization code for access token and creates/updates user.
    """
    # Validate state and get stored data
    if state not in _oauth_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state token"
        )

    # Get stored state data (includes shop_domain)
    state_data = _oauth_states[state]
    shop_domain = state_data.get("shop_domain")

    # Remove used state
    del _oauth_states[state]

    if not shop_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shop domain not found in state. Please try connecting again."
        )

    try:
        # Exchange code for token
        token_response = await judgeme_service.exchange_code_for_token(code, state)
        access_token = token_response.get('access_token')

        # Debug: log token response structure
        print(f"Token response keys: {list(token_response.keys())}")
        print(f"Using shop_domain from state: {shop_domain}")

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to obtain access token"
            )

        db = get_db()

        # Check if user exists
        existing_user = await db.get_user_by_shop_domain(shop_domain)

        if existing_user:
            # Update token
            await db.update_user_token(existing_user['id'], access_token)
            await db.update_last_login(existing_user['id'])
            user = existing_user
        else:
            # Create new user
            user = await db.create_user(
                shop_domain=shop_domain,
                access_token=access_token
            )

            # Create free subscription
            await db.create_subscription(user['id'], 'free')

        # Get subscription info
        subscription = await db.get_subscription(user['id'])

        # Create JWT token
        jwt_token = create_access_token({
            'sub': user['id'],
            'shop_domain': shop_domain,
            'tier': subscription.get('plan_tier', 'free') if subscription else 'free'
        })

        # Return login response
        # In production, redirect to frontend with token
        return LoginResponse(
            access_token=jwt_token,
            user=UserResponse(
                id=user['id'],
                shop_domain=shop_domain,
                email=user.get('email'),
                created_at=user['created_at'],
                last_login=user.get('last_login'),
                subscription_tier=subscription.get('plan_tier', 'free') if subscription else 'free',
                reviews_limit=subscription.get('reviews_limit', settings.free_reviews_limit) if subscription else settings.free_reviews_limit,
                reviews_used=subscription.get('reviews_used', 0) if subscription else 0
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information.
    """
    db = get_db()

    user = await db.get_user_by_id(current_user['sub'])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    subscription = await db.get_subscription(user['id'])

    return UserResponse(
        id=user['id'],
        shop_domain=user['judgeme_shop_domain'],
        email=user.get('email'),
        created_at=user['created_at'],
        last_login=user.get('last_login'),
        subscription_tier=subscription.get('plan_tier', 'free') if subscription else 'free',
        reviews_limit=subscription.get('reviews_limit', settings.free_reviews_limit) if subscription else settings.free_reviews_limit,
        reviews_used=subscription.get('reviews_used', 0) if subscription else 0
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user.

    Note: JWT tokens are stateless, so this mainly serves as a confirmation.
    The frontend should discard the token.
    """
    return {"message": "Successfully logged out"}

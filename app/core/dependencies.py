"""
FastAPI dependency injection utilities.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .security import decode_access_token
from .config import get_settings, Settings

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Dependency to get the current authenticated user from JWT token.

    Args:
        credentials: Bearer token from Authorization header

    Returns:
        User payload from decoded token

    Raises:
        HTTPException: If token is missing or invalid
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    Dependency to optionally get the current user (for endpoints that work
    both authenticated and unauthenticated).

    Returns:
        User payload or None if not authenticated
    """
    if credentials is None:
        return None

    return decode_access_token(credentials.credentials)


def get_settings_dep() -> Settings:
    """Dependency to get application settings."""
    return get_settings()


async def verify_subscription_tier(
    required_tier: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Dependency factory to verify user has required subscription tier.

    Args:
        required_tier: Minimum tier required ('free', 'starter', 'pro')
        current_user: Current authenticated user

    Returns:
        User payload if tier is sufficient

    Raises:
        HTTPException: If tier is insufficient
    """
    tier_levels = {'free': 0, 'starter': 1, 'pro': 2, 'enterprise': 3}

    user_tier = current_user.get('tier', 'free')
    user_level = tier_levels.get(user_tier, 0)
    required_level = tier_levels.get(required_tier, 0)

    if user_level < required_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This feature requires {required_tier} tier or higher"
        )

    return current_user


def require_tier(tier: str):
    """
    Dependency factory for tier verification.

    Usage:
        @router.get("/premium-feature")
        async def premium(user: dict = Depends(require_tier("pro"))):
            ...
    """
    async def _verify(current_user: dict = Depends(get_current_user)) -> dict:
        return await verify_subscription_tier(tier, current_user)
    return _verify

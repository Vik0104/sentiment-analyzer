"""
Security utilities for JWT tokens and encryption.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import secrets
import base64

from .config import get_settings

settings = get_settings()

# Password hashing (if needed for future features)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of claims to encode
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


def generate_state_token() -> str:
    """Generate a random state token for OAuth CSRF protection."""
    return secrets.token_urlsafe(32)


def get_encryption_key() -> bytes:
    """
    Derive a Fernet encryption key from the secret key.

    Returns:
        32-byte base64-encoded key for Fernet
    """
    # Use first 32 characters of secret key, padded if necessary
    key_bytes = settings.secret_key.encode()[:32].ljust(32, b'0')
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_token(token: str) -> str:
    """
    Encrypt a token for secure storage.

    Args:
        token: Plain text token

    Returns:
        Encrypted token string
    """
    f = Fernet(get_encryption_key())
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt a stored token.

    Args:
        encrypted_token: Encrypted token string

    Returns:
        Decrypted plain text token
    """
    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted_token.encode()).decode()


def hash_password(password: str) -> str:
    """Hash a password for storage."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

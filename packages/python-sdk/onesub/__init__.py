"""
1Sub SDK for Python

Official Python SDK for integrating with the 1Sub API.
Provides subscription verification, credit consumption, and webhook handling.

Example:
    >>> from onesub import OneSub
    >>>
    >>> client = OneSub(api_key="sk-tool-xxx")
    >>>
    >>> # Verify subscription
    >>> sub = client.subscriptions.verify_by_email("user@example.com")
    >>> print(f"Active: {sub['active']}")
    >>>
    >>> # Consume credits
    >>> result = client.credits.consume(
    ...     user_id=sub["oneSubUserId"],
    ...     amount=10,
    ...     reason="API call",
    ...     idempotency_key="req-123"
    ... )
"""

from .client import OneSub
from .errors import (
    OneSubError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    InsufficientCreditsError,
    ValidationError,
    InvalidCodeError,
    WebhookVerificationError,
)
from .utils import hash_email

__version__ = "1.0.0"
__all__ = [
    "OneSub",
    "OneSubError",
    "AuthenticationError",
    "NotFoundError",
    "RateLimitError",
    "InsufficientCreditsError",
    "ValidationError",
    "InvalidCodeError",
    "WebhookVerificationError",
    "hash_email",
]

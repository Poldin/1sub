"""1Sub SDK Utility Functions"""

import hashlib
import hmac
import time
from typing import Optional, Tuple


def hash_email(email: str) -> str:
    """
    Hash an email address using SHA-256.
    Normalizes email to lowercase and trims whitespace.
    """
    normalized = email.lower().strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


def create_hmac_signature(payload: str, secret: str) -> str:
    """Create HMAC-SHA256 signature"""
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()


def parse_signature_header(header: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse 1Sub signature header.
    Format: t=timestamp,v1=signature
    Returns (timestamp, signature)
    """
    timestamp = None
    signature = None

    for part in header.split(","):
        if "=" in part:
            key, value = part.split("=", 1)
            if key == "t":
                timestamp = value
            elif key == "v1":
                signature = value

    return timestamp, signature


def verify_signature(
    payload: str,
    signature: str,
    secret: str,
    tolerance_seconds: int = 300
) -> bool:
    """
    Verify 1Sub webhook signature.

    Args:
        payload: Raw request body
        signature: Value of the 1sub-signature header
        secret: Webhook secret
        tolerance_seconds: Max age of signature (default: 5 minutes)

    Returns:
        True if signature is valid
    """
    timestamp, sig = parse_signature_header(signature)

    if not timestamp or not sig:
        return False

    try:
        ts = int(timestamp)
    except ValueError:
        return False

    # Check timestamp tolerance
    now = int(time.time())
    if abs(now - ts) > tolerance_seconds:
        return False

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload}"
    expected = create_hmac_signature(signed_payload, secret)

    # Timing-safe comparison
    return hmac.compare_digest(expected, sig)


def generate_signature(payload: str, secret: str) -> str:
    """Generate a webhook signature (for testing)"""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    sig = create_hmac_signature(signed_payload, secret)
    return f"t={timestamp},v1={sig}"

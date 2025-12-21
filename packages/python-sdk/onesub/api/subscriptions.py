"""Subscriptions API"""

from typing import Any, Dict, Optional
from ..http import HttpClient
from ..utils import hash_email
from ..errors import ValidationError


class SubscriptionsApi:
    """Subscriptions API client"""

    def __init__(self, http: HttpClient, cache_enabled: bool = False, cache_ttl: int = 60):
        self._http = http
        self._cache_enabled = cache_enabled
        self._cache_ttl = cache_ttl
        self._cache: Dict[str, tuple] = {}  # key -> (data, expiry_time)

    def _get_cached(self, key: str) -> Optional[Dict[str, Any]]:
        if not self._cache_enabled:
            return None
        if key in self._cache:
            data, expiry = self._cache[key]
            import time
            if time.time() < expiry:
                return data
            del self._cache[key]
        return None

    def _set_cached(self, key: str, data: Dict[str, Any]) -> None:
        if self._cache_enabled:
            import time
            self._cache[key] = (data, time.time() + self._cache_ttl)

    def verify(
        self,
        onesub_user_id: Optional[str] = None,
        tool_user_id: Optional[str] = None,
        email_sha256: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify a user's subscription status.

        Args:
            onesub_user_id: The user's 1Sub ID (fastest)
            tool_user_id: Your tool's user ID (requires prior linking)
            email_sha256: SHA-256 hash of user's email

        Returns:
            Subscription data dict
        """
        if not onesub_user_id and not tool_user_id and not email_sha256:
            raise ValidationError(
                "At least one of onesub_user_id, tool_user_id, or email_sha256 must be provided"
            )

        # Check cache
        cache_key = onesub_user_id or tool_user_id or email_sha256
        cached = self._get_cached(f"sub:{cache_key}")
        if cached:
            return cached

        # Build request
        params = {}
        if onesub_user_id:
            params["oneSubUserId"] = onesub_user_id
        if tool_user_id:
            params["toolUserId"] = tool_user_id
        if email_sha256:
            params["emailSha256"] = email_sha256

        data = self._http.post("/tools/subscriptions/verify", params)

        # Cache response
        if data.get("oneSubUserId"):
            self._set_cached(f"sub:{data['oneSubUserId']}", data)
            if cache_key != data["oneSubUserId"]:
                self._set_cached(f"sub:{cache_key}", data)

        return data

    def verify_by_email(self, email: str) -> Dict[str, Any]:
        """
        Verify subscription by email address.
        Automatically hashes the email.
        """
        if not email:
            raise ValidationError("Email must be provided")
        return self.verify(email_sha256=hash_email(email))

    def verify_by_user_id(self, onesub_user_id: str) -> Dict[str, Any]:
        """Verify subscription by 1Sub user ID (fastest)"""
        if not onesub_user_id:
            raise ValidationError("User ID must be provided")
        return self.verify(onesub_user_id=onesub_user_id)

    def verify_by_tool_user_id(self, tool_user_id: str) -> Dict[str, Any]:
        """Verify subscription by your tool's user ID"""
        if not tool_user_id:
            raise ValidationError("Tool user ID must be provided")
        return self.verify(tool_user_id=tool_user_id)

    def is_active(
        self,
        onesub_user_id: Optional[str] = None,
        tool_user_id: Optional[str] = None,
        email_sha256: Optional[str] = None
    ) -> bool:
        """Check if user has an active subscription"""
        try:
            sub = self.verify(onesub_user_id, tool_user_id, email_sha256)
            return sub.get("active", False)
        except Exception:
            return False

    def invalidate_cache(self, onesub_user_id: str) -> None:
        """Invalidate cached subscription data"""
        if onesub_user_id in self._cache:
            del self._cache[f"sub:{onesub_user_id}"]

    def clear_cache(self) -> None:
        """Clear all cached subscription data"""
        self._cache.clear()

"""1Sub SDK Client"""

from typing import Optional
from .http import HttpClient
from .api import SubscriptionsApi, CreditsApi, LinksApi
from .webhooks import WebhooksClient
from .errors import ValidationError


class OneSub:
    """
    1Sub SDK Client.

    The main entry point for interacting with the 1Sub API.

    Example:
        >>> from onesub import OneSub
        >>>
        >>> client = OneSub(
        ...     api_key="sk-tool-xxx",
        ...     webhook_secret="whsec-xxx",
        ...     cache=True
        ... )
        >>>
        >>> # Verify subscription
        >>> sub = client.subscriptions.verify_by_email("user@example.com")
        >>>
        >>> # Consume credits
        >>> result = client.credits.consume(
        ...     user_id=sub["oneSubUserId"],
        ...     amount=10,
        ...     reason="Image generation",
        ...     idempotency_key="req-123"
        ... )
    """

    VERSION = "1.0.0"

    def __init__(
        self,
        api_key: str,
        webhook_secret: Optional[str] = None,
        base_url: str = "https://1sub.io/api/v1",
        timeout: int = 30,
        cache: bool = False,
        cache_ttl: int = 60,
        max_retries: int = 3,
        debug: bool = False
    ):
        """
        Create a new 1Sub client.

        Args:
            api_key: Your tool's API key (format: sk-tool-xxx)
            webhook_secret: Webhook secret for signature verification
            base_url: API base URL (default: https://1sub.io/api/v1)
            timeout: Request timeout in seconds (default: 30)
            cache: Enable response caching (default: False)
            cache_ttl: Cache TTL in seconds (default: 60)
            max_retries: Number of retry attempts (default: 3)
            debug: Enable debug logging (default: False)

        Raises:
            ValidationError: If API key is missing or invalid
        """
        if not api_key:
            raise ValidationError("api_key is required")

        if not api_key.startswith("sk-tool-"):
            raise ValidationError(
                "Invalid API key format. Expected format: sk-tool-xxx"
            )

        self.api_key = api_key
        self.webhook_secret = webhook_secret
        self.base_url = base_url
        self.timeout = timeout
        self.cache = cache
        self.cache_ttl = cache_ttl
        self.max_retries = max_retries
        self.debug = debug

        # Initialize HTTP client
        self._http = HttpClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            debug=debug
        )

        # Initialize API clients
        self.subscriptions = SubscriptionsApi(self._http, cache, cache_ttl)
        self.credits = CreditsApi(self._http)
        self.links = LinksApi(self._http)

        # Initialize webhooks client
        self.webhooks = WebhooksClient(webhook_secret or "", 300)

    @classmethod
    def create(cls, **kwargs) -> "OneSub":
        """
        Create a new client instance.
        Alternative to using OneSub() constructor.
        """
        return cls(**kwargs)

    def close(self) -> None:
        """Close the client and cleanup resources"""
        self._http.close()
        self.subscriptions.clear_cache()
        self.webhooks.clear_processed()

    def __enter__(self) -> "OneSub":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

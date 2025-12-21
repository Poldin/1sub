"""1Sub SDK Error Classes"""

from typing import Optional, Dict, Any


class OneSubError(Exception):
    """Base error class for 1Sub SDK errors"""

    def __init__(
        self,
        message: str,
        code: str = "UNKNOWN_ERROR",
        status_code: int = 0,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": self.code,
            "message": self.message,
            "status_code": self.status_code,
            "details": self.details,
        }


class AuthenticationError(OneSubError):
    """Error thrown when API key is invalid or missing"""

    def __init__(self, message: str = "Invalid or missing API key"):
        super().__init__(message, "UNAUTHORIZED", 401)


class NotFoundError(OneSubError):
    """Error thrown when resource is not found"""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)


class RateLimitError(OneSubError):
    """Error thrown when rate limit is exceeded"""

    def __init__(self, retry_after: int, limit: int, remaining: int):
        super().__init__(
            f"Rate limit exceeded. Retry after {retry_after} seconds.",
            "RATE_LIMIT_EXCEEDED",
            429
        )
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining


class InsufficientCreditsError(OneSubError):
    """Error thrown when user has insufficient credits"""

    def __init__(self, current_balance: int, required: int):
        super().__init__(
            f"Insufficient credits. Current: {current_balance}, Required: {required}",
            "INSUFFICIENT_CREDITS",
            400
        )
        self.current_balance = current_balance
        self.required = required
        self.shortfall = required - current_balance


class ValidationError(OneSubError):
    """Error thrown when request validation fails"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details)


class InvalidCodeError(OneSubError):
    """Error thrown when link code is invalid or expired"""

    def __init__(self, message: str = "Invalid or expired link code"):
        super().__init__(message, "INVALID_CODE", 400)


class WebhookVerificationError(OneSubError):
    """Error thrown when webhook signature verification fails"""

    def __init__(self, message: str = "Invalid webhook signature"):
        super().__init__(message, "WEBHOOK_VERIFICATION_FAILED", 401)


def parse_api_error(status_code: int, body: Dict[str, Any]) -> OneSubError:
    """Parse API error response and return appropriate error"""
    message = body.get("message") or body.get("error") or "Unknown error"

    if status_code == 401:
        raise AuthenticationError(message)
    elif status_code == 404:
        raise NotFoundError(message)
    elif status_code == 429:
        raise RateLimitError(
            body.get("retry_after", 60),
            body.get("limit", 100),
            body.get("remaining", 0)
        )
    elif status_code == 400:
        if body.get("error") == "INSUFFICIENT_CREDITS":
            raise InsufficientCreditsError(
                body.get("current_balance", 0),
                body.get("required", 0)
            )
        raise ValidationError(message, body)
    else:
        raise OneSubError(message, "API_ERROR", status_code, body)

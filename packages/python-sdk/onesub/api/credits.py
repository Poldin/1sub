"""Credits API"""

import time
import random
from typing import Any, Dict, Optional, Tuple, Union
from ..http import HttpClient
from ..errors import ValidationError, InsufficientCreditsError


class CreditsApi:
    """Credits API client"""

    def __init__(self, http: HttpClient):
        self._http = http

    def consume(
        self,
        user_id: str,
        amount: int,
        reason: str,
        idempotency_key: str
    ) -> Dict[str, Any]:
        """
        Consume credits from a user's balance.

        Args:
            user_id: The user's 1Sub ID
            amount: Amount of credits to consume (1 - 1,000,000)
            reason: Reason for credit consumption
            idempotency_key: Unique key for safe retries

        Returns:
            Dict with success, new_balance, transaction_id, is_duplicate

        Raises:
            InsufficientCreditsError: When user doesn't have enough credits
        """
        # Validate inputs
        if not user_id:
            raise ValidationError("user_id must be provided")
        if not isinstance(amount, int) or amount <= 0:
            raise ValidationError("amount must be a positive integer")
        if amount > 1_000_000:
            raise ValidationError("amount cannot exceed 1,000,000")
        if not reason:
            raise ValidationError("reason must be provided")
        if len(reason) > 500:
            raise ValidationError("reason cannot exceed 500 characters")
        if not idempotency_key:
            raise ValidationError("idempotency_key must be provided")
        if len(idempotency_key) > 255:
            raise ValidationError("idempotency_key cannot exceed 255 characters")

        data = self._http.post("/credits/consume", {
            "user_id": user_id,
            "amount": amount,
            "reason": reason,
            "idempotency_key": idempotency_key,
        })

        return {
            "success": data.get("success", True),
            "new_balance": data.get("new_balance"),
            "transaction_id": data.get("transaction_id"),
            "is_duplicate": data.get("is_duplicate", False),
        }

    def try_consume(
        self,
        user_id: str,
        amount: int,
        reason: str,
        idempotency_key: str
    ) -> Union[Tuple[bool, Dict[str, Any]], Tuple[bool, str, Optional[int]]]:
        """
        Try to consume credits, returning success/failure.

        Returns:
            (True, data) on success
            (False, error_message, shortfall) on failure
        """
        try:
            data = self.consume(user_id, amount, reason, idempotency_key)
            return (True, data)
        except InsufficientCreditsError as e:
            return (False, e.message, e.shortfall)
        except Exception as e:
            return (False, str(e), None)

    def has_enough(self, user_id: str, amount: int) -> bool:
        """
        Check if user has enough credits.
        Note: Balance may change between check and consume.
        """
        try:
            data = self._http.post("/tools/subscriptions/verify", {
                "oneSubUserId": user_id
            })
            balance = data.get("creditsRemaining", 0)
            return balance >= amount
        except Exception:
            return False

    @staticmethod
    def generate_idempotency_key(*parts: str) -> str:
        """Generate a unique idempotency key"""
        timestamp = hex(int(time.time()))[2:]
        rand = hex(random.randint(0, 0xFFFFFF))[2:]
        return "-".join(list(parts) + [timestamp, rand])

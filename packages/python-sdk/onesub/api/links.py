"""Links API"""

import re
from typing import Any, Dict, Optional, Tuple, Union
from ..http import HttpClient
from ..errors import ValidationError


class LinksApi:
    """Links API client for account linking via codes"""

    CODE_REGEX = re.compile(r"^[A-Z0-9]{6,10}$")

    def __init__(self, http: HttpClient):
        self._http = http

    def exchange_code(self, code: str, tool_user_id: str) -> Dict[str, Any]:
        """
        Exchange a link code for a 1Sub user ID.

        Args:
            code: The 6-character link code
            tool_user_id: Your tool's internal user ID

        Returns:
            Dict with linked, onesub_user_id, tool_user_id, linked_at

        Raises:
            InvalidCodeError: When code is invalid or expired
        """
        # Normalize and validate code
        normalized_code = code.upper().strip() if code else ""

        if not normalized_code:
            raise ValidationError("code must be provided")
        if not self.CODE_REGEX.match(normalized_code):
            raise ValidationError(
                "code must be 6-10 alphanumeric characters (e.g., ABC123)"
            )
        if not tool_user_id:
            raise ValidationError("tool_user_id must be provided")
        if len(tool_user_id) > 255:
            raise ValidationError("tool_user_id cannot exceed 255 characters")

        # NOTE: This endpoint has been deprecated in favor of the authorization code flow
        # See: https://1sub.io/docs/vendor-integration for the new flow
        data = self._http.post("/authorize/exchange", {
            "code": normalized_code,
            "redirectUri": tool_user_id,  # DEPRECATED: This API is being replaced
        })

        return {
            "linked": data.get("linked", True),
            "onesub_user_id": data.get("oneSubUserId"),
            "tool_user_id": data.get("toolUserId"),
            "linked_at": data.get("linkedAt"),
        }

    def try_exchange_code(
        self,
        code: str,
        tool_user_id: str
    ) -> Union[Tuple[bool, Dict[str, Any]], Tuple[bool, str]]:
        """
        Try to exchange a link code, returning success/failure.

        Returns:
            (True, data) on success
            (False, error_message) on failure
        """
        try:
            data = self.exchange_code(code, tool_user_id)
            return (True, data)
        except Exception as e:
            return (False, str(e))

    def is_valid_code_format(self, code: str) -> bool:
        """Validate link code format without API call"""
        if not code:
            return False
        return bool(self.CODE_REGEX.match(code.upper().strip()))

    @staticmethod
    def normalize_code(code: str) -> str:
        """Normalize a link code (uppercase, trimmed)"""
        return code.upper().strip()

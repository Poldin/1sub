"""1Sub Webhooks Client"""

import json
from typing import Any, Callable, Dict, Optional, Set
from .utils import verify_signature, generate_signature
from .errors import WebhookVerificationError


WebhookHandler = Callable[[Dict[str, Any]], None]


class WebhooksClient:
    """Webhooks client for verifying and handling webhook events"""

    def __init__(self, secret: str, tolerance_seconds: int = 300):
        self.secret = secret
        self.tolerance_seconds = tolerance_seconds
        self._handlers: Dict[str, WebhookHandler] = {}
        self._processed_events: Set[str] = set()
        self._max_processed = 10000

    def verify(self, payload: str, signature: str) -> bool:
        """
        Verify a webhook signature.

        Args:
            payload: Raw request body
            signature: Value of the X-1Sub-Signature header

        Returns:
            True if signature is valid
        """
        if not payload or not signature:
            return False
        return verify_signature(payload, signature, self.secret, self.tolerance_seconds)

    def verify_or_raise(self, payload: str, signature: str) -> None:
        """
        Verify and raise if invalid.

        Raises:
            WebhookVerificationError: If signature is invalid
        """
        if not self.verify(payload, signature):
            raise WebhookVerificationError()

    def construct_event(self, payload: str, signature: str) -> Dict[str, Any]:
        """
        Parse and verify a webhook event.

        Args:
            payload: Raw request body
            signature: Value of the X-1Sub-Signature header

        Returns:
            Parsed webhook event

        Raises:
            WebhookVerificationError: If signature is invalid
        """
        self.verify_or_raise(payload, signature)

        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            raise WebhookVerificationError("Invalid webhook payload")

    def on(self, event_type: str, handler: WebhookHandler) -> "WebhooksClient":
        """
        Register a handler for a specific event type.

        Args:
            event_type: Event type (e.g., 'subscription.activated')
            handler: Function to handle the event

        Returns:
            self for chaining
        """
        self._handlers[event_type] = handler
        return self

    def off(self, event_type: str) -> "WebhooksClient":
        """Remove a handler for a specific event type"""
        self._handlers.pop(event_type, None)
        return self

    def handle(self, event: Dict[str, Any]) -> bool:
        """
        Handle a webhook event by dispatching to registered handlers.

        Args:
            event: The webhook event

        Returns:
            True if event was handled
        """
        event_id = event.get("id", "")

        # Check for duplicate
        if event_id in self._processed_events:
            return True

        event_type = event.get("type", "")
        handler = self._handlers.get(event_type)

        if not handler:
            return False

        # Mark as processed
        self._mark_processed(event_id)

        handler(event)
        return True

    def process(self, payload: str, signature: str) -> Dict[str, Any]:
        """
        Process a raw webhook request (verify, parse, and handle).

        Args:
            payload: Raw request body
            signature: Value of the 1sub-signature header

        Returns:
            The parsed event after handling
        """
        event = self.construct_event(payload, signature)
        self.handle(event)
        return event

    def _mark_processed(self, event_id: str) -> None:
        """Mark an event as processed"""
        if len(self._processed_events) >= self._max_processed:
            # Remove oldest entry
            self._processed_events.pop()
        self._processed_events.add(event_id)

    def is_processed(self, event_id: str) -> bool:
        """Check if an event has been processed"""
        return event_id in self._processed_events

    def clear_processed(self) -> None:
        """Clear all processed event IDs"""
        self._processed_events.clear()

    def generate_test_signature(self, payload: str) -> str:
        """Generate a webhook signature (for testing)"""
        return generate_signature(payload, self.secret)

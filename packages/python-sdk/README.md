# onesub

Official 1Sub SDK for Python - Integrate subscription verification, credit consumption, and webhooks.

[![PyPI version](https://badge.fury.io/py/onesub.svg)](https://pypi.org/project/onesub/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
pip install onesub
```

## Quick Start

```python
from onesub import OneSub

# Initialize the client
client = OneSub(
    api_key="sk-tool-xxx",
    webhook_secret="whsec-xxx",  # Optional
    cache=True  # Enable caching
)

# Verify subscription by email
sub = client.subscriptions.verify_by_email("user@example.com")
print(f"Active: {sub['active']}")
print(f"Credits: {sub['creditsRemaining']}")

# Consume credits
result = client.credits.consume(
    user_id=sub["oneSubUserId"],
    amount=10,
    reason="Image generation",
    idempotency_key=f"gen-{time.time()}"
)
print(f"New balance: {result['new_balance']}")
```

## Configuration

```python
client = OneSub(
    # Required
    api_key="sk-tool-xxx",

    # Optional
    webhook_secret="whsec-xxx",       # For webhook verification
    base_url="https://1sub.io/api/v1",  # API base URL
    timeout=30,                        # Request timeout in seconds
    cache=False,                       # Enable response caching
    cache_ttl=60,                      # Cache TTL in seconds
    max_retries=3,                     # Retry attempts
    debug=False                        # Enable debug logging
)
```

## API Reference

### Subscriptions

```python
# Verify by 1Sub user ID (fastest)
sub = client.subscriptions.verify(onesub_user_id="uuid-123")

# Verify by email (auto-hashes)
sub = client.subscriptions.verify_by_email("user@example.com")

# Verify by your tool's user ID
sub = client.subscriptions.verify_by_tool_user_id("my-user-456")

# Check if subscription is active
is_active = client.subscriptions.is_active(onesub_user_id="uuid-123")

# Invalidate cache
client.subscriptions.invalidate_cache("uuid-123")
```

### Credits

```python
# Consume credits
result = client.credits.consume(
    user_id="uuid-123",
    amount=10,
    reason="API call",
    idempotency_key="req-abc-123"
)

# Try to consume (doesn't raise exception)
success, data_or_error = client.credits.try_consume(
    user_id="uuid-123",
    amount=10,
    reason="API call",
    idempotency_key="req-abc-123"
)

# Check if user has enough credits
has_enough = client.credits.has_enough("uuid-123", 100)

# Generate idempotency key
key = client.credits.generate_idempotency_key("image-gen", "user-123")
```

### Links (Link Codes)

```python
# Exchange a link code
link = client.links.exchange_code(
    code="ABC123",
    tool_user_id="my-user-456"
)
# Store link["onesub_user_id"] for future use

# Validate code format
if client.links.is_valid_code_format(user_input):
    link = client.links.exchange_code(user_input, tool_user_id)
```

### Webhooks

```python
# Verify signature
is_valid = client.webhooks.verify(raw_body, signature)

# Parse and verify event
event = client.webhooks.construct_event(raw_body, signature)

# Register event handlers
@client.webhooks.on("subscription.activated")
def handle_activated(event):
    print(f"User {event['data']['oneSubUserId']} subscribed!")

# Or use method chaining
client.webhooks.on("subscription.canceled", handle_canceled)

# Process webhook (verify + handle)
event = client.webhooks.process(raw_body, signature)
```

## Flask Example

```python
from flask import Flask, request, jsonify
from onesub import OneSub

app = Flask(__name__)
client = OneSub(
    api_key="sk-tool-xxx",
    webhook_secret="whsec-xxx"
)

@app.route("/api/premium", methods=["POST"])
def premium_feature():
    user_id = request.json.get("user_id")

    # Verify subscription
    sub = client.subscriptions.verify(onesub_user_id=user_id)
    if not sub["active"]:
        return jsonify({"error": "Subscription required"}), 403

    # Consume credits
    result = client.credits.consume(
        user_id=user_id,
        amount=10,
        reason="Premium feature",
        idempotency_key=f"feat-{request.json.get('request_id')}"
    )

    return jsonify({"credits_remaining": result["new_balance"]})

@app.route("/webhooks/1sub", methods=["POST"])
def webhook():
    signature = request.headers.get("1sub-signature")

    try:
        event = client.webhooks.construct_event(
            request.get_data(as_text=True),
            signature
        )
    except Exception:
        return "Invalid signature", 401

    if event["type"] == "subscription.activated":
        print(f"New subscriber: {event['data']['oneSubUserId']}")

    return jsonify({"received": True})
```

## Error Handling

```python
from onesub import (
    OneSub,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    InsufficientCreditsError,
    ValidationError
)

client = OneSub(api_key="sk-tool-xxx")

try:
    result = client.credits.consume(...)
except InsufficientCreditsError as e:
    print(f"Need {e.shortfall} more credits")
except RateLimitError as e:
    print(f"Retry after {e.retry_after} seconds")
except AuthenticationError:
    print("Invalid API key")
except NotFoundError:
    print("User not found")
except ValidationError as e:
    print(f"Invalid input: {e.message}")
```

## Context Manager

```python
# Automatically closes client when done
with OneSub(api_key="sk-tool-xxx") as client:
    sub = client.subscriptions.verify_by_email("user@example.com")
```

## Requirements

- Python 3.8+
- requests

## License

MIT

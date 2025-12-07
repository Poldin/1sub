# 1Sub Vendor Documentation

Complete technical documentation for integrating your tool with 1Sub.

## 📚 Documentation Structure

### Getting Started
- **[Index](index.mdx)** - Overview and introduction to 1Sub integration
- **[Quickstart](quickstart.mdx)** - Get integrated in 15 minutes

### Core Concepts
- **[Authentication](concepts/authentication.mdx)** - JWT tokens, API keys, and verification methods
- **[Tools and Accounts](concepts/tools-and-accounts.mdx)** - User linking and management
- **[Credits and Subscriptions](concepts/credits-and-subscriptions.mdx)** - Credit system and subscription models

### API Reference
- **[API Overview](api/overview.mdx)** - Base URLs, rate limits, and general info
- **[API Authentication](api/authentication.mdx)** - Detailed authentication guide
- **[API Reference](api/reference.mdx)** - Complete endpoint documentation
- **[Error Handling](api/errors.mdx)** - Error codes and handling strategies

### Webhooks
- **[Webhook Overview](webhooks/overview.mdx)** - Introduction to webhooks
- **[Webhook Events](webhooks/events.mdx)** - All event types and payloads
- **[Security and Signing](webhooks/security-and-signing.mdx)** - HMAC verification
- **[Testing Webhooks](webhooks/testing.mdx)** - Local testing strategies

### Code Examples
- **[Node.js Example](examples/node.mdx)** - Complete Express implementation
- **[Python Example](examples/python.mdx)** - Complete Flask implementation
- **[cURL Examples](examples/curl.mdx)** - Raw API requests

### Troubleshooting
- **[Common Errors](troubleshooting/common-errors.mdx)** - Solutions to frequent issues
- **[Integration Checklist](troubleshooting/checklist.mdx)** - Pre-launch verification

## 🚀 Quick Links

### Most Used Resources
1. **API Endpoints** (all vendor-facing):
   - `POST /api/v1/verify-user` - Verify JWT tokens (alternative to JWKS)
   - `POST /api/v1/refresh-token` - Refresh expired access tokens
   - `POST /api/v1/tools/subscriptions/verify` - Check subscription status
   - `POST /api/v1/credits/consume` - Deduct user credits
   - `POST /api/v1/tools/link/exchange-code` - Link code fallback flow
   - `GET /.well-known/1sub-jwks.json` - JWKS public keys

2. **Webhook Events** (all 8 types):
   - `subscription.activated` - New subscription created
   - `subscription.canceled` - Subscription cancelled
   - `subscription.updated` - Subscription plan changed
   - `purchase.completed` - One-time purchase completed
   - `user.credit_low` - User credits below threshold
   - `user.credit_depleted` - User out of credits
   - `user.session_expired` - User session expired
   - `tool.status_changed` - Tool enabled/disabled

### Important Notes

#### Authentication Methods
1. **JWKS Verification (Recommended)** - Client-side JWT verification using public keys
   - Faster, no network call
   - Better for high-volume APIs
   - Requires JWT library (jose, PyJWT, etc.)

2. **API Verification (Alternative)** - Server-side verification via `/api/v1/verify-user`
   - Simpler implementation
   - Good for quick prototypes
   - Rate limited to 60 requests/minute

See [Authentication Concepts](concepts/authentication.mdx#token-verification-methods) for detailed comparison.

#### Rate Limits
- `/api/v1/verify-user`: 60 requests/minute per IP
- `/api/v1/refresh-token`: 30 requests/minute per IP
- `/api/v1/tools/subscriptions/verify`: 100 requests/minute per API key
- `/api/v1/credits/consume`: 100 requests/minute per API key
- `/api/v1/tools/link/exchange-code`: 30 requests/minute per API key

#### Base URL
All API endpoints use: `https://1sub.io`

## 📦 What's Documented

### Complete Coverage
- ✅ All 5 vendor-facing REST API endpoints
- ✅ All 8 webhook event types with payloads
- ✅ Both JWT verification methods (JWKS + API)
- ✅ Token refresh flow for long-lived sessions
- ✅ Complete request/response examples
- ✅ All error codes and handling strategies
- ✅ Rate limits matching implementation
- ✅ Security best practices
- ✅ Working code examples (Node.js, Python, cURL)
- ✅ Integration testing guide
- ✅ Troubleshooting and common issues

### Recent Updates (2025-12-07)
- ✅ Added `/api/v1/verify-user` endpoint documentation
- ✅ Added `/api/v1/refresh-token` endpoint documentation
- ✅ Documented both JWKS and API verification approaches
- ✅ Fixed rate limit discrepancy (credits/consume: 100/min not 300/min)
- ✅ Corrected response fields for credit consumption endpoint
- ✅ Added alternative verification methods to quickstart
- ✅ Enhanced Node.js examples with token refresh patterns
- ✅ Verified all field names match implementation (snake_case)

## 🔍 Verification Status

All documentation has been verified against the codebase implementation:
- Response field names: ✅ Verified
- Response field types: ✅ Verified
- HTTP status codes: ✅ Verified
- Error messages: ✅ Verified
- Rate limits: ✅ Verified
- Webhook payloads: ✅ Verified
- Code examples: ✅ Verified

## 🛠️ Development

This documentation is built with [Mintlify](https://mintlify.com) and configured via `docs.json`.

### Local Development
```bash
# Install Mintlify CLI
npm i -g mintlify

# Start local server
cd docs
mintlify dev
```

### Documentation Standards
See [.cursor/rules/docs.mdc](.cursor/rules/docs.mdc) for writing guidelines and Mintlify component usage.

## 📞 Support

- **Email**: support@1sub.io
- **Discord**: https://discord.gg/R87YSYpKK
- **Vendor Dashboard**: https://1sub.io/vendor-dashboard

## 📄 License

This documentation is proprietary to 1Sub.io.

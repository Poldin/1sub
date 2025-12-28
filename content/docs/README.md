# 1Sub Vendor Documentation

Complete technical documentation for integrating your tool with 1Sub.

## 📚 Documentation Structure

### Getting Started
- **[Index](index.mdx)** - Overview and introduction to 1Sub integration
- **[Quickstart](quickstart.mdx)** - Get integrated in 15 minutes

### Core Concepts
- **[Monetization Models](concepts/monetization-models.mdx)** - Choose between subscriptions, credits, and one-time purchases
- **[Tools and Accounts](concepts/tools-and-accounts.mdx)** - User linking and management
- **[Credits and Subscriptions](concepts/credits-and-subscriptions.mdx)** - Credit system, subscription models, and one-time purchases
- **[Vendor Payouts](concepts/vendor-payouts.mdx)** - How to get paid, payout schedules, and Stripe Connect setup
- **[Authentication](concepts/authentication.mdx)** - JWT tokens, API keys, and verification methods

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

### Testing & Guides
- **[Testing Sandbox](guides/testing-sandbox.mdx)** - Local testing strategies

### Troubleshooting
- **[Common Errors](troubleshooting/common-errors.mdx)** - Solutions to frequent issues
- **[Integration Checklist](troubleshooting/checklist.mdx)** - Pre-launch verification

## 🚀 Quick Links

### Most Used Resources
1. **API Endpoints** (all vendor-facing):
   - `POST /api/v1/authorize/exchange` - Exchange authorization code for verification token
   - `POST /api/v1/verify` - Verify access with verification token
   - `POST /api/v1/credits/consume` - Deduct user credits

2. **Webhook Events** (all 13 types):
   - `subscription.created` - New subscription created
   - `subscription.activated` - Subscription activated
   - `subscription.updated` - Subscription plan changed
   - `subscription.canceled` - Subscription cancelled
   - `purchase.completed` - One-time purchase completed
   - `entitlement.granted` - User granted access via authorization
   - `entitlement.revoked` - User access revoked
   - `entitlement.changed` - User plan/features changed
   - `credits.consumed` - Credits consumed by user
   - `user.credit_low` - User credits below threshold
   - `user.credit_depleted` - User out of credits
   - `tool.status_changed` - Tool enabled/disabled
   - `verify.required` - Security event requiring verification

### Important Notes

#### Authentication Flow
1. **Authorization** - Users click "Launch Tool" on 1Sub → redirected to your callback URL with auth code
2. **Exchange** - Your server exchanges the code for a verification token via `/api/v1/authorize/exchange`
3. **Verify** - Ongoing access checks using verification token via `/api/v1/verify`
4. **Token Rotation** - Tokens are automatically rotated when near expiry (30 day lifetime)

#### Rate Limits
- `/api/v1/authorize/exchange`: 60 requests/minute per API key
- `/api/v1/verify`: 120 requests/minute per API key
- `/api/v1/credits/consume`: 100 requests/minute per API key

#### Base URL
All API endpoints use: `https://1sub.io`

## 📦 What's Documented

### Complete Coverage
- ✅ All 3 vendor-facing REST API endpoints
- ✅ All 13 webhook event types with payloads
- ✅ All monetization models (subscriptions, credits, one-time purchases)
- ✅ Vendor payout and revenue documentation
- ✅ OAuth 2.0-like authorization flow
- ✅ Verification token rotation for long-lived sessions
- ✅ Complete request/response examples
- ✅ All error codes and handling strategies
- ✅ Rate limits matching implementation
- ✅ Security best practices (HMAC webhook signing)
- ✅ Working code examples (Node.js, Python, cURL)
- ✅ Integration testing guide
- ✅ Troubleshooting and common issues

### Recent Updates (2025-12-26)
- ✅ **BREAKING**: Migrated from email/link-code auth to OAuth 2.0-like authorization flow
- ✅ Updated all endpoints to match new API structure
- ✅ Documented `/api/v1/authorize/exchange` and `/api/v1/verify` endpoints
- ✅ Removed deprecated endpoints (`/tools/subscriptions/verify`, `/tools/link/exchange-code`)
- ✅ Updated all code examples for new authorization flow
- ✅ Added verification token rotation documentation
- ✅ Updated webhook signature header to `X-1Sub-Signature`
- ✅ Simplified integration flow for better developer experience

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

This documentation is hosted on Mintlify cloud at https://1sub-6e656888.mintlify.dev and configured via `docs.json`.

### Making Changes

To update the documentation:
1. Edit files in `content/docs/`
2. Commit and push to the main branch
3. Changes will be automatically deployed to Mintlify

### Documentation Standards
See [.cursor/rules/docs.mdc](.cursor/rules/docs.mdc) for writing guidelines and Mintlify component usage.

### Internal Documentation
Internal architecture and implementation docs are located in `documentation/internal/` and are NOT published to the public docs site.

## 📞 Support

- **Email**: support@1sub.io
- **Discord**: https://discord.gg/R87YSYpKK
- **Vendor Dashboard**: https://1sub.io/vendor-dashboard

## 📄 License

This documentation is proprietary to 1Sub.io.

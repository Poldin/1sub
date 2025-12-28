# Internal Documentation (Team Only)

**⚠️ THESE DOCS ARE NOT PUBLIC**

This folder contains internal architecture and implementation details for the 1Sub team.

## Files

- **architecture.mdx** - System architecture, database schema, service layer design
- **checkout-flows.mdx** - Internal checkout implementation details
- **deployment.mdx** - Deployment guide with environment variables

## Access

These docs are:
- ✅ Available to team members via git repository
- ✅ Used for onboarding and internal reference
- ❌ NOT published to public docs site (https://1sub-6e656888.mintlify.dev)
- ❌ NOT indexed by Mintlify search
- ❌ NOT accessible to vendors

## Public Docs Location

Public vendor documentation is at: `content/docs/`

## Making Changes

Edit files in this folder as needed for team documentation.
Changes will NOT affect public docs.

## Why These Are Internal

These docs contain sensitive implementation details that must NOT be exposed:

- **Database Schema:** Table names, column structures, relationships
- **Service File Paths:** Internal code organization
- **Cache Implementation:** Redis TTL, eviction strategies
- **Internal Endpoints:** Non-public API routes
- **Environment Variables:** Secret key formats and structures
- **Pricing Details:** Discount structures, internal pricing logic

Exposing this information would:
- Enable targeted attacks (SQL injection, timing attacks)
- Reveal business logic that competitors could exploit
- Confuse vendors about the correct integration path
- Create security vulnerabilities

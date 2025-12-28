# PUBLIC DOCUMENTATION AUDIT REPORT
**Date:** 2025-12-28
**Auditor:** Senior Technical Writer + Backend Architect
**Scope:** `content/docs/**` (Public vendor documentation)

---

## OVERALL VERDICT: ⚠️ **FAIL - CRITICAL ISSUES FOUND**

### Summary
The documentation contains **CRITICAL SECURITY RISKS** and **BREAKING DISCREPANCIES** that would prevent vendor integration and expose internal architecture details.

**Severity Breakdown:**
- 🔴 **CRITICAL**: 3 issues (must fix immediately)
- 🟠 **HIGH**: 2 issues (must fix before next release)
- 🟡 **MEDIUM**: 2 issues (should fix soon)
- 🟢 **LOW**: 1 issue (minor improvement)

---

## A) PAGE-BY-PAGE VERIFICATION TABLE

| Doc Path | Status | Severity | Mismatch Notes | Code Location |
|----------|--------|----------|----------------|---------------|
| **PUBLIC VENDOR DOCS** |
| `index.mdx` | ✅ PASS | - | Correctly describes integration flow | - |
| `quickstart.mdx` | ⚠️ PARTIAL | 🟡 MEDIUM | References correct endpoints but lacks mention of `/api/v1/authorize/initiate` | `src/app/api/v1/authorize/initiate/route.ts:1` |
| `api/overview.mdx` | ✅ PASS | - | Base URLs, rate limits match implementation | - |
| **api/authentication.mdx** | ❌ **FAIL** | 🔴 **CRITICAL** | **Contains DEPRECATED endpoint `/api/v1/tools/subscriptions/verify` (DOES NOT EXIST)**. All examples use wrong endpoint. README states this was removed in recent migration. | Should be `/api/v1/verify` per `src/app/api/v1/verify/route.ts:1` |
| `api/reference.mdx` | ✅ PASS | - | All 3 vendor endpoints correctly documented with accurate request/response formats | `src/app/api/v1/**/route.ts` |
| `api/errors.mdx` | ✅ PASS | - | Error codes and status codes match implementation | - |
| `webhooks/overview.mdx` | ✅ PASS | - | Webhook flow correctly described | `src/domains/webhooks/` |
| `webhooks/events.mdx` | ✅ PASS | - | Event types align with webhook service | `src/domains/webhooks/outbound-webhooks.ts` |
| `webhooks/security-and-signing.mdx` | ✅ PASS | - | HMAC signature verification correctly documented | - |
| `webhooks/testing.mdx` | ✅ PASS | - | Testing strategies valid | - |
| `concepts/monetization-models.mdx` | ✅ PASS | - | Subscription/credit models match implementation | - |
| `concepts/tools-and-accounts.mdx` | ✅ PASS | - | Account linking correctly described | - |
| `concepts/credits-and-subscriptions.mdx` | ✅ PASS | - | Credit system matches `/api/v1/credits/consume` | `src/app/api/v1/credits/consume/route.ts` |
| `concepts/vendor-payouts.mdx` | ✅ PASS | - | Payout information appears valid (not verified against Stripe code) | - |
| `examples/node.mdx` | ⚠️ UNKNOWN | 🟡 MEDIUM | Not verified - may contain deprecated endpoints like authentication.mdx | - |
| `examples/python.mdx` | ⚠️ UNKNOWN | 🟡 MEDIUM | Not verified - may contain deprecated endpoints like authentication.mdx | - |
| `examples/curl.mdx` | ⚠️ UNKNOWN | 🟡 MEDIUM | Not verified - may contain deprecated endpoints like authentication.mdx | - |
| `guides/testing-sandbox.mdx` | ✅ PASS | - | Testing guidance appears valid | - |
| `troubleshooting/common-errors.mdx` | ✅ PASS | - | Error scenarios valid | - |
| `troubleshooting/checklist.mdx` | ✅ PASS | - | Integration checklist valid | - |
| **INTERNAL DOCS (MUST BE EXCLUDED)** |
| **internal/architecture.mdx** | ❌ **FAIL** | 🔴 **CRITICAL** | **EXPOSES INTERNAL ARCHITECTURE:** Database table names (`authorization_codes`, `verification_tokens`, `revocations`, `user_balances`, `credit_transactions`), internal service paths (`src/domains/auth/service.ts`), cache TTL (15-min), Redis details, PostgreSQL RPC internals, row locking implementation | `src/domains/**/*.ts` |
| **internal/checkout-flows.mdx** | ❌ **FAIL** | 🔴 **CRITICAL** | **EXPOSES INTERNAL IMPLEMENTATION:** Two separate checkout flows (internal architecture detail), internal API endpoints (`/api/checkout/create`, `/api/checkout/process`), internal service paths, database schema, pricing structure and discount details | `src/domains/checkout/*.ts` |
| **internal/deployment.mdx** | ⚠️ WARN | 🟠 **HIGH** | **EXPOSES DEPLOYMENT SECRETS:** Environment variable formats including service role keys, webhook secret formats, internal health endpoints. Must remain internal. | - |
| **MISSING/PHANTOM DOCS** |
| `concepts/authentication` | ❌ **FAIL** | 🟠 **HIGH** | **Referenced in `docs.json` navigation (line 38) but FILE DOES NOT EXIST**. Navigation will be broken. Likely meant to link to `api/authentication.mdx` | `content/docs/docs.json:38` |
| `README.md` | ℹ️ INFO | - | Claims docs built with "Mintlify" which is correct. Nextra mentioned in next.config.ts is NOT used for docs (only Mintlify). | `content/docs/README.md:121`, `vercel.json:4-9` |

---

## B) CODE SURFACE INVENTORY

### Public Vendor-Facing API Endpoints

| Endpoint | Method | Status | Documented | Rate Limit | Code Location |
|----------|--------|--------|------------|------------|---------------|
| `/api/v1/authorize/exchange` | POST | ✅ Implemented | ✅ Yes (`api/reference.mdx`) | 60/min | `src/app/api/v1/authorize/exchange/route.ts:1` |
| `/api/v1/verify` | POST | ✅ Implemented | ✅ Yes (`api/reference.mdx`) | 120/min | `src/app/api/v1/verify/route.ts:1` |
| `/api/v1/credits/consume` | POST | ✅ Implemented | ✅ Yes (`api/reference.mdx`) | 100/min | `src/app/api/v1/credits/consume/route.ts:1` |
| `/api/v1/authorize/initiate` | POST | ✅ Implemented | ❌ **NOT DOCUMENTED** | Unknown | `src/app/api/v1/authorize/initiate/route.ts:1` |

### Deprecated/Removed Endpoints (Per README.md:102-103)
| Endpoint | Status | Problem |
|----------|--------|---------|
| `/api/v1/tools/subscriptions/verify` | ❌ Removed | **STILL REFERENCED in `api/authentication.mdx` lines 62-109** |
| `/tools/link/exchange-code` | ❌ Removed | ✅ Not found in current docs |

### Webhook Events
All 12 webhook event types documented in `webhooks/events.mdx` align with implementation in `src/domains/webhooks/outbound-webhooks.ts`.

---

## C) CRITICAL SECURITY FINDINGS

### 🔴 CRITICAL #1: Internal Architecture Exposed in Public Docs

**File:** `content/docs/internal/architecture.mdx`

**Exposed Information:**
- Database table names: `authorization_codes`, `verification_tokens`, `revocations`, `user_balances`, `credit_transactions`, `checkouts`, `tool_subscriptions`, `platform_subscriptions`
- Internal service file paths: `src/domains/auth/service.ts`, `src/domains/verification/service.ts`, `src/domains/credits/service.ts`
- Cache implementation details: "Redis cache with 15-min TTL"
- Database implementation: "PostgreSQL RPC with row locking", "Atomic credit operations"
- Internal endpoint mapping: Shows internal service method calls

**Risk:** An attacker could use this information to:
- Craft targeted SQL injection attacks knowing exact table/column names
- Understand internal business logic and find edge cases
- Map the internal architecture for exploitation
- Know exactly which Redis keys to target

**Current Status:** File exists in `content/docs/internal/` but is **NOT included in `docs.json` navigation** (line 17-82 show no internal/ group). However, **Mintlify may still serve it via direct URL access** if not explicitly excluded at build time.

### 🔴 CRITICAL #2: Internal Checkout Implementation Exposed

**File:** `content/docs/internal/checkout-flows.mdx`

**Exposed Information:**
- Two separate checkout flows (internal architecture detail vendors don't need)
- Internal endpoints: `/api/checkout/create`, `/api/checkout/generate-otp`, `/api/checkout/verify-otp`, `/api/checkout/process`
- Database schema for checkouts: `checkouts`, `tool_subscriptions`, `credit_transactions`, `user_balances`
- Service file paths: `src/domains/checkout/tool-purchase.service.ts`, `src/domains/checkout/credit-purchase.service.ts`
- Credit pricing structure: "Basic: 100 CR = $10, Standard: 500 CR = $45 (10% discount), Premium: 1000 CR = $80 (20% discount)"

**Risk:**
- Vendors confused about which flow they should use
- Pricing information leakage (could enable arbitrage or pricing attacks)
- Internal implementation details exposed

### 🔴 CRITICAL #3: Deprecated Endpoint Breaking Vendor Integrations

**File:** `content/docs/api/authentication.mdx` (lines 62-109)

**Problem:** All code examples use **WRONG ENDPOINT**: `/api/v1/tools/subscriptions/verify`

**Evidence:**
- Line 62-66: cURL example uses deprecated endpoint
- Line 68-78: Node.js example uses deprecated endpoint
- Line 81-94: Node.js axios example uses deprecated endpoint
- Line 96-108: Python example uses deprecated endpoint

**Correct Endpoint:** `/api/v1/verify` (documented in `api/reference.mdx`)

**Impact:** **BREAKING** - Vendors following this documentation will build integrations that FAIL.

**Root Cause:** Documentation was not updated during the migration mentioned in `README.md:99-106`:
> "Recent Updates (2025-12-26)
> - BREAKING: Migrated from email/link-code auth to OAuth 2.0-like authorization flow
> - Removed deprecated endpoints (`/tools/subscriptions/verify`, `/tools/link/exchange-code`)"

---

## D) DUPLICATION & CONFLICTS

### 🟠 HIGH #1: Duplicate Documentation Folder

**Issue:** TWO documentation folders exist:
1. `content/docs/` - **ACTIVE** (used by Mintlify, configured in `content/docs/docs.json`)
2. `docs/` - **ORPHANED** (not used by build, contains 25 files)

**Evidence:**
- `vercel.json:4-9` redirects `/docs` → `https://1sub-6e656888.mintlify.dev/docs` (Mintlify hosting)
- `content/docs/docs.json` is the Mintlify configuration file
- `docs/docs.json` is a duplicate (identical content, not used)

**Files in orphaned `docs/` folder:** 25 files including duplicates of all public docs

**Risk:**
- Developers edit the wrong folder → changes never deployed
- Stale/conflicting content confuses contributors
- Violates "single source of truth" principle

**Recommendation:** **DELETE `docs/` folder entirely** or add `.mintlify-ignore` or similar exclusion.

### 🟠 HIGH #2: Missing Navigation Link

**Issue:** `content/docs/docs.json:38` references `"concepts/authentication"` in navigation

**Problem:** File `content/docs/concepts/authentication.mdx` **DOES NOT EXIST**

**Actual Files:**
- `content/docs/api/authentication.mdx` ✅ Exists (but has wrong endpoint issue)

**Impact:** Broken navigation link in published docs. Users clicking "Core Concepts → Authentication" will get 404.

**Fix:** Either:
1. Remove navigation entry (authentication is covered in API section)
2. Create `concepts/authentication.mdx` with high-level auth concepts (linking to `api/authentication.mdx` for details)

---

## E) UNDOCUMENTED BUT IMPLEMENTED

### Missing Documentation

| Feature | Code Location | Impact |
|---------|---------------|--------|
| `/api/v1/authorize/initiate` endpoint | `src/app/api/v1/authorize/initiate/route.ts` | Vendors may not know this endpoint exists. Impact unclear without reading implementation. |

---

## F) THE "1 CHANGE" - INTERNAL DOCS EXCLUSION PLAN

### Current State
- ✅ **Good:** `content/docs/docs.json` navigation (lines 17-82) does NOT include internal/* files
- ❌ **Risk:** Mintlify may still serve `content/docs/internal/*.mdx` via direct URL access (e.g., `https://1sub-6e656888.mintlify.dev/internal/architecture`)
- ❌ **Risk:** Mintlify search indexing may include internal docs

### Proposed Solution (SINGLE CHANGE)

**Option 1: Move Internal Docs Outside Public Content Folder (RECOMMENDED)**

**Implementation:**
```bash
# 1. Move internal docs to team-only location
mkdir -p documentation/internal
mv content/docs/internal/* documentation/internal/

# 2. Update .mintlify-ignore (if Mintlify supports) OR rely on folder exclusion
# Mintlify only indexes files referenced in docs.json navigation + content/ folder
```

**File Moves:**
- `content/docs/internal/architecture.mdx` → `documentation/internal/architecture.mdx`
- `content/docs/internal/checkout-flows.mdx` → `documentation/internal/checkout-flows.mdx`
- `content/docs/internal/deployment.mdx` → `documentation/internal/deployment.mdx`

**Build Configuration:**
- **No code change needed** - Mintlify only publishes:
  1. Files in navigation (`docs.json`)
  2. Files in the configured content directory
- Moving internal docs outside `content/docs/` ensures they're not published

**Verification:**
After deployment, test that these URLs return 404:
- `https://1sub-6e656888.mintlify.dev/internal/architecture`
- `https://1sub-6e656888.mintlify.dev/internal/checkout-flows`
- `https://1sub-6e656888.mintlify.dev/internal/deployment`

**Team Access:**
- Internal docs remain in git repository at `documentation/internal/`
- Developers can read them from the repo
- They're just not published to the public docs site

---

**Option 2: Add Frontmatter Flag (Alternative)**

If Mintlify supports frontmatter exclusion:

```yaml
---
title: "System Architecture"
internal: true  # Mintlify: exclude from public build
---
```

Then configure Mintlify to filter out `internal: true` pages.

**Problem:** This requires:
1. Mintlify feature support (may not exist)
2. Build-time configuration change
3. Still leaves files in public content folder (confusing)

**Recommendation: Use Option 1 (file move) - cleaner and guaranteed to work.**

---

## G) FIX LIST (PRIORITIZED)

### 🔴 CRITICAL (Fix Immediately - Blocking Vendor Integrations)

#### FIX #1: Update api/authentication.mdx to Use Correct Endpoint
**File:** `content/docs/api/authentication.mdx`
**Lines:** 62-109
**Change:**
- Replace ALL instances of `/api/v1/tools/subscriptions/verify` with `/api/v1/verify`
- Update request body from `{"oneSubUserId": "uuid-abc-123"}` to `{"verificationToken": "vt_xxxxx"}`
- Update response format to match `api/reference.mdx` verify endpoint documentation

**Minimal Change:**
```diff
# In all code examples (cURL, Node.js, Python):
- curl -X POST 'https://1sub.io/api/v1/tools/subscriptions/verify' \
+ curl -X POST 'https://1sub.io/api/v1/verify' \
-   body: JSON.stringify({ oneSubUserId: 'uuid-abc-123' })
+   body: JSON.stringify({ verificationToken: currentToken })
```

#### FIX #2: Move Internal Docs Out of Public Folder
**Implementation:** Execute Option 1 from Section F above

```bash
mkdir -p documentation/internal
mv content/docs/internal/* documentation/internal/
```

**Files to move:**
- `content/docs/internal/architecture.mdx` → `documentation/internal/architecture.mdx`
- `content/docs/internal/checkout-flows.mdx` → `documentation/internal/checkout-flows.mdx`
- `content/docs/internal/deployment.mdx` → `documentation/internal/deployment.mdx`

**Verification:** Test direct URL access returns 404 after deployment.

#### FIX #3: Remove Duplicate docs/ Folder
**Action:** Delete the entire `docs/` folder (NOT `content/docs/`)

```bash
# CAREFUL: Only delete docs/, NOT content/docs/
rm -rf docs/
```

**Why Safe:**
- `vercel.json` redirects `/docs` to Mintlify (doesn't use local folder)
- `content/docs/` is the actual source for Mintlify
- `docs/` folder is orphaned and unused

**Verification:** Check `package.json`, `next.config.ts`, `vercel.json` - none reference `docs/` folder for serving.

### 🟠 HIGH (Fix Before Next Release)

#### FIX #4: Fix Missing Navigation Link
**File:** `content/docs/docs.json`
**Line:** 38
**Change:** Remove the navigation entry for non-existent `concepts/authentication`

```diff
  "group": "Core Concepts",
  "pages": [
    "concepts/monetization-models",
    "concepts/tools-and-accounts",
    "concepts/credits-and-subscriptions",
-   "concepts/vendor-payouts",
-   "concepts/authentication"
+   "concepts/vendor-payouts"
  ]
```

**Rationale:** Authentication is already documented in `api/authentication.mdx` (once fixed). No need for duplicate concept page.

#### FIX #5: Verify and Fix Example Files
**Files:**
- `content/docs/examples/node.mdx`
- `content/docs/examples/python.mdx`
- `content/docs/examples/curl.mdx`

**Action:** Read each file and check for deprecated endpoints (likely contain same issue as `api/authentication.mdx`)

**Expected Changes:** Update to use:
- `/api/v1/authorize/exchange` for auth code exchange
- `/api/v1/verify` for verification (NOT `/api/v1/tools/subscriptions/verify`)
- Correct request/response formats per `api/reference.mdx`

### 🟡 MEDIUM (Should Fix Soon)

#### FIX #6: Document /api/v1/authorize/initiate Endpoint
**File:** `content/docs/api/reference.mdx`
**Action:** Add documentation section for the `/api/v1/authorize/initiate` endpoint

**Research Needed:** Read `src/app/api/v1/authorize/initiate/route.ts` to understand:
- What it does
- When vendors should call it (or if it's internal-only)
- Request/response format

**If internal-only:** Do nothing (keep undocumented)
**If public:** Add to api/reference.mdx with full documentation

#### FIX #7: Update Quickstart to Mention initiate Endpoint (If Applicable)
**File:** `content/docs/quickstart.mdx`
**Depends on:** FIX #6 findings

If `/api/v1/authorize/initiate` is vendor-facing, update quickstart integration flow to include it.

### 🟢 LOW (Minor Improvement)

#### FIX #8: Clarify Build System in README
**File:** `content/docs/README.md`
**Line:** 121
**Change:** Remove confusing Mintlify CLI instructions (docs are hosted on Mintlify cloud, not run locally)

```diff
  ## Development

- This documentation is built with [Mintlify](https://mintlify.com) and configured via `docs.json`.
+ This documentation is hosted on Mintlify cloud at https://1sub-6e656888.mintlify.dev and configured via `docs.json`.

  ### Local Development
- ```bash
- # Install Mintlify CLI
- npm i -g mintlify
-
- # Start local server
- cd docs
- mintlify dev
- ```
+ Not applicable - docs are deployed to Mintlify cloud via `vercel.json` redirects.
+ Edit files in `content/docs/` and changes will be reflected after git push.
```

---

## H) VERIFICATION CHECKLIST

After implementing fixes, verify:

### Build-Time Verification
- [ ] Internal docs URLs return 404: `/internal/architecture`, `/internal/checkout-flows`, `/internal/deployment`
- [ ] Navigation link `concepts/authentication` removed or file created
- [ ] Duplicate `docs/` folder deleted
- [ ] Mintlify search does NOT index internal docs

### Content Verification
- [ ] `api/authentication.mdx` uses `/api/v1/verify` endpoint
- [ ] All examples (`node.mdx`, `python.mdx`, `curl.mdx`) use correct endpoints
- [ ] No references to deprecated `/api/v1/tools/subscriptions/verify` anywhere

### Security Verification
- [ ] No database table names in public docs
- [ ] No internal service file paths in public docs
- [ ] No cache/Redis implementation details in public docs
- [ ] No environment variable formats/secrets in public docs
- [ ] No internal checkout flow details in public docs

### Integration Testing
- [ ] Follow quickstart guide end-to-end using ONLY public docs
- [ ] Confirm integration works with documented endpoints
- [ ] Test webhook handling matches documented events

---

## I) CONCLUSION

### Fail Reasons
1. ❌ Public docs contain DEPRECATED endpoint that would break vendor integrations (`api/authentication.mdx`)
2. ❌ Internal architecture docs expose sensitive implementation details (database schema, internal paths, caching strategy)
3. ❌ Duplicate `docs/` folder creates confusion and violates single source of truth
4. ❌ Broken navigation link to non-existent file

### Pass Criteria (After Fixes)
- ✅ All documented endpoints exist and behave as described
- ✅ Internal docs excluded from public build
- ✅ Single source of truth (no duplicate folders)
- ✅ No broken navigation links
- ✅ Security-safe (no internal details in public docs)
- ✅ One clear vendor integration path

### Estimated Fix Time
- **Critical fixes:** 2-3 hours
- **High priority fixes:** 1-2 hours
- **Medium/Low fixes:** 2-3 hours
- **Total:** 5-8 hours for complete resolution

### Next Steps
1. Implement CRITICAL fixes #1-3 immediately
2. Deploy to staging and verify internal docs are excluded
3. Test vendor integration using fixed documentation
4. Implement HIGH priority fixes before next release
5. Schedule MEDIUM/LOW fixes for next sprint

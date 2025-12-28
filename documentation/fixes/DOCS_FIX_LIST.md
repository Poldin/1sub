# DOCUMENTATION FIX LIST
**Date:** 2025-12-28
**Source:** PUBLIC_DOCS_AUDIT_REPORT.md
**Priority:** Immediate action required for CRITICAL issues

---

## 🔴 CRITICAL (Fix Immediately - Blocking Vendor Integrations)

### FIX #1: Update api/authentication.mdx - DEPRECATED ENDPOINT

**File:** `content/docs/api/authentication.mdx`
**Lines:** 62-109
**Issue:** All code examples use WRONG, NON-EXISTENT endpoint: `/api/v1/tools/subscriptions/verify`
**Impact:** BREAKING - Vendors following this doc will build integrations that FAIL

**Changes Required:**

1. **cURL Example (lines 62-66):**
```diff
- curl -X POST 'https://1sub.io/api/v1/tools/subscriptions/verify' \
+ curl -X POST 'https://1sub.io/api/v1/verify' \
   -H 'Authorization: Bearer sk-tool-xxxxxxxxxxxxxxxxxxxxxxxx' \
   -H 'Content-Type: application/json' \
-  -d '{"oneSubUserId": "uuid-abc-123"}'
+  -d '{"verificationToken": "vt_xxxxxxxxxxxxxxxxxxxxxxxx"}'
```

2. **Node.js fetch Example (lines 68-78):**
```diff
- const response = await fetch('https://1sub.io/api/v1/tools/subscriptions/verify', {
+ const response = await fetch('https://1sub.io/api/v1/verify', {
   method: 'POST',
   headers: {
     'Authorization': `Bearer ${process.env.ONESUB_API_KEY}`,
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
-    oneSubUserId: 'uuid-abc-123'
+    verificationToken: currentToken
   })
 });
```

3. **Node.js axios Example (lines 81-94):**
```diff
 const response = await axios.post(
-  'https://1sub.io/api/v1/tools/subscriptions/verify',
-  { oneSubUserId: 'uuid-abc-123' },
+  'https://1sub.io/api/v1/verify',
+  { verificationToken: currentToken },
   {
     headers: {
       'Authorization': `Bearer ${process.env.ONESUB_API_KEY}`,
       'Content-Type': 'application/json'
     }
   }
 );
```

4. **Python Example (lines 96-108):**
```diff
 response = requests.post(
-    'https://1sub.io/api/v1/tools/subscriptions/verify',
-    json={'oneSubUserId': 'uuid-abc-123'},
+    'https://1sub.io/api/v1/verify',
+    json={'verificationToken': current_token},
     headers={
         'Authorization': f'Bearer {os.environ["ONESUB_API_KEY"]}',
         'Content-Type': 'application/json'
     }
 )
```

5. **Testing Example (lines 277-289):**
```diff
 # Test authentication
- curl -X POST 'https://1sub.io/api/v1/tools/subscriptions/verify' \
+ curl -X POST 'https://1sub.io/api/v1/verify' \
   -H 'Authorization: Bearer YOUR_API_KEY' \
   -H 'Content-Type: application/json' \
-  -d '{"oneSubUserId": "test-user-id"}'
+  -d '{"verificationToken": "vt_test_token"}'

- # Expected response (404 is OK - just testing auth):
- # {"error": "Not found", "message": "No subscription found"}
+ # Expected response if auth works but token invalid:
+ # {"valid": false, "error": "INVALID_TOKEN", "reason": "Token verification failed"}
```

**Reference:** Correct endpoint documented in `content/docs/api/reference.mdx` lines 172-309

---

### FIX #2: Move Internal Docs Out of Public Folder

**Issue:** `content/docs/internal/*.mdx` files expose:
- Database table names (`authorization_codes`, `verification_tokens`, `user_balances`, etc.)
- Internal service file paths (`src/domains/auth/service.ts`)
- Cache implementation details (Redis, 15-min TTL)
- Internal checkout endpoints and pricing

**Impact:** SECURITY RISK - Exposes internal architecture to potential attackers

**Implementation:** See `INTERNAL_DOCS_EXCLUSION_IMPLEMENTATION.md`

**Quick Steps:**
```bash
# Create new internal docs location
mkdir -p documentation/internal

# Move files
mv content/docs/internal/architecture.mdx documentation/internal/architecture.mdx
mv content/docs/internal/checkout-flows.mdx documentation/internal/checkout-flows.mdx
mv content/docs/internal/deployment.mdx documentation/internal/deployment.mdx

# Remove empty folder
rmdir content/docs/internal
```

**Verification After Deploy:**
```bash
# All should return 404
curl -I https://1sub-6e656888.mintlify.dev/internal/architecture
curl -I https://1sub-6e656888.mintlify.dev/internal/checkout-flows
curl -I https://1sub-6e656888.mintlify.dev/internal/deployment
```

---

### FIX #3: Delete Duplicate docs/ Folder

**Issue:** TWO documentation folders exist:
- `content/docs/` - ACTIVE (used by Mintlify)
- `docs/` - ORPHANED (25 duplicate files, NOT used by build)

**Impact:** Violates "single source of truth", risk of editing wrong folder

**Action:** Delete the `docs/` folder (NOT `content/docs/`)

**⚠️ IMPORTANT:** This deletes the `docs/` folder at project root, NOT `content/docs/`

```bash
# CAREFUL: Delete docs/ folder (root level), NOT content/docs/
rm -rf docs/
```

**Windows:**
```cmd
rmdir /s /q docs
```

**Verification:**
```bash
# Should NOT exist
test -d docs && echo "❌ Still exists" || echo "✅ Deleted"

# Should EXIST
test -d content/docs && echo "✅ Exists" || echo "❌ Deleted wrong folder!"
```

**Why Safe:**
- `vercel.json` redirects `/docs` to Mintlify (doesn't use local `docs/` folder)
- `content/docs/` is the actual source for Mintlify
- `docs/` folder is not referenced in build configuration

---

## 🟠 HIGH (Fix Before Next Release)

### FIX #4: Fix Missing Navigation Link

**File:** `content/docs/docs.json`
**Line:** 38
**Issue:** Navigation references `"concepts/authentication"` but file doesn't exist
**Impact:** Broken navigation link (404 error)

**Change:**
```diff
   "group": "Core Concepts",
   "pages": [
     "concepts/monetization-models",
     "concepts/tools-and-accounts",
     "concepts/credits-and-subscriptions",
-    "concepts/vendor-payouts",
-    "concepts/authentication"
+    "concepts/vendor-payouts"
   ]
```

**Rationale:** Authentication is already documented in `api/authentication.mdx` section. No need for duplicate concept page.

---

### FIX #5: Audit and Fix Example Files

**Files to Check:**
1. `content/docs/examples/node.mdx`
2. `content/docs/examples/python.mdx`
3. `content/docs/examples/curl.mdx`

**Expected Issues:** Likely contain same deprecated endpoint as `api/authentication.mdx`

**Action Steps:**
1. Read each file
2. Search for `/api/v1/tools/subscriptions/verify` (deprecated)
3. Replace with `/api/v1/verify`
4. Update request bodies to use `verificationToken` instead of `oneSubUserId`
5. Verify response formats match `api/reference.mdx`

**Script to Check:**
```bash
# Check for deprecated endpoint in example files
grep -n "tools/subscriptions/verify" content/docs/examples/*.mdx

# If found, apply same fixes as FIX #1
```

---

## 🟡 MEDIUM (Should Fix Soon)

### FIX #6: Document /api/v1/authorize/initiate Endpoint

**File:** `content/docs/api/reference.mdx`
**Issue:** Endpoint `/api/v1/authorize/initiate` exists in code but is NOT documented
**Code:** `src/app/api/v1/authorize/initiate/route.ts`

**Action:**
1. Read implementation file to understand endpoint purpose
2. Determine if it's vendor-facing or internal-only
3. If vendor-facing: Add documentation section to `api/reference.mdx`
4. If internal-only: Do nothing (keep undocumented)

**Research Needed:**
```bash
# Read the implementation
cat src/app/api/v1/authorize/initiate/route.ts

# Check if referenced in existing docs
grep -r "authorize/initiate" content/docs/
```

---

### FIX #7: Update Quickstart (If initiate Endpoint is Public)

**File:** `content/docs/quickstart.mdx`
**Depends on:** FIX #6 findings

**Action:** If `/api/v1/authorize/initiate` is vendor-facing, update quickstart flow to include it

**Current Flow (lines 65-88):**
1. Receive `code` from callback
2. Exchange code for token via `/api/v1/authorize/exchange`
3. Create session

**Potential Updated Flow:**
1. Call `/api/v1/authorize/initiate` (if required before redirect)
2. Receive `code` from callback
3. Exchange code for token via `/api/v1/authorize/exchange`
4. Create session

---

## 🟢 LOW (Minor Improvement)

### FIX #8: Clarify Build System in README

**File:** `content/docs/README.md`
**Lines:** 121-131
**Issue:** Confusing instructions about local Mintlify CLI (docs are cloud-hosted, not run locally)

**Change:**
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
+
+ To make changes:
+ 1. Edit files in `content/docs/`
+ 2. Commit and push to main branch
+ 3. Changes will be reflected on Mintlify after deployment
```

---

## IMPLEMENTATION ORDER

### Phase 1: CRITICAL (Immediate - 2-3 hours)
1. ✅ FIX #1: Update api/authentication.mdx
2. ✅ FIX #2: Move internal docs (15 minutes)
3. ✅ FIX #3: Delete duplicate docs/ folder (1 minute)

**Deploy and verify before proceeding.**

### Phase 2: HIGH (Before Next Release - 1-2 hours)
4. ✅ FIX #4: Fix navigation link (1 minute)
5. ✅ FIX #5: Audit and fix examples (1-2 hours)

**Test vendor integration end-to-end before proceeding.**

### Phase 3: MEDIUM (Next Sprint - 2-3 hours)
6. ✅ FIX #6: Document initiate endpoint (1-2 hours research + documentation)
7. ✅ FIX #7: Update quickstart if needed (30 minutes)

### Phase 4: LOW (When Convenient - 10 minutes)
8. ✅ FIX #8: Update README (10 minutes)

---

## VERIFICATION CHECKLIST

After each phase, verify:

### Phase 1 Verification
```bash
# 1. Test /verify endpoint works (not /tools/subscriptions/verify)
curl -X POST 'https://1sub.io/api/v1/verify' \
  -H 'Authorization: Bearer sk-tool-xxxxx' \
  -H 'Content-Type: application/json' \
  -d '{"verificationToken": "test"}'

# 2. Internal docs return 404
curl -I https://1sub-6e656888.mintlify.dev/internal/architecture | grep 404

# 3. Duplicate folder deleted
test ! -d docs && echo "✅ Deleted"
```

### Phase 2 Verification
```bash
# 1. Navigation link works or removed
# Visit: https://1sub-6e656888.mintlify.dev
# Check: "Core Concepts" section has no broken links

# 2. Examples use correct endpoints
grep -n "verify" content/docs/examples/*.mdx | grep -v "tools/subscriptions"
```

### Phase 3 Verification
```bash
# Follow quickstart guide end-to-end
# Verify all endpoints work as documented
```

---

## ESTIMATED TIME TO COMPLETE

| Priority | Fixes | Estimated Time |
|----------|-------|----------------|
| 🔴 CRITICAL | #1-3 | 2-3 hours |
| 🟠 HIGH | #4-5 | 1-2 hours |
| 🟡 MEDIUM | #6-7 | 2-3 hours |
| 🟢 LOW | #8 | 10 minutes |
| **TOTAL** | **8 fixes** | **5-8 hours** |

---

## SUCCESS CRITERIA

Documentation audit will PASS when:
- ✅ All documented endpoints exist and work
- ✅ No deprecated endpoints in docs
- ✅ Internal docs excluded from public builds
- ✅ Single source of truth (no duplicate folders)
- ✅ No broken navigation links
- ✅ Vendor can integrate using ONLY public docs
- ✅ No security leaks (DB schema, internal paths, etc.)

**Current Status:** ❌ FAIL (3 critical issues)
**After Phase 1:** ✅ PASS (critical issues resolved)
**After All Phases:** ✅ EXCELLENT (all issues resolved)

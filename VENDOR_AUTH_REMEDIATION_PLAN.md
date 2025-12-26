# Vendor Authorization Flow Remediation Plan

**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH
**Estimated Effort:** 4-6 hours
**Risk Level:** MEDIUM (requires careful migration)

---

## Executive Summary

The vendor authorization flow audit revealed **critical architectural violations** that compromise the system's single-path enforcement model:

1. **Duplicate Authorization Logic** - 687 lines of dead code in `src/lib/vendor-auth.ts`
2. **Legacy Endpoint Still Active** - `POST /api/credit-checkout` continues to operate despite deprecation
3. **Multiple Authorization Paths** - JWT-based and verification token flows coexist

This plan provides a **step-by-step remediation strategy** to achieve the **non-negotiable invariant**:

> **There MUST be exactly ONE vendor authorization flow, enforced at the code level.**

---

## Verified Issues

### Issue #1: Duplicate Authorization Implementation

**File:** `src/lib/vendor-auth.ts` (687 lines)

**Problem:**
- Complete duplicate of canonical `src/domains/auth/service.ts`
- NOT imported anywhere (verified via grep)
- Creates maintenance burden and confusion
- Risk of accidental future use

**Impact:**
- **Maintenance Risk:** HIGH - Changes must be duplicated
- **Code Confusion:** MEDIUM - Developers don't know which to use
- **Accidental Import Risk:** LOW (currently unused)

**Evidence:**
```bash
# No imports found
grep -r "from.*lib/vendor-auth" src/
grep -r "import.*vendor-auth" src/
# Returns: No matches
```

---

### Issue #2: Legacy Endpoint Active

**File:** `src/app/api/credit-checkout/route.ts`

**Problem:**
- Marked deprecated with sunset date 2026-06-01
- Still fully functional and processing requests
- Uses JWT tokens (different security model than verification tokens)
- Cannot enforce real-time revocation (tokens cached by vendors)

**Impact:**
- **Security Risk:** HIGH - Bypasses revocation system
- **Architecture Violation:** HIGH - Two auth mechanisms exist
- **Migration Burden:** MEDIUM - Users need migration path

**Current State:**
```typescript
// Deprecation headers present
response.headers.set('Deprecation', 'true');
response.headers.set('Sunset', 'Sat, 01 Jun 2026 00:00:00 GMT');

// But endpoint still processes requests
return NextResponse.json({ success: true, ... });
```

**References:**
- Tests: `tests/integration/api/checkout.api.test.ts:426-434`
- Docs: `content/docs/internal/checkout-flows.mdx:88-94`

---

### Issue #3: No Import Prevention

**Problem:**
- No ESLint rule prevents importing from `src/lib/vendor-auth.ts`
- No TypeScript path mapping restrictions
- Developers could accidentally use duplicate code

**Impact:**
- **Future Risk:** MEDIUM - Accidental use likely over time
- **Code Review Burden:** LOW - Reviewers must manually catch

---

## Canonical Authorization Flow (CORRECT)

**Source:** `src/domains/auth/service.ts` (479 lines)

```
User clicks "Launch Tool"
  ↓
POST /api/v1/authorize/initiate
  ↓
createAuthorizationCode() [domains/auth/service.ts:72]
  ↓
Redirect to vendor with code
  ↓
Vendor: POST /api/v1/authorize/exchange
  ↓
exchangeAuthorizationCode() [domains/auth/service.ts:138]
  ↓
Returns verification token
  ↓
Vendor: POST /api/v1/verify (periodic)
  ↓
validateTokenReadOnly() [domains/auth/service.ts:187]
  ↓
Returns entitlements
```

**Current Consumers (ALL CORRECT):**
- ✅ `src/app/api/v1/verify/route.ts:24` - Uses `@/domains/auth`
- ✅ `src/app/api/v1/authorize/initiate/route.ts` - Uses `@/domains/auth`
- ✅ `src/app/api/v1/authorize/exchange/route.ts` - Uses `@/domains/auth`
- ✅ `src/app/api/v1/credits/consume/route.ts` - Uses `@/domains/auth`
- ✅ `src/app/api/credit-checkout/route.ts:28` - Uses `@/domains/auth` (but implements different flow)

---

## Remediation Strategy

### Phase 1: Immediate Actions (Low Risk)

#### Action 1.1: Delete Duplicate Code

**Target:** `src/lib/vendor-auth.ts`

**Justification:**
- Not imported anywhere
- Complete duplicate
- Zero runtime impact

**Steps:**
1. Verify no imports (already done)
2. Delete file
3. Commit with clear message

**Risk:** NONE (file unused)

**Command:**
```bash
git rm src/lib/vendor-auth.ts
git commit -m "Remove duplicate vendor-auth implementation

This file is a complete duplicate of src/domains/auth/service.ts.
It is not imported anywhere in the codebase (verified via grep).

The canonical implementation is in src/domains/auth/service.ts.

Impact: None (file was unused)
Security: Eliminates maintenance burden and confusion"
```

---

#### Action 1.2: Add ESLint Rule

**Target:** `.eslintrc.js` or `eslint.config.js`

**Purpose:** Prevent future imports of deleted file

**Implementation:**
```javascript
// Add to .eslintrc.js
module.exports = {
  // ... existing config
  rules: {
    // ... existing rules
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@/lib/vendor-auth',
            message: 'Use @/domains/auth instead. vendor-auth.ts is deleted.',
          },
          {
            name: '../lib/vendor-auth',
            message: 'Use @/domains/auth instead. vendor-auth.ts is deleted.',
          },
          {
            name: '../../lib/vendor-auth',
            message: 'Use @/domains/auth instead. vendor-auth.ts is deleted.',
          },
        ],
      },
    ],
  },
};
```

**Risk:** NONE (preventive measure)

---

### Phase 2: Legacy Endpoint Migration (Medium Risk)

#### Action 2.1: Assess Current Usage

**Research Required:**
- Check production logs for `/api/credit-checkout` requests
- Identify active vendors using this endpoint
- Estimate migration timeline

**Questions to Answer:**
1. How many vendors currently use `/api/credit-checkout`?
2. When was the last request to this endpoint?
3. Are these vendors actively maintained?

**Recommendation:** Query production metrics before proceeding.

---

#### Action 2.2: Create Migration Guide

**Target:** `docs/migrations/credit-checkout-to-v1.md`

**Content:**
```markdown
# Migration: Legacy Credit Checkout → V1 Vendor Flow

## Why Migrate?

The legacy `/api/credit-checkout` endpoint:
- Uses JWT tokens (self-verifiable authority)
- Cannot enforce real-time revocation
- Bypasses the single-path authorization model

The new flow provides:
- Real-time revocation enforcement
- Token rotation for security
- Consistent authorization model

## Migration Steps

### Old Flow (Deprecated)
```http
POST /api/credit-checkout
Authorization: Bearer <api_key>
{
  "userId": "user_123",
  "toolId": "tool_456"
}

Response:
{
  "success": true,
  "accessToken": "<jwt_token>",
  "toolUrl": "https://vendor.com"
}
```

### New Flow (Required)
```http
# Step 1: User initiates authorization
POST /api/v1/authorize/initiate
{
  "toolId": "tool_456",
  "userId": "user_123",
  "redirectUri": "https://vendor.com/callback"
}

Response:
{
  "code": "auth_xyz",
  "authorizationUrl": "https://vendor.com/callback?code=auth_xyz"
}

# Step 2: Vendor exchanges code for token
POST /api/v1/authorize/exchange
Authorization: Bearer <api_key>
{
  "code": "auth_xyz",
  "redirectUri": "https://vendor.com/callback"
}

Response:
{
  "success": true,
  "verificationToken": "vt_abc123",
  "userId": "user_123",
  "grantId": "grant_789"
}

# Step 3: Verify periodically (every 15-30 min)
POST /api/v1/verify
Authorization: Bearer <api_key>
{
  "verificationToken": "vt_abc123"
}

Response:
{
  "valid": true,
  "onesubUserId": "user_123",
  "entitlements": { ... },
  "verificationToken": "vt_new456",  // Rotated if needed
  "cacheUntil": 1234567890
}
```

## Timeline

- **Now - 2026-03-01:** Both endpoints available
- **2026-03-01:** Legacy endpoint returns 410 Gone
- **2026-06-01:** Legacy endpoint removed

## Support

Contact support@1sub.io for migration assistance.
```

---

#### Action 2.3: Implement Deprecation Warning (Intermediate Step)

**Target:** `src/app/api/credit-checkout/route.ts`

**Modification:**
```typescript
export async function POST(request: NextRequest) {
  // Add prominent warning log
  console.warn('[DEPRECATION] /api/credit-checkout called', {
    userAgent: request.headers.get('user-agent'),
    ip: getClientIp(request),
    timestamp: new Date().toISOString(),
    sunsetDate: '2026-06-01',
  });

  // Existing logic continues...
  return withApiAuth(request, async (req, authenticatedUser) => {
    // ... existing code
  });
}
```

**Purpose:** Track usage for migration planning

**Risk:** NONE (logging only)

---

#### Action 2.4: Disable Legacy Endpoint (BREAKING CHANGE)

**WARNING:** This is a BREAKING CHANGE. Only execute after:
1. Vendor notification (30+ days notice)
2. Zero usage in production logs (7+ days)
3. Migration guide published

**Target:** `src/app/api/credit-checkout/route.ts`

**Implementation Option A: Soft Block (Recommended)**
```typescript
export async function POST(request: NextRequest) {
  // Return 410 Gone with migration instructions
  return NextResponse.json(
    {
      error: 'ENDPOINT_DEPRECATED',
      message: 'This endpoint has been sunset as of 2026-06-01',
      migration: {
        guide: 'https://docs.1sub.io/migrations/credit-checkout-to-v1',
        newEndpoints: {
          authorize: '/api/v1/authorize/initiate',
          exchange: '/api/v1/authorize/exchange',
          verify: '/api/v1/verify',
          credits: '/api/v1/credits/consume',
        },
      },
      support: 'support@1sub.io',
    },
    {
      status: 410, // 410 Gone
      headers: {
        'Deprecation': 'true',
        'Sunset': 'Sat, 01 Jun 2026 00:00:00 GMT',
        'Link': '<https://docs.1sub.io/migrations/credit-checkout-to-v1>; rel="alternate"',
      },
    }
  );
}
```

**Implementation Option B: Hard Block (After Sunset)**
```bash
# Delete the route file entirely
git rm src/app/api/credit-checkout/route.ts
```

**Risk:** HIGH (breaks existing integrations)

---

### Phase 3: Testing & Validation

#### Action 3.1: Update Tests

**Target:** `tests/integration/api/checkout.api.test.ts:426-434`

**Modification:**
```typescript
describe('Credit Checkout API', () => {
  describe('POST /api/credit-checkout', () => {
    it('should return 410 Gone (endpoint sunset)', async () => {
      const response = await fetch(`${process.env.TEST_API_URL}/api/credit-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          userId: testUserId,
          toolId: testToolId,
        }),
      });

      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toBe('ENDPOINT_DEPRECATED');
      expect(data.migration.newEndpoints).toBeDefined();
    });
  });
});
```

---

#### Action 3.2: Add Single-Path Enforcement Test

**Target:** `tests/integration/vendor/authorization-flow-uniqueness.test.ts` (new file)

**Content:**
```typescript
/**
 * Authorization Flow Uniqueness Test
 *
 * Verifies the non-negotiable invariant:
 * There MUST be exactly ONE vendor authorization flow.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Vendor Authorization Flow Uniqueness', () => {
  it('should have exactly ONE canonical authorization service', () => {
    const canonicalPath = path.join(process.cwd(), 'src/domains/auth/service.ts');
    expect(fs.existsSync(canonicalPath)).toBe(true);
  });

  it('should NOT have duplicate vendor-auth file', () => {
    const duplicatePath = path.join(process.cwd(), 'src/lib/vendor-auth.ts');
    expect(fs.existsSync(duplicatePath)).toBe(false);
  });

  it('should have all API routes using canonical auth', async () => {
    const routePaths = [
      'src/app/api/v1/verify/route.ts',
      'src/app/api/v1/authorize/initiate/route.ts',
      'src/app/api/v1/authorize/exchange/route.ts',
      'src/app/api/v1/credits/consume/route.ts',
    ];

    for (const routePath of routePaths) {
      const fullPath = path.join(process.cwd(), routePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Should import from @/domains/auth
      expect(content).toMatch(/@\/domains\/auth/);

      // Should NOT import from lib/vendor-auth
      expect(content).not.toMatch(/lib\/vendor-auth/);
    }
  });
});
```

---

### Phase 4: Documentation Updates

#### Action 4.1: Update Domain README

**Target:** `src/domains/auth/README.md`

**Add Section:**
```markdown
## CRITICAL: Canonical Source

**This is the ONLY implementation of vendor authorization.**

### DO NOT:
- ❌ Create duplicate implementations in `src/lib/`
- ❌ Use JWT tokens for vendor authorization
- ❌ Bypass this service with direct database access

### DO:
- ✅ Import from `@/domains/auth`
- ✅ Use verification tokens (not JWTs)
- ✅ Follow the OAuth-like flow (initiate → exchange → verify)

### Deleted Files (Do Not Recreate):
- `src/lib/vendor-auth.ts` - Duplicate implementation (deleted 2025-XX-XX)

### ESLint Protection:
The `no-restricted-imports` rule prevents importing from deleted files.
```

---

#### Action 4.2: Update Checkout Flows Documentation

**Target:** `content/docs/internal/checkout-flows.mdx:88-94`

**Modification:**
```diff
## Legacy: Credit Consumption

- `POST /api/credit-checkout` - Legacy endpoint for immediate credit deduction during tool usage.
+ `POST /api/credit-checkout` - **REMOVED (2026-06-01)**

- Being replaced by: `POST /api/v1/credits/consume`
+ **Replacement:** Use the OAuth-like vendor flow instead:
+ 1. `POST /api/v1/authorize/initiate` - Generate authorization code
+ 2. `POST /api/v1/authorize/exchange` - Exchange for verification token
+ 3. `POST /api/v1/verify` - Verify access periodically
+ 4. `POST /api/v1/credits/consume` - Consume credits

- This is NOT a checkout flow - it's credit consumption.
+ See [Migration Guide](../migrations/credit-checkout-to-v1.md)
```

---

## Implementation Checklist

### Immediate (Can Execute Now)

- [ ] **Delete `src/lib/vendor-auth.ts`**
  - Verify no imports: `grep -r "vendor-auth" src/`
  - Delete file: `git rm src/lib/vendor-auth.ts`
  - Commit with detailed message

- [ ] **Add ESLint rule**
  - Update `.eslintrc.js` with `no-restricted-imports`
  - Test: Try importing from deleted path
  - Verify ESLint error appears

- [ ] **Add deprecation warning logging**
  - Update `src/app/api/credit-checkout/route.ts`
  - Add console.warn with usage tracking
  - Deploy and monitor logs

- [ ] **Create migration guide**
  - Write `docs/migrations/credit-checkout-to-v1.md`
  - Include code examples
  - Publish to docs site

- [ ] **Add uniqueness test**
  - Create `tests/integration/vendor/authorization-flow-uniqueness.test.ts`
  - Verify test passes
  - Add to CI pipeline

- [ ] **Update documentation**
  - Update `src/domains/auth/README.md`
  - Update `content/docs/internal/checkout-flows.mdx`
  - Mark legacy endpoint as removed

### Before Blocking Legacy Endpoint (Requires Analysis)

- [ ] **Query production metrics**
  - Count `/api/credit-checkout` requests (last 30 days)
  - Identify active users
  - Estimate migration timeline

- [ ] **Notify vendors**
  - Email notification (30+ days notice)
  - Provide migration guide
  - Offer support

- [ ] **Monitor migration progress**
  - Track legacy endpoint usage
  - Verify vendors migrate successfully
  - Provide assistance as needed

### Final Steps (After Zero Usage)

- [ ] **Disable legacy endpoint**
  - Return 410 Gone with migration instructions
  - Monitor for errors
  - Provide support for stragglers

- [ ] **Delete legacy endpoint**
  - Remove `src/app/api/credit-checkout/route.ts`
  - Remove tests
  - Remove documentation references

- [ ] **Verify single-path enforcement**
  - Run all tests
  - Manual verification of auth flow
  - Production smoke tests

---

## Risk Assessment

### Low Risk Actions (Execute Immediately)
1. Delete `src/lib/vendor-auth.ts` - NO IMPACT (unused file)
2. Add ESLint rule - NO IMPACT (preventive)
3. Add logging - NO IMPACT (observability)
4. Update docs - NO IMPACT (information)

### Medium Risk Actions (Requires Analysis)
1. Disable legacy endpoint - BREAKS existing integrations
2. Vendor notification - REQUIRES coordination

### High Risk Actions (Do NOT Execute Without Approval)
1. Delete legacy endpoint - PERMANENT (cannot rollback easily)

---

## Success Criteria

After remediation, the following MUST be true:

1. ✅ **Single Source of Truth**
   - Only `src/domains/auth/service.ts` contains authorization logic
   - No duplicate implementations exist

2. ✅ **Single Authorization Flow**
   - All vendors use OAuth-like flow (initiate → exchange → verify)
   - No JWT-based authorization bypasses

3. ✅ **Import Prevention**
   - ESLint rule prevents imports from deleted files
   - TypeScript paths enforce canonical imports

4. ✅ **Documentation Clarity**
   - Docs clearly state canonical source
   - Migration guides exist for legacy users
   - Deleted files documented

5. ✅ **Test Coverage**
   - Uniqueness test verifies single path
   - All tests use canonical flow
   - No tests reference deleted code

---

## Rollback Plan

### If Issues Arise During Phase 1 (Delete Duplicate)
- **Restore file:** `git revert <commit>`
- **Impact:** NONE (file was unused)

### If Issues Arise During Phase 2 (Disable Legacy)
- **Re-enable endpoint:** Revert commit
- **Extend timeline:** Delay sunset date
- **Provide support:** Help vendors migrate

### If Critical Issue After Phase 3 (Delete Legacy)
- **Emergency hotfix:** Recreate route with 410 Gone message
- **Investigate:** Identify missed vendor
- **Fast-track migration:** Provide immediate support

---

## Timeline Recommendation

| Phase | Action | Duration | Dependencies |
|-------|--------|----------|--------------|
| **Phase 1** | Delete duplicate, add ESLint | 1 hour | None |
| **Phase 2** | Add logging, create docs | 2 hours | None |
| **Analysis** | Query metrics, identify vendors | 1-2 weeks | Production access |
| **Notification** | Email vendors, provide support | 30+ days | Vendor list |
| **Phase 3** | Disable legacy endpoint | 1 hour | Zero usage |
| **Phase 4** | Delete legacy endpoint | 30 min | 7+ days @ 410 |

**Total Timeline:** 5-7 weeks (mostly waiting for vendor migration)

**Immediate Actions:** 3-4 hours (Phases 1-2)

---

## Recommendation

**Execute Phase 1 and Phase 2 immediately** (Immediate Actions checklist).

These are **zero-risk** improvements that:
- Eliminate maintenance burden
- Prevent future confusion
- Improve documentation
- Add safety guards

**Delay Phase 3** (blocking legacy endpoint) until:
- Production metrics analyzed
- Vendors notified (30+ days)
- Zero usage confirmed (7+ days)

---

## Questions for Product/Engineering

1. **Production Metrics:** Can we query `/api/credit-checkout` usage?
2. **Vendor List:** Who are the active users of the legacy endpoint?
3. **Timeline:** Is 30-day notice sufficient for vendors?
4. **Support:** Who will handle vendor migration questions?
5. **Approval:** Who must approve blocking/deleting the legacy endpoint?

---

## Appendix A: File Comparison

### Canonical Implementation
**File:** `src/domains/auth/service.ts` (479 lines)
- Uses `createServiceClient()` from infrastructure layer
- Exports all auth functions
- Contains canonical business logic

### Duplicate (TO BE DELETED)
**File:** `src/lib/vendor-auth.ts` (687 lines)
- Creates own Supabase client (anti-pattern)
- Duplicates all auth functions
- Adds `markRevocationPropagated()` (not in canonical)
- Adds `getToolRedirectUri()` (not in canonical)

**Functions Duplicated:** 11 functions (100% overlap)

---

## Appendix B: Migration Support Script

**File:** `scripts/check-vendor-migration.ts`

```typescript
/**
 * Checks vendor migration status from legacy endpoint
 */

import { createServiceClient } from '@/infrastructure/database/client';

async function checkMigrationStatus() {
  const supabase = createServiceClient();

  // Query usage logs for /api/credit-checkout
  const { data: logs } = await supabase
    .from('usage_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  const legacyUsers = logs?.filter((log) =>
    log.metadata?.endpoint === '/api/credit-checkout'
  );

  console.log(`Legacy endpoint usage (last 30 days): ${legacyUsers?.length || 0}`);

  // TODO: Identify vendors who haven't migrated
}

checkMigrationStatus();
```

---

**End of Remediation Plan**

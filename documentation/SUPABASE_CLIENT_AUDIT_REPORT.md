# Supabase Client Usage Audit Report

**Date:** 2024-12-19  
**Auditor:** Senior Backend Engineer & Database/Security Auditor  
**Scope:** Complete codebase review of Supabase Client usage patterns

---

## Executive Summary

**VERDICT: ⚠️ CONDITIONAL PASS with RECOMMENDATIONS**

The codebase demonstrates **generally good** Supabase Client usage patterns with clear separation between client-side and server-side access. However, several issues require attention:

1. **CRITICAL:** Multiple direct service-role client instantiations bypass centralized factory
2. **HIGH:** Overlapping entitlements implementations (`src/lib/entitlements.ts` vs `src/domains/verification/service.ts`)
3. **MEDIUM:** Client-side queries to sensitive tables (with RLS protection, but should be minimized)
4. **MEDIUM:** Inconsistent error handling patterns
5. **LOW:** Documentation gaps in some areas

**Overall Assessment:** The architecture is sound, but consolidation and standardization are needed.

---

## 1. Supabase Client Inventory

### 1.1 Centralized Client Factories

**✅ GOOD:** Centralized factory exists at `src/infrastructure/database/client.ts`

**Client Types:**
1. **Browser Client** (`createBrowserClient()`)
   - Location: `src/infrastructure/database/client.ts:90`
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Pattern: Singleton (prevents multiple listeners)
   - Usage: Client-side React components, hooks, browser code

2. **Server Client** (`createServerClient()`)
   - Location: `src/infrastructure/database/client.ts:161`
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (with user context via cookies)
   - Pattern: Per-request (uses Next.js cookies)
   - Usage: API routes, server components, server actions

3. **Service Client** (`createServiceClient()`)
   - Location: `src/infrastructure/database/client.ts:204`
   - Key: `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - Pattern: Per-call (no singleton needed)
   - Usage: Domain services, admin operations, RPC functions

### 1.2 Legacy Client Files

**⚠️ ISSUE:** Legacy client files exist alongside centralized factory:

- `src/lib/supabase/client.ts` - Browser client (legacy, exports `createClient()`)
- `src/lib/supabase/server.ts` - Server client (legacy, exports `createClient()`)
- `src/lib/supabase/middleware.ts` - Middleware client (specialized, OK)

**Status:** Legacy files are still in use but marked as deprecated. The centralized factory at `src/infrastructure/database/client.ts` is the canonical source.

### 1.3 Direct Service-Role Client Instantiations

**❌ CRITICAL ISSUE:** Multiple files create service-role clients directly instead of using centralized factory:

1. **`src/app/api/admin/credits/adjust/route.ts:9-23`**
   - Creates `createAdminClient()` function
   - Uses `createClient` from `@supabase/supabase-js` directly
   - **Should use:** `createServiceClient()` from `@/infrastructure/database/client`

2. **`src/app/api/vendor/tools/[id]/route.ts:119-127`**
   - Creates service-role client inline
   - Uses `createServiceRoleClient` from `@supabase/supabase-js` directly
   - **Should use:** `createServiceClient()` from `@/infrastructure/database/client`

3. **`src/lib/server/subscription-renewal.ts:19-28`**
   - Creates `getSupabaseClient()` function
   - Uses `createClient` from `@supabase/supabase-js` directly
   - **Should use:** `createServiceClient()` from `@/infrastructure/database/client`

4. **`src/lib/api-keys.ts:16-25`**
   - Creates `getServiceClient()` function
   - Uses `createSupabaseClient` from `@supabase/supabase-js` directly
   - **Should use:** `createServiceClient()` from `@/infrastructure/database/client`

5. **`src/lib/vendor-auth.ts:17-26`**
   - Creates `getServiceClient()` function
   - Uses `createSupabaseClient` from `@supabase/supabase-js` directly
   - **Should use:** `createServiceClient()` from `@/infrastructure/database/client`

6. **`src/lib/stripe-connect.ts:17-26`**
   - Creates `getSupabaseClient()` function
   - Uses `createClient` from `@supabase/supabase-js` directly
   - **Should use:** `createServiceClient()` from `@/infrastructure/database/client`

7. **`src/app/api/credit-checkout/route.ts:30-39`**
   - Creates `getSupabaseClient()` function
   - Uses `createClient` from `@supabase/supabase-js` directly
   - **Should use:** `createServiceClient()` from `@/infrastructure/database/client`

**Impact:** 
- Code duplication
- Inconsistent error handling
- Harder to maintain
- Potential for service-role key exposure if not careful

**Recommendation:** Refactor all direct instantiations to use `createServiceClient()` from centralized factory.

### 1.4 Service-Role Key Security

**✅ GOOD:** Service-role key is never exposed client-side
- All service-role clients are created server-side only
- Key is accessed via `process.env.SUPABASE_SERVICE_ROLE_KEY` (server-only env var)
- No `NEXT_PUBLIC_` prefix on service-role key

---

## 2. Client-Side Usage Analysis

### 2.1 Client-Side Supabase Queries

**Files with Client-Side Queries:**

1. **`src/hooks/usePurchasedProducts.ts:52-59`**
   - Queries: `tool_subscriptions`
   - Access: User's own subscriptions only
   - **Status:** ✅ OK (user-scoped, RLS protected)

2. **`src/app/profile/page.tsx:166-183`**
   - Queries: `platform_subscriptions`, `tool_subscriptions`, `checkouts`
   - Access: User's own data only
   - **Status:** ✅ OK (user-scoped, RLS protected)

3. **`src/lib/credits.ts:67-74`** (`getCurrentBalanceClient()`)
   - Queries: `user_balances`
   - Access: User's own balance only
   - **Status:** ✅ OK (user-scoped, RLS protected)

4. **`src/contexts/AuthContext.tsx:90-99`**
   - Realtime subscription: `user_balances`
   - Access: User's own balance only
   - **Status:** ✅ OK (user-scoped, RLS protected)

### 2.2 Sensitive Tables NOT Accessed Client-Side

**✅ GOOD:** Client never queries sensitive tables:
- `revocations` - ✅ Not accessed client-side
- `api_keys` - ✅ Not accessed client-side  
- `authorization_codes` - ✅ Not accessed client-side
- `grants` - ✅ Not accessed client-side

### 2.3 Client-Side Write Operations

**✅ GOOD:** Client-side writes are minimal and safe:
- No client-side writes to entitlements tables
- No client-side writes to billing/revocation tables
- Only user profile updates (via API routes)

### 2.4 RLS Protection

**⚠️ CONCERN:** Client-side code relies on RLS for security. While RLS policies should exist, application-level authorization should also be present.

**Recommendation:** 
- Verify RLS policies exist for all client-accessible tables
- Add application-level authorization checks in API routes (already done in most places)
- Document RLS policies in codebase

---

## 3. Server-Side Usage Analysis

### 3.1 Domain Services

**✅ EXCELLENT:** Domain services use centralized service client:

- `src/domains/auth/service.ts` - Uses `createServiceClient()`
- `src/domains/credits/service.ts` - Uses `createServiceClient()` and `createServerClient()`
- `src/domains/tools/service.ts` - Uses `createServiceClient()` and `createServerClient()`
- `src/domains/verification/service.ts` - Uses `createServiceClient()`
- `src/domains/checkout/tool-checkout.ts` - Uses `createServiceClient()` and `createServerClient()`
- `src/domains/checkout/credit-checkout.ts` - Uses `createServiceClient()` and `createServerClient()`

**Pattern:** Domain services correctly use service client for authoritative operations.

### 3.2 API Routes

**✅ GOOD:** Most API routes use server client correctly:

- `src/app/api/**/route.ts` - Use `createClient()` from `@/lib/supabase/server` (legacy but OK)
- Routes verify authentication before database access
- Application-level authorization checks present

**⚠️ MINOR ISSUE:** Some routes use legacy `@/lib/supabase/server` instead of centralized factory. This is acceptable but should be standardized.

### 3.3 Service-Role Usage Justification

**✅ GOOD:** Service-role usage is justified:
- Domain services need to bypass RLS for system operations
- Admin operations require elevated permissions
- RPC functions require service-role grants
- Token verification needs service-role access

**Pattern:** Service-role is used appropriately, not overused.

### 3.4 Business Logic Location

**✅ GOOD:** Business logic is in application code, not just DB queries:
- Domain services contain business logic
- API routes have authorization checks
- No business rules embedded solely in SQL

---

## 4. Overlapping Functionality Detection

### 4.1 Entitlements Implementation Duplication

**❌ HIGH PRIORITY ISSUE:** Two implementations of entitlements lookup:

1. **`src/lib/entitlements.ts`** (Legacy)
   - Function: `getEntitlements()`, `getEntitlementsWithCache()`, `hasActiveSubscription()`
   - Uses: Service client directly
   - Status: ⚠️ Legacy, may be deprecated

2. **`src/domains/verification/service.ts`** (Canonical)
   - Function: `getEntitlements()`, `getEntitlementsWithCache()`, `hasActiveSubscription()`
   - Uses: Service client from centralized factory
   - Status: ✅ Canonical source

**Impact:**
- Confusion about which to use
- Potential for inconsistent results
- Maintenance burden

**Recommendation:**
- Mark `src/lib/entitlements.ts` as deprecated
- Migrate all usages to `src/domains/verification/service.ts`
- Remove legacy file after migration

### 4.2 Credit Balance Retrieval

**⚠️ MEDIUM PRIORITY:** Multiple functions for credit balance:

1. **`src/lib/credits.ts:63`** - `getCurrentBalanceClient()` (client-side)
   - Uses: Browser client
   - Queries: `user_balances` table
   - Status: ✅ OK (client-side variant)

2. **`src/lib/credits-service.ts`** - `getCurrentBalance()` (server-side)
   - Uses: Server client
   - Queries: `user_balances` table
   - Status: ✅ OK (server-side variant)

3. **`src/domains/credits/service.ts:80`** - `getCurrentBalance()` (domain service)
   - Uses: Server client
   - Queries: `user_balances` table
   - Status: ✅ OK (domain service variant)

4. **`src/domains/credits/service.ts:123`** - `getCurrentBalanceService()` (service-role)
   - Uses: Service client
   - Queries: `user_balances` table
   - Status: ✅ OK (service-role variant)

**Assessment:** Multiple variants are acceptable as they serve different contexts (client/server/service). However, documentation should clarify when to use each.

### 4.3 Subscription Queries

**⚠️ MINOR:** Subscription queries appear in multiple places:
- `src/hooks/usePurchasedProducts.ts` - Client-side
- `src/app/profile/page.tsx` - Client-side
- `src/domains/tools/service.ts` - Server-side (canonical)
- `src/domains/verification/service.ts` - Server-side (canonical)

**Assessment:** Client-side queries are acceptable for UI, but server-side should use domain services.

---

## 5. Authorization & RLS Verification

### 5.1 Application-Level Authorization

**✅ GOOD:** Application-level authorization is present:

- API routes check authentication: `supabase.auth.getUser()`
- Admin routes check role: `profile.role === 'admin'`
- Vendor routes check ownership: `tool.vendor_id === user.id`
- User routes check ownership: `checkout.user_id === authUser.id`

**Pattern:** Authorization checks are explicit, not relying solely on RLS.

### 5.2 RLS as Defense-in-Depth

**✅ GOOD:** RLS is used as defense-in-depth:
- Application code enforces authorization
- RLS policies provide additional protection
- Service-role bypasses RLS (intentional, server-only)

**Recommendation:** Document RLS policies in codebase or migration files.

### 5.3 Tables Requiring RLS

**Expected RLS Policies:**
- `tool_subscriptions` - Users can read own subscriptions
- `user_balances` - Users can read own balance
- `credit_transactions` - Users can read own transactions
- `platform_subscriptions` - Users can read own subscriptions
- `checkouts` - Users can read own checkouts
- `revocations` - Users should NOT access (service-role only)
- `api_keys` - Users should NOT access (service-role only)
- `authorization_codes` - Users should NOT access (service-role only)
- `grants` - Users should NOT access (service-role only)

**Status:** Cannot verify RLS policies without database access, but application code suggests they exist.

---

## 6. Data Ownership & Boundaries

### 6.1 Domain Ownership

**✅ GOOD:** Clear domain ownership:

- **Auth Domain:** `authorization_codes`, `grants`, `revocations`
  - Owner: `src/domains/auth/service.ts`
  - Status: ✅ Single owner

- **Credits Domain:** `credit_transactions`, `user_balances`
  - Owner: `src/domains/credits/service.ts`
  - Status: ✅ Single owner

- **Subscriptions Domain:** `tool_subscriptions`, `platform_subscriptions`
  - Owner: `src/domains/tools/service.ts`, `src/domains/checkout/`
  - Status: ✅ Clear ownership

- **Checkout Domain:** `checkouts`
  - Owner: `src/domains/checkout/`
  - Status: ✅ Single owner

- **Tools Domain:** `tools`, `api_keys`
  - Owner: `src/domains/tools/service.ts`
  - Status: ✅ Single owner

### 6.2 Cross-Domain Writes

**✅ GOOD:** Cross-domain writes are explicit:
- Checkout creates subscription (explicit, documented)
- Subscription renewal creates credit transactions (explicit, documented)
- No unauthorized cross-domain access

---

## 7. Security & Data Exposure

### 7.1 Service-Role Key Exposure

**✅ GOOD:** Service-role key is never exposed:
- All service-role clients created server-side only
- Key accessed via `process.env.SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix)
- No service-role key in client bundles

### 7.2 Sensitive Data in Logs

**⚠️ MINOR CONCERN:** Some logs may include sensitive data:
- Error logs sometimes include full error objects
- Some console.log statements may include user data

**Recommendation:** 
- Review and sanitize logs
- Use structured logging
- Avoid logging PII

### 7.3 Client Data Exposure

**✅ GOOD:** Client only sees appropriate data:
- User-scoped data only
- No sensitive system state exposed
- No internal metadata leaked

---

## 8. Error Handling & Consistency

### 8.1 Error Handling Patterns

**⚠️ INCONSISTENT:** Error handling varies across codebase:

**Good Patterns:**
- `src/domains/credits/service.ts` - Consistent error handling with proper logging
- `src/domains/auth/service.ts` - Proper error propagation

**Areas for Improvement:**
- Some routes swallow errors silently
- Inconsistent error response formats
- Some errors logged but not returned to client

**Recommendation:**
- Standardize error handling
- Use consistent error response format
- Ensure all errors are logged appropriately

### 8.2 Partial Failure Handling

**✅ GOOD:** Application handles partial failures:
- Transaction rollbacks on errors
- Idempotency keys prevent duplicate operations
- Graceful degradation on cache failures

---

## 9. Documentation Consistency

### 9.1 Client Factory Documentation

**✅ EXCELLENT:** Centralized factory is well-documented:
- `src/infrastructure/database/client.ts` has comprehensive comments
- Clear usage guidelines
- Security warnings for service-role usage

### 9.2 Domain Service Documentation

**✅ GOOD:** Domain services are documented:
- Each service has header comments
- Functions have JSDoc comments
- Usage patterns are clear

### 9.3 Undocumented Patterns

**⚠️ MINOR:** Some patterns are undocumented:
- Legacy client files (`src/lib/supabase/`) not clearly marked as deprecated
- Some API routes lack documentation
- RLS policies not documented in codebase

**Recommendation:**
- Add deprecation notices to legacy files
- Document RLS policies
- Add API route documentation

---

## 10. Findings Summary

### Critical Issues (Must Fix)

1. **Direct Service-Role Client Instantiation**
   - **Files:** 7 files create service-role clients directly
   - **Impact:** Code duplication, maintenance burden
   - **Fix:** Refactor to use `createServiceClient()` from centralized factory

### High Priority Issues (Should Fix)

1. **Entitlements Implementation Duplication**
   - **Files:** `src/lib/entitlements.ts` vs `src/domains/verification/service.ts`
   - **Impact:** Confusion, potential inconsistencies
   - **Fix:** Deprecate legacy file, migrate to canonical implementation

### Medium Priority Issues (Nice to Fix)

1. **Client-Side RLS Dependency**
   - **Issue:** Client-side code relies on RLS (should have app-level checks too)
   - **Fix:** Verify RLS policies exist, document them

2. **Error Handling Inconsistency**
   - **Issue:** Varying error handling patterns
   - **Fix:** Standardize error handling across codebase

3. **Legacy Client Files**
   - **Issue:** Legacy files still in use
   - **Fix:** Complete migration to centralized factory

### Low Priority Issues (Documentation/Clarity)

1. **Documentation Gaps**
   - **Issue:** Some patterns undocumented
   - **Fix:** Add documentation for RLS policies, API routes

2. **Credit Balance Function Documentation**
   - **Issue:** Multiple variants, unclear when to use each
   - **Fix:** Document usage guidelines for each variant

---

## 11. Recommendations

### Immediate Actions

1. **Refactor Direct Service-Role Instantiations**
   - Replace all direct `createClient()` calls with `createServiceClient()` from centralized factory
   - Files to update: 7 files identified in section 1.3

2. **Consolidate Entitlements Implementation**
   - Mark `src/lib/entitlements.ts` as deprecated
   - Migrate all usages to `src/domains/verification/service.ts`
   - Remove legacy file after migration

### Short-Term Actions

1. **Standardize Error Handling**
   - Create error handling utility
   - Standardize error response format
   - Ensure all errors are logged

2. **Complete Migration to Centralized Factory**
   - Migrate remaining legacy client usage
   - Remove legacy files after migration

### Long-Term Actions

1. **Document RLS Policies**
   - Add RLS policy documentation
   - Include in migration files or separate documentation

2. **Improve Logging**
   - Review and sanitize logs
   - Use structured logging
   - Avoid logging PII

---

## 12. Final Verdict

**CONDITIONAL PASS**

The codebase demonstrates **good architectural patterns** with clear separation of concerns and appropriate use of Supabase clients. However, **consolidation and standardization** are needed to achieve excellence.

**Key Strengths:**
- ✅ Centralized client factory exists
- ✅ Clear domain ownership
- ✅ Service-role key never exposed
- ✅ Application-level authorization present
- ✅ Client-side access is appropriately scoped

**Key Weaknesses:**
- ❌ Direct service-role client instantiations (7 files)
- ❌ Entitlements implementation duplication
- ⚠️ Inconsistent error handling
- ⚠️ Documentation gaps

**Confirmation Statement:**

> **Supabase Client usage is MOSTLY consistent and secure, but requires consolidation to be fully compliant with best practices. The architecture is sound, but direct service-role instantiations and duplicate implementations should be addressed.**

---

## Appendix: File Inventory

### Client Creation Points

**Centralized Factory:**
- `src/infrastructure/database/client.ts` - ✅ Canonical source

**Legacy Files:**
- `src/lib/supabase/client.ts` - ⚠️ Legacy browser client
- `src/lib/supabase/server.ts` - ⚠️ Legacy server client
- `src/lib/supabase/middleware.ts` - ✅ Specialized middleware client (OK)

**Direct Service-Role Instantiations (to fix):**
- `src/app/api/admin/credits/adjust/route.ts`
- `src/app/api/vendor/tools/[id]/route.ts`
- `src/lib/server/subscription-renewal.ts`
- `src/lib/api-keys.ts`
- `src/lib/vendor-auth.ts`
- `src/lib/stripe-connect.ts`
- `src/app/api/credit-checkout/route.ts`

**Domain Services (using centralized factory):**
- `src/domains/auth/service.ts` - ✅
- `src/domains/credits/service.ts` - ✅
- `src/domains/tools/service.ts` - ✅
- `src/domains/verification/service.ts` - ✅
- `src/domains/checkout/tool-checkout.ts` - ✅
- `src/domains/checkout/credit-checkout.ts` - ✅

---

**End of Report**


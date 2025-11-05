# Code Review: Bugs and Optimizations Found

## 🔴 CRITICAL ISSUES

### 1. Performance/Security Issue: findToolByApiKey (CRITICAL)
**File:** `src/lib/api-keys.ts` lines 86-114

**Problem:**
- Fetches ALL tools from database
- Loops through ALL tools doing bcrypt comparisons
- With 1000 tools, this means 1000 bcrypt operations per failed auth attempt
- **DoS vulnerability**: Attacker can cause massive CPU usage
- **Performance**: Extremely slow with many tools

**Fix:** Create a mapping table or use database filtering

---

### 2. Race Condition: updateApiKeyLastUsed
**File:** `src/lib/api-keys.ts` lines 16-46

**Problem:**
- Read-modify-write pattern without locking
- Concurrent requests can lose updates
- Last used timestamp may not be accurate

**Fix:** Use atomic update with JSONB functions

---

### 3. Security: Storing JWT Token in Database
**File:** `src/app/api/checkout/process/route.ts` line 329

**Problem:**
```typescript
tool_access_token: toolAccessToken || undefined, // Store token in metadata for reference
```
- JWT tokens should NOT be stored in database
- Tokens are short-lived (1 hour) and should only be transmitted
- If database is compromised, tokens can be stolen

**Fix:** Remove token storage, only return in response

---

### 4. Redundant Token Expiry Check
**File:** `src/app/api/v1/verify-user/route.ts` lines 31-40

**Problem:**
- Manual expiry check after jwt.verify()
- jwt.verify() already throws TokenExpiredError if expired
- Redundant code

**Fix:** Remove manual check, jwt.verify() handles it

---

## ⚠️ IMPORTANT ISSUES

### 5. Missing Rate Limiting
**Files:** All API endpoints

**Problem:**
- No rate limiting on `/api/v1/verify-user`
- No rate limiting on `/api/v1/credits/consume`
- Can be abused for:
  - Brute force API key attempts
  - Credit drain attacks
  - DoS attacks

**Recommendation:** Implement rate limiting middleware

---

### 6. Inefficient Balance Calculation
**File:** `src/app/api/v1/credits/consume/route.ts` lines 150-176

**Problem:**
- Fetches ALL credit transactions for user
- Calculates balance client-side
- Should use `balance_after` from latest transaction

**Fix:** Use optimized balance query

---

### 7. Missing Input Validation
**Multiple files**

**Problem:**
- No UUID validation for user_id, tool_id, checkout_id
- Could cause database errors or security issues

**Recommendation:** Add UUID validation

---

### 8. Metadata Type Safety Issues
**Files:** Multiple

**Problem:**
- Using `as any` in several places
- Type casting to `Record<string, unknown>` loses type safety
- Accessing nested properties without proper type guards

**Fix:** Define proper ToolMetadata type and use type guards

---

## 📊 OPTIMIZATION OPPORTUNITIES

### 9. JWT_SECRET Validation on Every Call
**File:** `src/lib/jwt.ts`

**Current:** Checks JWT_SECRET on every token operation
**Optimization:** Validate once at module load, fail fast

---

### 10. Multiple Database Queries in Sequence
**File:** `src/app/api/v1/credits/consume/route.ts`

**Current:** 
1. Check idempotency (line 128)
2. Fetch all transactions (line 151)
3. Consume credits (line 193)
4. Fetch new balance (line 215)
5. Fetch transaction ID (line 227)

**Optimization:** Could be reduced to 2-3 queries with better RPC function

---

### 11. Duplicate Tool Fetch
**File:** `src/app/api/v1/credits/consume/route.ts` lines 29-47

**Problem:**
- Finds tool by API key (queries database)
- Then fetches tool again by ID
- Should return tool data from findToolByApiKey

---

## 🔧 MINOR ISSUES

### 12. Inconsistent Error Messages
- Some errors expose internal details
- Some use generic messages
- Should standardize error responses

### 13. Missing Logging for Security Events
- API key verification failures not logged
- Credit consumption not audited
- Should add security audit logging

### 14. No Metrics/Monitoring
- No tracking of API key usage
- No monitoring of credit consumption patterns
- Should add metrics

---

## 📝 RECOMMENDATIONS

### Priority 1 (Immediate):
1. Fix findToolByApiKey performance issue
2. Remove JWT token storage from database
3. Fix race condition in updateApiKeyLastUsed

### Priority 2 (Soon):
4. Add rate limiting to API endpoints
5. Optimize balance calculation
6. Add input validation

### Priority 3 (When possible):
7. Improve type safety
8. Add security audit logging
9. Add monitoring/metrics


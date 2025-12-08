# Pre-Production Testing Plan - 1sub Platform

**Version:** 1.0
**Date:** December 8, 2024
**Status:** Ready for Execution

---

## Executive Summary

This document outlines the comprehensive testing strategy for the 1sub platform before production deployment. The plan covers UI/UX, API functionality, database integrity, payment flows, security, and performance optimization.

**Platform Overview:**
- **Type:** Unified subscription platform for SaaS tools
- **Users:** End users who purchase credits/subscriptions
- **Vendors:** Tool providers who monetize through the platform
- **Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL), Stripe, JWT Auth
- **Critical Systems:** Payment processing, credit system, API key authentication, vendor payouts

---

## 1. USER FLOW TESTING

### 1.1 Registration & Authentication

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| U1.1 | Register new account with valid email/password | Account created, profile added to database, redirect to /backoffice | HIGH |
| U1.2 | Register with existing email | Error message: "Email already registered" | HIGH |
| U1.3 | Register with weak password | Error message with password requirements | MEDIUM |
| U1.4 | Login with valid credentials | Successful login, session cookie set, redirect to /backoffice | HIGH |
| U1.5 | Login with invalid credentials | Error message: "Invalid credentials" | HIGH |
| U1.6 | Session persistence after refresh | User remains logged in across page refreshes | HIGH |
| U1.7 | Logout functionality | Session cleared, redirect to /login | MEDIUM |
| U1.8 | Forgot password flow | Email sent, reset link works, password updated | MEDIUM |
| U1.9 | Unauthorized access to protected pages | Redirect to /login with return URL | HIGH |

**Manual Testing Steps:**
1. Open incognito browser window
2. Navigate to `/register`
3. Fill registration form with test email: `test-{timestamp}@example.com`
4. Verify email confirmation (if enabled)
5. Login and check redirect to `/backoffice`
6. Check `user_profiles` table for new record
7. Verify `role='user'` and `is_vendor=false`
8. Test logout and re-login
9. Test password reset flow end-to-end

---

### 1.2 Credit Purchase Flow

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| U2.1 | Browse credit packages on /buy-credits | All packages displayed with correct pricing | HIGH |
| U2.2 | Select credit package and initiate checkout | Checkout created in database, redirect to payment page | HIGH |
| U2.3 | Complete payment with test card | Stripe webhook received, credits added to user_balances | CRITICAL |
| U2.4 | Verify credit balance after purchase | Balance matches purchased amount | CRITICAL |
| U2.5 | Duplicate webhook handling (idempotency) | Credits only added once despite duplicate webhook | CRITICAL |
| U2.6 | Failed payment handling | No credits added, checkout status remains pending | HIGH |
| U2.7 | Transaction history visibility | Purchase appears in /backoffice transaction list | MEDIUM |
| U2.8 | Concurrent purchases by same user | Both purchases processed correctly, balance sums correctly | HIGH |

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**Manual Testing Steps:**
1. Login as test user
2. Note current credit balance in `user_balances` table
3. Navigate to `/buy-credits`
4. Select "50 credits" package
5. Complete Stripe checkout with test card 4242 4242 4242 4242
6. Wait for webhook (check `/api/stripe/webhook` logs)
7. Verify `credit_transactions` table has new "add" record
8. Verify `user_balances` updated correctly
9. Check `idempotency_key` is stored
10. **Critical:** Manually trigger duplicate webhook with same session ID
11. Verify credits NOT added twice (idempotency working)

**Database Verification Queries:**
```sql
-- Check user balance
SELECT * FROM user_balances WHERE user_id = '{test_user_id}';

-- Check transactions
SELECT * FROM credit_transactions
WHERE user_id = '{test_user_id}'
ORDER BY created_at DESC LIMIT 10;

-- Verify balance matches sum of transactions
SELECT
  ub.balance as table_balance,
  COALESCE(SUM(
    CASE
      WHEN ct.type = 'add' THEN ct.credits_amount
      WHEN ct.type = 'subtract' THEN -ct.credits_amount
      ELSE 0
    END
  ), 0) as calculated_balance
FROM user_balances ub
LEFT JOIN credit_transactions ct ON ub.user_id = ct.user_id
WHERE ub.user_id = '{test_user_id}'
GROUP BY ub.balance;
```

---

### 1.3 Platform Subscription Flow

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| U3.1 | View subscription plans on /subscribe | All 4 plans displayed with correct pricing | HIGH |
| U3.2 | Subscribe to Starter plan (monthly) | Subscription created, 50 credits added | CRITICAL |
| U3.3 | Subscribe to Professional plan (yearly) | Subscription created with yearly pricing, 150 credits added | CRITICAL |
| U3.4 | Attempt to subscribe when already subscribed | Error: "Already have active subscription" | HIGH |
| U3.5 | Subscription renewal (monthly) | Recurring invoice paid, credits added automatically | CRITICAL |
| U3.6 | Upgrade from Starter to Business | Prorated charge, credits updated immediately | HIGH |
| U3.7 | Downgrade from Business to Professional | Change scheduled for next billing cycle | HIGH |
| U3.8 | Cancel subscription | Status updated, no more recurring charges | HIGH |
| U3.9 | Subscription after cancellation | Resubscription date tracked, new subscription period starts | MEDIUM |

**Manual Testing Steps:**

**Initial Subscription:**
1. Login as new test user (no subscription)
2. Navigate to `/subscribe`
3. Select "Professional" plan with "Monthly" billing
4. Complete Stripe checkout
5. Wait for webhook: `checkout.session.completed` with mode='subscription'
6. Verify `platform_subscriptions` table:
   - `status = 'active'`
   - `plan_id = 'professional'`
   - `billing_period = 'monthly'`
   - `credits_per_period = 150`
   - `max_overdraft = 50`
7. Verify 150 credits added to `user_balances`
8. Check `stripe_subscription_id` matches Stripe dashboard

**Renewal Testing:**
1. In Stripe Dashboard, find subscription
2. Use "Send test invoice" to simulate renewal
3. Verify webhook: `invoice.paid`
4. Check 150 credits added again
5. Verify `current_period_start` and `current_period_end` updated
6. Check `next_billing_date` is 1 month from now

**Upgrade Testing:**
1. User on Starter plan (50 credits/month)
2. Call `POST /api/subscriptions/change-platform-plan` with `new_plan_id: 'business'`
3. Verify immediate upgrade (no pending_plan_change)
4. Check credits updated to 300
5. Verify prorated Stripe invoice created

**Downgrade Testing:**
1. User on Business plan (300 credits/month)
2. Call `POST /api/subscriptions/change-platform-plan` with `new_plan_id: 'professional'`
3. Verify `pending_plan_change` field populated:
   ```json
   {
     "new_plan_id": "professional",
     "scheduled_at": "{next_billing_date}"
   }
   ```
4. Verify current plan still active until next billing
5. Wait for next billing webhook
6. Verify plan changed and credits adjusted to 150

---

### 1.4 Tool Launch & Credit Consumption

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| U4.1 | Browse tools on homepage | All active tools displayed | MEDIUM |
| U4.2 | View tool details | Modal shows pricing, description, launch button | MEDIUM |
| U4.3 | Launch tool with sufficient credits | Redirect to tool with valid token | HIGH |
| U4.4 | Tool verifies user token | Tool receives user_id and validates successfully | CRITICAL |
| U4.5 | Tool consumes credits via API | Credits deducted from user_balances | CRITICAL |
| U4.6 | Attempt credit consumption with insufficient balance | Error 402: "Insufficient credits" | CRITICAL |
| U4.7 | Idempotent credit consumption | Same idempotency_key doesn't deduct credits twice | CRITICAL |
| U4.8 | Credit consumption with invalid API key | Error 401: "Invalid API key" | HIGH |
| U4.9 | Concurrent credit consumptions | All valid requests processed, no race conditions | HIGH |
| U4.10 | Balance reaches 0 | Webhook notification sent to user | MEDIUM |

**Manual Testing Steps:**

**Tool Launch Flow:**
1. Login as user with credits (e.g., 100 credits)
2. Navigate to homepage
3. Click "Launch Tool" on any tool
4. **Check Network tab:** `POST /api/v1/tools/link/generate-code`
5. Verify redirect to tool URL with code parameter
6. **Simulate tool side:** Call `POST /api/v1/tools/link/exchange-code` with code
7. Receive JWT token (verify expiration = 1 hour)
8. Decode JWT and verify payload: `userId`, `toolId`, `checkoutId`

**Credit Consumption Testing:**
1. Get tool's API key from vendor dashboard or database
2. Make request to `POST /api/v1/credits/consume`:
   ```bash
   curl -X POST https://yourapp.com/api/v1/credits/consume \
     -H "Authorization: Bearer {tool_api_key}" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "{user_uuid}",
       "amount": 10,
       "reason": "Test tool usage",
       "idempotency_key": "test-key-001"
     }'
   ```
3. Verify response: `{"success": true, "new_balance": 90}`
4. Check `credit_transactions` table has "subtract" record
5. Verify `user_balances` decreased by 10
6. **Critical:** Retry same request with same idempotency_key
7. Verify response: `{"success": true, "new_balance": 90}` (not 80!)
8. Verify only ONE transaction in database

**Insufficient Credits Test:**
1. User with 5 credits
2. Attempt to consume 10 credits
3. Verify error response: `402 Payment Required`
4. Verify balance unchanged (still 5)
5. Verify NO transaction created

**Race Condition Test:**
1. User with 100 credits
2. Send 5 concurrent requests to consume 25 credits each (total 125)
3. Verify 4 requests succeed (100 credits used)
4. Verify 1 request fails with "Insufficient credits"
5. Final balance should be 0 or 25 (not negative!)

---

## 2. VENDOR FLOW TESTING

### 2.1 Vendor Application & Approval

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| V1.1 | Submit vendor application | Application created with status='pending' | HIGH |
| V1.2 | Admin views pending applications | All pending applications listed in /admin/vendor-applications | HIGH |
| V1.3 | Admin approves application | user_profiles.is_vendor set to true, status='approved' | HIGH |
| V1.4 | Admin rejects application | status='rejected', rejection_reason stored | MEDIUM |
| V1.5 | Access vendor dashboard before approval | Redirect to /vendors/apply | HIGH |
| V1.6 | Access vendor dashboard after approval | Dashboard loads successfully | HIGH |
| V1.7 | Email notifications sent | Applicant receives approval/rejection email | MEDIUM |

**Manual Testing Steps:**
1. Register new user account
2. Navigate to `/vendors/apply`
3. Submit application:
   - Company: "Test Vendor Co"
   - Website: "https://testvendor.com"
   - Description: "We provide AI tools for developers"
4. Check `vendor_applications` table for new record
5. Login as admin user
6. Navigate to `/admin/vendor-applications`
7. Find test application and click "Approve"
8. Verify `user_profiles.is_vendor = true` for vendor user
9. Logout and login as vendor
10. Verify access to `/vendor-dashboard` granted

---

### 2.2 Tool Creation & Management

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| V2.1 | Create new tool with one-time pricing | Tool created, appears in vendor's tool list | HIGH |
| V2.2 | Create tool with subscription pricing | Multiple pricing tiers saved correctly | HIGH |
| V2.3 | Create tool with custom pricing | Custom pricing flag set, no checkout button | MEDIUM |
| V2.4 | Edit existing tool details | Changes saved, updated_at timestamp updated | MEDIUM |
| V2.5 | Activate/deactivate tool | is_active flag toggled, tool visibility updated | MEDIUM |
| V2.6 | Upload tool logo/images | Images stored, displayed correctly | LOW |
| V2.7 | Tool appears on public marketplace | Active tools visible on homepage | HIGH |
| V2.8 | Tool webhook URL configuration | Webhook URL validated and saved | MEDIUM |

**Manual Testing Steps:**
1. Login as approved vendor
2. Navigate to `/vendor-dashboard/products/create` or similar
3. Fill tool creation form:
   - Name: "Test AI Tool"
   - Description: "Comprehensive description..."
   - URL: "https://testtool.ai"
   - Category: "AI"
   - Pricing: One-time, 20 credits
4. Submit form
5. Verify `tools` table has new record
6. Check tool appears in `/vendor-dashboard/products`
7. Logout and view homepage
8. Verify tool appears (if is_active=true)
9. Verify tool does NOT appear if is_active=false

---

### 2.3 API Key Management

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| V3.1 | Generate first API key for tool | Key generated with format sk-tool-{32chars} | CRITICAL |
| V3.2 | View API key (only once) | Key displayed once, then hidden | HIGH |
| V3.3 | Regenerate API key | New key generated, old key invalidated | HIGH |
| V3.4 | API key usage statistics | Last used timestamp and count displayed | MEDIUM |
| V3.5 | Use old API key after regeneration | Error 401: "Invalid API key" | CRITICAL |
| V3.6 | Use new API key after regeneration | Authentication successful | CRITICAL |
| V3.7 | API key hash stored correctly | bcrypt hash (not plaintext) in api_keys table | CRITICAL |

**Manual Testing Steps:**
1. Login as vendor with a tool
2. Navigate to `/vendor-dashboard/api`
3. Click "Generate API Key" for tool
4. **Critical:** Copy the displayed key (only shown once!)
5. Verify key format: `sk-tool-` followed by 32 alphanumeric chars
6. Check `api_keys` table:
   ```sql
   SELECT * FROM api_keys WHERE tool_id = '{tool_id}';
   ```
7. Verify `key_hash` is bcrypt hash (starts with `$2b$` or similar)
8. Verify `key_prefix` is first 8 chars of key
9. Test API key with `/api/v1/credits/consume`
10. Click "Regenerate API Key"
11. Confirm regeneration
12. Copy NEW key
13. Test OLD key → should fail with 401
14. Test NEW key → should succeed

---

### 2.4 Analytics Access

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| V4.1 | View revenue analytics | Total earnings displayed correctly | HIGH |
| V4.2 | View tool performance metrics | Credits consumed per tool accurate | HIGH |
| V4.3 | View user engagement | Active users count correct | MEDIUM |
| V4.4 | View time series data | Charts display correct date ranges | MEDIUM |
| V4.5 | Export analytics data | CSV download works | LOW |
| V4.6 | Filter analytics by date range | Filtered data matches query | MEDIUM |
| V4.7 | Real-time analytics update | New transactions appear within 1 minute | MEDIUM |

**Manual Testing Steps:**
1. Setup: Create test transactions for vendor's tools
2. Login as vendor
3. Navigate to `/vendor-dashboard` analytics section
4. Verify revenue total matches:
   ```sql
   SELECT SUM(ct.credits_amount) as total_credits
   FROM credit_transactions ct
   JOIN tools t ON ct.tool_id = t.id
   WHERE t.user_profile_id = '{vendor_id}'
   AND ct.type = 'subtract';
   ```
5. Check per-tool breakdown accuracy
6. Test date range filters (last 7 days, 30 days, custom)
7. Verify charts render without errors

---

### 2.5 Payout Management

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| V5.1 | View available balance | Balance = total earnings - scheduled payouts | CRITICAL |
| V5.2 | Initiate Stripe Connect onboarding | Onboarding link generated, redirect to Stripe | HIGH |
| V5.3 | Complete Stripe Connect onboarding | account_status updated to 'active' | HIGH |
| V5.4 | Schedule payout with sufficient balance | Payout created with status='scheduled' | CRITICAL |
| V5.5 | Schedule payout exceeding balance | Error: "Insufficient balance" | HIGH |
| V5.6 | Schedule payout below minimum (50 credits) | Error: "Minimum payout is 50 credits" | MEDIUM |
| V5.7 | Admin processes scheduled payouts | Stripe transfer created, status='completed' | CRITICAL |
| V5.8 | View payout history | All past payouts listed with correct amounts | MEDIUM |
| V5.9 | Failed payout handling | Status='failed', error in metadata | HIGH |

**Manual Testing Steps:**

**Setup - Generate Vendor Earnings:**
```sql
-- Add test credits to a test user
INSERT INTO credit_transactions (user_id, credits_amount, type, reason, tool_id)
VALUES ('{test_user_id}', 100, 'subtract', 'Test tool usage', '{vendor_tool_id}');
-- This simulates 100 credits spent on vendor's tool
```

**Balance Check:**
1. Login as vendor
2. Navigate to `/vendor-dashboard/payouts`
3. Verify "Available Balance" shows 100 credits
4. Verify database:
   ```sql
   -- Calculate vendor balance
   SELECT
     COALESCE(SUM(ct.credits_amount), 0) as total_earnings,
     COALESCE(SUM(vp.credits_amount), 0) as total_payouts,
     COALESCE(SUM(ct.credits_amount), 0) - COALESCE(SUM(vp.credits_amount), 0) as available
   FROM credit_transactions ct
   JOIN tools t ON ct.tool_id = t.id
   LEFT JOIN vendor_payouts vp ON vp.vendor_id = t.user_profile_id
   WHERE t.user_profile_id = '{vendor_id}' AND ct.type = 'subtract';
   ```

**Stripe Connect Onboarding:**
1. Click "Setup Payouts" or "Connect Stripe Account"
2. Verify redirect to Stripe Connect onboarding
3. Complete onboarding in Stripe test mode:
   - Use test business details
   - Skip real identity verification in test mode
4. Return to application
5. Check `vendor_stripe_accounts` table:
   - `account_status = 'active'`
   - `onboarding_completed = true`

**Schedule Payout:**
1. Click "Schedule Payout"
2. Enter 75 credits
3. Select payout date (e.g., tomorrow)
4. Submit
5. Verify `vendor_payouts` table:
   - `status = 'scheduled'`
   - `credits_amount = 75`
   - `euro_amount = 75` (1:1 conversion)
   - `scheduled_date = tomorrow`
6. Verify "Available Balance" now shows 25 (100 - 75)

**Process Payout (Admin/Cron):**
1. Call `POST /api/vendor/payouts/process` with admin API key:
   ```bash
   curl -X POST https://yourapp.com/api/vendor/payouts/process \
     -H "Authorization: Bearer {ADMIN_API_KEY}"
   ```
2. Verify response lists processed payouts
3. Check `vendor_payouts` table:
   - `status = 'completed'`
   - `processed_at` timestamp set
   - `stripe_transfer_id` populated
4. Check Stripe Dashboard for transfer (75 EUR)
5. Verify audit log entry created

**Error Cases:**
- Schedule 120 credits when balance is 100 → should fail
- Schedule 30 credits (below minimum 50) → should fail
- Process payout with inactive Stripe account → should fail with metadata error

---

## 3. API TESTING

### 3.1 Authentication & Authorization

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| A1.1 | Access /api/v1/credits/consume with valid API key | 200 OK (after consuming credits) | CRITICAL |
| A1.2 | Access /api/v1/credits/consume with invalid API key | 401 Unauthorized | CRITICAL |
| A1.3 | Access /api/v1/credits/consume without API key | 401 Unauthorized | HIGH |
| A1.4 | Access /api/vendor/* without session | 401 Unauthorized, redirect to login | HIGH |
| A1.5 | Access /api/vendor/* as non-vendor user | 403 Forbidden | HIGH |
| A1.6 | Access /api/admin/* as regular user | 403 Forbidden | HIGH |
| A1.7 | Access /api/admin/* without session | 401 Unauthorized | HIGH |
| A1.8 | JWT token expiration (1 hour) | 401 after expiration | HIGH |
| A1.9 | Malformed JWT token | 401 Unauthorized | MEDIUM |
| A1.10 | API key rate limiting | 429 after limit exceeded | HIGH |

**Testing Tools:**
- **Postman/Insomnia:** For manual API testing
- **curl:** For automated testing scripts

**Test Script Example:**
```bash
#!/bin/bash

API_BASE="https://yourapp.com"
API_KEY="sk-tool-testkey12345678901234567890"
USER_ID="test-user-uuid"

echo "Test 1: Valid API key"
curl -X POST "$API_BASE/api/v1/credits/consume" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "amount": 1,
    "reason": "Test",
    "idempotency_key": "test-'$(date +%s)'"
  }'

echo "\n\nTest 2: Invalid API key"
curl -X POST "$API_BASE/api/v1/credits/consume" \
  -H "Authorization: Bearer sk-tool-invalid" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "amount": 1,
    "reason": "Test",
    "idempotency_key": "test-'$(date +%s)'"
  }'

echo "\n\nTest 3: Missing API key"
curl -X POST "$API_BASE/api/v1/credits/consume" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "amount": 1,
    "reason": "Test",
    "idempotency_key": "test-'$(date +%s)'"
  }'
```

---

### 3.2 Rate Limiting

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| R1.1 | 100 requests in 1 minute to /api/v1/credits/consume | First 100 succeed, 101st returns 429 | HIGH |
| R1.2 | Rate limit headers present | X-RateLimit-Limit, X-RateLimit-Remaining in response | MEDIUM |
| R1.3 | Rate limit reset after window | Requests succeed after 60 seconds | HIGH |
| R1.4 | Different API keys have separate limits | Key A rate limited doesn't affect Key B | HIGH |
| R1.5 | Auth failure rate limiting (10/5min per IP) | 11th failed auth returns 429 | HIGH |

**Load Testing Script:**
```bash
#!/bin/bash

API_BASE="https://yourapp.com"
API_KEY="your-test-api-key"
USER_ID="test-user-id"

echo "Sending 110 requests to test rate limiting..."

for i in {1..110}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/credits/consume" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "user_id": "'$USER_ID'",
      "amount": 1,
      "reason": "Rate limit test",
      "idempotency_key": "rate-test-'$i'"
    }')

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  echo "Request $i: HTTP $HTTP_CODE"

  if [ "$HTTP_CODE" = "429" ]; then
    echo "Rate limit hit at request $i"
    break
  fi

  sleep 0.1
done
```

---

### 3.3 Input Validation

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| I1.1 | Invalid UUID format in user_id | 400 Bad Request with clear error | HIGH |
| I1.2 | Negative credit amount | 400 Bad Request | HIGH |
| I1.3 | Credit amount exceeding maximum (1M) | 400 Bad Request | MEDIUM |
| I1.4 | Missing required fields | 400 Bad Request listing missing fields | HIGH |
| I1.5 | SQL injection in reason field | Input sanitized, no SQL execution | CRITICAL |
| I1.6 | XSS payload in tool description | HTML sanitized, script tags removed | CRITICAL |
| I1.7 | Overly long input strings | Truncated or rejected | MEDIUM |
| I1.8 | Special characters in product names | Sanitized correctly | MEDIUM |

**SQL Injection Test:**
```bash
curl -X POST "$API_BASE/api/v1/credits/consume" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'$USER_ID'",
    "amount": 1,
    "reason": "Test'); DROP TABLE users;--",
    "idempotency_key": "sql-injection-test"
  }'

# Verify: Tables should still exist
```

**XSS Test:**
1. Create tool with description: `<script>alert('XSS')</script>`
2. View tool on homepage
3. Verify script NOT executed (sanitized to text)
4. Check database - description stored safely

---

### 3.4 Error Handling

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| E1.1 | Database connection failure | 500 with generic error, detailed log server-side | HIGH |
| E1.2 | Stripe API timeout | Graceful failure, user notified to retry | HIGH |
| E1.3 | Invalid Stripe webhook signature | 400, webhook ignored, logged | CRITICAL |
| E1.4 | Malformed JSON in request body | 400 with JSON parse error | MEDIUM |
| E1.5 | Unexpected errors don't expose sensitive data | Generic error message, no stack traces | HIGH |
| E1.6 | Audit logs created for all errors | Error logged with context | MEDIUM |

---

## 4. DATABASE TESTING

### 4.1 Data Integrity

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| D1.1 | user_balances matches sum of credit_transactions | Balance calculation accurate | CRITICAL |
| D1.2 | Concurrent credit operations | No race conditions, final balance correct | CRITICAL |
| D1.3 | Foreign key constraints enforced | Cannot create transaction for non-existent user | HIGH |
| D1.4 | Check constraints enforced | Cannot have negative balance | HIGH |
| D1.5 | Database triggers fire correctly | sync_balance_on_transaction updates balance | CRITICAL |
| D1.6 | Idempotency keys are unique | Duplicate idempotency_key rejected | CRITICAL |
| D1.7 | Soft deletes preserve data | Deleted records remain in database | MEDIUM |

**Integrity Validation Script:**
```sql
-- Run this query to find inconsistencies
WITH user_balances_calculated AS (
  SELECT
    user_id,
    COALESCE(SUM(
      CASE
        WHEN type = 'add' THEN credits_amount
        WHEN type = 'subtract' THEN -credits_amount
        ELSE 0
      END
    ), 0) as calculated_balance
  FROM credit_transactions
  GROUP BY user_id
)
SELECT
  ub.user_id,
  ub.balance as stored_balance,
  COALESCE(ubc.calculated_balance, 0) as calculated_balance,
  ub.balance - COALESCE(ubc.calculated_balance, 0) as difference
FROM user_balances ub
LEFT JOIN user_balances_calculated ubc ON ub.user_id = ubc.user_id
WHERE ub.balance != COALESCE(ubc.calculated_balance, 0);

-- Should return 0 rows (no inconsistencies)
```

**Repair Function Test:**
```sql
-- If inconsistencies found, test repair function
SELECT repair_user_balance('{user_id}');

-- Verify balance corrected
SELECT * FROM user_balances WHERE user_id = '{user_id}';
```

---

### 4.2 Row Level Security (RLS)

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| D2.1 | User can only read own balance | Query returns only own record | HIGH |
| D2.2 | User cannot read other users' balances | Empty result set | HIGH |
| D2.3 | Service role bypasses RLS | All records accessible | HIGH |
| D2.4 | Vendor can only access own tools | Only own tools returned | HIGH |
| D2.5 | Admin can access all resources | All records accessible | HIGH |
| D2.6 | API keys policies allow tool access | Tool can query via API | CRITICAL |

**RLS Testing:**
```sql
-- Test as regular user (set auth.uid to user's ID)
SET request.jwt.claim.sub = '{user_id}';

-- Should return only user's balance
SELECT * FROM user_balances;

-- Should return empty (different user's balance)
SELECT * FROM user_balances WHERE user_id != '{user_id}';
```

---

### 4.3 Performance & Indexes

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| D3.1 | Balance lookup by user_id | < 10ms (indexed) | HIGH |
| D3.2 | API key lookup by prefix | < 20ms (indexed) | HIGH |
| D3.3 | Transaction history pagination | < 50ms for 50 records | MEDIUM |
| D3.4 | Tool search by category | < 100ms | MEDIUM |
| D3.5 | Analytics queries with date filters | < 500ms | MEDIUM |

**Performance Test Query:**
```sql
EXPLAIN ANALYZE SELECT * FROM user_balances WHERE user_id = '{user_id}';
-- Should show Index Scan, not Seq Scan

EXPLAIN ANALYZE SELECT * FROM api_keys WHERE key_prefix = 'sk-tool-';
-- Should show Index Scan
```

---

## 5. PAYMENT & SECURITY TESTING

### 5.1 Stripe Integration

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| P1.1 | Webhook signature verification | Invalid signature rejected | CRITICAL |
| P1.2 | Duplicate webhook handling | Idempotency prevents duplicate processing | CRITICAL |
| P1.3 | Webhook retry logic | Failed webhooks retried by Stripe | HIGH |
| P1.4 | Payment Intent succeeded | Credits added correctly | CRITICAL |
| P1.5 | Payment Intent failed | No credits added, user notified | HIGH |
| P1.6 | Subscription creation | Recurring billing setup correctly | CRITICAL |
| P1.7 | Subscription invoice payment | Credits added on each invoice | CRITICAL |
| P1.8 | Subscription cancellation | No more charges, status updated | HIGH |
| P1.9 | Stripe Connect transfer | Vendor receives payout | CRITICAL |
| P1.10 | Failed Connect transfer | Payout status=failed, retry possible | HIGH |

**Webhook Testing:**
1. Use Stripe CLI to forward webhooks to local dev:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
2. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger invoice.paid
   stripe trigger customer.subscription.deleted
   ```
3. Verify each webhook handler processes correctly
4. Check database updates after each event
5. Test invalid signature:
   ```bash
   curl -X POST http://localhost:3000/api/stripe/webhook \
     -H "stripe-signature: invalid" \
     -d '{}'
   # Should return 400
   ```

---

### 5.2 Security Testing

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| S1.1 | SQL injection in all input fields | All inputs sanitized | CRITICAL |
| S1.2 | XSS in user-generated content | Scripts sanitized/escaped | CRITICAL |
| S1.3 | CSRF protection on forms | CSRF tokens validated | HIGH |
| S1.4 | Session hijacking prevention | Secure cookies, httpOnly flag | HIGH |
| S1.5 | API key exposure in logs | Keys redacted in logs | CRITICAL |
| S1.6 | Sensitive data in error messages | No sensitive data leaked | HIGH |
| S1.7 | HTTPS enforcement | HTTP redirects to HTTPS | HIGH |
| S1.8 | Password strength enforcement | Weak passwords rejected | MEDIUM |
| S1.9 | Brute force protection | Rate limiting on login | HIGH |
| S1.10 | JWT secret strength | 32+ character random string | CRITICAL |

**Security Checklist:**

**Environment Variables:**
- [ ] JWT_SECRET is 32+ characters, truly random
- [ ] ADMIN_API_KEY is strong and not guessable
- [ ] STRIPE_WEBHOOK_SECRET matches Stripe dashboard
- [ ] SUPABASE_SERVICE_ROLE_KEY is not exposed client-side
- [ ] No secrets in .env.example or git history

**Cookie Security:**
- [ ] Session cookies have `secure` flag (HTTPS only)
- [ ] Session cookies have `httpOnly` flag (no JS access)
- [ ] Session cookies have `sameSite=lax` or `strict`

**API Keys:**
- [ ] Stored as bcrypt hashes, not plaintext
- [ ] Never logged in plaintext
- [ ] Only shown once to user during generation
- [ ] Prefix indexed for fast lookup without exposing full key

**Input Validation:**
- [ ] All UUID fields validated with Zod
- [ ] Credit amounts checked (positive, max limit)
- [ ] URLs validated (no javascript:, data:, file:)
- [ ] Email addresses validated
- [ ] Markdown content sanitized

**Output Encoding:**
- [ ] HTML content sanitized before rendering
- [ ] JSON responses properly encoded
- [ ] Error messages don't expose system details

---

### 5.3 Payment Security

**Test Cases:**

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| PS1.1 | No credit card details stored on server | All handled by Stripe | CRITICAL |
| PS1.2 | PCI compliance via Stripe | Stripe Checkout/Elements used | CRITICAL |
| PS1.3 | Payment amounts match expected | No price manipulation | CRITICAL |
| PS1.4 | Refunds processed correctly | Credits deducted, transaction logged | HIGH |
| PS1.5 | Chargebacks handled | Automated or manual response | MEDIUM |
| PS1.6 | Currency consistency (EUR only) | All transactions in EUR | HIGH |
| PS1.7 | Credit-to-euro conversion accurate (1:1) | Payout amounts correct | CRITICAL |

**Manual Verification:**
1. Complete test purchase
2. Check Stripe Dashboard:
   - Amount matches expected price
   - Currency is EUR
   - Customer ID matches user
3. Verify NO card details in application database:
   ```sql
   -- These queries should return NO credit card data
   SELECT * FROM credit_transactions WHERE metadata::text LIKE '%card%';
   SELECT * FROM checkouts WHERE metadata::text LIKE '%card%';
   ```

---

## 6. UI/UX TESTING

### 6.1 Responsive Design

**Test Cases:**

| ID | Device | Test | Expected Result | Priority |
|----|--------|------|-----------------|----------|
| UI1.1 | Mobile (375px) | Homepage | All content visible, no horizontal scroll | HIGH |
| UI1.2 | Mobile (375px) | Tool cards | Cards stack vertically, readable | HIGH |
| UI1.3 | Mobile (375px) | Navigation | Hamburger menu works | HIGH |
| UI1.4 | Tablet (768px) | Dashboard | Sidebar collapses/expands | MEDIUM |
| UI1.5 | Desktop (1920px) | All pages | No excessive whitespace | LOW |
| UI1.6 | Mobile | Credit purchase | Checkout flow usable on mobile | HIGH |
| UI1.7 | Mobile | Vendor dashboard | Charts render correctly | MEDIUM |

**Testing Devices:**
- iPhone SE (375px width)
- iPhone 12 Pro (390px)
- iPad (768px)
- Desktop (1920px)
- Use browser DevTools device emulation

---

### 6.2 Accessibility (WCAG 2.1 Level AA)

**Test Cases:**

| ID | Test | Expected Result | Priority |
|----|------|-----------------|----------|
| A11Y1.1 | Keyboard navigation | All interactive elements accessible via Tab | HIGH |
| A11Y1.2 | Screen reader compatibility | ARIA labels present, content readable | MEDIUM |
| A11Y1.3 | Color contrast | All text meets 4.5:1 ratio | MEDIUM |
| A11Y1.4 | Focus indicators | Visible focus outline on all interactive elements | HIGH |
| A11Y1.5 | Form labels | All inputs have associated labels | HIGH |
| A11Y1.6 | Error messages | Clear, accessible error messages | HIGH |
| A11Y1.7 | Alt text for images | All images have descriptive alt text | MEDIUM |

**Testing Tools:**
- **axe DevTools:** Browser extension for automated accessibility testing
- **Lighthouse:** Chrome DevTools accessibility audit
- **WAVE:** Web accessibility evaluation tool
- **Keyboard only:** Navigate entire site without mouse

---

### 6.3 User Experience Flows

**Test Cases:**

| ID | Flow | Critical Points | Priority |
|----|------|-----------------|----------|
| UX1.1 | First-time user registration to tool launch | < 5 minutes, clear path | HIGH |
| UX1.2 | Buying credits | < 3 clicks from homepage | HIGH |
| UX1.3 | Subscription purchase | Clear plan comparison, easy selection | HIGH |
| UX1.4 | Tool discovery | Search/filter works, categories clear | MEDIUM |
| UX1.5 | Vendor onboarding | Application to approval status visible | HIGH |
| UX1.6 | Error recovery | Clear error messages, actionable next steps | HIGH |
| UX1.7 | Loading states | Spinners/skeletons for async operations | MEDIUM |

**User Testing Script:**
1. **Task:** "You want to try the AI tool. Sign up and launch it."
   - Observe: Do they find the tool easily? Is signup intuitive?
   - Time: Should complete in < 5 minutes
   - Issues: Note any confusion or friction points

2. **Task:** "You ran out of credits. Buy more."
   - Observe: Can they find credit purchase page?
   - Issues: Is pricing clear? Is checkout smooth?

3. **Task:** "You want a subscription. Compare plans and subscribe."
   - Observe: Can they differentiate plans?
   - Issues: Are benefits clear? Is checkout straightforward?

---

### 6.4 Performance & Optimization

**Test Cases:**

| ID | Metric | Target | Priority |
|----|--------|--------|----------|
| PERF1.1 | Homepage load time (3G) | < 3 seconds | HIGH |
| PERF1.2 | Time to Interactive (TTI) | < 5 seconds | HIGH |
| PERF1.3 | Largest Contentful Paint (LCP) | < 2.5 seconds | MEDIUM |
| PERF1.4 | First Input Delay (FID) | < 100ms | MEDIUM |
| PERF1.5 | Cumulative Layout Shift (CLS) | < 0.1 | MEDIUM |
| PERF1.6 | Image optimization | All images < 200KB, lazy loaded | MEDIUM |
| PERF1.7 | Bundle size | Main JS bundle < 500KB | LOW |

**Testing Tools:**
- **Lighthouse:** Chrome DevTools performance audit
- **WebPageTest:** Real-world performance testing
- **GTmetrix:** Performance insights

**Optimization Checklist:**
- [ ] Images optimized (WebP format, proper sizing)
- [ ] Next.js Image component used throughout
- [ ] Code splitting implemented (per-route)
- [ ] Critical CSS inlined
- [ ] Fonts preloaded
- [ ] API responses cached where appropriate
- [ ] Database queries optimized (indexes used)
- [ ] No unnecessary re-renders in React components

---

## 7. INTEGRATION TESTING

### 7.1 End-to-End User Scenarios

**Scenario 1: New User Complete Journey**
1. User visits homepage
2. Registers account
3. Browses tools
4. Purchases credits (50 credits)
5. Launches a tool
6. Tool consumes credits (10 credits)
7. User checks balance (40 credits remaining)
8. User subscribes to Professional plan
9. Receives monthly credit allotment (150 credits)
10. Balance now 190 credits

**Verification Points:**
- [ ] Email confirmation sent (if enabled)
- [ ] User profile created with correct role
- [ ] Payment successful in Stripe
- [ ] Credits added to user_balances
- [ ] Transaction logged in credit_transactions
- [ ] Tool receives valid JWT token
- [ ] Credit consumption atomic and idempotent
- [ ] Subscription created in Stripe
- [ ] Recurring credits added
- [ ] User can see transaction history

---

**Scenario 2: Vendor Complete Journey**
1. User registers account
2. Applies to become vendor
3. Admin approves application
4. Vendor creates tool
5. Vendor generates API key
6. Vendor's tool consumes credits via API
7. Vendor checks analytics
8. Vendor initiates Stripe Connect onboarding
9. Vendor schedules payout
10. Admin processes payout
11. Vendor receives funds in Stripe

**Verification Points:**
- [ ] Application status tracked correctly
- [ ] is_vendor flag set after approval
- [ ] Tool created and visible in marketplace
- [ ] API key generated and works
- [ ] Credit consumption via API successful
- [ ] Analytics show accurate revenue
- [ ] Stripe Connect account created
- [ ] Payout scheduled and processed
- [ ] Stripe transfer successful
- [ ] Audit logs complete

---

### 7.2 Failure & Recovery Scenarios

**Scenario 3: Payment Failure Handling**
1. User attempts credit purchase with declining card
2. Stripe rejects payment
3. Webhook notifies application
4. No credits added to account
5. User notified of failure
6. User retries with valid card
7. Payment succeeds
8. Credits added correctly

**Verification Points:**
- [ ] Failed payment doesn't add credits
- [ ] Checkout status remains pending
- [ ] User receives clear error message
- [ ] Retry functionality works
- [ ] Successful retry processes correctly

---

**Scenario 4: Webhook Failure & Retry**
1. Stripe sends webhook
2. Application returns 500 error (simulated)
3. Stripe retries webhook (3 attempts)
4. Application recovers and processes on retry
5. Credits added correctly (idempotency prevents duplicates)

**Verification Points:**
- [ ] Webhook retry logic works
- [ ] Idempotency key prevents duplicate credits
- [ ] Final state is consistent
- [ ] Audit log shows retry attempts

---

## 8. PRE-PRODUCTION CHECKLIST

### 8.1 Environment Configuration

**Production Environment Variables:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set to production Supabase project
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (never exposed client-side)
- [ ] `JWT_SECRET` is 32+ random characters (unique from staging)
- [ ] `ADMIN_EMAIL` set to production admin email
- [ ] `RESEND_API_KEY` set to production Resend account
- [ ] `STRIPE_SECRET_KEY` set to LIVE mode (starts with `sk_live_`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set to LIVE mode (`pk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` set to production webhook secret
- [ ] `STRIPE_WEBHOOK_SECRET_CONNECT` set to production Connect webhook secret
- [ ] `ADMIN_API_KEY` is strong, unique (for cron jobs)
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain (e.g., https://1sub.io)
- [ ] `MIN_PAYOUT_CREDITS` set (default: 50)

**Vercel/Deployment Platform:**
- [ ] All environment variables added to Vercel dashboard
- [ ] Environment variables marked as "Production" only (not exposed in preview)
- [ ] Domain configured and SSL enabled
- [ ] Vercel analytics enabled (optional)

---

### 8.2 Database Migration

**Pre-Migration:**
- [ ] All migrations tested in staging environment
- [ ] Backup of production database created
- [ ] Rollback plan documented
- [ ] Migration time estimated (downtime if needed)
- [ ] Team notified of migration schedule

**Migration Steps:**
```bash
# 1. Backup production database
# In Supabase Dashboard: Database > Backups > Create backup

# 2. Link to production project
supabase link --project-ref {production-ref}

# 3. Run migrations
supabase db push

# 4. Verify migrations applied
# Check Supabase Dashboard: Table Editor

# 5. Run data integrity check
# Execute SQL query from section 4.1
```

**Post-Migration:**
- [ ] All tables exist and have correct schema
- [ ] RLS policies applied correctly
- [ ] Database functions (RPC) working
- [ ] Indexes created
- [ ] Test queries run successfully
- [ ] Data integrity validated

---

### 8.3 Stripe Configuration

**Activate Live Mode:**
- [ ] Activate Stripe account (complete business verification)
- [ ] Enable live mode in Stripe Dashboard
- [ ] Create live webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
- [ ] Events to listen: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, `customer.subscription.updated`, `payment_intent.succeeded`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Create Connect webhook: `https://yourdomain.com/api/stripe/connect/webhook`
- [ ] Events to listen: `account.updated`
- [ ] Copy Connect webhook secret to `STRIPE_WEBHOOK_SECRET_CONNECT`
- [ ] Test webhooks with Stripe CLI:
  ```bash
  stripe listen --live --forward-to https://yourdomain.com/api/stripe/webhook
  ```

**Payment Methods:**
- [ ] Enable desired payment methods (Cards, Wallets, etc.)
- [ ] Configure currency (EUR)
- [ ] Set up billing portal (if using Stripe Billing)
- [ ] Configure email receipts

**Stripe Connect:**
- [ ] Enable Stripe Connect for your platform
- [ ] Set up brand settings (logo, colors)
- [ ] Configure account requirements (Standard accounts)
- [ ] Test onboarding flow in live mode
- [ ] Set up payout schedule (manual or automatic)

---

### 8.4 Monitoring & Logging

**Error Monitoring:**
- [ ] Sentry or similar error tracking configured
- [ ] Error notifications sent to team
- [ ] Sensitive data redacted in error logs
- [ ] Source maps uploaded for stack traces

**Application Monitoring:**
- [ ] Vercel Analytics enabled (or alternative)
- [ ] Custom API route monitoring (response times, error rates)
- [ ] Database query performance monitoring
- [ ] Webhook delivery monitoring

**Logging:**
- [ ] Audit logs written for all critical operations:
  - Credit additions/subtractions
  - Subscription changes
  - API key regeneration
  - Vendor payouts
  - Admin actions
- [ ] Logs structured (JSON format)
- [ ] Log retention policy defined
- [ ] Sensitive data (API keys, passwords) redacted

**Alerts:**
- [ ] Alert on high error rate (> 5% of requests)
- [ ] Alert on failed webhook deliveries
- [ ] Alert on Stripe payout failures
- [ ] Alert on database query slowdowns
- [ ] Alert on rate limit abuse

---

### 8.5 Security Hardening

**Before Production:**
- [ ] Run security audit with npm audit / yarn audit
- [ ] Update all dependencies to latest secure versions
- [ ] Remove all console.log statements from production code
- [ ] Enable Vercel Firewall (if available)
- [ ] Configure CSP (Content Security Policy) headers
- [ ] Enable HSTS (HTTP Strict Transport Security)
- [ ] Disable directory listing
- [ ] Hide server version headers
- [ ] Rate limiting enabled on all API endpoints
- [ ] CORS configured (whitelist only allowed origins)
- [ ] Supabase RLS policies enabled on ALL tables
- [ ] Database backups automated (daily)
- [ ] Secrets rotation plan documented

**Security Testing:**
- [ ] Run OWASP ZAP scan
- [ ] Test for common vulnerabilities (SQL injection, XSS, CSRF)
- [ ] Penetration testing (if budget allows)
- [ ] Review all admin endpoints (ensure proper auth)
- [ ] Verify API keys stored as hashes
- [ ] Check no secrets in client-side code

---

### 8.6 Performance Optimization

**Before Launch:**
- [ ] Lighthouse score > 90 on all core pages
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting implemented
- [ ] Unused dependencies removed
- [ ] Database indexes verified
- [ ] API response times < 200ms (p95)
- [ ] CDN configured for static assets
- [ ] Caching headers set correctly
- [ ] gzip/brotli compression enabled

**Load Testing:**
```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 https://yourdomain.com/api/v1/credits/consume \
  -H "Authorization: Bearer {test_api_key}" \
  -p payload.json -T application/json

# Monitor:
# - Response times (should be < 500ms)
# - Error rate (should be 0%)
# - Database connection pool usage
# - Memory usage
```

- [ ] API handles 100 req/min per key without degradation
- [ ] Database handles concurrent writes without deadlocks
- [ ] No memory leaks under sustained load
- [ ] Graceful degradation under extreme load

---

### 8.7 Business Continuity

**Documentation:**
- [ ] All API endpoints documented (see API_ENDPOINTS_REFERENCE.md)
- [ ] Vendor integration guide published
- [ ] Admin operations manual created
- [ ] Incident response plan documented
- [ ] Backup and restore procedures tested
- [ ] Contact information for critical services (Stripe, Supabase, etc.)

**Rollback Plan:**
- [ ] Previous production version tagged in git
- [ ] Rollback procedure documented (Vercel: instant rollback to previous deployment)
- [ ] Database rollback scripts prepared (if schema changes)
- [ ] Team trained on rollback procedure

**Support:**
- [ ] Support email configured (support@yourdomain.com)
- [ ] Support ticket system ready (if applicable)
- [ ] FAQ/Help documentation published
- [ ] Discord/community channel moderated
- [ ] On-call schedule defined for critical issues

---

## 9. TESTING EXECUTION PLAN

### Phase 1: Unit & Component Testing (1-2 days)
- [ ] All utility functions tested (validation, sanitization, etc.)
- [ ] Database functions (RPC) tested
- [ ] Credit system functions tested
- [ ] Payment integration functions tested

### Phase 2: API Testing (2-3 days)
- [ ] All API endpoints tested with Postman/Insomnia
- [ ] Authentication and authorization verified
- [ ] Rate limiting tested
- [ ] Input validation tested
- [ ] Error handling verified

### Phase 3: User Flow Testing (2-3 days)
- [ ] Registration and login flows
- [ ] Credit purchase flow (full Stripe integration)
- [ ] Subscription flow (creation, renewal, cancellation)
- [ ] Tool launch and credit consumption
- [ ] Transaction history and balance display

### Phase 4: Vendor Flow Testing (2-3 days)
- [ ] Vendor application and approval
- [ ] Tool creation and management
- [ ] API key generation and usage
- [ ] Analytics accuracy
- [ ] Payout flow (Stripe Connect)

### Phase 5: Integration Testing (2-3 days)
- [ ] End-to-end scenarios (see section 7.1)
- [ ] Failure and recovery scenarios
- [ ] Concurrent user scenarios
- [ ] Data consistency validation

### Phase 6: Security & Performance (1-2 days)
- [ ] Security audit (OWASP Top 10)
- [ ] Load testing
- [ ] Performance optimization
- [ ] Accessibility testing

### Phase 7: UAT (User Acceptance Testing) (3-5 days)
- [ ] Invite beta users (5-10 users)
- [ ] Invite beta vendors (2-3 vendors)
- [ ] Collect feedback
- [ ] Fix critical issues
- [ ] Retest

### Phase 8: Pre-Production Verification (1 day)
- [ ] Complete pre-production checklist (section 8)
- [ ] Final smoke test on production-like staging environment
- [ ] Team sign-off

**Total Estimated Time:** 14-22 days

---

## 10. SUCCESS CRITERIA

### Must-Have (Blockers for Production)
- [ ] All HIGH and CRITICAL priority tests pass
- [ ] No security vulnerabilities (SQL injection, XSS)
- [ ] Payment flows work correctly (100% success rate in testing)
- [ ] Credit system is accurate (no credit leaks or race conditions)
- [ ] Vendor payouts process correctly
- [ ] Database integrity validated
- [ ] All environment variables configured
- [ ] Stripe webhooks working in live mode
- [ ] Monitoring and alerts configured

### Should-Have (Fix if time allows)
- [ ] All MEDIUM priority tests pass
- [ ] Lighthouse score > 90
- [ ] Mobile responsiveness perfect
- [ ] All accessibility issues fixed
- [ ] Load testing passed (100 req/min sustained)

### Nice-to-Have (Post-launch)
- [ ] All LOW priority tests pass
- [ ] Advanced analytics features tested
- [ ] Email templates polished
- [ ] Additional payment methods tested

---

## 11. KNOWN LIMITATIONS & RISKS

### Rate Limiting
**Limitation:** In-memory rate limiter (not distributed)
**Risk:** Rate limits reset on server restart, not shared across multiple instances
**Mitigation:** For production with multiple servers, migrate to Redis-based rate limiting (Upstash recommended)

### Webhook Reliability
**Risk:** If webhook endpoint is down during Stripe event, data inconsistency possible
**Mitigation:** Stripe automatically retries webhooks. Monitor webhook delivery in Stripe Dashboard. Set up alerts for failed webhooks.

### Payment Processing
**Risk:** User completes payment but webhook never received
**Mitigation:** Implement background job to reconcile Stripe payments with database (match stripe_session_id)

### Database Concurrency
**Risk:** High concurrency on credit operations could cause lock contention
**Mitigation:** RPC function uses row-level locking. Monitor query performance. Consider read replicas if needed.

### Payout Processing
**Risk:** Failed payout leaves payout record in "processing" state indefinitely
**Mitigation:** Implement retry logic with exponential backoff. Manual admin intervention for stuck payouts.

---

## 12. POST-LAUNCH MONITORING

### First 24 Hours
- [ ] Monitor error rates every hour
- [ ] Check webhook delivery success rate
- [ ] Verify payment processing (at least 10 successful transactions)
- [ ] Monitor database performance (query times, connection pool)
- [ ] Check for any security alerts

### First Week
- [ ] Daily error report review
- [ ] User feedback collection and triage
- [ ] Vendor feedback collection
- [ ] Performance metrics review (API response times, page load times)
- [ ] Financial reconciliation (Stripe payouts match database records)

### Ongoing
- [ ] Weekly security updates (npm audit, dependency updates)
- [ ] Monthly performance review (optimize slow queries, API endpoints)
- [ ] Quarterly disaster recovery drill (test backup restore)
- [ ] Continuous monitoring of error logs and user feedback

---

## APPENDIX A: Test Data

### Test Users
Create these users in staging/test environment:

1. **Regular User** (user1@test.com)
   - Initial balance: 100 credits
   - Has active subscription: No
   - Role: user

2. **Subscribed User** (sub-user@test.com)
   - Initial balance: 150 credits
   - Has active subscription: Professional (monthly)
   - Role: user

3. **Vendor User** (vendor1@test.com)
   - Is vendor: Yes
   - Has 1 tool published
   - Has API key
   - Role: user, vendor

4. **Admin User** (admin@test.com)
   - Role: admin
   - Access to all admin endpoints

### Test Tools
1. **Test AI Tool**
   - Vendor: vendor1@test.com
   - Pricing: 10 credits per use
   - Status: Active
   - Category: AI

2. **Test Dev Tool**
   - Vendor: vendor1@test.com
   - Pricing: Subscription ($20/month)
   - Status: Active
   - Category: Development

### Stripe Test Data
- Test Cards: https://stripe.com/docs/testing
- Test Webhooks: Use Stripe CLI
- Test Connect Accounts: Create in Stripe Dashboard test mode

---

## APPENDIX B: Testing Tools & Resources

### Required Tools
- **Postman/Insomnia:** API testing
- **Stripe CLI:** Webhook testing
- **Browser DevTools:** UI/performance testing
- **Database Client:** (DBeaver, pgAdmin) for database verification

### Optional Tools
- **Sentry:** Error tracking (recommended)
- **Lighthouse CI:** Automated performance testing
- **OWASP ZAP:** Security testing
- **k6 or Apache Bench:** Load testing
- **axe DevTools:** Accessibility testing

### Documentation References
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Testing Best Practices](https://nextjs.org/docs/testing)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Document Version:** 1.0
**Last Updated:** December 8, 2024
**Next Review:** After test execution completion

---

*This testing plan is comprehensive but practical. Focus on HIGH and CRITICAL priority items first. All tests should be executed before production launch. Good luck!*

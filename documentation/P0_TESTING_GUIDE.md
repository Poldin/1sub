# P0 Security Fixes - Testing Guide

## Overview

This guide provides step-by-step instructions for testing the three critical P0 security bug fixes.

---

## Prerequisites

Before testing, ensure:

1. ✅ Database migration applied: `20251227000001_fix_p0_security_bugs.sql`
2. ✅ TypeScript changes deployed: `src/app/api/subscriptions/cancel/route.ts`
3. ✅ Test environment configured with `.env.test`
4. ✅ Supabase test database available

---

## Quick Test (Automated)

### Windows
```bash
cd C:\Users\DISTRICTS\Desktop\1sub-dev
scripts\test-p0-fixes.bat
```

### Linux/Mac
```bash
cd /path/to/1sub-dev
chmod +x scripts/test-p0-fixes.sh
./scripts/test-p0-fixes.sh
```

---

## Individual Test Execution

### Test Bug #1: Code Exchange Race Condition

```bash
npm test -- tests/security/p0-bug1-code-exchange-race.test.ts
```

**What it tests:**
- ✅ Two simultaneous exchange requests with same code → one succeeds, one fails
- ✅ 100 concurrent exchange attempts → exactly one succeeds
- ✅ Second exchange after first succeeds → CODE_ALREADY_USED error
- ✅ Rapid sequential exchanges → only first succeeds

**Expected Results:**
- All tests pass
- Console output shows "✅ Race condition prevented"
- No duplicate tokens created

**If tests fail:**
- Check migration `20251227000001_fix_p0_security_bugs.sql` is applied
- Verify `exchange_authorization_code` function updated
- Check database for duplicate `is_exchanged=TRUE` records

---

### Test Bug #2: Token Rotation Subscription Check

```bash
npm test -- tests/security/p0-bug2-token-rotation-subscription.test.ts
```

**What it tests:**
- ✅ Token rotation works when subscription is `active`
- ✅ Token rotation works when subscription is `trialing`
- ❌ Token rotation FAILS when subscription is `cancelled`
- ❌ Token rotation FAILS when subscription is `past_due`
- ❌ Token rotation FAILS when subscription is `paused`
- ❌ Indefinite access prevention after cancellation

**Expected Results:**
- All tests pass
- Console output shows "✅ Token rotation blocked after cancellation"
- No rotations succeed after cancellation

**If tests fail:**
- Check `rotate_token` SQL function includes subscription check
- Verify subscription status in `tool_subscriptions` table
- Check `revocations` table for proper records

---

### Test Bug #3: Manual Cancellation Revocation

```bash
npm test -- tests/security/p0-bug3-manual-cancellation-revocation.test.ts
```

**What it tests:**
- ✅ Revocation record created on manual cancellation
- ✅ All verification tokens immediately invalidated
- ✅ Access blocked within 2 seconds of cancellation
- ✅ Consistent behavior with Stripe webhook cancellation
- ✅ Multiple tokens all revoked simultaneously

**Expected Results:**
- All tests pass
- Console output shows "✅ Token immediately invalidated"
- Revocation delay < 2 seconds

**If tests fail:**
- Check `src/app/api/subscriptions/cancel/route.ts` has `revokeAccess()` call
- Verify `revokeAccess()` import added
- Check database for revocation records in `revocations` table

---

## Manual Testing (No Automation)

If automated tests cannot run, perform manual testing:

### Manual Test 1: Code Exchange Race

```bash
# Terminal 1: Get authorization code
curl -X POST http://localhost:3000/api/v1/authorize/initiate \
  -H "Content-Type: application/json" \
  -d '{"toolId":"YOUR_TOOL_ID"}'

# Save the code from response

# Terminal 2 & 3: Send simultaneous exchanges
curl -X POST http://localhost:3000/api/v1/authorize/exchange \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_CODE"}' &
curl -X POST http://localhost:3000/api/v1/authorize/exchange \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_CODE"}' &

# Check responses - one should succeed, one should fail with CODE_ALREADY_USED
```

### Manual Test 2: Token Rotation After Cancellation

```bash
# 1. Create subscription and get verification token
# (via normal flow)

# 2. Verify token works
curl -X POST http://localhost:3000/api/v1/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"verificationToken":"YOUR_TOKEN"}'
# Should return valid: true

# 3. Cancel subscription
curl -X POST http://localhost:3000/api/subscriptions/cancel \
  -H "Authorization: Bearer USER_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subscription_id":"SUB_ID"}'

# 4. Try to verify again
curl -X POST http://localhost:3000/api/v1/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"verificationToken":"YOUR_TOKEN"}'
# Should return valid: false, error: ACCESS_REVOKED
```

### Manual Test 3: Database Verification

```sql
-- Check revocation was created
SELECT * FROM revocations
WHERE user_id = 'YOUR_USER_ID'
  AND tool_id = 'YOUR_TOOL_ID';
-- Should return one row with reason = 'subscription_cancelled'

-- Check tokens were revoked
SELECT * FROM verification_tokens
WHERE user_id = 'YOUR_USER_ID'
  AND tool_id = 'YOUR_TOOL_ID'
  AND is_revoked = TRUE;
-- Should return all tokens for that user+tool

-- Check code exchange atomicity
SELECT code, is_exchanged, exchanged_at
FROM authorization_codes
WHERE code = 'YOUR_TEST_CODE';
-- Should only be exchanged once (is_exchanged = TRUE, single exchanged_at)
```

---

## Integration Testing

After unit tests pass, run full integration test suite:

```bash
# Run all vendor integration tests
npm test -- tests/integration/vendor/

# Specific critical tests
npm test -- tests/integration/vendor/callback-launch-flow.test.ts
npm test -- tests/integration/vendor/enforcement-verify.test.ts
npm test -- tests/integration/vendor/session-enforcement.test.ts
```

---

## Monitoring After Deployment

### Key Metrics to Watch

1. **Revocation Rate**
   ```sql
   SELECT COUNT(*) as revocations_today
   FROM revocations
   WHERE revoked_at > NOW() - INTERVAL '1 day';
   ```
   Expected: May increase (users with cancelled subs now properly blocked)

2. **Code Exchange Errors**
   ```sql
   -- Check application logs
   grep "CODE_ALREADY_USED" /var/log/app.log
   ```
   Expected: Should be rare (< 0.1% of exchanges)

3. **Token Rotation Failures**
   ```sql
   SELECT COUNT(*) as rotation_failures
   FROM verification_tokens
   WHERE is_revoked = TRUE
     AND revoked_at > NOW() - INTERVAL '1 day'
     AND metadata->>'rolled_to' IS NULL;
   ```
   Expected: Increase (cancelled users blocked from rotation)

### Alert Thresholds

- ⚠️ CODE_ALREADY_USED > 1% of total exchanges → possible attack
- ⚠️ Revocation failures > 0 → bug in revocation logic
- ⚠️ Token rotation allowed after cancellation → Bug #2 not fixed

---

## Troubleshooting

### Tests Fail: "Migration not applied"

**Solution:**
```bash
npx supabase migration up
# Or
npx supabase db push
```

### Tests Fail: "revokeAccess is not a function"

**Solution:**
- Check `src/app/api/subscriptions/cancel/route.ts` has import:
  ```typescript
  import { revokeAccess } from '@/domains/auth';
  ```
- Restart dev server after code changes

### Tests Fail: "Cannot connect to database"

**Solution:**
- Check `.env.test` has valid `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Verify Supabase project is running
- Check network connectivity

### Tests Fail: "User not authenticated"

**Solution:**
- Tests need service role key, not anon key
- Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.test`
- Check RLS policies allow service role access

---

## Success Criteria

All P0 fixes are verified when:

✅ **Bug #1 Tests Pass:**
- Race condition prevented (100 concurrent exchanges → 1 success)
- CODE_ALREADY_USED error returned for duplicates

✅ **Bug #2 Tests Pass:**
- Token rotation blocked when subscription inactive
- No indefinite access after cancellation

✅ **Bug #3 Tests Pass:**
- Revocation record created on manual cancellation
- Access blocked within 2 seconds
- All tokens invalidated

✅ **Database Checks:**
- `revocations` table populated correctly
- `verification_tokens.is_revoked = TRUE` after cancellation
- `authorization_codes.is_exchanged` only TRUE once per code

✅ **Integration Tests:**
- Full vendor flow works end-to-end
- No regressions in existing functionality

---

## Sign-Off

After all tests pass:

- [ ] Bug #1 tests passed
- [ ] Bug #2 tests passed
- [ ] Bug #3 tests passed
- [ ] Integration tests passed
- [ ] Database verification completed
- [ ] Monitoring alerts configured
- [ ] Security team notified
- [ ] Deployment approved

**Tester Name:** _______________
**Date:** _______________
**Environment:** [ ] Local [ ] Staging [ ] Production
**Approval:** _______________

---

**END OF TESTING GUIDE**

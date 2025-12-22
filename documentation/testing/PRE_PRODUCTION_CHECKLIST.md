# Pre-Production Testing Checklist

Use this checklist before deploying to production to ensure the platform is fully tested and ready.

## Overview

This checklist covers all critical testing steps that must be completed before production deployment. Each section includes commands to run and expected outcomes.

---

## 📋 Phase 1: Environment Setup

### 1.1 Verify Test Environment
- [ ] `.env.test` file exists and is configured
- [ ] Test Supabase database is accessible
- [ ] Stripe test keys are configured
- [ ] All environment variables are set

**Command:**
```bash
# Verify environment file
cat .env.test

# Check required variables
grep SUPABASE_URL .env.test
grep STRIPE_SECRET_KEY .env.test
```

**Expected:** All required variables present and valid.

### 1.2 Install Dependencies
- [ ] Node.js 18+ installed
- [ ] All npm packages installed
- [ ] Playwright browsers installed
- [ ] No security vulnerabilities

**Commands:**
```bash
node --version              # Should be v18+
npm install
npx playwright install --with-deps
npm audit                   # Should show 0 vulnerabilities
```

**Expected:** All installations successful, no vulnerabilities.

---

## 📋 Phase 2: Unit Testing

### 2.1 Run All Unit Tests
- [ ] Validation tests pass
- [ ] Sanitization tests pass
- [ ] Rate limit tests pass
- [ ] No failing tests

**Command:**
```bash
npm run test:unit
```

**Expected Output:**
```
Test Files  3 passed (3)
Tests  XX passed (XX)
Duration  < 1 minute
```

### 2.2 Verify Code Coverage
- [ ] Overall coverage ≥ 70%
- [ ] Critical paths ≥ 90%
- [ ] No untested critical functions

**Command:**
```bash
npm run test:coverage
open coverage/index.html
```

**Expected:** Green coverage reports, all thresholds met.

---

## 📋 Phase 3: Integration Testing

### 3.1 Database Integrity Tests
- [ ] Credit transactions maintain balance consistency
- [ ] Triggers work correctly
- [ ] Constraints prevent invalid data
- [ ] Concurrent operations handled properly

**Command:**
```bash
npm run test:database
```

**Expected:** All database tests passing.

### 3.2 API Integration Tests
- [ ] Credit management APIs work
- [ ] V1 vendor APIs authenticated properly
- [ ] Stripe webhooks process correctly
- [ ] Checkout flow completes successfully

**Command:**
```bash
npm run test:integration
```

**Expected:** All API tests passing, no timeout errors.

### 3.3 Security Tests
- [ ] SQL injection attempts blocked
- [ ] XSS payloads sanitized
- [ ] Authentication required for protected endpoints
- [ ] Rate limiting enforced

**Command:**
```bash
npm run test:security
```

**Expected:** All security tests pass, no vulnerabilities.

---

## 📋 Phase 4: End-to-End Testing

### 4.1 User Journey Tests
- [ ] User registration works
- [ ] Login/logout functions properly
- [ ] Credit purchase flow completes
- [ ] Tool launching works
- [ ] Transaction history displays

**Command:**
```bash
# Start dev server first
npm run dev

# In another terminal:
npm run test:e2e -- tests/e2e/user/
```

**Expected:** All user journey tests pass in all browsers.

### 4.2 Vendor Journey Tests
- [ ] Vendor application submits successfully
- [ ] Tool creation works
- [ ] API key generation functions
- [ ] Analytics display correctly
- [ ] Payout process works

**Command:**
```bash
npm run test:e2e -- tests/e2e/vendor/
```

**Expected:** All vendor tests pass.

### 4.3 Admin Functions Tests
- [ ] Admin can access dashboard
- [ ] User management works
- [ ] Vendor approval process functions
- [ ] Platform statistics display
- [ ] Settings can be modified

**Command:**
```bash
npm run test:e2e -- tests/e2e/admin/
```

**Expected:** All admin tests pass.

### 4.4 Cross-Browser Compatibility
- [ ] Tests pass in Chromium
- [ ] Tests pass in Firefox
- [ ] Tests pass in WebKit (Safari)
- [ ] Tests pass on mobile (Chrome)
- [ ] Tests pass on mobile (Safari)

**Command:**
```bash
npm run test:e2e
```

**Expected:** All tests pass across all browsers.

---

## 📋 Phase 5: Performance Testing

### 5.1 Load Testing
- [ ] System handles 100+ req/s
- [ ] P95 latency < 500ms
- [ ] No errors under load
- [ ] Database performs well

**Command:**
```bash
npm run test:load
```

**Expected:**
```
Requests: 10k+
Throughput: > 100 req/s
Latency P95: < 500ms
Errors: 0
```

### 5.2 Lighthouse Audit
- [ ] Performance score > 90
- [ ] Accessibility score > 90
- [ ] Best practices > 90
- [ ] SEO > 90

**Command:**
```bash
npm run test:lighthouse
```

**Expected:** All scores above thresholds.

---

## 📋 Phase 6: Manual Verification

### 6.1 Critical User Flows
Manually test these critical flows:

#### User Flow
1. [ ] Register new account
2. [ ] Verify email (if implemented)
3. [ ] Login to dashboard
4. [ ] Purchase credits (use Stripe test card: `4242 4242 4242 4242`)
5. [ ] Browse available tools
6. [ ] Launch a tool
7. [ ] Verify credits deducted
8. [ ] Check transaction history
9. [ ] Logout

#### Vendor Flow
1. [ ] Submit vendor application
2. [ ] Wait for approval (or manually approve as admin)
3. [ ] Access vendor dashboard
4. [ ] Create new tool
5. [ ] Generate API key
6. [ ] View analytics
7. [ ] Check payout balance
8. [ ] Connect Stripe (test mode)

#### Admin Flow
1. [ ] Login as admin
2. [ ] View dashboard statistics
3. [ ] Approve vendor application
4. [ ] Adjust user credits
5. [ ] Deactivate a tool
6. [ ] View transaction logs
7. [ ] Export data

### 6.2 Payment Testing
- [ ] Test one-time credit purchase
- [ ] Test subscription purchase (if applicable)
- [ ] Test webhook processing
- [ ] Test failed payment handling
- [ ] Test refund (in Stripe dashboard)

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires Auth: `4000 0027 6000 3184`

### 6.3 Security Verification
- [ ] Try accessing admin routes as regular user (should fail)
- [ ] Try accessing vendor routes as non-vendor (should fail)
- [ ] Try manipulating API requests (should be validated)
- [ ] Try XSS in input fields (should be sanitized)
- [ ] Try SQL injection in search (should be prevented)

### 6.4 UI/UX Verification
- [ ] All pages load correctly
- [ ] Navigation works smoothly
- [ ] Forms validate input properly
- [ ] Error messages are clear
- [ ] Success messages display
- [ ] Loading states show appropriately
- [ ] Mobile responsive (check on phone)
- [ ] Desktop layout looks good

### 6.5 Browser Compatibility
Manually test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 📋 Phase 7: Data Integrity

### 7.1 Database Checks
- [ ] Credit balances match transaction sums
- [ ] No orphaned records
- [ ] Foreign key constraints working
- [ ] Indexes exist on key columns
- [ ] RLS policies active

**Commands:**
```bash
# Connect to test database
psql $DATABASE_URL

# Check balance consistency
SELECT user_id,
       balance,
       (SELECT SUM(amount) FROM credit_transactions WHERE user_id = user_balances.user_id)
FROM user_balances
WHERE balance != (SELECT SUM(amount) FROM credit_transactions WHERE user_id = user_balances.user_id);
```

**Expected:** No inconsistencies found.

### 7.2 API Key Security
- [ ] API keys are hashed in database
- [ ] Raw keys never stored
- [ ] Keys can be verified via bcrypt
- [ ] Expired/invalid keys rejected

### 7.3 Transaction Logging
- [ ] All credit additions logged
- [ ] All credit consumptions logged
- [ ] All payments logged
- [ ] Audit trail complete

---

## 📋 Phase 8: External Integrations

### 8.1 Supabase Integration
- [ ] Authentication works
- [ ] Database queries succeed
- [ ] RLS policies enforced
- [ ] Real-time subscriptions work (if used)

### 8.2 Stripe Integration
- [ ] Payment intents create successfully
- [ ] Webhooks receive and process
- [ ] Stripe Connect onboarding works
- [ ] Payouts can be initiated

### 8.3 Email Service (if configured)
- [ ] Verification emails send
- [ ] Transaction confirmation emails send
- [ ] Vendor application emails send
- [ ] Admin notification emails send

---

## 📋 Phase 9: Error Handling

### 9.1 Network Errors
- [ ] Graceful handling of API timeouts
- [ ] Retry logic for failed requests
- [ ] User-friendly error messages
- [ ] Fallback UI states

### 9.2 Payment Errors
- [ ] Declined card handling
- [ ] Webhook failure recovery
- [ ] Duplicate payment prevention
- [ ] Refund processing

### 9.3 Database Errors
- [ ] Connection timeout handling
- [ ] Constraint violation messages
- [ ] Transaction rollback on error
- [ ] Data consistency maintained

---

## 📋 Phase 10: Deployment Preparation

### 10.1 Environment Variables
- [ ] Production `.env` file prepared
- [ ] All secrets are production values
- [ ] No test/development keys
- [ ] Database URLs point to production

### 10.2 Stripe Configuration
- [ ] Switch to live Stripe keys
- [ ] Webhook endpoints configured for production URL
- [ ] Stripe Connect settings verified
- [ ] Payout schedule configured

### 10.3 Database Migration
- [ ] All migrations applied to production DB
- [ ] Database indexes created
- [ ] RLS policies enabled
- [ ] Backup strategy in place

### 10.4 Monitoring Setup
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Performance monitoring active
- [ ] Log aggregation set up
- [ ] Alerts configured

### 10.5 Documentation
- [ ] README up to date
- [ ] API documentation complete
- [ ] Deployment guide created
- [ ] Runbook prepared

---

## 📋 Phase 11: Final Verification

### 11.1 Complete Test Suite
Run the entire test suite one final time:

**Command:**
```bash
npm run test:all
```

**Expected:** 100% passing tests.

### 11.2 Production Build
- [ ] Build succeeds without errors
- [ ] Build size is acceptable
- [ ] No console warnings in production build

**Command:**
```bash
npm run build
npm run start

# Verify in browser
open http://localhost:3000
```

### 11.3 Performance Check
- [ ] First load < 3 seconds
- [ ] Page transitions smooth
- [ ] No memory leaks
- [ ] Bundle size optimized

### 11.4 Security Audit
**Command:**
```bash
npm audit
npm audit --production
```

**Expected:** 0 high/critical vulnerabilities.

---

## ✅ Pre-Production Sign-Off

### Test Results Summary
- [ ] Unit Tests: **PASSED** (XX/XX tests)
- [ ] Integration Tests: **PASSED** (XX/XX tests)
- [ ] E2E Tests: **PASSED** (XX/XX tests)
- [ ] Security Tests: **PASSED** (XX/XX tests)
- [ ] Performance Tests: **PASSED**
- [ ] Manual Verification: **COMPLETE**

### Coverage Summary
- [ ] Overall Coverage: **XX%** (≥ 70%)
- [ ] Critical Paths: **XX%** (≥ 90%)

### Sign-Off
- [ ] **Developer**: All tests passing, code ready
- [ ] **QA**: Manual testing complete, issues resolved
- [ ] **Security**: No vulnerabilities, security measures verified
- [ ] **DevOps**: Infrastructure ready, monitoring configured

### Deployment Approval
- [ ] All checklist items completed
- [ ] Production environment configured
- [ ] Rollback plan prepared
- [ ] Team notified of deployment window

---

## 🚀 Ready for Production!

Once all items are checked:

1. **Merge to main branch**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. **Tag the release**
   ```bash
   git tag -a v1.0.0 -m "Production release v1.0.0"
   git push origin v1.0.0
   ```

3. **Deploy to production**
   - Follow your deployment process
   - Monitor logs during deployment
   - Verify production health checks

4. **Post-Deployment Verification**
   - [ ] Production site accessible
   - [ ] Database connected
   - [ ] Payments processing
   - [ ] Webhooks receiving
   - [ ] Monitoring active

---

## 📞 Emergency Contacts

If issues arise during deployment:

- **Technical Lead**: [Name/Contact]
- **DevOps**: [Name/Contact]
- **Stripe Support**: https://support.stripe.com
- **Supabase Support**: https://supabase.com/support

## 📊 Post-Deployment Monitoring

Monitor these metrics for the first 24 hours:

- [ ] Error rate (should be < 1%)
- [ ] Response times (should be < 500ms P95)
- [ ] Payment success rate (should be > 95%)
- [ ] User registration rate
- [ ] Credit purchase rate
- [ ] Tool usage rate

---

**Congratulations on reaching production!** 🎉

Keep this checklist for future releases and update as needed based on learnings.

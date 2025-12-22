# Platform Plan Upgrade/Downgrade Testing Guide

## Overview
This document provides comprehensive test cases for the platform subscription upgrade/downgrade feature implementation.

## Test Environment Setup
1. Ensure you have Stripe test mode keys configured
2. Set up test users with different subscription states
3. Have access to Stripe webhook testing (use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`)

---

## 1. Backend API Tests

### Test: POST /api/subscriptions/change-platform-plan

#### Test Case 1.1: Upgrade from Starter to Professional (Monthly)
**Setup:**
- User has active Starter monthly subscription
- Current period ends in 15 days

**Action:**
```bash
POST /api/subscriptions/change-platform-plan
{
  "targetPlanId": "professional",
  "billingPeriod": "monthly"
}
```

**Expected Results:**
- ✅ Response: `200 OK`
- ✅ Response body includes: `"changeType": "upgrade"`
- ✅ Message indicates price changes at next cycle
- ✅ Database `platform_subscriptions` updated immediately:
  - `plan_id` = "professional"
  - `credits_per_period` = 150
  - `max_overdraft` = 50
  - `previous_plan_id` = "starter"
  - `plan_changed_at` = current timestamp
- ✅ Stripe subscription updated with new price (proration_behavior: 'none')
- ✅ Current credits balance unchanged
- ✅ Audit log entry created

#### Test Case 1.2: Downgrade from Business to Professional (Monthly)
**Setup:**
- User has active Business monthly subscription
- Current period ends in 20 days

**Action:**
```bash
POST /api/subscriptions/change-platform-plan
{
  "targetPlanId": "professional",
  "billingPeriod": "monthly"
}
```

**Expected Results:**
- ✅ Response: `200 OK`
- ✅ Response body includes: `"changeType": "downgrade"`
- ✅ Message indicates downgrade at end of period
- ✅ Database `platform_subscriptions`:
  - `plan_id` remains "business" (not changed yet)
  - `pending_plan_change` populated with:
    ```json
    {
      "target_plan_id": "professional",
      "target_billing_period": "monthly",
      "change_type": "downgrade",
      "requested_at": "<timestamp>",
      "effective_at": "<current_period_end>",
      "target_credits_per_month": 150,
      "target_max_overdraft": 50
    }
    ```
- ✅ Stripe subscription NOT updated yet
- ✅ User keeps Business benefits until period end

#### Test Case 1.3: Change from Monthly to Yearly (Same Plan)
**Setup:**
- User has active Professional monthly subscription

**Action:**
```bash
POST /api/subscriptions/change-platform-plan
{
  "targetPlanId": "professional",
  "billingPeriod": "yearly"
}
```

**Expected Results:**
- ✅ Response: `200 OK`
- ✅ Response body includes: `"changeType": "interval_change"`
- ✅ Database updated immediately with new billing_period
- ✅ New yearly price applies from next cycle
- ✅ Stripe subscription updated

#### Test Case 1.4: No Change (Same Plan and Period)
**Setup:**
- User has active Professional monthly subscription

**Action:**
```bash
POST /api/subscriptions/change-platform-plan
{
  "targetPlanId": "professional",
  "billingPeriod": "monthly"
}
```

**Expected Results:**
- ✅ Response: `200 OK`
- ✅ Response body: `"changeType": "none"`
- ✅ Message: "You are already on this plan"
- ✅ No database changes
- ✅ No Stripe calls

#### Test Case 1.5: Unauthorized User
**Action:**
```bash
POST /api/subscriptions/change-platform-plan
{
  "targetPlanId": "professional",
  "billingPeriod": "monthly"
}
# With no auth token
```

**Expected Results:**
- ✅ Response: `401 Unauthorized`
- ✅ Error message: "Unauthorized"

#### Test Case 1.6: No Active Subscription
**Setup:**
- User has no active subscription

**Action:**
```bash
POST /api/subscriptions/change-platform-plan
{
  "targetPlanId": "professional",
  "billingPeriod": "monthly"
}
```

**Expected Results:**
- ✅ Response: `400 Bad Request`
- ✅ Error code: "NO_ACTIVE_SUBSCRIPTION"
- ✅ Message directs to /subscribe

#### Test Case 1.7: Invalid Plan ID
**Action:**
```bash
POST /api/subscriptions/change-platform-plan
{
  "targetPlanId": "invalid_plan",
  "billingPeriod": "monthly"
}
```

**Expected Results:**
- ✅ Response: `400 Bad Request`
- ✅ Error: "Invalid target plan ID"

### Test: DELETE /api/subscriptions/change-platform-plan (Cancel Pending Change)

#### Test Case 1.8: Cancel Pending Downgrade
**Setup:**
- User has pending downgrade to Starter

**Action:**
```bash
DELETE /api/subscriptions/change-platform-plan
```

**Expected Results:**
- ✅ Response: `200 OK`
- ✅ `pending_plan_change` cleared in database
- ✅ Success message returned
- ✅ User keeps current plan

#### Test Case 1.9: Cancel When No Pending Change
**Setup:**
- User has active subscription with no pending change

**Action:**
```bash
DELETE /api/subscriptions/change-platform-plan
```

**Expected Results:**
- ✅ Response: `400 Bad Request`
- ✅ Error: "No pending plan change to cancel"

---

## 2. Webhook Tests

### Test Case 2.1: Apply Pending Downgrade on Renewal
**Setup:**
- User has Professional plan with pending downgrade to Starter
- `effective_at` date has passed
- Stripe sends `invoice.paid` webhook for renewal

**Action:**
- Trigger webhook: `stripe trigger invoice.payment_succeeded`

**Expected Results:**
- ✅ Pending plan change applied
- ✅ Database updated:
  - `plan_id` = "starter"
  - `credits_per_period` = 50
  - `max_overdraft` = 0
  - `pending_plan_change` = null
  - `previous_plan_id` = "professional"
  - `plan_changed_at` = current timestamp
- ✅ Stripe subscription updated with new price
- ✅ 50 credits added (new plan's amount)
- ✅ Audit log entry: `plan_changed` with trigger: 'webhook_renewal'

### Test Case 2.2: Renewal Without Pending Change
**Setup:**
- User has Professional plan with no pending change
- Stripe sends `invoice.paid` webhook

**Action:**
- Trigger renewal webhook

**Expected Results:**
- ✅ 150 credits added (current plan's amount)
- ✅ No plan changes applied
- ✅ Billing dates updated
- ✅ No audit log for plan change

### Test Case 2.3: Idempotency - Duplicate Webhook
**Setup:**
- Same `invoice.paid` webhook sent twice

**Action:**
- Send identical webhook twice

**Expected Results:**
- ✅ Credits added only once (idempotency key check)
- ✅ Second webhook logs idempotent transaction
- ✅ No duplicate credit additions

---

## 3. UI/UX Tests

### Test Case 3.1: Subscribe Page - Display Upgrade Options
**Setup:**
- User logged in with Starter monthly plan
- Navigate to `/subscribe`

**Expected UI:**
- ✅ Current subscription notice shows: "You currently have the starter plan (monthly)"
- ✅ Starter plan card shows "CURRENT" badge
- ✅ Professional, Business, Enterprise cards show "Upgrade to {Plan}" button
- ✅ Helper text: "💡 New price applies from your next billing cycle"
- ✅ Credits comparison visible for each plan

### Test Case 3.2: Subscribe Page - Display Downgrade Options
**Setup:**
- User logged in with Enterprise monthly plan
- Navigate to `/subscribe`

**Expected UI:**
- ✅ Enterprise plan card shows "CURRENT" badge
- ✅ Starter, Professional, Business cards show "Downgrade to {Plan}" button
- ✅ Helper text: "💡 Downgrade takes effect at the end of your current period"

### Test Case 3.3: Subscribe Page - Execute Upgrade
**Setup:**
- User on Starter plan clicks "Upgrade to Professional"

**Action:**
- Click upgrade button

**Expected Results:**
- ✅ Loading state shown (button disabled, spinner)
- ✅ API called: `/api/subscriptions/change-platform-plan`
- ✅ Alert shows success message
- ✅ Page reloads
- ✅ After reload: Professional plan shows as CURRENT

### Test Case 3.4: Subscribe Page - Execute Downgrade
**Setup:**
- User on Professional plan clicks "Downgrade to Starter"

**Action:**
- Click downgrade button

**Expected Results:**
- ✅ Success message: "Your plan will be downgraded to Starter..."
- ✅ Page reloads
- ✅ Professional still shows as CURRENT
- ✅ (Navigate to profile to see pending change notice)

### Test Case 3.5: Subscribe Page - Billing Period Change
**Setup:**
- User on Professional monthly
- Toggle to "Yearly" billing period

**Expected UI:**
- ✅ Professional card now shows "Change Billing Period" button
- ✅ Price shows monthly equivalent of yearly price
- ✅ Savings badge: "Save 10% yearly"

### Test Case 3.6: Profile Page - Display Current Subscription
**Setup:**
- User has active Professional monthly plan

**Expected UI:**
- ✅ "Professional Plan" title
- ✅ Status badge: "active" (green)
- ✅ Monthly Credits: "150 credits" (highlighted in green)
- ✅ Billing period: "Every month"
- ✅ Next billing date displayed
- ✅ Overdraft limit: "50 credits - Protection enabled"
- ✅ "Change Plan" button present

### Test Case 3.7: Profile Page - Show Pending Downgrade
**Setup:**
- User has Professional plan with pending downgrade to Starter on 2025-02-15

**Expected UI:**
- ✅ Blue notice box: "Scheduled Plan Change"
- ✅ Text: "Your plan will change to starter on 2/15/2025"
- ✅ "Cancel Change" link present (red, underlined)
- ✅ Current plan details still show Professional

### Test Case 3.8: Profile Page - Cancel Pending Change
**Setup:**
- User clicks "Cancel Change" on pending downgrade

**Action:**
- Click "Cancel Change"
- Confirm dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ API called: `DELETE /api/subscriptions/change-platform-plan`
- ✅ Success alert
- ✅ Page reloads
- ✅ Pending change notice removed

### Test Case 3.9: No Subscription State
**Setup:**
- User has no active subscription
- Navigate to profile or /subscribe

**Expected UI:**
- Profile: "No Active Subscription" state with "View Plans & Pricing" button
- Subscribe: No "CURRENT" badge on any plan, all show "Subscribe" button

---

## 4. Error Handling Tests

### Test Case 4.1: Stripe API Failure During Upgrade
**Setup:**
- Simulate Stripe API error (network timeout, API key invalid, etc.)

**Expected Results:**
- ✅ User sees error message (non-sensitive)
- ✅ Database not updated (transaction rollback)
- ✅ Error logged server-side with full details
- ✅ User can retry

### Test Case 4.2: Database Failure During Plan Change
**Setup:**
- Simulate database connection error

**Expected Results:**
- ✅ 500 response returned
- ✅ Error logged
- ✅ No partial updates
- ✅ Stripe subscription not modified

### Test Case 4.3: Webhook Received Before Database Updated
**Setup:**
- Race condition: webhook arrives before DB update completes

**Expected Results:**
- ✅ Webhook handler waits/retries for subscription record
- ✅ Or logs error and Stripe will retry webhook
- ✅ No credit duplication
- ✅ Eventual consistency maintained

---

## 5. Edge Cases

### Test Case 5.1: Multiple Rapid Plan Changes
**Setup:**
- User changes plan multiple times in quick succession

**Expected Results:**
- ✅ All requests processed sequentially (or optimistic locking prevents conflicts)
- ✅ Final state matches last successful request
- ✅ Audit log shows all attempted changes

### Test Case 5.2: Downgrade Then Cancel Subscription
**Setup:**
- User schedules downgrade, then cancels subscription entirely

**Expected Results:**
- ✅ Subscription cancelled
- ✅ Pending downgrade becomes irrelevant
- ✅ User retains credits until period end
- ✅ No downgrade applied

### Test Case 5.3: Upgrade During Pending Downgrade
**Setup:**
- User has pending downgrade to Starter
- User upgrades to Enterprise

**Expected Results:**
- ✅ Pending downgrade cleared
- ✅ Upgrade applied immediately
- ✅ Database consistent

### Test Case 5.4: Change Plan on Last Day of Billing Cycle
**Setup:**
- User changes plan hours before renewal

**Expected Results:**
- ✅ Plan change processed
- ✅ Webhook handles timing correctly
- ✅ Correct credits added at renewal

---

## 6. Manual Testing Checklist

- [ ] Create test user account
- [ ] Subscribe to Starter plan via Stripe test card (4242 4242 4242 4242)
- [ ] Verify initial credits added (50)
- [ ] Upgrade to Professional via /subscribe
- [ ] Verify immediate plan change in database
- [ ] Verify no immediate charge in Stripe
- [ ] Check Stripe subscription metadata updated
- [ ] Downgrade to Starter
- [ ] Verify pending_plan_change in database
- [ ] Verify profile shows scheduled change notice
- [ ] Cancel pending downgrade from profile
- [ ] Verify pending_plan_change cleared
- [ ] Trigger test webhook for renewal (Stripe CLI)
- [ ] Verify credits added correctly
- [ ] Test error cases (invalid plan ID, no auth, etc.)
- [ ] Test billing period change (monthly ↔ yearly)
- [ ] Verify all audit logs created
- [ ] Check responsive design on mobile
- [ ] Test accessibility (keyboard navigation, screen readers)

---

## 7. Performance Tests

### Test Case 7.1: Concurrent Plan Changes
**Setup:**
- 100 users simultaneously change plans

**Expected Results:**
- ✅ All requests handled within reasonable time (<2s each)
- ✅ No database deadlocks
- ✅ All Stripe calls complete successfully
- ✅ No data corruption

### Test Case 7.2: Webhook Processing Under Load
**Setup:**
- 1000 renewal webhooks arrive within 1 minute

**Expected Results:**
- ✅ All webhooks processed
- ✅ Idempotency maintained
- ✅ No credit duplications
- ✅ All database updates consistent

---

## 8. Security Tests

### Test Case 8.1: Cross-User Plan Change Attempt
**Setup:**
- User A tries to change User B's plan

**Expected Results:**
- ✅ Request rejected (401/403)
- ✅ No database changes for User B
- ✅ Security event logged

### Test Case 8.2: Plan ID Injection
**Setup:**
- Send malicious plan ID (SQL injection, XSS, etc.)

**Expected Results:**
- ✅ Request validated and rejected
- ✅ No security vulnerability exploited
- ✅ Error logged

### Test Case 8.3: Webhook Signature Verification
**Setup:**
- Send webhook without valid Stripe signature

**Expected Results:**
- ✅ Webhook rejected (400)
- ✅ No processing occurs
- ✅ Error logged

---

## Test Summary Report Template

```
Date: _______________
Tester: _______________
Environment: [ ] Local [ ] Staging [ ] Production

Backend API Tests:      ___ / 9 passed
Webhook Tests:          ___ / 3 passed
UI/UX Tests:            ___ / 9 passed
Error Handling:         ___ / 3 passed
Edge Cases:             ___ / 4 passed
Security Tests:         ___ / 3 passed

Total:                  ___ / 31 passed

Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

Critical Blockers: [ ] None [ ] Listed above

Ready for Production: [ ] Yes [ ] No
```



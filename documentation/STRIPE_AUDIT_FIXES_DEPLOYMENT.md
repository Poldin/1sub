# Stripe Audit Fixes - Deployment Guide

This document describes the fixes implemented for the Stripe integration audit and how to deploy them to production.

## Summary of Fixes

### ✅ Bug #2: Chargeback/Dispute Handling (CRITICAL)
**Status:** FIXED
**Impact:** Prevents financial loss from chargebacks and disputes

**Changes:**
- Added 5 new dispute event handlers:
  - `charge.dispute.created` - Freezes account and marks subscription as disputed
  - `charge.dispute.updated` - Updates dispute status
  - `charge.dispute.closed` - Restores access if won, maintains freeze if lost
  - `charge.dispute.funds_withdrawn` - Cancels subscription and suspends account
  - `charge.dispute.funds_reinstated` - Unfreezes account (requires manual review)

**Files Modified:**
- `src/app/api/stripe/webhook/route.ts` (added handlers)

---

### ✅ Bug #3: Grace Period Enforcement (HIGH)
**Status:** FIXED
**Impact:** Ensures users don't retain access indefinitely after payment failure

**Changes:**
- Implemented 7-day grace period for `past_due` subscriptions
- Automatic cancellation after grace period expires
- Integrated into existing daily cron job at 2 AM UTC

**Files Created:**
- `src/domains/subscriptions/grace-period.ts` (grace period service)

**Files Modified:**
- `src/app/api/stripe/webhook/route.ts` (added grace period metadata to failed payments)
- `src/app/api/cron/process-subscriptions/route.ts` (added grace period processing)

---

### ✅ Bug #4: Webhook Retry Queue (MEDIUM)
**Status:** FIXED
**Impact:** Prevents data loss from failed webhook processing

**Changes:**
- Exponential backoff retry strategy (5 retries max)
- Dead letter queue for permanent failures
- Integrated into existing daily cron job at 2 AM UTC
- Idempotent event processing

**Files Created:**
- `src/domains/webhooks/webhook-failure-queue.ts` (retry queue service)
- `supabase/migrations/20251228_webhook_failures.sql` (database schema)

**Files Modified:**
- `src/app/api/stripe/webhook/route.ts` (integrated retry queue)
- `src/app/api/cron/process-subscriptions/route.ts` (added Stripe webhook retry processing)

---

## ✅ No New Cron Jobs Required!

**All fixes are integrated into your existing cron job:**
- `/api/cron/process-subscriptions` (runs at 2 AM UTC daily)

This cron job now handles:
1. ✅ Subscription renewals (existing)
2. ✅ Failed subscription retries (existing)
3. ✅ Outbound webhook retries to vendors (existing)
4. ✅ **NEW:** Stripe inbound webhook retries
5. ✅ **NEW:** Expired grace period processing

**Your existing `vercel.json` cron configuration remains unchanged!**

---

## Database Migration Required

### webhook_failures Table

Run this migration to create the webhook retry queue table:

```bash
supabase db push
```

Or manually run:
```sql
-- See: supabase/migrations/20251228_webhook_failures.sql
```

**Schema:**
- `id` - Unique identifier
- `event_id` - Stripe event ID (unique constraint)
- `event_type` - Stripe event type
- `payload` - Full Stripe event (JSONB)
- `error_message` - Last error
- `retry_count` - Current retry attempt
- `max_retries` - Maximum retries (default: 5)
- `next_retry_at` - When to retry next
- `status` - pending | retrying | succeeded | dead_letter
- `created_at`, `updated_at`, `processed_at`

---

## Environment Variables

Your existing `CRON_SECRET` is already configured and will continue to work.

**No new environment variables required!**

---

## Stripe Webhook Configuration

Update your Stripe webhook to listen for new events:

### Add these events in Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/webhooks
2. Select your webhook endpoint
3. Add these events:
   - `charge.dispute.created`
   - `charge.dispute.updated`
   - `charge.dispute.closed`
   - `charge.dispute.funds_withdrawn`
   - `charge.dispute.funds_reinstated`

**Existing events (should already be configured):**
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `charge.refunded`
- (all other existing events)

---

## Deployment Steps

### 1. Database Migration
```bash
# Apply the webhook_failures table migration
supabase db push

# OR manually run the migration
psql $DATABASE_URL < supabase/migrations/20251228_webhook_failures.sql
```

### 2. Deploy Application
```bash
# Deploy to Vercel
vercel --prod

# OR deploy to your platform
git push origin main
```

### 3. Configure Stripe Webhooks
- Add the 5 new dispute events in Stripe Dashboard
- Test with Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger dispute event
stripe trigger charge.dispute.created
```

### 4. Verify Cron Job
Your existing cron job will automatically start processing the new tasks. You can verify by checking the logs after the next run (2 AM UTC):

```bash
# Check Vercel logs
vercel logs --production

# Or manually trigger (requires CRON_SECRET)
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/process-subscriptions
```

---

## Testing

### Test Dispute Handling

1. Create a test payment in Stripe Dashboard
2. Trigger dispute event:
   ```bash
   stripe trigger charge.dispute.created
   ```
3. Verify in database:
   - User profile metadata has `dispute_status: 'under_review'`
   - Subscription status set to `disputed`
   - Audit log created

4. Test funds withdrawal:
   ```bash
   stripe trigger charge.dispute.funds_withdrawn
   ```
5. Verify:
   - Subscription cancelled
   - User account suspended
   - Audit log shows `payment_dispute_funds_withdrawn`

### Test Grace Period

1. Mark a subscription as `past_due` in Supabase
2. Set `metadata.last_payment_failure` to 8 days ago
3. Wait for next cron run (2 AM UTC) OR manually trigger:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     https://your-domain.com/api/cron/process-subscriptions
   ```
4. Verify:
   - Subscription status changed to `cancelled`
   - Audit log created with `subscription_cancelled_grace_period_expired`

### Test Webhook Retry Queue

1. Temporarily break webhook processing (e.g., comment out Supabase client)
2. Trigger a webhook event
3. Verify in `webhook_failures` table:
   - Event queued with `status: 'pending'`
   - `next_retry_at` set to future time
4. Restore webhook processing
5. Wait for cron run OR manually trigger
6. Verify:
   - Event processed successfully
   - Status changed to `succeeded`

---

## Enhanced Cron Job Response

Your `/api/cron/process-subscriptions` endpoint now returns enhanced statistics:

```json
{
  "success": true,
  "timestamp": "2025-12-28T02:00:00.000Z",
  "duration": "15234ms",
  "active_subscriptions": {
    "processed": 150,
    "successful": 148,
    "failed": 2,
    "paused": 0
  },
  "failed_retries": {
    "processed": 5,
    "successful": 3,
    "failed": 2,
    "paused": 0
  },
  "outbound_webhook_retries": {
    "processed": 10,
    "succeeded": 8,
    "failed": 2,
    "deadLetter": 0
  },
  "stripe_webhook_retries": {
    "processed": 3,
    "succeeded": 3,
    "failed": 0,
    "deadLetter": 0
  },
  "stripe_webhook_queue_stats": {
    "pending": 0,
    "succeeded": 245,
    "deadLetter": 2,
    "total": 247
  },
  "grace_periods": {
    "processed": 5,
    "revoked": 5,
    "errors": 0
  },
  "totals": {
    "subscriptions_processed": 155,
    "successful_renewals": 151,
    "failed_renewals": 4,
    "paused_subscriptions": 0,
    "grace_periods_expired": 5
  }
}
```

---

## Monitoring

### Webhook Failure Queue Metrics

Query to monitor webhook failures:

```sql
-- Current status breakdown
SELECT
  status,
  COUNT(*) as count,
  MAX(created_at) as last_failure
FROM webhook_failures
GROUP BY status;

-- Dead letter queue (needs manual review)
SELECT *
FROM webhook_failures
WHERE status = 'dead_letter'
ORDER BY created_at DESC;

-- Pending retries
SELECT
  event_type,
  retry_count,
  next_retry_at,
  error_message
FROM webhook_failures
WHERE status = 'pending'
ORDER BY next_retry_at;
```

### Grace Period Dashboard

```sql
-- Subscriptions in grace period
SELECT
  ps.id,
  ps.user_id,
  ps.plan_id,
  ps.metadata->>'last_payment_failure' as failed_at,
  ps.metadata->>'grace_period_ends_at' as expires_at
FROM platform_subscriptions ps
WHERE ps.status = 'past_due'
ORDER BY (ps.metadata->>'grace_period_ends_at')::timestamp;

-- Count by grace period days remaining
SELECT
  EXTRACT(DAY FROM
    (ps.metadata->>'grace_period_ends_at')::timestamp - NOW()
  ) as days_remaining,
  COUNT(*) as count
FROM platform_subscriptions ps
WHERE ps.status = 'past_due'
GROUP BY days_remaining
ORDER BY days_remaining;
```

### Dispute Metrics

```sql
-- Active disputes
SELECT
  al.created_at,
  al.user_id,
  al.action,
  al.metadata->>'dispute_id' as dispute_id,
  al.metadata->>'amount' as amount,
  al.metadata->>'reason' as reason
FROM audit_logs al
WHERE al.action LIKE '%dispute%'
ORDER BY al.created_at DESC
LIMIT 50;

-- Suspended accounts
SELECT
  up.id,
  up.email,
  up.metadata->>'dispute_status' as dispute_status,
  up.metadata->>'suspended_at' as suspended_at
FROM user_profiles up
WHERE (up.metadata->>'account_suspended')::boolean = true;
```

---

## Rollback Plan

If issues arise, rollback procedure:

1. **Revert webhook changes:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Database rollback (if needed):**
   ```sql
   DROP TABLE IF EXISTS webhook_failures CASCADE;
   ```

3. **Remove Stripe webhook events:**
   - Remove dispute events from Stripe Dashboard

---

## Files Modified Summary

### Created (3 files):
1. `src/domains/subscriptions/grace-period.ts` - Grace period service
2. `src/domains/webhooks/webhook-failure-queue.ts` - Stripe webhook retry queue
3. `supabase/migrations/20251228_webhook_failures.sql` - Database migration

### Modified (2 files):
1. `src/app/api/stripe/webhook/route.ts` - Added dispute handlers, grace period tracking, retry queue integration
2. `src/app/api/cron/process-subscriptions/route.ts` - Integrated Stripe webhook retries and grace period processing

### No Changes Required:
- ✅ `vercel.json` - Existing cron configuration works as-is
- ✅ Environment variables - Uses existing `CRON_SECRET`

---

## Changelog

### 2025-12-28
- ✅ Implemented dispute/chargeback handling
- ✅ Implemented grace period enforcement
- ✅ Implemented webhook retry queue
- ✅ Created database migration
- ✅ Integrated into existing cron job (no new crons required!)
- ✅ Updated Stripe webhook handler

---

## Next Steps

After deployment, monitor for:

1. **Dead letter queue growth** - investigate permanent failures
2. **Grace period expirations** - ensure smooth cancellations
3. **Dispute events** - review and respond appropriately
4. **Retry queue size** - ensure retries are succeeding
5. **Cron execution time** - ensure under 5 minute limit

Check the enhanced response from `/api/cron/process-subscriptions` to track all metrics in one place.

---

**Status:** Ready for deployment ✅

**Deployment Impact:** Zero configuration changes needed! Just deploy and run the database migration.


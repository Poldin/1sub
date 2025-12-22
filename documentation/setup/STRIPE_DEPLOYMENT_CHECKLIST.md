# Stripe Payment Deployment Checklist

This checklist will guide you through deploying your 1sub platform with fully functional Stripe payments for both user credit purchases and vendor payouts.

## 📋 Pre-Deployment Checklist

### ✅ 1. Stripe Account Setup

- [ ] Create or login to [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] **Enable Stripe Connect** (required for vendor payouts)
  - Go to: Settings → Connect → Enable
  - Choose account type: **Standard** (already configured in code)
- [ ] Switch to **Test Mode** for initial deployment (toggle in top right)

### ✅ 2. Get Stripe API Keys

Navigate to: **Developers → API keys**

- [ ] Copy **Publishable key** (starts with `pk_test_` or `pk_live_`)
- [ ] Copy **Secret key** (starts with `sk_test_` or `sk_live_`)
  - ⚠️ **Warning**: Never expose secret key in client-side code

### ✅ 3. Configure Stripe Webhooks

You need to create **TWO** webhook endpoints:

#### **Webhook 1: Payment Events**
Navigate to: **Developers → Webhooks → Add endpoint**

- [ ] **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
- [ ] **Description**: "1sub Payment Events"
- [ ] **Events to select**:
  - ✅ `checkout.session.completed`
  - ✅ `invoice.paid`
  - ✅ `customer.subscription.deleted`
  - ✅ `customer.subscription.updated`
  - ✅ `payment_intent.succeeded`
- [ ] Click "Add endpoint"
- [ ] **Copy the Signing Secret** (starts with `whsec_`)
  - This is `STRIPE_WEBHOOK_SECRET`

#### **Webhook 2: Connect Events**
Navigate to: **Developers → Webhooks → Add endpoint**

- [ ] **Endpoint URL**: `https://yourdomain.com/api/stripe/connect/webhook`
- [ ] **Description**: "1sub Vendor Connect Events"
- [ ] **Events to select**:
  - ✅ `account.updated`
  - ✅ `account.external_account.created`
  - ✅ `account.external_account.updated`
- [ ] Click "Add endpoint"
- [ ] **Copy the Signing Secret** (starts with `whsec_`)
  - This is `STRIPE_WEBHOOK_SECRET_CONNECT`

---

## 🔐 Environment Variables Setup

### Option A: Using Vercel Dashboard (Recommended)

1. Go to your Vercel project
2. Navigate to: **Settings → Environment Variables**
3. Add each variable below:

```bash
# === STRIPE CONFIGURATION ===
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_xxxxxxxxxxxxx

# === ADMIN CONFIGURATION ===
# Generate using: openssl rand -hex 32
ADMIN_API_KEY=your_generated_admin_key_here

# === APPLICATION CONFIGURATION ===
NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app

# === OPTIONAL ===
MIN_PAYOUT_CREDITS=50
```

4. **Important**: Set all variables to apply to:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_WEBHOOK_SECRET_CONNECT
vercel env add ADMIN_API_KEY
vercel env add NEXT_PUBLIC_APP_URL
```

---

## 🚀 Deployment Steps

### Step 1: Commit Configuration Files

```bash
# Verify vercel.json was created
cat vercel.json

# Add to git
git add vercel.json
git add README.md
git commit -m "Add Stripe payment configuration and cron jobs"
```

### Step 2: Push to GitHub

```bash
git push origin main
```

### Step 3: Deploy to Vercel

#### If First Time Deploying:
```bash
vercel --prod
```

#### If Already Connected to Vercel:
- Push to GitHub will auto-deploy
- Or manually trigger: **Vercel Dashboard → Deployments → Redeploy**

### Step 4: Verify Deployment

- [ ] Check deployment succeeded in Vercel dashboard
- [ ] Visit your production URL
- [ ] Check Vercel logs for any errors

---

## 🧪 Testing Your Payment System

### Test 1: User Credit Purchase

1. **Navigate to Buy Credits Page**
   - URL: `https://yourdomain.com/buy-credits`

2. **Select a Credit Package**
   - Choose: 100 credits (€10)

3. **Use Stripe Test Card**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. **Complete Purchase**
   - Click "Pay €10.00"
   - Should redirect to: `/buy-credits?success=true`

5. **Verify Credits Added**
   - Check your dashboard
   - Credits should show: +100

6. **Check Stripe Dashboard**
   - Navigate to: Payments → All payments
   - Verify payment appears with status: **Succeeded**

7. **Check Webhook Delivery**
   - Navigate to: Developers → Webhooks → [Your webhook]
   - Click "Events" tab
   - Verify `checkout.session.completed` event was sent
   - Status should be: **Succeeded** (HTTP 200)

### Test 2: Vendor Connect Onboarding

1. **Publish a Tool** (as vendor)
   - Go to Vendor Dashboard → My Tools
   - Publish any tool

2. **Navigate to Payouts**
   - Go to: Vendor Dashboard → Payouts
   - Click "Connect Stripe Account"

3. **Complete Stripe Onboarding**
   - Use Stripe test account information
   - Use test bank account:
     - Routing: `110000000`
     - Account: `000123456789`

4. **Verify Connection**
   - Should see "Account Status: Active"
   - Should see "Payouts Enabled: Yes"

### Test 3: Vendor Payout (Manual Trigger)

Since cron jobs run on schedule, manually trigger for testing:

```bash
# Schedule payouts (creates payout records)
curl -X POST https://yourdomain.com/api/vendor/payouts/schedule \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json"

# Process payouts (creates Stripe transfers)
curl -X POST https://yourdomain.com/api/vendor/payouts/process \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "scheduled": 1,
  "message": "Scheduled 1 payouts"
}
```

---

## 🔍 Verify Cron Jobs Are Working

### Check Vercel Cron Configuration

1. Go to: **Vercel Dashboard → Your Project → Settings → Cron Jobs**
2. You should see 3 cron jobs:
   - ✅ `/api/vendor/payouts/schedule` - Runs: 1st of month at 00:00
   - ✅ `/api/vendor/payouts/process` - Runs: Daily at 01:00
   - ✅ `/api/cron/process-subscriptions` - Runs: Daily at 02:00

### Monitor Cron Execution

Cron jobs will start running automatically after deployment. To monitor:

1. **Check Vercel Logs**
   - Go to: Dashboard → Deployments → [Latest] → Functions
   - Filter by cron function paths

2. **Wait for Next Schedule**
   - Schedule jobs run on 1st of month
   - Process jobs run daily

3. **Check Database**
   ```sql
   -- Check vendor_payouts table
   SELECT * FROM vendor_payouts
   ORDER BY created_at DESC
   LIMIT 10;
   ```

---

## 🐛 Troubleshooting

### Issue: Credits Not Added After Purchase

**Possible Causes**:
- ❌ Webhook not configured in Stripe
- ❌ Webhook secret mismatch
- ❌ Webhook delivery failed

**Debug Steps**:
1. Check Stripe Dashboard → Webhooks → Events
2. Look for `checkout.session.completed` event
3. Click event → Check "Response" tab
4. If error, check Vercel logs for that timestamp

### Issue: Webhook Returns 500 Error

**Possible Causes**:
- ❌ Missing environment variables
- ❌ Database connection issues
- ❌ Supabase RLS policy blocking insert

**Debug Steps**:
1. Check Vercel logs: Dashboard → Logs
2. Filter by `/api/stripe/webhook`
3. Look for error messages
4. Verify environment variables are set correctly

### Issue: Vendor Payout Failed

**Possible Causes**:
- ❌ Vendor account not fully onboarded
- ❌ Insufficient balance
- ❌ Stripe API error

**Debug Steps**:
1. Check `vendor_payouts` table for status
2. Check Stripe Dashboard → Connect → Accounts
3. Verify account is "Active" and "Payouts Enabled"
4. Check Vercel logs for transfer errors

### Issue: Cron Jobs Not Running

**Possible Causes**:
- ❌ `vercel.json` not deployed
- ❌ Cron jobs not enabled (requires Pro plan)
- ❌ Authentication failing (ADMIN_API_KEY)

**Debug Steps**:
1. Verify Vercel plan supports cron jobs
2. Check Vercel Dashboard → Settings → Cron Jobs
3. Manually trigger endpoints to test authentication
4. Check function logs during scheduled time

---

## 📊 Post-Deployment Monitoring

### Daily Checks (First Week)

- [ ] Check Stripe webhook delivery success rate
- [ ] Verify credit purchases are adding to balances
- [ ] Monitor vendor payout processing
- [ ] Check for any error logs in Vercel

### Weekly Checks

- [ ] Review total revenue in Stripe Dashboard
- [ ] Reconcile credit transactions with Stripe payments
- [ ] Check vendor payout success rate
- [ ] Review audit logs for anomalies

### Monthly Checks

- [ ] Verify all scheduled payouts were processed
- [ ] Generate financial reconciliation report
- [ ] Review Stripe fees and platform economics
- [ ] Check for failed/pending payouts

---

## 🎉 Going Live: Test Mode → Live Mode

Once everything works in test mode:

### 1. Switch Stripe to Live Mode

- [ ] Go to Stripe Dashboard
- [ ] Toggle to **Live Mode** (top right)
- [ ] Get new API keys from: Developers → API keys
- [ ] Create new webhooks (same URLs, live mode)
- [ ] Get new webhook signing secrets

### 2. Update Vercel Environment Variables

Replace test keys with live keys:
- [ ] `STRIPE_SECRET_KEY` → `sk_live_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` → New live webhook secret
- [ ] `STRIPE_WEBHOOK_SECRET_CONNECT` → New live Connect secret

### 3. Redeploy

```bash
# Trigger new deployment to apply env vars
vercel --prod
```

### 4. Final Verification

- [ ] Make a small real purchase (€10)
- [ ] Verify real money charges correctly
- [ ] Test real vendor onboarding
- [ ] Monitor first real payout cycle

---

## 📞 Support & Resources

### Stripe Resources
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

### Vercel Resources
- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

### 1sub Resources
- `README.md` - General setup
- `API_INTEGRATION_GUIDE.md` - API documentation
- `DEPLOYMENT_QUICKSTART.md` - Deployment guide

---

## ✅ Completion Checklist

Before marking deployment as complete:

- [ ] ✅ Stripe account set up with Connect enabled
- [ ] ✅ All API keys added to Vercel
- [ ] ✅ Both webhooks configured and tested
- [ ] ✅ `vercel.json` deployed with cron jobs
- [ ] ✅ Test credit purchase successful
- [ ] ✅ Test vendor onboarding successful
- [ ] ✅ Cron jobs visible in Vercel dashboard
- [ ] ✅ Webhook delivery confirmed in Stripe
- [ ] ✅ Credits added to user balance
- [ ] ✅ No errors in Vercel logs

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Production URL**: _______________
**Stripe Mode**: [ ] Test [ ] Live

---

## 🎊 Success!

Your Stripe payment system is now fully deployed and operational!

**What happens automatically now:**
- ✅ Users can purchase credits with real/test cards
- ✅ Vendors earn credits when users access their tools
- ✅ Vendor payouts are scheduled monthly (1st of month)
- ✅ Payouts are processed daily
- ✅ All transactions are logged and audited

**Next Steps:**
1. Monitor the first few transactions closely
2. Set up email notifications (future enhancement)
3. Create financial reconciliation reports
4. Plan for scaling (if needed)

Happy building! 🚀

# 1Sub Vendor Documentation Restructure Plan

**Goal:** Simplify documentation to focus exclusively on vendor integration and revenue generation.

---

## Phase 1: Remove Non-Vendor Content

### Files to DELETE from `docs/`:
- [x] `DATABASE_SECURITY_AUDIT.md` - Move to internal docs folder
- [x] `LEAKED_PASSWORD_PROTECTION.md` - Move to internal docs folder

**Action:** Create a new folder `/internal-docs/` or `/team-docs/` and move these files there.

---

## Phase 2: Add CRITICAL Missing Vendor Content

### 2.1 NEW: Vendor Payouts & Revenue Documentation

Create: `docs/concepts/vendor-payouts.mdx`

**Content to include:**

#### Getting Paid: Overview
- How revenue flows: User → 1Sub → Vendor
- Revenue share model (e.g., "Vendors keep 85%, 1Sub takes 15%")
- Supported currencies and regions

#### Setting Up Payouts
- Stripe Connect onboarding process
- Required business information (tax ID, bank account, etc.)
- Verification timeline
- Supported countries

#### Payout Schedule
- Payout frequency (e.g., every Monday for previous week's revenue)
- Minimum payout threshold (e.g., $25)
- Processing time (e.g., "Funds arrive in 2-5 business days")
- Payout holds for new vendors (e.g., 7-14 day hold)

#### Understanding Your Revenue
- How subscription revenue is calculated
- How credit revenue is calculated
- How one-time purchase revenue is calculated
- Refunds and chargebacks impact
- Transaction fees breakdown

#### Viewing Earnings
- Vendor dashboard earnings page
- Downloadable reports (CSV, PDF)
- Tax forms (1099-K for US vendors)
- Invoice generation

#### Troubleshooting Payouts
- Common payout delays
- Failed payout reasons
- How to update bank account
- Support contacts for payout issues

**Priority:** HIGH - This is the most critical missing content!

---

### 2.2 ENHANCE: Credits and Subscriptions Documentation

Update: `docs/concepts/credits-and-subscriptions.mdx`

**Add new section: "One-Time Purchases"**

```markdown
## One-Time Purchase Model

One-time purchases allow users to buy lifetime access to your tool for a single payment.

### How One-Time Purchases Work

<Steps>
<Step title="User purchases tool">
  User pays once for lifetime access on 1Sub.
</Step>

<Step title="Purchase webhook sent">
  You receive `purchase.completed` webhook event.
</Step>

<Step title="You verify ownership">
  Verify the user owns your tool before granting access.

```typescript
const subscription = await verifySubscription(oneSubUserId);

if (subscription.hasLifetimeAccess) {
  // Grant permanent access to all features
}
```
</Step>

<Step title="User has lifetime access">
  User can use your tool forever without recurring payments.
</Step>
</Steps>

### One-Time Purchase Properties

<ResponseField name="hasLifetimeAccess" type="boolean">
Whether user has lifetime access via one-time purchase
</ResponseField>

<ResponseField name="purchaseDate" type="string (ISO 8601)">
When the one-time purchase was completed
</ResponseField>

<ResponseField name="purchaseAmount" type="number">
Amount paid for lifetime access (in cents)
</ResponseField>

### When to Use One-Time Purchases

<CardGroup cols={2}>
<Card title="Best For">
  - Desktop apps and CLI tools
  - Simple SaaS tools
  - Educational content/courses
  - Templates and themes
</Card>

<Card title="Not Recommended For">
  - High server costs (hosting, API calls)
  - Continuous content updates
  - Tools requiring ongoing support
</Card>
</CardGroup>

### Pricing Strategies

**Recommended pricing:**
- Price one-time purchase at 12-24 months of subscription value
- Example: If monthly plan is $10, price lifetime at $120-240

### Hybrid: One-Time + Credits

You can combine one-time purchases with credits:

```typescript
async function handleRequest(userId: string) {
  const sub = await verifySubscription(oneSubUserId);

  if (!sub.hasLifetimeAccess && !sub.active) {
    throw new Error('Purchase or subscription required');
  }

  // User has access, now consume credits for usage
  if (sub.creditsRemaining < 10) {
    throw new Error('Insufficient credits');
  }

  await consumeCredits({
    user_id: oneSubUserId,
    amount: 10,
    reason: 'Used premium feature',
    idempotency_key: `${userId}-${requestId}`,
  });
}
```

### Webhooks for One-Time Purchases

Listen for `purchase.completed` event:

```typescript
webhookHandler.on('purchase.completed', (event) => {
  console.log('New purchase:', event.data);

  // {
  //   oneSubUserId: "uuid-abc-123",
  //   toolId: "uuid-tool-456",
  //   amount: 9900, // $99.00 in cents
  //   purchaseDate: "2025-11-16T12:34:56Z"
  // }

  // Grant lifetime access
  await db.users.update(event.data.oneSubUserId, {
    hasLifetimeAccess: true,
    purchaseDate: event.data.purchaseDate
  });

  // Send welcome email
  await sendWelcomeEmail(event.data.oneSubUserId);
});
```
```

---

### 2.3 NEW: Monetization Models Comparison

Create: `docs/concepts/monetization-models.mdx`

**Content to include:**

#### Choosing Your Monetization Model

Quick comparison table:

| Model | Best For | Pros | Cons | Example Pricing |
|-------|----------|------|------|----------------|
| **Subscription** | SaaS, continuous access | Predictable revenue, higher LTV | Churn risk, requires retention | $10/month |
| **Credits** | Usage-based tools | Fair pricing, scales with usage | Harder to predict revenue | 100 credits = $10 |
| **One-Time** | Desktop apps, tools | No churn, simple UX | Lower LTV, no recurring revenue | $99 lifetime |
| **Hybrid** | Best of both worlds | Flexible, maximize revenue | More complex to implement | $10/mo + 10 credits/use |

#### Decision Tree

```
Are your server costs high or usage-based?
├─ Yes → Use Credits or Subscription + Credits
└─ No
   Are you providing continuous updates/content?
   ├─ Yes → Use Subscription
   └─ No → Use One-Time Purchase
```

#### Revenue Examples

**Subscription Example:**
- 100 users × $10/month = $1,000/month recurring revenue
- Annual value: $12,000

**Credits Example:**
- 1,000 users averaging 50 credits/month × $0.10/credit = $5,000/month
- Highly variable based on usage

**One-Time Example:**
- 50 purchases × $99 = $4,950 (one-time)
- No recurring revenue unless you launch v2

#### Migration Strategies

How to switch models without losing users:
- Subscription → Credits: Grant credit balance based on remaining subscription time
- One-Time → Subscription: Grandfather existing users, subscription for new users
- Credits → Subscription: Offer plan that includes monthly credit allowance

---

### 2.4 ENHANCE: API Reference

Update: `docs/api/reference.mdx`

**Add field to verify subscription response:**

```json
{
  "active": true,
  "status": "active",
  "hasLifetimeAccess": false,  // NEW FIELD
  "purchaseDate": null,        // NEW FIELD
  "planId": "monthly",
  "currentPeriodStart": "2025-11-01T00:00:00Z",
  "currentPeriodEnd": "2025-12-01T00:00:00Z",
  ...
}
```

---

## Phase 3: Simplify and Reorganize

### 3.1 Merge Redundant Content

**Current issue:** `full-integration-walkthrough.mdx` just redirects to quickstart

**Action:** DELETE `guides/full-integration-walkthrough.mdx` and update navigation to remove it.

**Updated navigation in `docs.json`:**

```json
{
  "group": "Guides & Examples",
  "pages": [
    "guides/testing-sandbox",
    "examples/node",
    "examples/python",
    "examples/curl"
  ]
}
```

---

### 3.2 Reorganize Core Concepts

**New order (in `docs.json`):**

```json
{
  "group": "Core Concepts",
  "pages": [
    "concepts/monetization-models",        // NEW - Start with this!
    "concepts/tools-and-accounts",         // Keep
    "concepts/credits-and-subscriptions",  // Enhanced with one-time
    "concepts/vendor-payouts",             // NEW - Critical!
    "concepts/authentication"              // Move to end (technical detail)
  ]
}
```

**Rationale:** Start with business model (how you make money), then dive into technical integration.

---

### 3.3 Update Index Page

Update: `docs/index.mdx`

**Add new card in "Why Integrate with 1Sub?":**

```mdx
<CardGroup cols={3}>
<Card title="Quick Setup" icon="zap">
  Simple REST API with email-based or link code authentication. Get integrated in minutes, not days.
</Card>

<Card title="Secure & Reliable" icon="shield-check">
  Enterprise-grade security with HMAC signatures, rate limiting, and comprehensive audit logs.
</Card>

<Card title="Fast Payouts" icon="dollar-sign">
  Receive payouts weekly via Stripe Connect. Transparent fees and easy tax reporting.
</Card>
</CardGroup>
```

**Add new integration pattern tab:**

```mdx
<Tabs>
<Tab title="Subscription-Based">
  **Best for:** SaaS tools with recurring access
  - Users subscribe to plans on 1Sub
  - Verify subscription status via API
  - Receive webhook notifications on changes
  - Support tiered plans with different features
</Tab>

<Tab title="Credit-Based">
  **Best for:** Usage-based tools (API calls, generations, etc.)
  - Users purchase credit packages on 1Sub
  - Consume credits for each tool usage
  - Real-time balance tracking
  - Automatic refunds on failures
</Tab>

<Tab title="One-Time Purchase">
  **Best for:** Desktop apps, CLI tools, lifetime access
  - Users pay once for lifetime access
  - No recurring billing complexity
  - Simple user experience
  - Higher upfront revenue per user
</Tab>

<Tab title="Hybrid">
  **Best for:** Tools with base access + usage charges
  - Subscription or one-time purchase grants base access
  - Credits used for premium features
  - Best of all models
</Tab>
</Tabs>
```

---

## Phase 4: Update Navigation (docs.json)

### Proposed Final Navigation Structure

```json
{
  "navigation": {
    "dropdowns": [
      {
        "dropdown": "Documentation",
        "icon": "book",
        "description": "Complete integration guide for vendors",
        "groups": [
          {
            "group": "Getting Started",
            "pages": [
              "index",
              "quickstart"
            ]
          },
          {
            "group": "Core Concepts",
            "pages": [
              "concepts/monetization-models",
              "concepts/tools-and-accounts",
              "concepts/credits-and-subscriptions",
              "concepts/vendor-payouts",
              "concepts/authentication"
            ]
          },
          {
            "group": "REST APIs",
            "pages": [
              "api/overview",
              "api/authentication",
              "api/reference",
              "api/errors"
            ]
          },
          {
            "group": "Webhooks",
            "pages": [
              "webhooks/overview",
              "webhooks/events",
              "webhooks/security-and-signing",
              "webhooks/testing"
            ]
          },
          {
            "group": "Code Examples",
            "pages": [
              "examples/node",
              "examples/python",
              "examples/curl"
            ]
          },
          {
            "group": "Troubleshooting",
            "pages": [
              "troubleshooting/common-errors",
              "troubleshooting/checklist"
            ]
          }
        ]
      }
    ]
  }
}
```

**Changes:**
- Removed "Guides & Examples", split into "Code Examples" and removed redundant walkthrough
- Reordered Core Concepts to start with business/revenue topics
- Added 2 new pages: `monetization-models.mdx` and `vendor-payouts.mdx`

---

## Phase 5: Testing & Validation

### Before Launch Checklist

- [ ] Move internal docs (DATABASE_SECURITY_AUDIT.md, LEAKED_PASSWORD_PROTECTION.md) to `/internal-docs/`
- [ ] Create `concepts/vendor-payouts.mdx` with complete payout documentation
- [ ] Create `concepts/monetization-models.mdx` with model comparison
- [ ] Enhance `concepts/credits-and-subscriptions.mdx` with one-time purchase section
- [ ] Update `api/reference.mdx` with `hasLifetimeAccess` and `purchaseDate` fields
- [ ] Delete `guides/full-integration-walkthrough.mdx`
- [ ] Update `docs.json` navigation structure
- [ ] Update `index.mdx` with payout messaging and one-time purchase tab
- [ ] Update `README.md` to reflect new structure
- [ ] Test all links work correctly
- [ ] Review with vendor beta testers for feedback

---

## Expected Impact

### Before:
- ❌ Vendors confused about getting paid
- ❌ One-time purchases mentioned but not documented
- ❌ Internal security docs mixed with vendor docs
- ❌ Unclear which monetization model to choose

### After:
- ✅ Clear payout process and timelines
- ✅ All three monetization models fully documented
- ✅ Clean separation of vendor vs internal docs
- ✅ Decision framework for choosing monetization model
- ✅ Faster vendor integration (clearer docs)
- ✅ Reduced support questions about payments

---

## Timeline Estimate

- **Phase 1 (Remove non-vendor content):** 15 minutes
- **Phase 2 (Create new vendor content):** 3-4 hours
- **Phase 3 (Simplify and reorganize):** 1 hour
- **Phase 4 (Update navigation):** 30 minutes
- **Phase 5 (Testing):** 1 hour

**Total:** ~6 hours of focused work

---

## Questions to Answer First

Before implementing, clarify these details:

1. **Revenue Share:**
   - What % do vendors keep? (e.g., 85%?)
   - Are there different tiers based on volume?

2. **Payout Schedule:**
   - Weekly, biweekly, or monthly?
   - What's the minimum payout threshold?
   - Any holds for new vendors?

3. **One-Time Purchases:**
   - Are these already implemented in the API?
   - What's the recommended pricing strategy?
   - Can vendors set their own lifetime price?

4. **Stripe Connect:**
   - Is this already set up?
   - What information do vendors need to provide?
   - Supported countries?

5. **Tax Documentation:**
   - Are 1099s issued automatically?
   - VAT/GST handling for international vendors?

---

## Next Steps

1. Review this plan
2. Answer the questions above
3. Approve or provide feedback on structure
4. Begin implementation in phases

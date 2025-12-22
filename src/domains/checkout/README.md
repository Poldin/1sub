# Checkout Domain

Handles TWO separate checkout flows. DO NOT merge them.

## Flow 1: Tool/Subscription Purchase

**Purpose**: User buys access to a tool (subscription or one-time)

**Entry Point**: `tool-purchase.service.ts`

**API Flow**:
```
POST /api/checkout/create         -> Create checkout session
POST /api/checkout/generate-otp   -> Generate OTP
POST /api/checkout/verify-otp     -> Verify OTP
POST /api/checkout/process        -> Process payment
```

**Database**: `tool_subscriptions`, `checkouts`

---

## Flow 2: Credit Purchase

**Purpose**: User buys credit packages (100, 500, 1000 CR or custom)

**Entry Point**: `credit-purchase.service.ts`

**API Flow**:
```
POST /api/stripe/create-checkout-session  -> Create Stripe session
[User completes Stripe payment]
POST /api/stripe/webhook                  -> Stripe webhook
     -> calls credits domain addCredits()
```

**Database**: `credit_transactions`, `user_balances`

---

## Rules

1. DO NOT merge these two flows
2. Tool purchase uses OTP verification
3. Credit purchase uses Stripe Checkout
4. Each flow has its own service file

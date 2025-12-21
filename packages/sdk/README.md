# @1sub/sdk

Official 1Sub SDK for Node.js - Integrate subscription verification, credit consumption, and webhooks in minutes.

[![npm version](https://badge.fury.io/js/%401sub%2Fsdk.svg)](https://www.npmjs.com/package/@1sub/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Subscription Verification** - Verify user subscriptions by user ID, email, or tool user ID
- **Credit Consumption** - Consume credits with idempotency support
- **Link Codes** - Exchange link codes for CLI/desktop apps
- **Webhooks** - Verify signatures and handle events
- **Express Middleware** - Protect routes with subscription checks
- **Next.js Middleware** - Server-side subscription verification
- **Caching** - Built-in response caching to reduce API calls
- **Retry Logic** - Automatic retries with exponential backoff
- **TypeScript** - Full type definitions included

## Installation

```bash
npm install @1sub/sdk
# or
yarn add @1sub/sdk
# or
pnpm add @1sub/sdk
```

## Quick Start

```typescript
import { OneSub } from '@1sub/sdk';

// Initialize the client
const onesub = new OneSub({
  apiKey: process.env.ONESUB_API_KEY!,
  webhookSecret: process.env.ONESUB_WEBHOOK_SECRET,
  cache: true, // Enable caching
});

// Verify subscription by email
const subscription = await onesub.subscriptions.verifyByEmail('user@example.com');
console.log(`Active: ${subscription.active}`);
console.log(`Credits: ${subscription.creditsRemaining}`);

// Consume credits
const result = await onesub.credits.consume({
  userId: subscription.oneSubUserId!,
  amount: 10,
  reason: 'Image generation',
  idempotencyKey: `gen-${Date.now()}`,
});
console.log(`New balance: ${result.newBalance}`);
```

## Configuration

```typescript
const onesub = new OneSub({
  // Required
  apiKey: 'sk-tool-xxx',           // Your API key from 1Sub dashboard

  // Optional
  webhookSecret: 'whsec-xxx',      // For webhook signature verification
  baseUrl: 'https://1sub.io/api/v1', // API base URL (default)
  timeout: 30000,                   // Request timeout in ms (default: 30000)
  cache: false,                     // Enable response caching (default: false)
  cacheTTL: 60000,                  // Cache TTL in ms (default: 60000)
  maxRetries: 3,                    // Retry attempts (default: 3)
  debug: false,                     // Enable debug logging (default: false)
});
```

## API Reference

### Subscriptions

```typescript
// Verify by 1Sub user ID (fastest)
const sub = await onesub.subscriptions.verify({ oneSubUserId: 'uuid-123' });

// Verify by email (auto-hashes)
const sub = await onesub.subscriptions.verifyByEmail('user@example.com');

// Verify by your tool's user ID
const sub = await onesub.subscriptions.verifyByToolUserId('my-user-456');

// Check if subscription is active
const isActive = await onesub.subscriptions.isActive({ oneSubUserId: 'uuid-123' });

// Invalidate cache after webhook
onesub.subscriptions.invalidateCache('uuid-123');
```

### Credits

```typescript
// Consume credits
const result = await onesub.credits.consume({
  userId: 'uuid-123',
  amount: 10,
  reason: 'API call',
  idempotencyKey: 'req-abc-123', // For safe retries
});

// Try to consume (doesn't throw)
const result = await onesub.credits.tryConsume({
  userId: 'uuid-123',
  amount: 10,
  reason: 'API call',
  idempotencyKey: 'req-abc-123',
});

if (result.success) {
  console.log(`New balance: ${result.data.newBalance}`);
} else {
  console.log(`Failed: ${result.error}`);
}

// Check if user has enough credits
const hasEnough = await onesub.credits.hasEnough('uuid-123', 100);

// Generate idempotency key
const key = onesub.credits.generateIdempotencyKey('image-gen', 'user-123');
```

### Links (Link Codes)

```typescript
// Exchange a link code
const link = await onesub.links.exchangeCode({
  code: 'ABC123',
  toolUserId: 'my-user-456',
});

// Store the oneSubUserId for future use
await db.users.update(myUserId, {
  oneSubUserId: link.oneSubUserId,
});

// Validate code format before API call
if (onesub.links.isValidCodeFormat(userInput)) {
  await onesub.links.exchangeCode({ code: userInput, toolUserId });
}
```

### Webhooks

```typescript
// Verify signature
const isValid = onesub.webhooks.verify(rawBody, signature);

// Parse and verify event
const event = onesub.webhooks.constructEvent(rawBody, signature);

// Register event handlers
onesub.webhooks.on('subscription.activated', async (event) => {
  console.log(`User ${event.data.oneSubUserId} subscribed!`);
  await sendWelcomeEmail(event.data.oneSubUserId);
});

onesub.webhooks.on('subscription.canceled', async (event) => {
  console.log(`User ${event.data.oneSubUserId} canceled`);
});

onesub.webhooks.on('user.credit_low', async (event) => {
  console.log(`User ${event.data.oneSubUserId} low on credits: ${event.data.balance}`);
});

// Process webhook (verify + handle)
await onesub.webhooks.process(rawBody, signature);
```

## Express Middleware

```typescript
import express from 'express';
import { OneSub } from '@1sub/sdk';

const app = express();
const onesub = new OneSub({ apiKey: process.env.ONESUB_API_KEY! });

// Require subscription for routes
app.use('/premium', onesub.express.requireSubscription({
  getUserId: (req) => req.session.oneSubUserId,
  onNoSubscription: (req, res) => {
    res.redirect('/subscribe');
  },
}));

app.get('/premium/feature', (req, res) => {
  // req.oneSubSubscription is available
  res.json({ credits: req.oneSubSubscription?.creditsRemaining });
});

// Optionally load subscription
app.use(onesub.express.loadSubscription({
  getUserId: (req) => req.session.oneSubUserId,
}));

app.get('/feature', (req, res) => {
  if (req.oneSubSubscription?.active) {
    // Premium path
  } else {
    // Free path
  }
});

// Require minimum credits
app.post('/api/generate',
  onesub.express.requireSubscription({
    getUserId: (req) => req.session.oneSubUserId,
  }),
  onesub.express.requireCredits(10),
  async (req, res) => {
    // User has at least 10 credits
  }
);

// Handle webhooks
app.post('/webhooks/1sub',
  express.raw({ type: 'application/json' }),
  onesub.express.webhookHandler(),
  (req, res) => {
    const event = req.oneSubEvent!;
    console.log(`Received: ${event.type}`);
    res.json({ received: true });
  }
);
```

## Next.js Integration

### Middleware (middleware.ts)

```typescript
import { OneSub } from '@1sub/sdk';

const onesub = new OneSub({ apiKey: process.env.ONESUB_API_KEY! });

export const middleware = onesub.next.withSubscription({
  getUserId: (req) => req.cookies.get('oneSubUserId')?.value,
  noSubscriptionRedirect: '/subscribe',
  unauthorizedRedirect: '/login',
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/premium/:path*'],
};
```

### API Route (Webhooks)

```typescript
// app/api/webhooks/1sub/route.ts
import { onesub } from '@/lib/onesub';

// Register handlers
onesub.webhooks.on('subscription.activated', async (event) => {
  await sendWelcomeEmail(event.data.oneSubUserId);
});

export async function POST(req: Request) {
  return onesub.next.handleWebhook(req);
}
```

### API Route (Protected)

```typescript
// app/api/generate/route.ts
import { onesub } from '@/lib/onesub';

export async function POST(req: Request) {
  const { oneSubUserId, prompt } = await req.json();

  // Consume credits
  const result = await onesub.next.consumeCredits(
    oneSubUserId,
    10,
    'Image generation',
    `gen-${Date.now()}`
  );

  if (!result.success) {
    return Response.json(result, { status: 402 });
  }

  // Generate image...
  return Response.json({ success: true });
}
```

## Error Handling

```typescript
import {
  OneSubSDKError,
  AuthenticationError,
  NotFoundError,
  RateLimitExceededError,
  InsufficientCreditsSDKError,
  ValidationError,
} from '@1sub/sdk';

try {
  await onesub.credits.consume({ ... });
} catch (error) {
  if (error instanceof InsufficientCreditsSDKError) {
    console.log(`Need ${error.shortfall} more credits`);
  } else if (error instanceof RateLimitExceededError) {
    console.log(`Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof NotFoundError) {
    console.log('User not found');
  } else if (error instanceof OneSubSDKError) {
    console.log(`Error: ${error.code} - ${error.message}`);
  }
}
```

## Webhook Event Types

| Event | Description |
|-------|-------------|
| `subscription.activated` | New subscription or reactivation |
| `subscription.updated` | Plan change, renewal, or status update |
| `subscription.canceled` | User canceled subscription |
| `purchase.completed` | One-time purchase or credit package |
| `user.credit_low` | Credits fell below threshold |
| `user.credit_depleted` | Credits reached 0 |
| `tool.status_changed` | Tool activated/suspended |

## Best Practices

### 1. Cache the oneSubUserId

```typescript
// First request: verify by email (slower)
const sub = await onesub.subscriptions.verifyByEmail(user.email);

// Store the oneSubUserId
await db.users.update(userId, { oneSubUserId: sub.oneSubUserId });

// Future requests: verify by oneSubUserId (faster)
const sub = await onesub.subscriptions.verify({
  oneSubUserId: user.oneSubUserId
});
```

### 2. Use Idempotency Keys

```typescript
// Generate unique key for each operation
const idempotencyKey = `${userId}-${operationType}-${Date.now()}`;

await onesub.credits.consume({
  userId,
  amount: 10,
  reason: 'Image generation',
  idempotencyKey, // Safe to retry if request fails
});
```

### 3. Invalidate Cache on Webhooks

```typescript
onesub.webhooks.on('subscription.updated', (event) => {
  onesub.subscriptions.invalidateCache(event.data.oneSubUserId);
});

onesub.webhooks.on('subscription.canceled', (event) => {
  onesub.subscriptions.invalidateCache(event.data.oneSubUserId);
});
```

### 4. Handle Rate Limits

```typescript
try {
  await onesub.subscriptions.verify({ oneSubUserId });
} catch (error) {
  if (error instanceof RateLimitExceededError) {
    // Wait and retry
    await sleep(error.retryAfter * 1000);
    await onesub.subscriptions.verify({ oneSubUserId });
  }
}
```

## TypeScript

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type {
  OneSubConfig,
  VerifySubscriptionResponse,
  ConsumeCreditsResponse,
  WebhookEvent,
  SubscriptionActivatedData,
} from '@1sub/sdk';
```

## Requirements

- Node.js 18+
- TypeScript 5+ (optional but recommended)

## License

MIT

## Support

- Documentation: https://1sub.io/docs
- Email: support@1sub.io
- Discord: https://discord.gg/1sub

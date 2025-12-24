---
name: Vendor Integration Automated Test Plan
overview: Comprehensive automated test suite to validate vendor tool integrations with 1sub platform. Uses Vitest for integration tests and Playwright for E2E tests, with a mock vendor server to test webhooks and callbacks.
todos: []
---

# Vendor Integration Automated Test Plan

## Overview

This plan automates the vendor integration QA tests using a combination of:
- **Vitest** for API integration tests (fast, server-side)
- **Playwright** for E2E browser tests (user flows)
- **Mock Vendor Server** (Express/Node) to simulate vendor endpoints for webhooks and callbacks

The automated suite executes all 8 critical tests from the QA plan without manual intervention.

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Test Execution Flow                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Vitest     │───▶│  1sub API    │───▶│   Database   │
│ Integration  │    │  Endpoints   │    │   (Supabase) │
│   Tests      │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
      │                    │
      │                    │
      ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  Playwright  │───▶│  Mock Vendor │
│   E2E Tests  │    │    Server    │
│              │    │              │
└──────────────┘    └──────────────┘
      │                    │
      │                    │
      └─────────┬──────────┘
                │
                ▼
      ┌──────────────────┐
      │  Webhook/Webhook │
      │    Endpoints     │
      └──────────────────┘
```

## Test Infrastructure Components

### 1. Mock Vendor Server

**Purpose**: Simulates a vendor tool with callback and webhook endpoints

**Technology**: Express.js or native Node.js HTTP server

**Location**: `tests/mocks/vendor-server.ts`

**Endpoints**:
- `GET /callback` - Receives authorization code redirect
- `POST /webhook` - Receives webhook notifications
- `GET /verify` - Simulates vendor tool verification endpoint (optional)

**Features**:
- Stores received webhooks in memory (for test verification)
- Validates webhook signatures
- Returns configurable HTTP status codes (for failure testing)
- Records request/response logs

**Example Implementation**:
```typescript
// tests/mocks/vendor-server.ts
import express from 'express';
import { createHmac } from 'crypto';

interface ReceivedWebhook {
  id: string;
  type: string;
  timestamp: string;
  payload: unknown;
  signature: string;
  isValid: boolean;
}

class MockVendorServer {
  private app: express.Application;
  private server: any;
  private webhooks: ReceivedWebhook[] = [];
  private callbackRequests: any[] = [];
  private webhookSecret: string;
  
  constructor(port: number, webhookSecret: string) {
    this.webhookSecret = webhookSecret;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  setupRoutes() {
    // Callback endpoint (receives authorization code)
    this.app.get('/callback', (req, res) => {
      const { code, state } = req.query;
      this.callbackRequests.push({ code, state, timestamp: new Date() });
      // In real vendor, this would exchange code server-to-server
      res.redirect('/vendor-dashboard?code=' + code);
    });

    // Webhook endpoint
    this.app.post('/webhook', (req, res) => {
      const signature = req.headers['x-1sub-signature'] as string;
      const payload = req.body;
      
      const isValid = this.validateSignature(signature, payload);
      
      this.webhooks.push({
        id: payload.id,
        type: payload.type,
        timestamp: payload.created,
        payload,
        signature,
        isValid,
      });

      // Simulate success/failure
      const status = this.shouldFail ? 500 : 200;
      res.status(status).json({ received: true });
    });

    // Test endpoint to check received webhooks
    this.app.get('/test/webhooks', (req, res) => {
      res.json({ webhooks: this.webhooks, count: this.webhooks.length });
    });

    // Control endpoint for test scenarios
    this.app.post('/test/fail-next', (req, res) => {
      this.shouldFail = true;
      res.json({ success: true, message: 'Next webhook will fail' });
    });
  }

  validateSignature(signature: string, payload: unknown): boolean {
    // Extract timestamp and signature from header
    const match = signature.match(/t=(\d+),v1=(.+)/);
    if (!match) return false;

    const timestamp = parseInt(match[1]);
    const providedSig = match[2];

    // Check timestamp (within 300s)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) return false;

    // Generate expected signature
    const payloadStr = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadStr}`;
    const expectedSig = createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    return expectedSig === providedSig;
  }

  async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server = this.app.listen(0, () => {
        const address = this.server.address();
        const url = `http://localhost:${address.port}`;
        resolve(url);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }

  getReceivedWebhooks(): ReceivedWebhook[] {
    return [...this.webhooks];
  }

  clearWebhooks() {
    this.webhooks = [];
    this.callbackRequests = [];
  }
}

export default MockVendorServer;
```

### 2. Test Helpers

**Location**: `tests/helpers/vendor-integration-helpers.ts`

**Functions**:
- `createTestVendorTool()` - Creates tool with callback/webhook URLs
- `createTestSubscription()` - Creates active subscription for test user
- `cancelTestSubscription()` - Cancels subscription (triggers webhook)
- `verifyWebhookInDatabase()` - Checks webhook_logs table
- `waitForWebhookDelivery()` - Polls database until webhook appears

**Example**:
```typescript
// tests/helpers/vendor-integration-helpers.ts
import { getTestSupabase } from './db-helpers';
import { generateApiKey } from '@/lib/api-keys-client';
import bcrypt from 'bcryptjs';

export async function createTestVendorTool(
  vendorId: string,
  callbackUrl: string,
  webhookUrl: string
) {
  const supabase = getTestSupabase();
  
  // Create tool
  const { data: tool, error } = await supabase
    .from('tools')
    .insert({
      name: `Test Tool ${Date.now()}`,
      description: 'Test tool for integration',
      url: 'https://test-tool.example.com',
      user_profile_id: vendorId,
      is_active: true,
      metadata: {
        callback_url: callbackUrl,
        webhook_url: webhookUrl,
      },
    })
    .select()
    .single();

  if (error) throw error;

  // Create API key
  const rawApiKey = generateApiKey();
  const keyHash = await bcrypt.hash(rawApiKey, 10);
  const keyPrefix = rawApiKey.substring(0, 8);

  await supabase.from('api_keys').insert({
    tool_id: tool.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    is_active: true,
  });

  return { tool, apiKey: rawApiKey };
}

export async function createTestSubscription(userId: string, toolId: string) {
  const supabase = getTestSupabase();
  
  const { data: subscription, error } = await supabase
    .from('tool_subscriptions')
    .insert({
      user_id: userId,
      tool_id: toolId,
      status: 'active',
      plan_id: 'test-plan',
    })
    .select()
    .single();

  if (error) throw error;
  return subscription;
}

export async function verifyWebhookInDatabase(
  toolId: string,
  eventType: string,
  maxWait: number = 5000
): Promise<boolean> {
  const supabase = getTestSupabase();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('tool_id', toolId)
      .eq('event_type', eventType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) return true;

    // Wait 200ms before next check
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return false;
}
```

## Test Implementation

### TEST 1: Callback / Launch Flow (Integration Test)

**File**: `tests/integration/vendor/callback-launch-flow.test.ts`

**Approach**: Vitest integration test

**Steps**:
1. Create test user and vendor tool
2. Create subscription for user
3. Call `/api/v1/authorize/initiate` to get authorization URL
4. Extract code from URL
5. Call `/api/v1/authorize/exchange` with code (simulating vendor)
6. Verify response contains verificationToken and entitlements

**Implementation**:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestVendor,
  cleanupTestUser,
  getTestSupabase,
} from '../../helpers/db-helpers';
import {
  createTestVendorTool,
  createTestSubscription,
} from '../../helpers/vendor-integration-helpers';

describe('TEST 1: Callback / Launch Flow', () => {
  let testUserId: string;
  let testVendorId: string;
  let testToolId: string;
  let testApiKey: string;
  let mockServer: MockVendorServer;
  let callbackUrl: string;
  let webhookUrl: string;

  beforeAll(async () => {
    // Start mock vendor server
    mockServer = new MockVendorServer(0, process.env.WEBHOOK_SECRET!);
    const baseUrl = await mockServer.start();
    callbackUrl = `${baseUrl}/callback`;
    webhookUrl = `${baseUrl}/webhook`;

    // Create test user
    const user = await createTestUser();
    testUserId = user.id;

    // Create test vendor and tool
    const vendor = await createTestVendor();
    testVendorId = vendor.id;

    const { tool, apiKey } = await createTestVendorTool(
      testVendorId,
      callbackUrl,
      webhookUrl
    );
    testToolId = tool.id;
    testApiKey = apiKey;

    // Create subscription
    await createTestSubscription(testUserId, testToolId);
  });

  afterAll(async () => {
    await mockServer.stop();
    // Cleanup...
  });

  it('should initiate authorization and exchange code successfully', async () => {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';

    // Step 1: Initiate authorization
    const initiateResponse = await fetch(`${apiUrl}/api/v1/authorize/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Need user session cookie or JWT
      },
      body: JSON.stringify({
        toolId: testToolId,
        redirectUri: callbackUrl,
      }),
    });

    expect(initiateResponse.ok).toBe(true);
    const { authorizationUrl, code } = await initiateResponse.json();

    // Verify authorization URL contains code
    expect(authorizationUrl).toContain(callbackUrl);
    expect(code).toBeDefined();

    // Step 2: Exchange code (vendor side)
    const exchangeResponse = await fetch(`${apiUrl}/api/v1/authorize/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        code,
        redirectUri: callbackUrl,
      }),
    });

    expect(exchangeResponse.ok).toBe(true);
    const exchangeData = await exchangeResponse.json();

    // Verify exchange response
    expect(exchangeData.valid).toBe(true);
    expect(exchangeData.onesubUserId).toBe(testUserId);
    expect(exchangeData.verificationToken).toBeDefined();
    expect(exchangeData.entitlements).toBeDefined();

    // Verify tokens are NOT in URLs
    expect(authorizationUrl).not.toContain('verificationToken');
  });
});
```

### TEST 2: Session Enforcement (Integration Test)

**File**: `tests/integration/vendor/session-enforcement.test.ts`

**Approach**: Test that verify endpoint supports caching

**Implementation**:
```typescript
describe('TEST 2: Session Enforcement', () => {
  it('should return cacheUntil and nextVerificationBefore', async () => {
    // Call verify multiple times rapidly
    // Verify that caching is respected (not calling on every request)
    const verify1 = await callVerify(verificationToken);
    expect(verify1.cacheUntil).toBeDefined();
    expect(verify1.nextVerificationBefore).toBeDefined();

    // Second call should return same cacheUntil (if within cache window)
    const verify2 = await callVerify(verificationToken);
    expect(verify2.cacheUntil).toBe(verify1.cacheUntil);
  });
});
```

### TEST 3: Webhook Delivery (Integration Test)

**File**: `tests/integration/vendor/webhook-delivery.test.ts`

**Approach**: Trigger subscription cancellation, verify webhook delivery

**Implementation**:
```typescript
describe('TEST 3: Webhook Delivery', () => {
  it('should deliver webhook when subscription is cancelled', async () => {
    // Cancel subscription
    await cancelTestSubscription(testUserId, testToolId);

    // Wait for webhook delivery (poll database)
    const webhookDelivered = await verifyWebhookInDatabase(
      testToolId,
      'entitlement.revoked',
      10000 // 10 second timeout
    );

    expect(webhookDelivered).toBe(true);

    // Verify webhook log entry
    const supabase = getTestSupabase();
    const { data: log } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('tool_id', testToolId)
      .eq('event_type', 'entitlement.revoked')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(log).toBeDefined();
    expect(log.event_id).toBeDefined();
    expect(log.success).toBe(true);
    expect(log.status_code).toBeGreaterThanOrEqual(200);
    expect(log.status_code).toBeLessThan(300);
    expect(log.delivery_time_ms).toBeGreaterThan(0);
  });
});
```

### TEST 4: Vendor Webhook Handling (Integration Test)

**File**: `tests/integration/vendor/webhook-handling.test.ts`

**Approach**: Verify mock vendor receives and validates webhooks

**Implementation**:
```typescript
describe('TEST 4: Vendor Webhook Handling', () => {
  it('should receive and validate webhook signature', async () => {
    // Trigger webhook
    await cancelTestSubscription(testUserId, testToolId);
    await waitForWebhookDelivery(testToolId, 'entitlement.revoked');

    // Check mock vendor received webhook
    const receivedWebhooks = mockServer.getReceivedWebhooks();
    expect(receivedWebhooks.length).toBeGreaterThan(0);

    const webhook = receivedWebhooks[0];
    expect(webhook.type).toBe('entitlement.revoked');
    expect(webhook.isValid).toBe(true); // Signature validated
    expect(webhook.payload.id).toBeDefined();
    expect(webhook.payload.type).toBe('entitlement.revoked');
  });
});
```

### TEST 5: Enforcement via /verify (Integration Test)

**File**: `tests/integration/vendor/enforcement-verify.test.ts`

**Approach**: Cancel subscription, verify that /verify returns revoked

**Implementation**:
```typescript
describe('TEST 5: Enforcement via /verify', () => {
  it('should return valid:false after subscription cancellation', async () => {
    // Get verification token first (from exchange)
    const { verificationToken } = await exchangeAuthorizationCode(...);

    // Cancel subscription
    await cancelTestSubscription(testUserId, testToolId);

    // Wait for cache invalidation (may need to wait a bit)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Call verify - should return revoked
    const verifyResponse = await fetch(`${apiUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        verificationToken,
      }),
    });

    const verifyData = await verifyResponse.json();
    expect(verifyData.valid).toBe(false);
    expect(verifyData.error).toMatch(/SUBSCRIPTION_INACTIVE|ACCESS_REVOKED/);
    expect(verifyData.action).toBe('terminate_session');
  });
});
```

### TEST 6: Webhook Failure Resilience (Integration Test)

**File**: `tests/integration/vendor/webhook-failure-resilience.test.ts`

**Approach**: Configure mock server to fail, verify retry queue

**Implementation**:
```typescript
describe('TEST 6: Webhook Failure Resilience', () => {
  it('should queue failed webhooks for retry', async () => {
    // Configure mock server to fail
    await fetch(`${mockServerUrl}/test/fail-next`, { method: 'POST' });

    // Trigger webhook
    await cancelTestSubscription(testUserId, testToolId);

    // Verify webhook log shows failure
    const supabase = getTestSupabase();
    const { data: log } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('tool_id', testToolId)
      .eq('event_type', 'entitlement.revoked')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(log.success).toBe(false);
    expect(log.status_code).toBeGreaterThanOrEqual(500);

    // Verify retry queue entry (if retry system implemented)
    const { data: retryEntry } = await supabase
      .from('webhook_retry_queue')
      .select('*')
      .eq('tool_id', testToolId)
      .eq('event_type', 'entitlement.revoked')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (retryEntry) {
      expect(retryEntry.retry_count).toBe(0);
      expect(retryEntry.status).toBe('pending');
    }
  });
});
```

### TEST 7: Security Checks (Integration Test)

**File**: `tests/integration/vendor/security-checks.test.ts`

**Approach**: Test webhook signature validation

**Implementation**:
```typescript
describe('TEST 7: Security Checks', () => {
  it('should reject webhooks with invalid signature', async () => {
    const invalidPayload = {
      id: 'test-id',
      type: 'entitlement.revoked',
      created: Math.floor(Date.now() / 1000),
    };

    const response = await fetch(`${mockServerUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-1Sub-Signature': 't=1234567890,v1=invalid_signature',
      },
      body: JSON.stringify(invalidPayload),
    });

    // Mock server should reject (but we're testing 1sub's signature generation)
    // Better: test that 1sub generates valid signatures
    expect(response.status).toBe(401);
  });

  it('should reject webhooks with missing signature', async () => {
    const response = await fetch(`${mockServerUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No X-1Sub-Signature header
      },
      body: JSON.stringify({ type: 'test' }),
    });

    expect(response.status).toBe(401);
  });
});
```

### TEST 8: Integration Path Consistency (E2E Test)

**File**: `tests/e2e/vendor/integration-path-consistency.e2e.test.ts`

**Approach**: Playwright E2E test to verify UI shows correct integration guide

**Implementation**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('TEST 8: Integration Path Consistency', () => {
  test('should show correct integration documentation', async ({ page }) => {
    // Login as vendor
    await page.goto('/login');
    // ... login steps

    // Navigate to integration guide
    await page.goto('/vendor-dashboard/integration');

    // Verify documentation shows:
    // - Callback flow
    // - Webhook endpoint setup
    // - Verify endpoint usage

    await expect(page.locator('text=/callback.*flow/i')).toBeVisible();
    await expect(page.locator('text=/webhook.*endpoint/i')).toBeVisible();
    await expect(page.locator('text=/verify.*endpoint/i')).toBeVisible();

    // Verify no email-based linking mentioned
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toMatch(/email.*link|link.*email/i);
  });
});
```

## Test Execution

### Setup Script

**File**: `tests/helpers/setup-vendor-integration.ts`

```typescript
export async function setupVendorIntegrationTests() {
  // 1. Ensure test database is clean
  // 2. Start mock vendor server
  // 3. Create test users and vendors
  // 4. Return test context
}
```

### Test Runner Configuration

**Vitest Config** (already exists):
- Tests in `tests/integration/vendor/` directory
- Uses existing setup files
- Timeout: 30 seconds for webhook tests

**Playwright Config** (already exists):
- E2E tests in `tests/e2e/vendor/` directory
- Uses existing webServer configuration

### Running Tests

```bash
# Run all vendor integration tests
npm run test:vendor-integration

# Run specific test
npx vitest run tests/integration/vendor/callback-launch-flow.test.ts

# Run E2E tests
npx playwright test tests/e2e/vendor/

# Run with coverage
npm run test:vendor-integration -- --coverage
```

## Package Dependencies

Add to `package.json`:

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0",
    "express": "^4.18.0",
    "@types/express": "^4.17.0"
  }
}
```

## Test Scripts

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:vendor-integration": "vitest run tests/integration/vendor/",
    "test:vendor-integration:watch": "vitest watch tests/integration/vendor/",
    "test:vendor-e2e": "playwright test tests/e2e/vendor/",
    "test:vendor-all": "npm run test:vendor-integration && npm run test:vendor-e2e"
  }
}
```

## CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Run Vendor Integration Tests
  run: npm run test:vendor-integration
  env:
    TEST_API_URL: ${{ secrets.TEST_API_URL }}
    WEBHOOK_SECRET: ${{ secrets.WEBHOOK_SECRET }}
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}

- name: Run Vendor E2E Tests
  run: npm run test:vendor-e2e
  env:
    TEST_URL: ${{ secrets.TEST_URL }}
```

## Challenges and Solutions

### Challenge 1: User Authentication in Integration Tests

**Problem**: API endpoints require user session/auth tokens

**Solution**: 
- Use Supabase admin API to create user sessions
- Or use service role to bypass auth in test environment
- Or create test-specific auth endpoints

### Challenge 2: Webhook Delivery Timing

**Problem**: Webhooks are async, tests need to wait

**Solution**:
- Implement `waitForWebhookDelivery()` helper that polls database
- Use reasonable timeout (5-10 seconds)
- Consider using database triggers or webhook delivery guarantees

### Challenge 3: Mock Vendor Server Port Management

**Problem**: Need available port for mock server

**Solution**:
- Use port 0 (OS assigns available port)
- Return assigned port from `start()` method
- Store in test context

### Challenge 4: Test Isolation

**Problem**: Tests may interfere with each other

**Solution**:
- Use `beforeEach`/`afterEach` to clean up
- Use unique test data (UUIDs, timestamps)
- Clean up database after each test suite

## Test Coverage Goals

- **Integration Tests**: 100% of critical paths (TEST 1, 3, 5)
- **E2E Tests**: User-facing flows (TEST 8)
- **Security Tests**: All security checks (TEST 7)

## Expected Test Execution Time

- TEST 1: ~2 seconds
- TEST 2: ~1 second
- TEST 3: ~5 seconds (webhook delivery wait)
- TEST 4: ~5 seconds
- TEST 5: ~3 seconds
- TEST 6: ~5 seconds
- TEST 7: ~2 seconds
- TEST 8: ~10 seconds (E2E)

**Total**: ~33 seconds for integration tests + ~10 seconds for E2E = **~45 seconds**

## Next Steps

1. **Create Mock Vendor Server** (`tests/mocks/vendor-server.ts`)
2. **Extend Test Helpers** (`tests/helpers/vendor-integration-helpers.ts`)
3. **Implement TEST 1** (`tests/integration/vendor/callback-launch-flow.test.ts`)
4. **Implement TEST 3** (`tests/integration/vendor/webhook-delivery.test.ts`)
5. **Implement TEST 5** (`tests/integration/vendor/enforcement-verify.test.ts`)
6. **Implement remaining tests**
7. **Add CI/CD integration**
8. **Document test execution**

## Success Criteria

✅ All 8 tests pass automatically
✅ Tests run in < 60 seconds
✅ Tests are isolated and repeatable
✅ CI/CD integration works
✅ Tests catch regressions before deployment


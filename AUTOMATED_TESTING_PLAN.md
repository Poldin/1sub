# Automated Testing Plan - 1sub Platform

**Version:** 2.0 (Automated)
**Date:** December 8, 2024
**Purpose:** Complete automated testing strategy with zero manual intervention

---

## Executive Summary

This document outlines a fully automated testing strategy for the 1sub platform. All tests are automated and can be executed with a single command. The test suite covers unit tests, integration tests, E2E tests, API tests, database tests, and payment flow tests.

**Goal:** 100% automated test coverage for all critical flows before production deployment.

---

## Table of Contents

1. [Testing Stack & Tools](#1-testing-stack--tools)
2. [Installation & Setup](#2-installation--setup)
3. [Test Organization](#3-test-organization)
4. [Unit Tests](#4-unit-tests)
5. [API Integration Tests](#5-api-integration-tests)
6. [End-to-End Tests](#6-end-to-end-tests)
7. [Database Tests](#7-database-tests)
8. [Payment & Stripe Tests](#8-payment--stripe-tests)
9. [Security Tests](#9-security-tests)
10. [Performance Tests](#10-performance-tests)
11. [CI/CD Integration](#11-cicd-integration)
12. [Running All Tests](#12-running-all-tests)
13. [Test Coverage Requirements](#13-test-coverage-requirements)

---

## 1. Testing Stack & Tools

### Core Testing Framework
- **Vitest** - Fast unit testing framework (Vite-powered, Jest-compatible API)
- **@testing-library/react** - React component testing
- **@testing-library/user-event** - Simulating user interactions
- **happy-dom** - Fast DOM implementation for Node.js

### E2E Testing
- **Playwright** - Modern E2E testing framework by Microsoft
  - Cross-browser testing (Chromium, Firefox, WebKit)
  - Auto-wait capabilities
  - Network interception
  - Video recording on failures

### API Testing
- **Supertest** - HTTP assertions for API testing
- **MSW (Mock Service Worker)** - API mocking for tests
- **@supabase/supabase-js** - Supabase client testing

### Database Testing
- **@supabase/supabase-js** - Test database operations
- **pg** (PostgreSQL client) - Direct database testing
- **Custom SQL scripts** - Integrity validation

### Payment Testing
- **stripe-mock** - Stripe API mocking server
- **nock** - HTTP request mocking
- **Stripe test mode** - Real Stripe integration tests

### Security Testing
- **eslint-plugin-security** - Static security analysis
- **sql-injection-test** - SQL injection detection
- **xss-test** - XSS vulnerability testing
- **helmet** - Security headers testing

### Performance Testing
- **autocannon** - HTTP load testing
- **clinic** - Node.js performance profiling
- **lighthouse-ci** - Automated Lighthouse audits

### Code Quality
- **ESLint** - Linting and code quality
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Husky** - Git hooks for pre-commit checks

---

## 2. Installation & Setup

### 2.1 Install Testing Dependencies

```bash
# Install all testing dependencies
npm install --save-dev \
  vitest \
  @vitest/ui \
  @vitest/coverage-v8 \
  happy-dom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  playwright \
  supertest \
  msw \
  nock \
  autocannon \
  lighthouse \
  @lhci/cli \
  eslint-plugin-security \
  @types/supertest \
  dotenv-cli
```

### 2.2 Project Structure

```
1sub-dev/
├── tests/
│   ├── unit/                    # Unit tests
│   │   ├── lib/                 # Library function tests
│   │   ├── api/                 # API route handler tests
│   │   └── components/          # React component tests
│   ├── integration/             # Integration tests
│   │   ├── api/                 # API integration tests
│   │   ├── database/            # Database tests
│   │   └── payment/             # Payment flow tests
│   ├── e2e/                     # End-to-end tests
│   │   ├── user/                # User flow tests
│   │   ├── vendor/              # Vendor flow tests
│   │   └── admin/               # Admin flow tests
│   ├── security/                # Security tests
│   ├── performance/             # Performance tests
│   ├── fixtures/                # Test data and fixtures
│   ├── helpers/                 # Test utilities
│   │   ├── setup.ts             # Global test setup
│   │   ├── db-helpers.ts        # Database test helpers
│   │   ├── stripe-helpers.ts    # Stripe test helpers
│   │   └── auth-helpers.ts      # Auth test helpers
│   └── mocks/                   # Mock data and handlers
├── vitest.config.ts             # Vitest configuration
├── playwright.config.ts         # Playwright configuration
├── .lighthouserc.json          # Lighthouse CI configuration
└── .github/
    └── workflows/
        └── test.yml             # GitHub Actions CI/CD
```

---

## 3. Test Organization

### 3.1 Test Naming Convention

```typescript
// Format: [component/function].[test-type].ts
// Examples:
// tests/unit/lib/credits.test.ts
// tests/integration/api/stripe-webhook.integration.test.ts
// tests/e2e/user/credit-purchase.e2e.test.ts
```

### 3.2 Test Categories

| Category | Directory | Purpose | Tool |
|----------|-----------|---------|------|
| Unit | `tests/unit/` | Test individual functions/components | Vitest |
| Integration | `tests/integration/` | Test API routes, database operations | Vitest + Supertest |
| E2E | `tests/e2e/` | Test complete user flows | Playwright |
| Security | `tests/security/` | Test security vulnerabilities | Custom + ESLint |
| Performance | `tests/performance/` | Load testing, performance benchmarks | Autocannon + Lighthouse |

---

## 4. Unit Tests

### 4.1 Credit System Tests

**File:** `tests/unit/lib/credits.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addCredits, subtractCredits, getCurrentBalance } from '@/lib/credits';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js');

describe('Credit System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addCredits', () => {
    it('should add credits to user balance', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { balance: 100 },
                error: null,
              })),
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await addCredits({
        userId: 'user-123',
        amount: 50,
        reason: 'Purchase',
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(150);
    });

    it('should handle idempotency key duplicate', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'existing-txn' },
                error: null,
              })),
            })),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await addCredits({
        userId: 'user-123',
        amount: 50,
        reason: 'Purchase',
        idempotencyKey: 'duplicate-key',
      });

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
    });

    it('should fail with negative amount', async () => {
      await expect(
        addCredits({
          userId: 'user-123',
          amount: -10,
          reason: 'Invalid',
        })
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('subtractCredits', () => {
    it('should subtract credits from balance', async () => {
      // Test implementation
    });

    it('should fail with insufficient balance', async () => {
      // Test implementation
    });

    it('should respect idempotency key', async () => {
      // Test implementation
    });
  });

  describe('getCurrentBalance', () => {
    it('should return current balance', async () => {
      // Test implementation
    });

    it('should return 0 for new user', async () => {
      // Test implementation
    });
  });
});
```

### 4.2 Validation Tests

**File:** `tests/unit/lib/validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  validateCreditConsumeRequest,
  apiKeySchema,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('UUID Validation', () => {
    it('should validate correct UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key format', () => {
      const validKey = 'sk-tool-' + 'a'.repeat(32);
      expect(() => apiKeySchema.parse(validKey)).not.toThrow();
    });

    it('should reject invalid API key format', () => {
      expect(() => apiKeySchema.parse('invalid-key')).toThrow();
      expect(() => apiKeySchema.parse('sk-tool-short')).toThrow();
      expect(() => apiKeySchema.parse('sk-wrong-prefix')).toThrow();
    });
  });

  describe('Credit Consume Request Validation', () => {
    it('should validate correct request', () => {
      const request = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 10,
        reason: 'Tool usage',
        idempotency_key: 'key-123',
      };

      expect(() => validateCreditConsumeRequest(request)).not.toThrow();
    });

    it('should reject negative amount', () => {
      const request = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: -10,
        reason: 'Tool usage',
        idempotency_key: 'key-123',
      };

      expect(() => validateCreditConsumeRequest(request)).toThrow();
    });

    it('should reject amount exceeding maximum', () => {
      const request = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 2000000, // Over 1M limit
        reason: 'Tool usage',
        idempotency_key: 'key-123',
      };

      expect(() => validateCreditConsumeRequest(request)).toThrow();
    });
  });
});
```

### 4.3 Sanitization Tests

**File:** `tests/unit/lib/sanitization.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeUrl,
  sanitizeForLogging,
} from '@/lib/sanitization';

describe('Sanitization Utilities', () => {
  describe('HTML Sanitization', () => {
    it('should remove script tags', () => {
      const dirty = '<p>Hello</p><script>alert("XSS")</script>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const dirty = '<div onclick="alert()">Click</div>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const dirty = '<a href="javascript:alert()">Link</a>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('javascript:');
    });
  });

  describe('URL Sanitization', () => {
    it('should allow valid HTTP URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert()')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert()</script>')).toBe('');
    });

    it('should block file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });
  });

  describe('Logging Sanitization', () => {
    it('should redact sensitive fields', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        api_key: 'sk-tool-abc123',
        data: { token: 'bearer-token' },
      };

      const sanitized = sanitizeForLogging(obj);
      expect(sanitized).toEqual({
        username: 'john',
        password: '***REDACTED***',
        api_key: '***REDACTED***',
        data: { token: '***REDACTED***' },
      });
    });
  });
});
```

### 4.4 Rate Limiting Tests

**File:** `tests/unit/lib/rate-limit.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const identifier = 'test-key-1';
    const config = { limit: 5, windowMs: 60000 };

    // First 5 requests should succeed
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(identifier, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('should block requests exceeding limit', () => {
    const identifier = 'test-key-2';
    const config = { limit: 3, windowMs: 60000 };

    // First 3 succeed
    for (let i = 0; i < 3; i++) {
      checkRateLimit(identifier, config);
    }

    // 4th request should fail
    const result = checkRateLimit(identifier, config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });

  it('should reset after window expires', () => {
    const identifier = 'test-key-3';
    const config = { limit: 2, windowMs: 60000 };

    // Use up limit
    checkRateLimit(identifier, config);
    checkRateLimit(identifier, config);

    // Should be blocked
    let result = checkRateLimit(identifier, config);
    expect(result.success).toBe(false);

    // Fast forward past window
    vi.advanceTimersByTime(61000);

    // Should succeed again
    result = checkRateLimit(identifier, config);
    expect(result.success).toBe(true);
  });

  it('should track different identifiers separately', () => {
    const config = { limit: 1, windowMs: 60000 };

    const result1 = checkRateLimit('key-1', config);
    const result2 = checkRateLimit('key-2', config);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });
});
```

### 4.5 JWT Tests

**File:** `tests/unit/lib/jwt.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateToolAccessToken,
  verifyToolAccessToken,
} from '@/lib/jwt';

describe('JWT Utilities', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockToolId = '660e8400-e29b-41d4-a716-446655440000';
  const mockCheckoutId = '770e8400-e29b-41d4-a716-446655440000';

  describe('generateToolAccessToken', () => {
    it('should generate valid JWT token', () => {
      const token = generateToolAccessToken(
        mockUserId,
        mockToolId,
        mockCheckoutId
      );

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload', async () => {
      const token = generateToolAccessToken(
        mockUserId,
        mockToolId,
        mockCheckoutId
      );

      const verified = await verifyToolAccessToken(token);

      expect(verified.userId).toBe(mockUserId);
      expect(verified.toolId).toBe(mockToolId);
      expect(verified.checkoutId).toBe(mockCheckoutId);
    });
  });

  describe('verifyToolAccessToken', () => {
    it('should verify valid token', async () => {
      const token = generateToolAccessToken(
        mockUserId,
        mockToolId,
        mockCheckoutId
      );

      const verified = await verifyToolAccessToken(token);
      expect(verified).toBeTruthy();
    });

    it('should reject invalid token', async () => {
      await expect(verifyToolAccessToken('invalid.token.here')).rejects.toThrow();
    });

    it('should reject expired token', async () => {
      vi.useFakeTimers();

      const token = generateToolAccessToken(
        mockUserId,
        mockToolId,
        mockCheckoutId
      );

      // Fast forward 2 hours (token expires in 1 hour)
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      await expect(verifyToolAccessToken(token)).rejects.toThrow();

      vi.useRealTimers();
    });

    it('should reject token with wrong secret', async () => {
      // This would need to mock the JWT_SECRET env var
      // Test implementation depends on your JWT library
    });
  });
});
```

---

## 5. API Integration Tests

### 5.1 Credit Consumption API Tests

**File:** `tests/integration/api/credits-consume.integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { NextApiHandler } from 'next';

const TEST_API_KEY = 'sk-tool-' + 'a'.repeat(32);
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe('POST /api/v1/credits/consume', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Initialize test database connection
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test user with balance
    await supabase.from('user_balances').upsert({
      user_id: TEST_USER_ID,
      balance: 100,
    });

    // Create test tool with API key
    const { data: tool } = await supabase
      .from('tools')
      .insert({ name: 'Test Tool', url: 'https://test.com' })
      .select()
      .single();

    await supabase.from('api_keys').insert({
      tool_id: tool.id,
      key_hash: 'hashed-key', // In real test, use bcrypt
      key_prefix: 'sk-tool-',
      is_active: true,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('user_balances').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('credit_transactions').delete().eq('user_id', TEST_USER_ID);
  });

  beforeEach(async () => {
    // Reset balance before each test
    await supabase
      .from('user_balances')
      .update({ balance: 100 })
      .eq('user_id', TEST_USER_ID);
  });

  describe('Authentication', () => {
    it('should require API key', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .send({
          user_id: TEST_USER_ID,
          amount: 10,
          reason: 'Test',
          idempotency_key: 'test-key-1',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API key');
    });

    it('should reject invalid API key', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', 'Bearer invalid-key')
        .send({
          user_id: TEST_USER_ID,
          amount: 10,
          reason: 'Test',
          idempotency_key: 'test-key-2',
        });

      expect(response.status).toBe(401);
    });

    it('should accept valid API key', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: TEST_USER_ID,
          amount: 10,
          reason: 'Test',
          idempotency_key: `test-key-${Date.now()}`,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Credit Consumption', () => {
    it('should consume credits successfully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: TEST_USER_ID,
          amount: 10,
          reason: 'Test consumption',
          idempotency_key: `test-key-${Date.now()}`,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.new_balance).toBe(90);

      // Verify in database
      const { data } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', TEST_USER_ID)
        .single();

      expect(data?.balance).toBe(90);
    });

    it('should respect idempotency key', async () => {
      const idempotencyKey = `test-key-${Date.now()}`;

      // First request
      const response1 = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: TEST_USER_ID,
          amount: 25,
          reason: 'Test',
          idempotency_key: idempotencyKey,
        });

      expect(response1.status).toBe(200);
      expect(response1.body.new_balance).toBe(75);

      // Second request with same idempotency key
      const response2 = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: TEST_USER_ID,
          amount: 25,
          reason: 'Test',
          idempotency_key: idempotencyKey,
        });

      expect(response2.status).toBe(200);
      expect(response2.body.new_balance).toBe(75); // Still 75, not 50!

      // Verify balance is 75, not 50
      const { data } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', TEST_USER_ID)
        .single();

      expect(data?.balance).toBe(75);
    });

    it('should fail with insufficient balance', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: TEST_USER_ID,
          amount: 150, // More than 100 available
          reason: 'Test',
          idempotency_key: `test-key-${Date.now()}`,
        });

      expect(response.status).toBe(402);
      expect(response.body.error).toContain('Insufficient');

      // Verify balance unchanged
      const { data } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', TEST_USER_ID)
        .single();

      expect(data?.balance).toBe(100);
    });
  });

  describe('Validation', () => {
    it('should reject invalid user_id', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: 'invalid-uuid',
          amount: 10,
          reason: 'Test',
          idempotency_key: `test-key-${Date.now()}`,
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative amount', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: TEST_USER_ID,
          amount: -10,
          reason: 'Test',
          idempotency_key: `test-key-${Date.now()}`,
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${TEST_API_KEY}`)
        .send({
          user_id: TEST_USER_ID,
          // Missing amount, reason, idempotency_key
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const promises = [];

      // Send 101 requests (limit is 100/min)
      for (let i = 0; i < 101; i++) {
        promises.push(
          request(API_BASE_URL)
            .post('/api/v1/credits/consume')
            .set('Authorization', `Bearer ${TEST_API_KEY}`)
            .send({
              user_id: TEST_USER_ID,
              amount: 1,
              reason: 'Rate limit test',
              idempotency_key: `rate-test-${i}`,
            })
        );
      }

      const responses = await Promise.all(promises);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);

      // Check for rate limit headers
      const lastResponse = responses[responses.length - 1];
      if (lastResponse.status === 429) {
        expect(lastResponse.headers['x-ratelimit-limit']).toBeDefined();
        expect(lastResponse.headers['retry-after']).toBeDefined();
      }
    });
  });
});
```

### 5.2 Vendor API Tests

**File:** `tests/integration/api/vendor.integration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe('Vendor API Endpoints', () => {
  let vendorSession: string;
  let vendorId: string;
  let toolId: string;

  beforeAll(async () => {
    // Create test vendor and get session
    // This would use Supabase auth in real implementation
  });

  describe('POST /api/vendor/tools/create', () => {
    it('should create new tool', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/vendor/tools/create')
        .set('Cookie', vendorSession)
        .send({
          name: 'Test Tool',
          description: 'A test tool for automated testing',
          url: 'https://test-tool.example.com',
          category: 'AI',
          pricing: {
            type: 'credits',
            amount: 10,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.tool).toBeDefined();
      expect(response.body.tool.name).toBe('Test Tool');

      toolId = response.body.tool.id;
    });

    it('should reject invalid URL', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/vendor/tools/create')
        .set('Cookie', vendorSession)
        .send({
          name: 'Test Tool',
          description: 'A test tool',
          url: 'javascript:alert()',
          category: 'AI',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/vendor/api-keys/regenerate', () => {
    it('should generate API key', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/vendor/api-keys/regenerate')
        .set('Cookie', vendorSession)
        .send({ tool_id: toolId });

      expect(response.status).toBe(200);
      expect(response.body.api_key).toMatch(/^sk-tool-[a-z0-9]{32,}$/);
    });

    it('should invalidate old API key', async () => {
      // First regeneration
      const response1 = await request(API_BASE_URL)
        .post('/api/vendor/api-keys/regenerate')
        .set('Cookie', vendorSession)
        .send({ tool_id: toolId });

      const oldKey = response1.body.api_key;

      // Second regeneration
      const response2 = await request(API_BASE_URL)
        .post('/api/vendor/api-keys/regenerate')
        .set('Cookie', vendorSession)
        .send({ tool_id: toolId });

      const newKey = response2.body.api_key;

      expect(newKey).not.toBe(oldKey);

      // Old key should not work
      const consumeResponse = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', `Bearer ${oldKey}`)
        .send({
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 1,
          reason: 'Test',
          idempotency_key: 'test',
        });

      expect(consumeResponse.status).toBe(401);
    });
  });

  describe('GET /api/vendor/analytics/revenue', () => {
    it('should return revenue analytics', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/vendor/analytics/revenue')
        .set('Cookie', vendorSession);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_credits');
      expect(response.body).toHaveProperty('total_revenue');
      expect(typeof response.body.total_credits).toBe('number');
    });
  });
});
```

---

## 6. End-to-End Tests

### 6.1 Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
  ],
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 6.2 User Registration & Login E2E Test

**File:** `tests/e2e/user/auth.e2e.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('should register new user and login', async ({ page }) => {
    // Generate unique email
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Navigate to register page
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to backoffice
    await expect(page).toHaveURL('/backoffice');

    // Should show user email or name
    await expect(page.locator(`text=${email}`)).toBeVisible();

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');

    // Login again
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should be back in backoffice
    await expect(page).toHaveURL('/backoffice');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/Invalid credentials/i')).toBeVisible();

    // Should not redirect
    await expect(page).toHaveURL('/login');
  });

  test('should require authentication for protected pages', async ({ page }) => {
    // Try to access protected page without login
    await page.goto('/backoffice');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### 6.3 Credit Purchase E2E Test

**File:** `tests/e2e/user/credit-purchase.e2e.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Credit Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/backoffice');
  });

  test('should complete credit purchase', async ({ page }) => {
    // Get initial balance
    await page.goto('/backoffice');
    const initialBalanceText = await page.locator('[data-testid="credit-balance"]').textContent();
    const initialBalance = parseInt(initialBalanceText || '0');

    // Navigate to buy credits page
    await page.goto('/buy-credits');

    // Select 50 credits package
    await page.click('[data-testid="package-50-credits"]');

    // Should redirect to checkout page
    await expect(page).toHaveURL(/\/credit_checkout/);

    // Fill Stripe test card
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await stripeFrame.locator('input[name="postal"]').fill('12345');

    // Submit payment
    await page.click('button[type="submit"]:has-text("Pay")');

    // Wait for redirect to success page
    await page.waitForURL('/backoffice', { timeout: 30000 });

    // Check balance increased
    await page.reload(); // Refresh to get updated balance
    const newBalanceText = await page.locator('[data-testid="credit-balance"]').textContent();
    const newBalance = parseInt(newBalanceText || '0');

    expect(newBalance).toBe(initialBalance + 50);

    // Check transaction history
    await page.click('text=Transaction History');
    await expect(page.locator('text=/Purchased 50 credits/i')).toBeVisible();
  });

  test('should handle payment failure', async ({ page }) => {
    await page.goto('/buy-credits');
    await page.click('[data-testid="package-50-credits"]');

    // Use declining test card
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
    await stripeFrame.locator('input[name="cardnumber"]').fill('4000000000000002');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');

    await page.click('button[type="submit"]:has-text("Pay")');

    // Should show error message
    await expect(page.locator('text=/card was declined/i')).toBeVisible();

    // Balance should not change
    await page.goto('/backoffice');
    // Verify balance unchanged (would need to store initial balance)
  });
});
```

### 6.4 Subscription E2E Test

**File:** `tests/e2e/user/subscription.e2e.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Platform Subscription Flow', () => {
  test('should subscribe to Professional plan', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    // Navigate to subscribe page
    await page.goto('/subscribe');

    // View all plans
    await expect(page.locator('text=Starter')).toBeVisible();
    await expect(page.locator('text=Professional')).toBeVisible();
    await expect(page.locator('text=Business')).toBeVisible();
    await expect(page.locator('text=Enterprise')).toBeVisible();

    // Select Professional plan
    await page.click('[data-testid="plan-professional"]');

    // Choose monthly billing
    await page.click('input[value="monthly"]');

    // Proceed to checkout
    await page.click('button:has-text("Subscribe")');

    // Wait for Stripe checkout redirect
    await page.waitForURL(/checkout.stripe.com/, { timeout: 10000 });

    // Fill payment details (Stripe Checkout page)
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="cardNumber"]', '4242 4242 4242 4242');
    await page.fill('input[name="cardExpiry"]', '12 / 30');
    await page.fill('input[name="cardCvc"]', '123');
    await page.fill('input[name="billingName"]', 'Test User');

    // Submit payment
    await page.click('button[type="submit"]');

    // Wait for redirect back to app
    await page.waitForURL('/subscribe/success', { timeout: 30000 });

    // Verify success message
    await expect(page.locator('text=/subscription active/i')).toBeVisible();

    // Verify credits added (Professional = 150 credits)
    await page.goto('/backoffice');
    const balanceText = await page.locator('[data-testid="credit-balance"]').textContent();
    const balance = parseInt(balanceText || '0');
    expect(balance).toBeGreaterThanOrEqual(150);

    // Verify subscription badge
    await expect(page.locator('text=/Professional/i')).toBeVisible();
  });

  test('should cancel subscription', async ({ page }) => {
    // Login as user with active subscription
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_SUBSCRIBED_USER_EMAIL!);
    await page.fill('input[name="password"]', process.env.TEST_SUBSCRIBED_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    // Go to subscription management
    await page.goto('/backoffice');
    await page.click('text=Manage Subscription');

    // Cancel subscription
    await page.click('button:has-text("Cancel Subscription")');

    // Confirm cancellation
    await page.click('button:has-text("Yes, Cancel")');

    // Verify cancellation message
    await expect(page.locator('text=/subscription will end/i')).toBeVisible();

    // Verify status shows "Cancelled" or "Active until X"
    await expect(page.locator('text=/cancelled/i')).toBeVisible();
  });
});
```

### 6.5 Vendor Dashboard E2E Test

**File:** `tests/e2e/vendor/dashboard.e2e.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Vendor Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as vendor
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_VENDOR_EMAIL!);
    await page.fill('input[name="password"]', process.env.TEST_VENDOR_PASSWORD!);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/backoffice');
  });

  test('should create new tool', async ({ page }) => {
    await page.goto('/vendor-dashboard/products/create');

    // Fill tool details
    await page.fill('input[name="name"]', 'Test E2E Tool');
    await page.fill('textarea[name="description"]', 'This is a test tool created by E2E test');
    await page.fill('input[name="url"]', 'https://test-e2e-tool.example.com');
    await page.selectOption('select[name="category"]', 'AI');

    // Set pricing
    await page.click('input[value="credits"]');
    await page.fill('input[name="creditAmount"]', '15');

    // Submit
    await page.click('button[type="submit"]:has-text("Create Tool")');

    // Should redirect to tools list
    await expect(page).toHaveURL('/vendor-dashboard/products');

    // Tool should appear in list
    await expect(page.locator('text=Test E2E Tool')).toBeVisible();
  });

  test('should generate and copy API key', async ({ page }) => {
    await page.goto('/vendor-dashboard/api');

    // Click generate API key
    await page.click('button:has-text("Generate API Key")');

    // API key should be visible
    const apiKeyElement = page.locator('[data-testid="api-key-display"]');
    await expect(apiKeyElement).toBeVisible();

    // Key should match format
    const apiKey = await apiKeyElement.textContent();
    expect(apiKey).toMatch(/^sk-tool-[a-z0-9]{32,}$/);

    // Click copy button
    await page.click('button:has-text("Copy")');

    // Should show success message
    await expect(page.locator('text=/copied/i')).toBeVisible();
  });

  test('should view analytics', async ({ page }) => {
    await page.goto('/vendor-dashboard');

    // Analytics dashboard should load
    await expect(page.locator('text=/Total Revenue/i')).toBeVisible();
    await expect(page.locator('text=/Active Users/i')).toBeVisible();

    // Charts should render
    await expect(page.locator('canvas')).toBeVisible(); // Chart.js uses canvas

    // Revenue number should be present
    const revenueElement = page.locator('[data-testid="total-revenue"]');
    await expect(revenueElement).toBeVisible();

    const revenueText = await revenueElement.textContent();
    expect(revenueText).toMatch(/\d+/); // Contains number
  });

  test('should schedule payout', async ({ page }) => {
    await page.goto('/vendor-dashboard/payouts');

    // Check available balance
    const balanceElement = page.locator('[data-testid="available-balance"]');
    const balanceText = await balanceElement.textContent();
    const balance = parseInt(balanceText || '0');

    if (balance >= 50) {
      // Schedule payout
      await page.click('button:has-text("Schedule Payout")');

      // Fill payout amount (min 50)
      await page.fill('input[name="amount"]', '50');

      // Select date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill('input[type="date"]', tomorrow.toISOString().split('T')[0]);

      // Submit
      await page.click('button[type="submit"]:has-text("Schedule")');

      // Should show success message
      await expect(page.locator('text=/payout scheduled/i')).toBeVisible();

      // Should appear in payout history
      await expect(page.locator('text=/50 credits/i')).toBeVisible();
      await expect(page.locator('text=/scheduled/i')).toBeVisible();
    }
  });
});
```

---

## 7. Database Tests

### 7.1 Database Test Helpers

**File:** `tests/helpers/db-helpers.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

let supabase: SupabaseClient | null = null;

export function getTestSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}

export async function createTestUser(email?: string) {
  const supabase = getTestSupabase();
  const testEmail = email || `test-${randomUUID()}@example.com`;

  const { data: user, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (error) throw error;

  return user.user;
}

export async function createTestUserWithBalance(balance: number = 100) {
  const user = await createTestUser();

  const supabase = getTestSupabase();
  await supabase.from('user_balances').upsert({
    user_id: user.id,
    balance: balance,
  });

  return user;
}

export async function createTestVendor() {
  const user = await createTestUser();

  const supabase = getTestSupabase();
  await supabase
    .from('user_profiles')
    .update({ is_vendor: true })
    .eq('id', user.id);

  return user;
}

export async function createTestTool(vendorId: string) {
  const supabase = getTestSupabase();

  const { data: tool, error } = await supabase
    .from('tools')
    .insert({
      name: 'Test Tool',
      description: 'Test tool for automated testing',
      url: 'https://test-tool.example.com',
      category: 'AI',
      user_profile_id: vendorId,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return tool;
}

export async function createTestAPIKey(toolId: string, keyHash: string) {
  const supabase = getTestSupabase();

  await supabase.from('api_keys').insert({
    tool_id: toolId,
    key_hash: keyHash,
    key_prefix: 'sk-tool-',
    is_active: true,
  });
}

export async function cleanupTestUser(userId: string) {
  const supabase = getTestSupabase();

  // Delete user's data (cascading deletes should handle most)
  await supabase.from('user_balances').delete().eq('user_id', userId);
  await supabase.from('credit_transactions').delete().eq('user_id', userId);
  await supabase.from('checkouts').delete().eq('user_id', userId);

  // Delete auth user
  await supabase.auth.admin.deleteUser(userId);
}

export async function getBalance(userId: string): Promise<number> {
  const supabase = getTestSupabase();

  const { data, error } = await supabase
    .from('user_balances')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error) return 0;
  return data?.balance || 0;
}

export async function addTestCredits(userId: string, amount: number) {
  const supabase = getTestSupabase();

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    credits_amount: amount,
    type: 'add',
    reason: 'Test credit addition',
  });
}
```

### 7.2 Database Integrity Tests

**File:** `tests/integration/database/integrity.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestSupabase,
  createTestUserWithBalance,
  cleanupTestUser,
  getBalance,
  addTestCredits,
} from '../../helpers/db-helpers';

describe('Database Integrity', () => {
  let testUserId: string;
  const supabase = getTestSupabase();

  beforeEach(async () => {
    const user = await createTestUserWithBalance(100);
    testUserId = user.id;
  });

  afterEach(async () => {
    await cleanupTestUser(testUserId);
  });

  describe('Balance Consistency', () => {
    it('should match balance in user_balances with sum of transactions', async () => {
      // Add some transactions
      await addTestCredits(testUserId, 50);
      await addTestCredits(testUserId, -20); // Subtract via type

      // Get balance from user_balances table
      const storedBalance = await getBalance(testUserId);

      // Calculate balance from transactions
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('credits_amount, type')
        .eq('user_id', testUserId);

      const calculatedBalance = transactions!.reduce((sum, txn) => {
        return sum + (txn.type === 'add' ? txn.credits_amount : -txn.credits_amount);
      }, 0);

      expect(storedBalance).toBe(calculatedBalance);
    });

    it('should auto-update balance via trigger', async () => {
      const initialBalance = await getBalance(testUserId);

      // Insert transaction directly
      await supabase.from('credit_transactions').insert({
        user_id: testUserId,
        credits_amount: 25,
        type: 'add',
        reason: 'Trigger test',
      });

      // Balance should be updated automatically
      const newBalance = await getBalance(testUserId);
      expect(newBalance).toBe(initialBalance + 25);
    });

    it('should handle concurrent transactions correctly', async () => {
      const initialBalance = await getBalance(testUserId);

      // Create multiple concurrent transactions
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          supabase.from('credit_transactions').insert({
            user_id: testUserId,
            credits_amount: 5,
            type: 'add',
            reason: `Concurrent test ${i}`,
          })
        );
      }

      await Promise.all(promises);

      // Final balance should be exactly initial + 50
      const finalBalance = await getBalance(testUserId);
      expect(finalBalance).toBe(initialBalance + 50);
    });
  });

  describe('Repair Function', () => {
    it('should recalculate balance from transactions', async () => {
      // Manually corrupt the balance
      await supabase
        .from('user_balances')
        .update({ balance: 999 })
        .eq('user_id', testUserId);

      const corruptedBalance = await getBalance(testUserId);
      expect(corruptedBalance).toBe(999);

      // Run repair function
      await supabase.rpc('repair_user_balance', { p_user_id: testUserId });

      // Balance should be repaired
      const repairedBalance = await getBalance(testUserId);
      expect(repairedBalance).not.toBe(999);

      // Should match calculated balance
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('credits_amount, type')
        .eq('user_id', testUserId);

      const calculatedBalance = transactions!.reduce((sum, txn) => {
        return sum + (txn.type === 'add' ? txn.credits_amount : -txn.credits_amount);
      }, 0);

      expect(repairedBalance).toBe(calculatedBalance);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent orphaned credit transactions', async () => {
      // Try to create transaction for non-existent user
      const { error } = await supabase.from('credit_transactions').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        credits_amount: 10,
        type: 'add',
        reason: 'Test',
      });

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23503'); // Foreign key violation
    });

    it('should cascade delete transactions when user deleted', async () => {
      // Create transactions
      await addTestCredits(testUserId, 50);

      // Verify transactions exist
      const { data: before } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId);

      expect(before).toHaveLength(2); // Initial balance + new credit

      // Delete user
      await cleanupTestUser(testUserId);

      // Verify transactions deleted
      const { data: after } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId);

      expect(after).toHaveLength(0);

      // Mark as cleaned so afterEach doesn't fail
      testUserId = '';
    });
  });

  describe('Check Constraints', () => {
    it('should prevent negative balance', async () => {
      // Try to set negative balance
      const { error } = await supabase
        .from('user_balances')
        .update({ balance: -10 })
        .eq('user_id', testUserId);

      expect(error).toBeTruthy();
      expect(error?.message).toContain('check constraint');
    });
  });

  describe('Idempotency', () => {
    it('should enforce unique idempotency keys', async () => {
      const idempotencyKey = `test-key-${Date.now()}`;

      // First insert
      const { error: error1 } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: testUserId,
          credits_amount: 10,
          type: 'add',
          reason: 'Test',
          idempotency_key: idempotencyKey,
        });

      expect(error1).toBeNull();

      // Second insert with same key
      const { error: error2 } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: testUserId,
          credits_amount: 10,
          type: 'add',
          reason: 'Test',
          idempotency_key: idempotencyKey,
        });

      expect(error2).toBeTruthy();
      expect(error2?.code).toBe('23505'); // Unique violation
    });
  });
});
```

### 7.3 RLS Policy Tests

**File:** `tests/integration/database/rls.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  createTestUser,
  createTestUserWithBalance,
  cleanupTestUser,
} from '../../helpers/db-helpers';

describe('Row Level Security Policies', () => {
  let user1Id: string;
  let user2Id: string;
  let user1Session: string;

  beforeEach(async () => {
    const user1 = await createTestUserWithBalance(100);
    const user2 = await createTestUserWithBalance(50);

    user1Id = user1.id;
    user2Id = user2.id;

    // Get user1's session token
    // This would require signing in as user1
    // Implementation depends on your auth setup
  });

  afterEach(async () => {
    await cleanupTestUser(user1Id);
    await cleanupTestUser(user2Id);
  });

  describe('user_balances RLS', () => {
    it('should allow user to read own balance', async () => {
      // Create client with user1's session
      const user1Client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${user1Session}`,
            },
          },
        }
      );

      const { data, error } = await user1Client
        .from('user_balances')
        .select('*')
        .eq('user_id', user1Id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.balance).toBe(100);
    });

    it('should prevent user from reading other users balance', async () => {
      const user1Client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${user1Session}`,
            },
          },
        }
      );

      const { data, error } = await user1Client
        .from('user_balances')
        .select('*')
        .eq('user_id', user2Id);

      // Should return empty, not error (due to RLS)
      expect(data).toHaveLength(0);
    });
  });

  describe('credit_transactions RLS', () => {
    it('should allow user to read own transactions', async () => {
      // Test implementation similar to above
    });

    it('should prevent user from reading others transactions', async () => {
      // Test implementation
    });
  });

  describe('tools RLS', () => {
    it('should allow vendor to read/update own tools', async () => {
      // Test implementation
    });

    it('should prevent vendor from updating others tools', async () => {
      // Test implementation
    });

    it('should allow anyone to read active public tools', async () => {
      // Test implementation
    });
  });
});
```

---

## 8. Payment & Stripe Tests

### 8.1 Stripe Test Helpers

**File:** `tests/helpers/stripe-helpers.ts`

```typescript
import Stripe from 'stripe';
import { randomUUID } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function createTestPaymentIntent(amount: number = 5000) {
  return await stripe.paymentIntents.create({
    amount: amount, // in cents
    currency: 'eur',
    payment_method_types: ['card'],
    metadata: {
      test: 'true',
    },
  });
}

export async function createTestCheckoutSession(userId: string, creditAmount: number) {
  return await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${creditAmount} Credits`,
          },
          unit_amount: creditAmount * 100, // 1 credit = 1 EUR
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/backoffice?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/buy-credits`,
    metadata: {
      userId: userId,
      creditAmount: creditAmount.toString(),
      idempotencyKey: randomUUID(),
    },
  });
}

export async function simulateWebhookEvent(
  eventType: string,
  object: Stripe.Event.Data.Object
): Promise<Stripe.Event> {
  // Create a simulated webhook event
  return {
    id: `evt_test_${randomUUID()}`,
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: object,
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: eventType as any,
  };
}

export function constructWebhookSignature(
  payload: string,
  secret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return stripe.webhooks.generateTestHeaderString({
    payload: payload,
    secret: secret,
  });
}
```

### 8.2 Stripe Webhook Tests

**File:** `tests/integration/payment/stripe-webhook.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Stripe from 'stripe';
import {
  createTestUserWithBalance,
  cleanupTestUser,
  getBalance,
} from '../../helpers/db-helpers';
import { simulateWebhookEvent, constructWebhookSignature } from '../../helpers/stripe-helpers';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe('Stripe Webhook Handler', () => {
  let testUserId: string;

  beforeEach(async () => {
    const user = await createTestUserWithBalance(0);
    testUserId = user.id;
  });

  afterEach(async () => {
    await cleanupTestUser(testUserId);
  });

  describe('checkout.session.completed', () => {
    it('should add credits on successful checkout', async () => {
      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        metadata: {
          userId: testUserId,
          creditAmount: '50',
          idempotencyKey: `test-key-${Date.now()}`,
        },
      };

      const event = await simulateWebhookEvent(
        'checkout.session.completed',
        session as Stripe.Checkout.Session
      );

      const payload = JSON.stringify(event);
      const signature = constructWebhookSignature(
        payload,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      const response = await request(API_BASE_URL)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);

      // Verify credits added
      const balance = await getBalance(testUserId);
      expect(balance).toBe(50);
    });

    it('should handle subscription mode differently', async () => {
      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        mode: 'subscription',
        payment_status: 'paid',
        subscription: 'sub_test_123',
        metadata: {
          userId: testUserId,
          planId: 'professional',
        },
      };

      const event = await simulateWebhookEvent(
        'checkout.session.completed',
        session as Stripe.Checkout.Session
      );

      const payload = JSON.stringify(event);
      const signature = constructWebhookSignature(
        payload,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      const response = await request(API_BASE_URL)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);

      // Verify subscription created (not just credits)
      // Check platform_subscriptions table
    });

    it('should respect idempotency key', async () => {
      const idempotencyKey = `test-key-${Date.now()}`;

      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        metadata: {
          userId: testUserId,
          creditAmount: '50',
          idempotencyKey: idempotencyKey,
        },
      };

      // Send webhook twice with same idempotency key
      for (let i = 0; i < 2; i++) {
        const event = await simulateWebhookEvent(
          'checkout.session.completed',
          session as Stripe.Checkout.Session
        );

        const payload = JSON.stringify(event);
        const signature = constructWebhookSignature(
          payload,
          process.env.STRIPE_WEBHOOK_SECRET!
        );

        await request(API_BASE_URL)
          .post('/api/stripe/webhook')
          .set('stripe-signature', signature)
          .send(payload);
      }

      // Credits should only be added once
      const balance = await getBalance(testUserId);
      expect(balance).toBe(50); // Not 100!
    });

    it('should reject invalid signature', async () => {
      const session: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        metadata: {
          userId: testUserId,
          creditAmount: '50',
          idempotencyKey: `test-key-${Date.now()}`,
        },
      };

      const event = await simulateWebhookEvent(
        'checkout.session.completed',
        session as Stripe.Checkout.Session
      );

      const payload = JSON.stringify(event);

      const response = await request(API_BASE_URL)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(payload);

      expect(response.status).toBe(400);

      // Credits should not be added
      const balance = await getBalance(testUserId);
      expect(balance).toBe(0);
    });
  });

  describe('invoice.paid', () => {
    it('should add recurring credits on invoice payment', async () => {
      // Test implementation for subscription renewal
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should mark subscription as cancelled', async () => {
      // Test implementation
    });
  });
});
```

---

## 9. Security Tests

### 9.1 SQL Injection Tests

**File:** `tests/security/sql-injection.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe('SQL Injection Prevention', () => {
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "' UNION SELECT * FROM credit_transactions--",
    "admin'--",
    "' OR 1=1--",
    "1' AND '1'='1",
  ];

  sqlInjectionPayloads.forEach((payload) => {
    it(`should sanitize SQL injection: ${payload}`, async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/credits/consume')
        .set('Authorization', 'Bearer test-key')
        .send({
          user_id: payload,
          amount: 10,
          reason: payload,
          idempotency_key: 'test',
        });

      // Should return validation error, not 500 (SQL error)
      expect(response.status).toBe(400);
      expect(response.body.error).not.toContain('SQL');
      expect(response.body.error).not.toContain('syntax error');
    });
  });

  it('should prevent SQL injection in search params', async () => {
    const response = await request(API_BASE_URL)
      .get("/api/public/tools?category=' OR '1'='1")
      .send();

    expect(response.status).not.toBe(500);
  });
});
```

### 9.2 XSS Tests

**File:** `tests/security/xss.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeUrl } from '@/lib/sanitization';
import { test as playwrightTest } from '@playwright/test';

describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<iframe src="javascript:alert()">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<body onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
  ];

  xssPayloads.forEach((payload) => {
    it(`should sanitize XSS payload: ${payload}`, () => {
      const sanitized = sanitizeHtml(payload);

      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('javascript:');
    });
  });

  it('should sanitize URLs', () => {
    expect(sanitizeUrl('javascript:alert()')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert()</script>')).toBe('');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });
});

// E2E XSS test
playwrightTest('should not execute XSS in tool description', async ({ page }) => {
  // This would be in e2e test file
  await page.goto('/');

  // Check that script tag in content is not executed
  const scriptExecuted = await page.evaluate(() => {
    return (window as any).xssExecuted === true;
  });

  expect(scriptExecuted).toBe(false);
});
```

### 9.3 Authentication Security Tests

**File:** `tests/security/auth-security.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

describe('Authentication Security', () => {
  describe('Session Security', () => {
    it('should have secure cookie flags', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      const cookies = response.headers['set-cookie'];

      if (cookies) {
        const sessionCookie = cookies.find((c: string) => c.includes('session'));
        expect(sessionCookie).toContain('HttpOnly');
        expect(sessionCookie).toContain('Secure');
        expect(sessionCookie).toMatch(/SameSite=(Lax|Strict)/);
      }
    });

    it('should invalidate session on logout', async () => {
      // Login
      const loginResponse = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: process.env.TEST_USER_EMAIL,
          password: process.env.TEST_USER_PASSWORD,
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Logout
      await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .send();

      // Try to access protected route with old session
      const response = await request(API_BASE_URL)
        .get('/api/user/profile')
        .set('Cookie', cookies)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];

      for (const password of weakPasswords) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password: password,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/password/i);
      }
    });
  });

  describe('API Key Security', () => {
    it('should not expose API keys in logs', async () => {
      // This test would check log output
      // Implementation depends on your logging system
    });

    it('should store API keys as hashes', async () => {
      const supabase = getTestSupabase();

      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('key_hash')
        .limit(5);

      apiKeys?.forEach((key) => {
        // Key should be bcrypt hash (starts with $2b$ or $2a$)
        expect(key.key_hash).toMatch(/^\$2[aby]\$\d+\$/);
        // Should NOT be plaintext
        expect(key.key_hash).not.toMatch(/^sk-tool-/);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit brute force login attempts', async () => {
      const promises = [];

      // Attempt 20 failed logins
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(API_BASE_URL)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrong-password',
            })
        );
      }

      const responses = await Promise.all(promises);

      // Some should be rate limited
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
```

---

## 10. Performance Tests

### 10.1 Load Testing Configuration

**File:** `tests/performance/load-test.js`

```javascript
// Using autocannon for load testing
const autocannon = require('autocannon');

const instance = autocannon({
  url: process.env.TEST_API_URL || 'http://localhost:3000',
  connections: 100,
  duration: 30, // 30 seconds
  pipelining: 1,
  requests: [
    {
      method: 'POST',
      path: '/api/v1/credits/consume',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${process.env.TEST_API_KEY}`,
      },
      body: JSON.stringify({
        user_id: process.env.TEST_USER_ID,
        amount: 1,
        reason: 'Load test',
        idempotency_key: `load-test-[<id>]`, // autocannon replaces [<id>]
      }),
    },
  ],
});

autocannon.track(instance, { renderProgressBar: true });

instance.on('done', (results) => {
  console.log('Load Test Results:');
  console.log(`  Requests: ${results.requests.total}`);
  console.log(`  Duration: ${results.duration}s`);
  console.log(`  Throughput: ${results.throughput.mean} req/s`);
  console.log(`  Latency:`);
  console.log(`    Mean: ${results.latency.mean}ms`);
  console.log(`    P50: ${results.latency.p50}ms`);
  console.log(`    P95: ${results.latency.p95}ms`);
  console.log(`    P99: ${results.latency.p99}ms`);
  console.log(`  Errors: ${results.errors}`);
  console.log(`  Timeouts: ${results.timeouts}`);

  // Assert performance requirements
  if (results.latency.p95 > 500) {
    console.error('FAIL: P95 latency exceeds 500ms');
    process.exit(1);
  }

  if (results.errors > 0) {
    console.error('FAIL: Errors occurred during load test');
    process.exit(1);
  }

  console.log('✓ Load test passed');
});
```

### 10.2 Lighthouse CI Configuration

**File:** `.lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/login",
        "http://localhost:3000/backoffice",
        "http://localhost:3000/subscribe",
        "http://localhost:3000/vendor-dashboard"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.8 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## 11. CI/CD Integration

### 11.1 GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Automated Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
  JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
  STRIPE_SECRET_KEY: ${{ secrets.TEST_STRIPE_SECRET_KEY }}
  STRIPE_WEBHOOK_SECRET: ${{ secrets.TEST_STRIPE_WEBHOOK_SECRET }}
  TEST_API_URL: http://localhost:3000

jobs:
  # Job 1: Linting and Type Checking
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npx tsc --noEmit

  # Job 2: Unit Tests
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          flags: unit

  # Job 3: Integration Tests
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start dev server
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:3000 --timeout 60000

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          flags: integration

  # Job 4: E2E Tests
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Start production server
        run: |
          npm run start &
          npx wait-on http://localhost:3000 --timeout 60000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-videos
          path: test-results/
          retention-days: 7

  # Job 5: Security Tests
  security-tests:
    name: Security Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Run security tests
        run: npm run test:security

  # Job 6: Performance Tests
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start production server
        run: |
          npm run start &
          npx wait-on http://localhost:3000 --timeout 60000

      - name: Run Lighthouse CI
        run: npx @lhci/cli@latest autorun

      - name: Run load tests
        run: npm run test:load

  # Job 7: Database Tests
  database-tests:
    name: Database Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database tests
        run: npm run test:database

  # Job 8: Test Summary
  test-summary:
    name: Test Summary
    runs-on: ubuntu-latest
    needs:
      - lint
      - unit-tests
      - integration-tests
      - e2e-tests
      - security-tests
      - database-tests
    if: always()
    steps:
      - name: Check test results
        run: |
          echo "All tests completed!"
          if [ "${{ needs.unit-tests.result }}" == "failure" ] || \
             [ "${{ needs.integration-tests.result }}" == "failure" ] || \
             [ "${{ needs.e2e-tests.result }}" == "failure" ] || \
             [ "${{ needs.security-tests.result }}" == "failure" ] || \
             [ "${{ needs.database-tests.result }}" == "failure" ]; then
            echo "❌ Some tests failed"
            exit 1
          fi
          echo "✅ All tests passed!"
```

---

## 12. Running All Tests

### 12.1 NPM Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:database": "vitest run tests/integration/database",
    "test:security": "vitest run tests/security",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:load": "node tests/performance/load-test.js",
    "test:lighthouse": "lhci autorun",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

### 12.2 Local Testing Commands

```bash
# Install all dependencies
npm install

# Run all tests in sequence
npm run test:all

# Run specific test suites
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests only
npm run test:e2e            # E2E tests only
npm run test:security       # Security tests only
npm run test:database       # Database tests only

# Run tests with UI (interactive)
npm run test:ui             # Vitest UI
npm run test:e2e:ui        # Playwright UI

# Run tests in watch mode (for development)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run performance tests
npm run test:load          # Load testing
npm run test:lighthouse    # Lighthouse performance audit

# Run all tests before deployment
npm run test:all && npm run test:security && npm run test:load
```

### 12.3 Pre-Commit Hook

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running pre-commit checks..."

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Run unit tests only (fast)
npm run test:unit

# If any fail, prevent commit
if [ $? -ne 0 ]; then
  echo "❌ Pre-commit checks failed. Please fix errors before committing."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
```

---

## 13. Test Coverage Requirements

### Minimum Coverage Thresholds

| Category | Coverage Requirement |
|----------|---------------------|
| Statements | 70% |
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |

### Critical Paths (100% Coverage Required)

These areas must have 100% test coverage:

1. **Credit System**
   - `src/lib/credits.ts`
   - `src/lib/credits-service.ts`
   - `src/app/api/v1/credits/consume/route.ts`

2. **Payment Processing**
   - `src/app/api/stripe/webhook/route.ts`
   - `src/lib/stripe-connect.ts`

3. **Authentication**
   - `src/lib/jwt.ts`
   - `src/lib/api-keys.ts`
   - `src/lib/api-key-security.ts`

4. **Security**
   - `src/lib/validation.ts`
   - `src/lib/sanitization.ts`
   - `src/lib/rate-limit.ts`

### Coverage Report

Generate coverage report:

```bash
npm run test:coverage

# View HTML report
open coverage/index.html
```

---

## 14. Test Execution Timeline

### Development (Continuous)
- **Pre-commit**: Unit tests + lint (~2 min)
- **On push**: Unit + integration tests (~5 min)
- **On PR**: All tests including E2E (~15 min)

### Pre-Production (Full Test Run)
```bash
# Day 1: Setup and Initial Tests
npm run test:unit              # 5 minutes
npm run test:integration       # 10 minutes
npm run test:database          # 5 minutes
npm run test:security          # 5 minutes

# Day 2: E2E and Performance
npm run test:e2e              # 30 minutes (all browsers)
npm run test:load             # 5 minutes
npm run test:lighthouse       # 10 minutes

# Total: ~70 minutes of automated testing
```

### Post-Deployment (Smoke Tests)
```bash
# Quick validation after deployment
npm run test:e2e -- --grep "@smoke"  # Tagged smoke tests (~5 min)
```

---

## Summary

This automated testing plan eliminates **all manual testing** by:

1. **Unit Tests** - Test individual functions automatically
2. **Integration Tests** - Test API endpoints and database operations
3. **E2E Tests** - Test complete user flows with Playwright
4. **Security Tests** - Automated vulnerability scanning
5. **Performance Tests** - Load testing and Lighthouse audits
6. **CI/CD** - All tests run automatically on push/PR

**Total Setup Time:** 2-3 days
**Test Execution Time:** ~70 minutes (fully automated)
**Maintenance:** Add tests as you add features

**Single Command to Run Everything:**
```bash
npm run test:all && npm run test:security && npm run test:load
```

All tests are automated, reproducible, and can run in CI/CD pipelines with zero human intervention!

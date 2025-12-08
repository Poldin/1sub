# Testing Guide - 1sub Platform

This guide will help you set up and run the automated test suite for the 1sub platform.

## Quick Start

### 1. Install Dependencies

```bash
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
  @types/supertest \
  autocannon \
  @lhci/cli \
  wait-on
```

### 2. Install Playwright Browsers

```bash
npx playwright install --with-deps
```

### 3. Set Up Environment Variables

Create a `.env.test` file:

```bash
# Test Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
JWT_SECRET=test_jwt_secret_min_32_characters
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_test_webhook_secret
TEST_API_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

### 4. Update package.json

Add these scripts to your `package.json`:

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

## Running Tests

### Run All Tests

```bash
npm run test:all
```

### Run Specific Test Suites

```bash
npm run test:unit          # Unit tests only
npm run test:integration   # API integration tests
npm run test:e2e          # End-to-end tests
npm run test:security     # Security tests
npm run test:database     # Database tests
```

### Run Tests with UI

```bash
npm run test:ui           # Vitest UI (interactive)
npm run test:e2e:ui      # Playwright UI
```

### Run Tests in Watch Mode

```bash
npm run test:watch        # Auto-rerun tests on file changes
```

### Generate Coverage Report

```bash
npm run test:coverage
open coverage/index.html  # View HTML report
```

### Run Performance Tests

```bash
npm run test:load         # Load testing
npm run test:lighthouse   # Lighthouse audit
```

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   └── lib/                 # Library function tests
│       └── validation.test.ts
├── integration/             # Integration tests
│   ├── api/                 # API tests
│   └── database/            # Database tests
├── e2e/                     # End-to-end tests
│   └── user/                # User flow tests
│       └── auth.e2e.test.ts
├── security/                # Security tests
├── performance/             # Performance tests
│   └── load-test.js
├── helpers/                 # Test utilities
│   ├── setup.ts
│   └── db-helpers.ts
└── fixtures/                # Test data
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-module';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Get Started');
  await expect(page).toHaveURL('/register');
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('API Endpoint', () => {
  it('should return data', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## CI/CD Integration

Tests automatically run in GitHub Actions on:
- Every push to `main` or `develop`
- Every pull request

See `.github/workflows/test.yml` for configuration.

## Debugging Tests

### Debug Unit Tests

```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/unit/lib/validation.test.ts
```

### Debug E2E Tests

```bash
# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with Playwright Inspector
npx playwright test --debug

# Run specific test
npx playwright test tests/e2e/user/auth.e2e.test.ts
```

## Troubleshooting

### Tests Failing Locally

1. **Check environment variables**: Ensure `.env.test` is set up correctly
2. **Database connection**: Verify Supabase test database is accessible
3. **Server running**: Some tests require the dev server to be running
4. **Port conflicts**: Make sure port 3000 is available

### E2E Tests Timeout

```bash
# Increase timeout in playwright.config.ts
timeout: 30000  // 30 seconds
```

### Coverage Thresholds

If coverage is below thresholds (70%), add more tests for:
- `src/lib/` functions
- `src/app/api/` routes
- Critical user flows

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Clean up**: Use `beforeEach` and `afterEach` to clean test data
3. **Mock external services**: Don't call real Stripe API in tests
4. **Use test data**: Create fixtures for consistent test data
5. **Descriptive names**: Test names should clearly describe what they test
6. **Fast tests**: Keep unit tests under 100ms, integration tests under 1s

## Getting Help

- See `AUTOMATED_TESTING_PLAN.md` for comprehensive documentation
- Check test examples in `tests/` directory
- Review Vitest docs: https://vitest.dev
- Review Playwright docs: https://playwright.dev

## Next Steps

1. ✅ Install dependencies
2. ✅ Set up environment variables
3. ✅ Run `npm run test:all` to verify setup
4. 📝 Write tests for your new features
5. 🚀 Deploy with confidence!

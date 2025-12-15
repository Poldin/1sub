# Automated Testing Suite

This directory contains all automated tests for the 1sub platform.

## Directory Structure

```
tests/
├── unit/                   # Unit tests (fast, isolated)
│   └── lib/               # Library function tests
├── integration/           # Integration tests (API, database)
│   ├── api/              # API endpoint tests
│   └── database/         # Database integrity tests
├── e2e/                  # End-to-end tests (full user flows)
│   └── user/             # User flow tests
├── security/             # Security vulnerability tests
├── performance/          # Load and performance tests
├── helpers/              # Test utilities and helpers
├── fixtures/             # Test data
└── mocks/                # Mock implementations
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Create `.env.test`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
JWT_SECRET=test_secret_min_32_characters
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
TEST_API_URL=http://localhost:3000
```

### 3. Run Tests

```bash
# Run all tests
npm run test:all

# Run specific suites
npm run test:unit
npm run test:e2e
npm run test:security
```

## Test Types

### Unit Tests (`tests/unit/`)
- Test individual functions in isolation
- Fast execution (< 100ms per test)
- Mock external dependencies
- **Run before every commit**

Example:
```typescript
import { describe, it, expect } from 'vitest';

describe('My Function', () => {
  it('should return correct value', () => {
    expect(myFunction('input')).toBe('output');
  });
});
```

### Integration Tests (`tests/integration/`)
- Test API endpoints
- Test database operations
- Test service integrations
- **Run before every push**

Example:
```typescript
import request from 'supertest';

describe('API Endpoint', () => {
  it('should return 200', async () => {
    await request('http://localhost:3000')
      .get('/api/endpoint')
      .expect(200);
  });
});
```

### E2E Tests (`tests/e2e/`)
- Test complete user journeys
- Run in real browsers
- Test UI interactions
- **Run before every deployment**

Example:
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Security Tests (`tests/security/`)
- Test for SQL injection
- Test for XSS vulnerabilities
- Test authentication/authorization
- **Run on every PR**

### Performance Tests (`tests/performance/`)
- Load testing
- Lighthouse audits
- API response time testing
- **Run before major releases**

## Writing Tests

### Best Practices

1. **Descriptive Names**: Use clear test names
   ```typescript
   it('should reject invalid email format') // ✅ Good
   it('test email') // ❌ Bad
   ```

2. **Arrange-Act-Assert**: Structure your tests
   ```typescript
   it('should add credits', async () => {
     // Arrange
     const userId = 'test-user-id';
     const amount = 50;

     // Act
     const result = await addCredits(userId, amount);

     // Assert
     expect(result.success).toBe(true);
     expect(result.newBalance).toBe(50);
   });
   ```

3. **Isolation**: Each test should be independent
   ```typescript
   beforeEach(async () => {
     await setupTestData();
   });

   afterEach(async () => {
     await cleanupTestData();
   });
   ```

4. **Mock External Services**: Don't call real APIs
   ```typescript
   vi.mock('stripe', () => ({
     checkout: {
       sessions: {
         create: vi.fn(() => ({ id: 'session_123' }))
       }
     }
   }));
   ```

## Test Coverage

### Current Coverage Requirements

| Metric | Threshold |
|--------|-----------|
| Statements | 70% |
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |

### Critical Paths (100% Coverage Required)

- `src/lib/credits.ts` - Credit system
- `src/lib/validation.ts` - Input validation
- `src/lib/sanitization.ts` - XSS prevention
- `src/app/api/stripe/webhook/route.ts` - Payment processing

### Check Coverage

```bash
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests run automatically in GitHub Actions:

- **On Push**: Unit + Integration tests
- **On PR**: All tests including E2E
- **On Deploy**: Full test suite + Performance tests

See `.github/workflows/test.yml` for configuration.

## Debugging

### Debug Unit Tests

```bash
# Watch mode
npm run test:watch

# Debug specific file
npx vitest run tests/unit/lib/validation.test.ts --reporter=verbose
```

### Debug E2E Tests

```bash
# Run with visible browser
npm run test:e2e:headed

# Open Playwright UI
npm run test:e2e:ui

# Debug mode with inspector
npx playwright test --debug
```

### Common Issues

**Tests timing out:**
```typescript
// Increase timeout for slow tests
it('slow test', async () => {
  // ... test code
}, { timeout: 30000 }); // 30 seconds
```

**Database connection errors:**
- Check `.env.test` has correct Supabase credentials
- Verify test database is accessible
- Ensure migrations are applied

**Port conflicts:**
- Make sure port 3000 is available
- Kill any running dev servers: `lsof -ti:3000 | xargs kill`

## Performance Benchmarks

### Target Response Times

| Test Type | Target |
|-----------|--------|
| Unit Test | < 100ms |
| Integration Test | < 1s |
| E2E Test | < 5s |
| API Endpoint (p95) | < 500ms |

### Load Testing

```bash
npm run test:load
```

Expected results:
- Throughput: > 100 req/s
- P95 Latency: < 500ms
- Error Rate: 0%

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts` or `*.e2e.test.ts`
3. Add descriptive test cases
4. Run tests locally: `npm run test`
5. Ensure coverage doesn't decrease

### Test Naming Convention

```
[what-being-tested].[test-type].ts

Examples:
- validation.test.ts (unit test)
- credit-purchase.e2e.test.ts (E2E test)
- stripe-webhook.integration.test.ts (integration test)
```

## Resources

- **Vitest Docs**: https://vitest.dev
- **Playwright Docs**: https://playwright.dev
- **Testing Library**: https://testing-library.com
- **Supertest**: https://github.com/ladjs/supertest

## Getting Help

- Check `TESTING_GUIDE.md` for detailed setup instructions
- Review example tests in each directory
- See `AUTOMATED_TESTING_PLAN.md` for comprehensive documentation

---

**Remember**: Good tests are your safety net. Write them! 🧪✅

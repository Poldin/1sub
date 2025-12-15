# Running Automated Tests - Quick Reference

This guide provides quick commands for running all automated tests in the 1sub platform.

## Prerequisites

Ensure you've completed the installation from `INSTALLATION_TESTING.md`:
- ✅ All dependencies installed
- ✅ Playwright browsers installed
- ✅ `.env.test` configured
- ✅ Test database set up
- ✅ Dev server can start

## Quick Start

### Run Everything
```bash
# Run ALL tests (unit, integration, e2e, security)
npm run test:all
```

### Run by Category

#### Unit Tests (Fast - Runs in < 1 min)
```bash
# Run all unit tests
npm run test:unit

# Run specific unit test file
npm run test:unit tests/unit/lib/validation.test.ts

# Watch mode (auto-rerun on changes)
npm run test:watch
```

#### Integration Tests (Medium - Runs in 2-5 min)
```bash
# Run all integration tests
npm run test:integration

# Run database integrity tests
npm run test:database

# Run specific API tests
vitest run tests/integration/api/credits.api.test.ts
```

#### E2E Tests (Slow - Runs in 5-15 min)
```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Run with Playwright UI (best for debugging)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/user/auth.e2e.test.ts

# Run specific test by name
npx playwright test --grep "should register new user"
```

#### Security Tests (Fast - Runs in < 1 min)
```bash
# Run security vulnerability tests
npm run test:security
```

#### Performance Tests (Medium - Runs in 2-3 min)
```bash
# Run load tests
npm run test:load

# Run Lighthouse performance audit
npm run test:lighthouse
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/index.html       # macOS
start coverage/index.html      # Windows
xdg-open coverage/index.html   # Linux
```

## Test Results

### Understanding Test Output

#### Vitest (Unit/Integration)
```bash
✓ tests/unit/lib/validation.test.ts (5 tests) 145ms
  ✓ UUID Validation (2 tests) 23ms
    ✓ should validate correct UUID
    ✓ should reject invalid UUID
  ✓ API Key Validation (3 tests) 45ms
    ✓ should validate correct API key format
    ✓ should reject invalid API key format
    ✓ should reject keys without prefix

Test Files  1 passed (1)
Tests  5 passed (5)
Duration  145ms
```

#### Playwright (E2E)
```bash
Running 12 tests using 4 workers

  ✓  1 [chromium] › user/auth.e2e.test.ts:10:1 › should register new user (5s)
  ✓  2 [firefox] › user/auth.e2e.test.ts:10:1 › should register new user (6s)
  ✓  3 [webkit] › user/auth.e2e.test.ts:10:1 › should register new user (5s)

  12 passed (1m)
```

## Test Files Created

### Unit Tests (`tests/unit/`)
- ✅ `lib/validation.test.ts` - Input validation functions
- ✅ `lib/sanitization.test.ts` - XSS prevention and sanitization
- ✅ `lib/rate-limit.test.ts` - Rate limiting functionality

### Integration Tests (`tests/integration/`)
- ✅ `api/credits.api.test.ts` - Credit management APIs
- ✅ `api/v1-api.test.ts` - Vendor tool integration APIs
- ✅ `api/stripe-webhook.test.ts` - Stripe webhook handling
- ✅ `api/checkout.api.test.ts` - Checkout flow APIs
- ✅ `database/integrity.test.ts` - Database constraints and triggers

### E2E Tests (`tests/e2e/`)
- ✅ `user/auth.e2e.test.ts` - User authentication flows
- ✅ `user/credit-purchase.e2e.test.ts` - Credit purchase flow
- ✅ `user/complete-user-journey.e2e.test.ts` - Full user experience
- ✅ `vendor/vendor-onboarding.e2e.test.ts` - Vendor application and management
- ✅ `admin/admin-dashboard.e2e.test.ts` - Admin functionality

### Security Tests (`tests/security/`)
- ✅ `sql-injection.test.ts` - SQL injection prevention
- ✅ `xss.test.ts` - XSS attack prevention

### Performance Tests (`tests/performance/`)
- ✅ `load-test.js` - Load testing with autocannon

## Common Test Scenarios

### Before Committing Code
```bash
# Run unit tests (fast feedback)
npm run test:unit
```

### Before Pushing to Remote
```bash
# Run unit + integration tests
npm run test:unit && npm run test:integration
```

### Before Creating Pull Request
```bash
# Run full test suite
npm run test:all

# Generate coverage report
npm run test:coverage
```

### Before Production Deployment
```bash
# Run everything including performance tests
npm run test:all
npm run test:load
npm run test:lighthouse

# Verify no vulnerabilities
npm audit
```

## Debugging Failed Tests

### Debug Unit/Integration Tests

#### 1. Run with verbose output
```bash
vitest run tests/unit/lib/validation.test.ts --reporter=verbose
```

#### 2. Run single test in watch mode
```bash
vitest watch tests/unit/lib/validation.test.ts
```

#### 3. Add console.log debugging
```typescript
it('should validate UUID', () => {
  console.log('Testing UUID:', testUuid);
  expect(isValidUUID(testUuid)).toBe(true);
});
```

### Debug E2E Tests

#### 1. Run with visible browser
```bash
npm run test:e2e:headed
```

#### 2. Use Playwright UI (interactive)
```bash
npm run test:e2e:ui
```

#### 3. Debug specific test with inspector
```bash
npx playwright test --debug tests/e2e/user/auth.e2e.test.ts
```

#### 4. Check screenshots/videos of failures
```bash
# Screenshots and videos are saved to:
ls test-results/
```

#### 5. Use trace viewer for failed tests
```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### Common Issues and Solutions

#### Issue: "Cannot find module"
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Port 3000 already in use"
```bash
# Solution: Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

#### Issue: "Supabase connection timeout"
```bash
# Solution: Check environment variables
cat .env.test | grep SUPABASE

# Verify Supabase is accessible
curl https://your-project.supabase.co/rest/v1/
```

#### Issue: "Playwright browser not found"
```bash
# Solution: Reinstall Playwright browsers
npx playwright install --with-deps
```

#### Issue: Tests timing out
```bash
# Solution: Increase timeout
vitest run --test-timeout=30000

# Or in test file
it('slow test', async () => {
  // ...
}, { timeout: 30000 })
```

## Test Coverage Requirements

### Current Thresholds
| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 70% | 80% |
| Branches | 70% | 80% |
| Functions | 70% | 80% |
| Lines | 70% | 80% |

### Critical Paths (100% Required)
- `src/lib/credits.ts` - Credit operations
- `src/lib/validation.ts` - Input validation
- `src/lib/sanitization.ts` - Security sanitization
- `src/app/api/stripe/webhook/route.ts` - Payment webhooks

## CI/CD Integration

Tests run automatically in GitHub Actions:

### On Every Push
- ✅ Linting
- ✅ Unit tests
- ✅ Integration tests

### On Pull Requests
- ✅ All of the above, plus:
- ✅ E2E tests (all browsers)
- ✅ Security tests
- ✅ Coverage reports

### On Production Deploy
- ✅ Full test suite
- ✅ Performance tests
- ✅ Security audit

## Performance Benchmarks

### Expected Test Execution Times
| Test Suite | Expected Duration |
|------------|-------------------|
| Unit Tests | < 1 minute |
| Integration Tests | 2-5 minutes |
| E2E Tests (single browser) | 3-8 minutes |
| E2E Tests (all browsers) | 10-15 minutes |
| Security Tests | < 1 minute |
| Load Tests | 2-3 minutes |
| **Full Suite** | **15-25 minutes** |

### API Response Time Targets
| Endpoint Type | P95 Latency |
|--------------|-------------|
| GET (read) | < 200ms |
| POST (write) | < 500ms |
| Webhook | < 1000ms |

### Load Testing Targets
- **Throughput**: > 100 requests/second
- **P95 Latency**: < 500ms
- **Error Rate**: 0%

## Test Data Management

### Creating Test Data
```bash
# Tests automatically create and cleanup test data
# Use helpers from tests/helpers/db-helpers.ts

const { userId, email } = await createTestUser();
// ... run tests ...
await cleanupTestUser(userId);
```

### Test Database
```bash
# Run migrations on test database
supabase db push --db-url postgresql://test-db-url

# Reset test database (if needed)
supabase db reset --db-url postgresql://test-db-url
```

## Best Practices

### 1. Run Tests Locally Before Pushing
```bash
npm run test:unit  # Quick feedback
```

### 2. Use Watch Mode During Development
```bash
npm run test:watch
```

### 3. Run Full Suite Before PR
```bash
npm run test:all
npm run test:coverage
```

### 4. Keep Tests Fast
- Mock external services
- Use test database
- Minimize E2E tests (most expensive)
- Prefer unit tests (fastest)

### 5. Write Descriptive Test Names
```typescript
// ✅ Good
it('should reject invalid email format')

// ❌ Bad
it('test email')
```

### 6. Clean Up After Tests
```typescript
afterEach(async () => {
  await cleanupTestData();
});
```

### 7. Use Parallelization
```bash
# Vitest runs tests in parallel by default
# Playwright can be configured for parallel execution
```

## Continuous Improvement

### Adding New Tests
1. Identify untested functionality
2. Create test file in appropriate directory
3. Follow existing test patterns
4. Run tests locally
5. Ensure coverage doesn't decrease
6. Commit with descriptive message

### Maintaining Tests
- Update tests when features change
- Remove tests for deprecated features
- Refactor duplicate test code
- Keep test data fresh
- Monitor test execution time

## Getting Help

### Documentation
- **Full Testing Plan**: `AUTOMATED_TESTING_PLAN.md`
- **Installation Guide**: `INSTALLATION_TESTING.md`
- **User Guide**: `TESTING_GUIDE.md`
- **Test Directory**: `tests/README.md`

### External Resources
- [Vitest Docs](https://vitest.dev)
- [Playwright Docs](https://playwright.dev)
- [Testing Library](https://testing-library.com)

### Troubleshooting
1. Check test logs for error messages
2. Review this guide for common issues
3. Check GitHub Actions logs (if CI fails)
4. Review test configuration files

## Summary

### Quick Command Reference
```bash
npm run test:all           # Run everything
npm run test:unit          # Fast unit tests
npm run test:integration   # API and database tests
npm run test:e2e           # Full user flows
npm run test:e2e:ui        # Debug E2E with UI
npm run test:security      # Security vulnerability tests
npm run test:coverage      # Generate coverage report
npm run test:watch         # Development mode
```

### Test Checklist
- [ ] All tests passing locally
- [ ] Coverage meets thresholds (70%+)
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] E2E tests pass in all browsers
- [ ] CI/CD pipeline passing

---

**You're all set!** 🎉 The automated testing suite is ready to ensure your platform is production-ready.

For detailed information, see `AUTOMATED_TESTING_PLAN.md`.

# Testing Guide

This guide explains how to run and write tests for the 1sub MVP application.

## Test Structure

The test suite is organized into several categories:

```
tests/
├── api/                    # API endpoint tests
│   ├── credits.test.ts
│   ├── tools-integration.test.ts
│   ├── admin-features.test.ts
│   ├── error-handling.test.ts
│   └── idempotency.test.ts
├── components/             # UI component tests
│   ├── admin/              # Admin UI components
│   ├── backoffice/         # Backoffice components
│   └── ui/                 # Reusable UI components
├── db/                     # Database tests
│   ├── rpc-functions.test.ts
│   ├── triggers.test.ts
│   └── rls-policies.test.ts
├── e2e/                    # End-to-end tests
│   ├── user-flow.spec.ts
│   ├── admin-flow.spec.ts
│   └── edge-cases.spec.ts
├── integration/            # Integration tests
│   ├── concurrent-operations.test.ts
│   ├── tool-lifecycle.test.ts
│   └── admin-operations.test.ts
├── security/               # Security tests
│   ├── auth.test.ts
│   ├── authorization.test.ts
│   ├── jwt.test.ts
│   └── api-protection.test.ts
└── setup.ts               # Test setup configuration
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test tests/api/credits.test.ts

# Run tests matching pattern
npm run test -- --run credits
```

### End-to-End Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npm run test:e2e:install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific E2E test
npm run test:e2e tests/e2e/user-flow.spec.ts
```

### Database Tests

```bash
# Run database tests
npm run test tests/db/

# Run specific database test
npm run test tests/db/rpc-functions.test.ts
```

### Security Tests

```bash
# Run security tests
npm run test tests/security/

# Run specific security test
npm run test tests/security/auth.test.ts
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions and components in isolation.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { consumeCredits } from '@/lib/credits';

describe('consumeCredits', () => {
  it('should consume credits atomically', async () => {
    // Test implementation
    const result = await consumeCredits(userId, amount, toolId, idempotencyKey);
    expect(result.status).toBe('success');
  });
});
```

### Component Tests

Component tests should test React components with user interactions.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button Component', () => {
  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests

Integration tests should test multiple components working together.

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('Tool Lifecycle Integration', () => {
  let testUserId: string;
  let testToolId: string;

  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it('should handle complete tool lifecycle', async () => {
    // Test complete workflow
  });
});
```

### E2E Tests

E2E tests should test complete user workflows.

```typescript
import { test, expect } from '@playwright/test';

test('user registration and login flow', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/backoffice');
});
```

## Test Data Management

### Database Setup

Tests that require database access should:

1. Create test data in `beforeEach`
2. Clean up test data in `afterEach`
3. Use unique identifiers to avoid conflicts
4. Use the `supabaseAdmin` client for setup/cleanup

```typescript
beforeEach(async () => {
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true,
  });
  
  testUserId = authUser.user!.id;
});

afterEach(async () => {
  if (testUserId) {
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
  }
});
```

### Mocking

Use Vitest's mocking capabilities for external dependencies:

```typescript
import { vi } from 'vitest';

// Mock external API calls
vi.mock('@/lib/external-api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
}));

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'test-db-url',
  },
}));
```

## Test Configuration

### Vitest Configuration

The Vitest configuration is in `vitest.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Playwright Configuration

The Playwright configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

## Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain what is being tested
3. **Follow the AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent** - each test should be able to run in isolation

### Test Data

1. **Use unique identifiers** to avoid test conflicts
2. **Clean up after tests** to prevent data pollution
3. **Use realistic test data** that matches production scenarios
4. **Avoid hardcoded values** when possible

### Assertions

1. **Use specific assertions** rather than generic ones
2. **Test both positive and negative cases**
3. **Verify side effects** (database changes, API calls, etc.)
4. **Use meaningful error messages**

### Performance

1. **Run tests in parallel** when possible
2. **Mock expensive operations** (API calls, database queries)
3. **Use test databases** for integration tests
4. **Clean up resources** to prevent memory leaks

## Debugging Tests

### Unit Tests

```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Run specific test with debugging
npm run test -- --run "should consume credits atomically"
```

### E2E Tests

```bash
# Run tests in headed mode
npm run test:e2e -- --headed

# Run tests with debugging
npm run test:e2e -- --debug

# Run tests with trace
npm run test:e2e -- --trace on
```

### Database Tests

```bash
# Run database tests with logging
npm run test tests/db/ -- --reporter=verbose
```

## CI/CD Integration

Tests are automatically run in CI/CD pipelines:

- **Pull Requests**: All tests must pass before merging
- **Main Branch**: Full test suite runs on every push
- **Releases**: Additional smoke tests run before production deployment

### Coverage Requirements

- **Unit Tests**: Minimum 80% code coverage
- **Integration Tests**: All critical user flows covered
- **E2E Tests**: All major user journeys covered

### Test Reports

Test results and coverage reports are available in:
- GitHub Actions workflow runs
- Codecov integration
- Playwright HTML reports

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values for slow operations
2. **Database Conflicts**: Ensure unique test data identifiers
3. **Mock Issues**: Verify mock implementations match real APIs
4. **Environment Variables**: Check test environment configuration

### Getting Help

1. Check existing test files for examples
2. Review test configuration files
3. Check CI/CD logs for specific error messages
4. Consult the testing documentation for specific frameworks

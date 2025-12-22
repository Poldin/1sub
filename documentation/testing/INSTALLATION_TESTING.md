# Automated Testing Installation Guide

Complete step-by-step guide to install and run the automated testing suite.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git
- Access to test Supabase database
- Stripe test account

## Step 1: Install Testing Dependencies

Run this single command to install all testing dependencies:

```bash
npm install --save-dev \
  vitest@^1.0.0 \
  @vitest/ui@^1.0.0 \
  @vitest/coverage-v8@^1.0.0 \
  @vitejs/plugin-react@^4.2.0 \
  happy-dom@^12.10.3 \
  @testing-library/react@^14.1.2 \
  @testing-library/jest-dom@^6.1.5 \
  @testing-library/user-event@^14.5.1 \
  @playwright/test@^1.40.0 \
  playwright@^1.40.0 \
  supertest@^6.3.3 \
  @types/supertest@^6.0.2 \
  autocannon@^7.12.0 \
  @lhci/cli@^0.13.0 \
  wait-on@^7.2.0
```

## Step 2: Install Playwright Browsers

Playwright needs browser binaries to run E2E tests:

```bash
npx playwright install --with-deps
```

This installs Chromium, Firefox, and WebKit browsers.

## Step 3: Update package.json Scripts

Add these test scripts to your `package.json`:

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

## Step 4: Create Test Environment File

Create `.env.test` in your project root:

```bash
# Copy from .env.local and modify for testing
cp .env.local .env.test
```

Edit `.env.test` with test-specific values:

```bash
# Supabase Test Database
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key

# JWT Secret (use different secret for testing)
JWT_SECRET=test_jwt_secret_must_be_at_least_32_characters_long

# Stripe Test Keys (NOT live keys!)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_test_webhook_secret

# Test API URL
TEST_API_URL=http://localhost:3000

# Test User Credentials (will be created in test DB)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_VENDOR_EMAIL=vendor@example.com
TEST_VENDOR_PASSWORD=VendorPassword123!
```

## Step 5: Set Up Test Database

### Option A: Create Separate Test Project (Recommended)

1. Go to https://supabase.com/dashboard
2. Create a new project: "1sub-test"
3. Copy the connection details to `.env.test`
4. Run migrations:

```bash
# Link to test project
supabase link --project-ref your-test-project-ref

# Apply migrations
supabase db push
```

### Option B: Use Same Database with Test Data

⚠️ **Warning**: Only use for development, not shared environments

```bash
# Use same credentials as .env.local
# Tests will clean up after themselves
```

## Step 6: Verify Installation

Run a quick verification:

```bash
# 1. Check Vitest works
npx vitest --version

# 2. Check Playwright works
npx playwright --version

# 3. Run a simple test
npm run test:unit -- tests/unit/lib/validation.test.ts

# 4. Check E2E setup
npx playwright test --list
```

## Step 7: Run Your First Test

```bash
# Start dev server in one terminal
npm run dev

# In another terminal, run tests
npm run test:unit
```

You should see output like:

```
✓ tests/unit/lib/validation.test.ts (5 tests) 145ms
  ✓ UUID Validation (2 tests) 23ms
    ✓ should validate correct UUID
    ✓ should reject invalid UUID
  ✓ API Key Validation (3 tests) 45ms
    ✓ should validate correct API key format
    ✓ should reject invalid API key format

Test Files  1 passed (1)
Tests  5 passed (5)
```

## Step 8: Set Up CI/CD (Optional)

### GitHub Actions Setup

The workflow file is already created at `.github/workflows/test.yml`.

Add these secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:

```
TEST_SUPABASE_URL=https://your-test-project.supabase.co
TEST_SUPABASE_ANON_KEY=your_anon_key
TEST_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TEST_JWT_SECRET=your_test_jwt_secret
TEST_STRIPE_SECRET_KEY=sk_test_your_key
TEST_STRIPE_WEBHOOK_SECRET=whsec_test_secret
```

Tests will now run automatically on every push and PR!

## Verification Checklist

Before proceeding to production testing, verify:

- [ ] All dependencies installed (`npm list vitest playwright`)
- [ ] Playwright browsers installed (`npx playwright --version`)
- [ ] Test environment file created (`.env.test` exists)
- [ ] Test database accessible (run `npm run test:database`)
- [ ] Dev server can start (`npm run dev`)
- [ ] Unit tests pass (`npm run test:unit`)
- [ ] E2E tests can run (`npm run test:e2e -- --headed`)
- [ ] Coverage reports generate (`npm run test:coverage`)
- [ ] CI/CD secrets configured (if using GitHub Actions)

## Common Installation Issues

### Issue: "Cannot find module vitest"

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Playwright browsers not found"

**Solution:**
```bash
npx playwright install --with-deps
```

### Issue: "ECONNREFUSED on port 3000"

**Solution:**
```bash
# Make sure dev server is running
npm run dev

# Or change TEST_API_URL in .env.test
```

### Issue: "Supabase connection timeout"

**Solution:**
- Check internet connection
- Verify Supabase URL and keys in `.env.test`
- Check if Supabase project is paused (restart it)

### Issue: "Tests fail with 'fetch is not defined'"

**Solution:**
```bash
# Update Node.js to 18+
node --version  # Should be v18.0.0 or higher
```

## Next Steps

1. ✅ Installation complete
2. 📖 Read `TESTING_GUIDE.md` for usage instructions
3. 📝 Read `AUTOMATED_TESTING_PLAN.md` for comprehensive documentation
4. 🧪 Write your first test
5. 🚀 Run `npm run test:all` before deploying

## Getting Help

- **Installation Issues**: Check this guide
- **Writing Tests**: See `tests/README.md`
- **Usage**: See `TESTING_GUIDE.md`
- **Detailed Documentation**: See `AUTOMATED_TESTING_PLAN.md`

---

**Congratulations!** Your automated testing suite is ready to use! 🎉

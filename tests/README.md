# API Integration Tests

Comprehensive integration tests for the 1sub API endpoints, focusing on vendor product and tool management.

## Test Coverage

### Vendor Products API (`tests/integration/api/vendor-products.api.test.ts`)
- ✅ Product creation (POST /api/vendor/products)
  - Valid vendor authentication
  - Custom pricing products
  - Unauthorized access prevention
  - Missing required fields validation
  - Non-existent tool handling
  - Regular user rejection
- ✅ Product updates (PATCH /api/vendor/products/[id])
  - Full and partial updates
  - Pricing model updates
  - Authorization checks
  - Ownership verification
- ✅ Product deletion (DELETE /api/vendor/products/[id])
  - Successful deletion with verification
  - Authorization checks
  - Ownership verification

### Vendor Tools API (`tests/integration/api/vendor-tools.api.test.ts`)
- ✅ Tool updates (PATCH /api/vendor/tools/[id]/update)
  - Basic information updates
  - Metadata updates (emoji, tags, discounts)
  - Partial updates
  - Image updates
  - Authorization and ownership checks
- ✅ Tool deletion (DELETE /api/vendor/tools/[id])
  - Successful deletion
  - Cascade deletion verification
  - Authorization and ownership checks

## Prerequisites

### 1. Environment Variables

Create a `.env.test` file in the project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Configuration
TEST_API_URL=http://localhost:3000
```

**⚠️ Important:**
- Use a **test/staging database**, NOT your production database
- The service role key has full database access and bypasses RLS
- Never commit these credentials to version control

### 2. Test Database Setup

The tests use the service role key to:
- Create test users and vendors
- Set up test tools and products
- Clean up after tests complete

Make sure your test database has:
- All necessary tables created (tools, tool_products, user_profiles, etc.)
- RLS policies configured
- Proper foreign key constraints with CASCADE

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Run only integration tests
npm run test:integration

# Run only vendor-related integration tests
npm run test:integration:vendor

# Run unit tests
npm run test:unit

# Run security tests
npm run test:security

# Run E2E tests
npm run test:e2e
```

### Run Specific Test Files
```bash
# Run vendor products tests
npx vitest run tests/integration/api/vendor-products.api.test.ts

# Run vendor tools tests
npx vitest run tests/integration/api/vendor-tools.api.test.ts
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## Test Structure

```
tests/
├── integration/
│   ├── api/
│   │   ├── vendor-products.api.test.ts  # Product CRUD tests
│   │   ├── vendor-tools.api.test.ts     # Tool update/delete tests
│   │   ├── checkout.api.test.ts
│   │   └── ...
│   ├── database/
│   └── vendor/
├── helpers/
│   ├── db-helpers.ts                    # Database helper functions
│   └── vendor-integration-helpers.ts
├── unit/
├── security/
└── e2e/
```

## Helper Functions

The test helpers (`tests/helpers/db-helpers.ts`) provide utilities for:

### User Management
- `createTestUser()` - Create a test user
- `createTestVendor()` - Create a test vendor
- `cleanupTestUser(userId)` - Delete test user and related data

### Tool Management
- `createTestTool(vendorId, name?)` - Create a test tool
- `createTestProduct(toolId, productData?)` - Create a test product

### Database Access
- `getTestSupabase()` - Get service role Supabase client
- `getBalance(userId)` - Get user credit balance
- `addTestCredits(userId, amount)` - Add credits to user

## Writing New Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestVendor,
  createTestTool,
  cleanupTestUser,
  getTestSupabase,
} from '../../helpers/db-helpers';

describe('My API Endpoint', () => {
  let testVendorId: string;
  let testVendorAuth: { access_token: string };

  beforeAll(async () => {
    const vendor = await createTestVendor();
    testVendorId = vendor.id;

    const supabase = getTestSupabase();
    const { data } = await supabase.auth.signInWithPassword({
      email: vendor.email!,
      password: 'TestPassword123!',
    });
    testVendorAuth = data.session!;
  });

  afterAll(async () => {
    await cleanupTestUser(testVendorId);
  });

  it('should do something', async () => {
    const response = await fetch(`${process.env.TEST_API_URL}/api/my-endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testVendorAuth.access_token}`,
      },
      body: JSON.stringify({ /* data */ }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on others
2. **Cleanup**: Always clean up test data in `afterAll` hooks
3. **Authentication**: Test both authenticated and unauthenticated scenarios
4. **Authorization**: Test ownership verification (vendor can only access their own resources)
5. **Edge Cases**: Test invalid inputs, missing fields, non-existent resources
6. **Cascades**: Verify cascade deletes work correctly
7. **Idempotency**: Tests should be repeatable and produce consistent results

## Common Test Scenarios

### Testing Authorization
```typescript
it('should reject access by different vendor', async () => {
  const otherVendor = await createTestVendor();
  const { data } = await supabase.auth.signInWithPassword({
    email: otherVendor.email!,
    password: 'TestPassword123!',
  });

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${data.session!.access_token}` }
  });

  expect(response.status).toBe(403);
});
```

### Testing Validation
```typescript
it('should reject request with missing required fields', async () => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* incomplete data */ }),
  });

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toContain('required');
});
```

### Testing Cascade Deletes
```typescript
it('should cascade delete related records', async () => {
  // Create parent resource
  const parent = await createParentResource();

  // Create child resource
  const child = await createChildResource(parent.id);

  // Delete parent
  await deleteParent(parent.id);

  // Verify child was deleted
  const supabase = getTestSupabase();
  const { data } = await supabase
    .from('children')
    .select('*')
    .eq('id', child.id)
    .maybeSingle();

  expect(data).toBeNull();
});
```

## Debugging Failed Tests

### Enable Verbose Logging
```bash
# Set log level
export VITEST_LOG_LEVEL=verbose
npm test
```

### Run Single Test
```bash
npx vitest run tests/integration/api/vendor-products.api.test.ts -t "should create a product"
```

### Check Database State
Use the Supabase dashboard or SQL editor to inspect test data:
```sql
SELECT * FROM tools WHERE name LIKE 'Test%';
SELECT * FROM tool_products WHERE name LIKE 'Test%';
```

### Common Issues

1. **"Missing Supabase environment variables"**
   - Solution: Create `.env.test` file with required variables

2. **"Unauthorized" errors in tests**
   - Solution: Check if user/vendor was created successfully
   - Verify auth token is being passed correctly

3. **"Foreign key violation" errors**
   - Solution: Ensure parent resources are created before children
   - Check cleanup order in `afterAll` hooks

4. **Tests hanging or timing out**
   - Solution: Ensure all async operations use `await`
   - Check for missing cleanup in `afterAll` hooks

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}
    TEST_API_URL: http://localhost:3000
  run: |
    npm run dev &
    sleep 5
    npm run test:integration
```

## Contributing

When adding new API endpoints:
1. Create tests for all CRUD operations
2. Test authorization and authentication
3. Test edge cases and error scenarios
4. Update this README with new test coverage
5. Ensure tests pass before submitting PR

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

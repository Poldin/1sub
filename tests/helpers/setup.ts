/**
 * Global Test Setup
 *
 * This file runs before all tests.
 * Use it to configure global test settings, mocks, and utilities.
 */

import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables for testing
// Try .env.test first, then .env.local, then .env
dotenv.config({ path: resolve(process.cwd(), '.env.test') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config();

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
process.env.TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000';

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error('\n❌ Missing required environment variables for tests:');
  missingEnvVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Create a .env.test or .env.local file with these variables.');
  console.error('   You can find Supabase values at:');
  console.error('   https://supabase.com/dashboard/project/_/settings/api\n');
}

// Mock fetch if not available (for Node.js environments)
if (typeof global.fetch === 'undefined') {
  global.fetch = async () => new Response();
}

// Global setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

// Global teardown
afterAll(() => {
  console.log('✅ Test suite completed');
});

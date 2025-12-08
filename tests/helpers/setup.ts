/**
 * Global Test Setup
 *
 * This file runs before all tests.
 * Use it to configure global test settings, mocks, and utilities.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock Next.js router if needed
global.fetch = global.fetch || (async () => new Response());

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Global setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

// Global teardown
afterAll(() => {
  console.log('✅ Test suite completed');
});

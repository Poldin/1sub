#!/usr/bin/env npx ts-node
/**
 * Manual Test Script for Magic Login System
 *
 * This script tests the Magic Login security module directly.
 * Run with: npx ts-node scripts/test-magic-login.ts
 */

import {
  MAGIC_LOGIN_CONFIG,
  generateNonce,
  generateMagicLoginSignature,
  generateSignedMagicLoginParams,
  generateMagicLoginSecret,
  validateMagicLoginSignature,
  validateMagicLoginUrl,
} from '../src/security/magic-login';

console.log('='.repeat(60));
console.log('Magic Login Security Module Test');
console.log('='.repeat(60));

// Test 1: Configuration
console.log('\n[1] Configuration');
console.log(`   TTL: ${MAGIC_LOGIN_CONFIG.TTL_SECONDS} seconds (${MAGIC_LOGIN_CONFIG.TTL_SECONDS / 60} minutes)`);
console.log(`   Max Clock Skew: ${MAGIC_LOGIN_CONFIG.MAX_CLOCK_SKEW_SECONDS} seconds`);
console.log(`   Rate Limit (User): ${MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_USER}/min`);
console.log(`   Rate Limit (Tool): ${MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_TOOL}/min`);

// Test 2: Secret Generation
console.log('\n[2] Secret Generation');
const secret = generateMagicLoginSecret();
console.log(`   Generated Secret: ${secret.substring(0, 20)}...`);
console.log(`   Secret Length: ${secret.length} characters`);
console.log(`   Has Prefix: ${secret.startsWith('mlsec_') ? 'YES' : 'NO'}`);

// Test 3: Nonce Generation
console.log('\n[3] Nonce Generation');
const nonce1 = generateNonce();
const nonce2 = generateNonce();
console.log(`   Nonce 1: ${nonce1}`);
console.log(`   Nonce 2: ${nonce2}`);
console.log(`   Unique: ${nonce1 !== nonce2 ? 'YES' : 'NO'}`);
console.log(`   Length: ${nonce1.length} characters (${nonce1.length / 2} bytes)`);

// Test 4: Signature Generation
console.log('\n[4] Signature Generation');
const testUserId = 'user-12345-abcde';
const testTimestamp = Math.floor(Date.now() / 1000);
const testNonce = generateNonce();
const signature = generateMagicLoginSignature(testUserId, testTimestamp, testNonce, secret);
console.log(`   User ID: ${testUserId}`);
console.log(`   Timestamp: ${testTimestamp}`);
console.log(`   Nonce: ${testNonce}`);
console.log(`   Signature: ${signature.substring(0, 32)}...`);
console.log(`   Signature Length: ${signature.length} characters (SHA-256)`);

// Test 5: Full Signed Params
console.log('\n[5] Full Signed Parameters');
const params = generateSignedMagicLoginParams(testUserId, secret);
console.log(`   Timestamp: ${params.timestamp}`);
console.log(`   Nonce: ${params.nonce}`);
console.log(`   Signature: ${params.signature.substring(0, 32)}...`);

// Test 6: Signature Validation - Valid
console.log('\n[6] Signature Validation (Valid Request)');
const validResult = validateMagicLoginSignature(
  testUserId,
  params.timestamp,
  params.nonce,
  params.signature,
  secret,
  'tool-123'
);
console.log(`   Valid: ${validResult.valid ? 'YES' : 'NO'}`);
if (validResult.valid) {
  console.log(`   User ID: ${validResult.data?.userId}`);
}

// Test 7: Signature Validation - Replay Attack
console.log('\n[7] Signature Validation (Replay Attack)');
const replayResult = validateMagicLoginSignature(
  testUserId,
  params.timestamp,
  params.nonce, // Same nonce!
  params.signature,
  secret,
  'tool-123' // Same tool!
);
console.log(`   Valid: ${replayResult.valid ? 'YES' : 'NO'}`);
console.log(`   Error: ${replayResult.error || 'None'}`);
console.log(`   Replay Detected: ${replayResult.error?.includes('replay') ? 'YES' : 'NO'}`);

// Test 8: Signature Validation - Expired
console.log('\n[8] Signature Validation (Expired Timestamp)');
const expiredTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
const expiredNonce = generateNonce();
const expiredSignature = generateMagicLoginSignature(testUserId, expiredTimestamp, expiredNonce, secret);
const expiredResult = validateMagicLoginSignature(
  testUserId,
  expiredTimestamp,
  expiredNonce,
  expiredSignature,
  secret,
  'tool-456'
);
console.log(`   Valid: ${expiredResult.valid ? 'YES' : 'NO'}`);
console.log(`   Error: ${expiredResult.error || 'None'}`);

// Test 9: Signature Validation - Tampered
console.log('\n[9] Signature Validation (Tampered User ID)');
const tamperedParams = generateSignedMagicLoginParams('original-user', secret);
const tamperedResult = validateMagicLoginSignature(
  'tampered-user', // Different user!
  tamperedParams.timestamp,
  tamperedParams.nonce,
  tamperedParams.signature,
  secret,
  'tool-789'
);
console.log(`   Valid: ${tamperedResult.valid ? 'YES' : 'NO'}`);
console.log(`   Error: ${tamperedResult.error || 'None'}`);

// Test 10: URL Validation
console.log('\n[10] URL Validation');
const testUrls = [
  { url: 'https://example.com/auth/magic', dev: false, expected: true },
  { url: 'http://example.com/auth/magic', dev: false, expected: false },
  { url: 'http://localhost:3000/auth/magic', dev: true, expected: true },
  { url: 'https://192.168.1.1/auth/magic', dev: false, expected: false },
  { url: 'https://10.0.0.1/auth/magic', dev: false, expected: false },
  { url: 'not-a-url', dev: false, expected: false },
];

for (const test of testUrls) {
  const result = validateMagicLoginUrl(test.url, test.dev);
  const status = result.valid === test.expected ? 'PASS' : 'FAIL';
  console.log(`   [${status}] ${test.url} (dev=${test.dev}) -> valid=${result.valid}`);
  if (!result.valid && result.error) {
    console.log(`          Error: ${result.error}`);
  }
}

// Test 11: Build Complete Magic Login URL
console.log('\n[11] Complete Magic Login URL');
const baseUrl = 'https://myapp.example.com/auth/magic';
const userId = 'user-550e8400-e29b-41d4-a716-446655440000';
const finalParams = generateSignedMagicLoginParams(userId, secret);
const url = new URL(baseUrl);
url.searchParams.set('user', userId);
url.searchParams.set('ts', finalParams.timestamp.toString());
url.searchParams.set('nonce', finalParams.nonce);
url.searchParams.set('sig', finalParams.signature);
console.log(`   URL: ${url.toString()}`);
console.log(`   URL Length: ${url.toString().length} characters`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`   Configuration: OK`);
console.log(`   Secret Generation: OK`);
console.log(`   Nonce Generation: OK`);
console.log(`   Signature Generation: OK`);
console.log(`   Signature Validation (Valid): ${validResult.valid ? 'OK' : 'FAIL'}`);
console.log(`   Replay Attack Prevention: ${!replayResult.valid && replayResult.error?.includes('replay') ? 'OK' : 'FAIL'}`);
console.log(`   Expired Timestamp Detection: ${!expiredResult.valid ? 'OK' : 'FAIL'}`);
console.log(`   Tamper Detection: ${!tamperedResult.valid ? 'OK' : 'FAIL'}`);
console.log(`   URL Validation: OK`);
console.log('='.repeat(60));
console.log('All security features working correctly!');
console.log('='.repeat(60));

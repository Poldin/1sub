/**
 * P0 Fixes Verification Script
 *
 * Quick verification that P0 security fixes are in place
 * This checks the code without requiring full test infrastructure
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('P0 SECURITY FIXES - VERIFICATION SCRIPT');
console.log('='.repeat(60));
console.log('');

let allPassed = true;
const results = [];

// ============================================================================
// CHECK 1: Bug #3 Fix - Manual Cancellation Revocation
// ============================================================================
console.log('🔍 CHECK 1: Verifying Bug #3 fix (Manual Cancellation)...');

const cancelRoutePath = path.join(__dirname, '../src/app/api/subscriptions/cancel/route.ts');
if (!fs.existsSync(cancelRoutePath)) {
  results.push({ check: 'Bug #3', status: '❌ FAIL', reason: 'File not found' });
  allPassed = false;
} else {
  const cancelRouteContent = fs.readFileSync(cancelRoutePath, 'utf-8');

  // Check 1a: Import exists
  const hasImport = cancelRouteContent.includes("import { revokeAccess }") ||
                    cancelRouteContent.includes("import {revokeAccess}");

  // Check 1b: Function call exists
  const hasCall = cancelRouteContent.includes('await revokeAccess(') ||
                  cancelRouteContent.includes('revokeAccess(');

  // Check 1c: Called with subscription_cancelled reason
  const hasReason = cancelRouteContent.includes("'subscription_cancelled'") ||
                    cancelRouteContent.includes('"subscription_cancelled"');

  if (hasImport && hasCall && hasReason) {
    results.push({ check: 'Bug #3', status: '✅ PASS', reason: 'revokeAccess() call found' });
    console.log('  ✅ Import found');
    console.log('  ✅ revokeAccess() call found');
    console.log('  ✅ Correct reason parameter');
  } else {
    results.push({
      check: 'Bug #3',
      status: '❌ FAIL',
      reason: `Missing: ${!hasImport ? 'import' : ''} ${!hasCall ? 'call' : ''} ${!hasReason ? 'reason' : ''}`
    });
    allPassed = false;
    if (!hasImport) console.log('  ❌ Missing import statement');
    if (!hasCall) console.log('  ❌ Missing revokeAccess() call');
    if (!hasReason) console.log('  ❌ Missing subscription_cancelled reason');
  }
}
console.log('');

// ============================================================================
// CHECK 2: Bug #1 Fix - Code Exchange Race Condition
// ============================================================================
console.log('🔍 CHECK 2: Verifying Bug #1 fix (Code Exchange Race)...');

const migrationPath = path.join(__dirname, '../supabase/migrations/20251227000001_fix_p0_security_bugs.sql');
const oldMigrationPath = path.join(__dirname, '../supabase/migrations/20251221000001_create_vendor_auth_tables.sql');

let codeExchangeFixed = false;

if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

  // Check for atomic UPDATE...RETURNING pattern
  const hasAtomicUpdate = migrationContent.includes('UPDATE authorization_codes') &&
                          migrationContent.includes('RETURNING * INTO');

  // Check for GET DIAGNOSTICS pattern
  const hasRowCountCheck = migrationContent.includes('GET DIAGNOSTICS') &&
                          migrationContent.includes('ROW_COUNT');

  if (hasAtomicUpdate && hasRowCountCheck) {
    results.push({ check: 'Bug #1', status: '✅ PASS', reason: 'Atomic UPDATE pattern found in migration' });
    console.log('  ✅ New migration file exists');
    console.log('  ✅ Atomic UPDATE...RETURNING pattern found');
    console.log('  ✅ ROW_COUNT check found');
    codeExchangeFixed = true;
  }
} else if (fs.existsSync(oldMigrationPath)) {
  const oldMigrationContent = fs.readFileSync(oldMigrationPath, 'utf-8');

  const hasAtomicUpdate = oldMigrationContent.includes('UPDATE authorization_codes') &&
                          oldMigrationContent.includes('RETURNING * INTO') &&
                          oldMigrationContent.includes('WHERE code = p_code') &&
                          oldMigrationContent.includes('AND is_exchanged = FALSE');

  const hasRowCountCheck = oldMigrationContent.includes('GET DIAGNOSTICS') &&
                          oldMigrationContent.includes('ROW_COUNT');

  if (hasAtomicUpdate && hasRowCountCheck) {
    results.push({ check: 'Bug #1', status: '✅ PASS', reason: 'Fix found in updated migration' });
    console.log('  ✅ Atomic UPDATE pattern found');
    console.log('  ✅ ROW_COUNT check found');
    codeExchangeFixed = true;
  }
}

if (!codeExchangeFixed) {
  results.push({ check: 'Bug #1', status: '❌ FAIL', reason: 'Migration not found or incomplete' });
  allPassed = false;
  console.log('  ❌ Fix not found in migration files');
}
console.log('');

// ============================================================================
// CHECK 3: Bug #2 Fix - Token Rotation Subscription Check
// ============================================================================
console.log('🔍 CHECK 3: Verifying Bug #2 fix (Token Rotation)...');

let tokenRotationFixed = false;

if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

  // Check for subscription active check
  const hasSubscriptionCheck = migrationContent.includes('tool_subscriptions') &&
                               migrationContent.includes("status IN ('active', 'trialing')");

  // Check for revocation check
  const hasRevocationCheck = migrationContent.includes('FROM revocations') &&
                            migrationContent.includes('user_id') &&
                            migrationContent.includes('tool_id');

  // Check for SUBSCRIPTION_INACTIVE error
  const hasSubInactiveError = migrationContent.includes('SUBSCRIPTION_INACTIVE');

  if (hasSubscriptionCheck && hasRevocationCheck && hasSubInactiveError) {
    results.push({ check: 'Bug #2', status: '✅ PASS', reason: 'Subscription checks found in rotate_token' });
    console.log('  ✅ Subscription active check found');
    console.log('  ✅ Revocation check found');
    console.log('  ✅ SUBSCRIPTION_INACTIVE error found');
    tokenRotationFixed = true;
  }
}

const optimizedMigrationPath = path.join(__dirname, '../supabase/migrations/20251221000002_optimize_verification_functions.sql');
if (!tokenRotationFixed && fs.existsSync(optimizedMigrationPath)) {
  const optimizedContent = fs.readFileSync(optimizedMigrationPath, 'utf-8');

  const hasSubscriptionCheck = optimizedContent.includes('tool_subscriptions') &&
                               optimizedContent.includes("status IN ('active', 'trialing')");

  const hasRevocationCheck = optimizedContent.includes('FROM revocations');

  if (hasSubscriptionCheck && hasRevocationCheck) {
    results.push({ check: 'Bug #2', status: '✅ PASS', reason: 'Fix found in updated migration' });
    console.log('  ✅ Subscription check found');
    console.log('  ✅ Revocation check found');
    tokenRotationFixed = true;
  }
}

if (!tokenRotationFixed) {
  results.push({ check: 'Bug #2', status: '❌ FAIL', reason: 'Migration not found or incomplete' });
  allPassed = false;
  console.log('  ❌ Fix not found in migration files');
}
console.log('');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log('');

results.forEach(result => {
  console.log(`${result.status} ${result.check}: ${result.reason}`);
});

console.log('');
console.log('='.repeat(60));

if (allPassed) {
  console.log('✅ ALL P0 FIXES VERIFIED IN CODE');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Apply database migration: npx supabase migration up');
  console.log('  2. Run automated tests: npm test -- tests/security/');
  console.log('  3. Deploy to staging');
  console.log('  4. Deploy to production');
  process.exit(0);
} else {
  console.log('❌ SOME P0 FIXES NOT FOUND');
  console.log('');
  console.log('Please review the failures above and ensure:');
  console.log('  - All code changes are saved');
  console.log('  - Migration files are in correct location');
  console.log('  - No merge conflicts or reverts');
  process.exit(1);
}

#!/bin/bash

# P0 Security Fixes Test Runner
# Tests all three critical security bug fixes

set -e

echo "=============================================="
echo "P0 SECURITY FIXES - TEST SUITE"
echo "=============================================="
echo ""
echo "Testing fixes for:"
echo "  - Bug #1: Code exchange race condition"
echo "  - Bug #2: Token rotation subscription check"
echo "  - Bug #3: Manual cancellation revocation"
echo ""
echo "=============================================="
echo ""

# Check if database migration has been applied
echo "📋 Step 1: Checking database migration..."
if npx supabase db diff 20251227000001_fix_p0_security_bugs > /dev/null 2>&1; then
    echo "✅ Migration already applied"
else
    echo "⚠️  Migration not yet applied. Applying now..."
    npx supabase migration up
    echo "✅ Migration applied successfully"
fi
echo ""

# Run Bug #1 tests
echo "🧪 Step 2: Testing Bug #1 Fix (Code Exchange Race Condition)..."
echo "----------------------------------------"
npm test -- tests/security/p0-bug1-code-exchange-race.test.ts
echo ""

# Run Bug #2 tests
echo "🧪 Step 3: Testing Bug #2 Fix (Token Rotation Subscription Check)..."
echo "----------------------------------------"
npm test -- tests/security/p0-bug2-token-rotation-subscription.test.ts
echo ""

# Run Bug #3 tests
echo "🧪 Step 4: Testing Bug #3 Fix (Manual Cancellation Revocation)..."
echo "----------------------------------------"
npm test -- tests/security/p0-bug3-manual-cancellation-revocation.test.ts
echo ""

# Summary
echo "=============================================="
echo "✅ ALL P0 SECURITY TESTS COMPLETED"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Review test results above"
echo "  2. Deploy to staging environment"
echo "  3. Run full integration test suite"
echo "  4. Deploy to production"
echo ""
echo "⚠️  IMPORTANT: These are critical security fixes."
echo "    Do not skip deployment steps."
echo ""

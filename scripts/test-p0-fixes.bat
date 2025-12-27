@echo off
REM P0 Security Fixes Test Runner (Windows)
REM Tests all three critical security bug fixes

echo ==============================================
echo P0 SECURITY FIXES - TEST SUITE
echo ==============================================
echo.
echo Testing fixes for:
echo   - Bug #1: Code exchange race condition
echo   - Bug #2: Token rotation subscription check
echo   - Bug #3: Manual cancellation revocation
echo.
echo ==============================================
echo.

REM Run Bug #1 tests
echo Testing Bug #1 Fix (Code Exchange Race Condition)...
echo ----------------------------------------
call npm test -- tests/security/p0-bug1-code-exchange-race.test.ts
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Bug #1 tests FAILED
    exit /b 1
)
echo ✅ Bug #1 tests PASSED
echo.

REM Run Bug #2 tests
echo Testing Bug #2 Fix (Token Rotation Subscription Check)...
echo ----------------------------------------
call npm test -- tests/security/p0-bug2-token-rotation-subscription.test.ts
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Bug #2 tests FAILED
    exit /b 1
)
echo ✅ Bug #2 tests PASSED
echo.

REM Run Bug #3 tests
echo Testing Bug #3 Fix (Manual Cancellation Revocation)...
echo ----------------------------------------
call npm test -- tests/security/p0-bug3-manual-cancellation-revocation.test.ts
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Bug #3 tests FAILED
    exit /b 1
)
echo ✅ Bug #3 tests PASSED
echo.

REM Summary
echo ==============================================
echo ✅ ALL P0 SECURITY TESTS COMPLETED SUCCESSFULLY
echo ==============================================
echo.
echo Next steps:
echo   1. Review test results above
echo   2. Apply database migration: npx supabase migration up
echo   3. Deploy to staging environment
echo   4. Run full integration test suite
echo   5. Deploy to production
echo.
echo ⚠️  IMPORTANT: These are critical security fixes.
echo     Do not skip deployment steps.
echo.

pause

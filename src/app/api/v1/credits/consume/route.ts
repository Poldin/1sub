/**
 * API Endpoint: /api/v1/credits/consume
 * 
 * Consumes credits for a user using an API key for authentication.
 * This endpoint is called by external tools to consume credits.
 * 
 * Features:
 * - Rate limiting (100 requests per minute per API key)
 * - Input validation (UUID, amounts, etc.)
 * - Security audit logging
 * - Authentication failure tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findToolByApiKey, updateApiKeyLastUsed } from '@/lib/api-keys';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { safeValidate, creditConsumeRequestSchema } from '@/lib/validation';
import { 
  logApiKeyAuth, 
  logCreditConsumption, 
  logRateLimitExceeded, 
  logValidationError,
  logInsufficientCredits 
} from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logApiKeyAuth({
        success: false,
        reason: 'Missing Authorization header',
        ip: clientIp
      });

      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'API key is required in Authorization header (Bearer token)',
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Rate limiting per API key
    const rateLimitResult = checkRateLimit(
      `credits-consume:${apiKey.substring(0, 20)}`, // Use prefix to avoid storing full key
      RATE_LIMITS.CREDITS_CONSUME
    );

    if (!rateLimitResult.success) {
      logRateLimitExceeded({
        endpoint: '/api/v1/credits/consume',
        identifier: apiKey.substring(0, 20),
        limit: RATE_LIMITS.CREDITS_CONSUME.limit,
        ip: clientIp
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.CREDITS_CONSUME.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Find tool by API key
    // FIX: Now returns tool data directly, avoiding duplicate database query
    const toolData = await findToolByApiKey(apiKey);
    if (!toolData) {
      // Track authentication failures for security monitoring
      const failureRateLimit = checkRateLimit(
        `auth-failures:${clientIp}`,
        RATE_LIMITS.AUTH_FAILURES
      );

      logApiKeyAuth({
        success: false,
        apiKey: apiKey,
        reason: 'Invalid API key',
        ip: clientIp
      });

      if (!failureRateLimit.success) {
        // Too many auth failures - potential attack
        logRateLimitExceeded({
          endpoint: '/api/v1/credits/consume',
          identifier: clientIp,
          limit: RATE_LIMITS.AUTH_FAILURES.limit,
          ip: clientIp
        });
      }

      return NextResponse.json(
        {
          error: 'Invalid API key',
          message: 'The provided API key is invalid or does not exist',
        },
        { status: 401 }
      );
    }

    // Log successful authentication
    logApiKeyAuth({
      success: true,
      apiKey: apiKey,
      toolId: toolData.toolId,
      toolName: toolData.toolName,
      ip: clientIp
    });

    const supabase = await createClient();
    const toolId = toolData.toolId;
    const metadata = toolData.metadata;

    // Verify tool is active (already checked in findToolByApiKey, but double-check)
    if (!toolData.isActive) {
      return NextResponse.json(
        {
          error: 'Tool inactive',
          message: 'The tool associated with this API key is not active',
        },
        { status: 403 }
      );
    }

    // Verify API key is active in metadata (already checked in findToolByApiKey)
    if ((metadata.api_key_active as boolean | undefined) === false) {
      return NextResponse.json(
        {
          error: 'API key inactive',
          message: 'The API key has been deactivated',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = safeValidate(creditConsumeRequestSchema, body);
    if (!validation.success) {
      logValidationError({
        endpoint: '/api/v1/credits/consume',
        error: validation.error,
        input: { ...body, user_id: body.user_id ? '***' : undefined }, // Mask sensitive data
        ip: clientIp
      });

      return NextResponse.json(
        {
          error: 'Invalid request',
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const { user_id, amount, reason, idempotency_key } = validation.data;

    // Check for duplicate idempotency key
    const { data: existingTransaction, error: checkError } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', user_id)
      .eq('metadata->>idempotency_key', idempotency_key)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected for new transactions
      console.error('Error checking idempotency:', checkError);
    }

    if (existingTransaction) {
      return NextResponse.json(
        {
          error: 'Duplicate request',
          message: 'This request has already been processed (duplicate idempotency_key)',
        },
        { status: 409 }
      );
    }

    // Get user's current balance
    // OPTIMIZATION: Use balance_after from latest transaction instead of calculating from all
    const { data: latestBalance, error: balanceError } = await supabase
      .from('credit_transactions')
      .select('balance_after')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let currentBalance = 0;
    
    if (balanceError) {
      // If no transactions found (code PGRST116), balance is 0
      if (balanceError.code === 'PGRST116') {
        currentBalance = 0;
      } else {
        // Other errors should fail the request
        console.error('Error fetching balance:', balanceError);
        return NextResponse.json(
          {
            error: 'Internal server error',
            message: 'Failed to fetch user balance',
          },
          { status: 500 }
        );
      }
    } else {
      currentBalance = latestBalance?.balance_after ?? 0;
    }

    // Check if user has sufficient credits
    if (currentBalance < amount) {
      logInsufficientCredits({
        userId: user_id,
        toolId: toolId,
        required: amount,
        available: currentBalance,
        ip: clientIp
      });

      return NextResponse.json(
        {
          error: 'Insufficient credits',
          message: 'User does not have sufficient credits',
          current_balance: currentBalance,
          required: amount,
          shortfall: amount - currentBalance,
        },
        { status: 400 }
      );
    }

    // Consume credits using RPC function
    const { error: consumeError } = await supabase.rpc(
      'consume_credits',
      {
        p_user_id: user_id,
        p_amount: amount,
        p_reason: reason,
        p_idempotency_key: idempotency_key,
      }
    );

    if (consumeError) {
      console.error('Error consuming credits:', consumeError);
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Failed to consume credits',
        },
        { status: 500 }
      );
    }

    // Get new balance after deduction
    const { data: newTransactions } = await supabase
      .from('credit_transactions')
      .select('balance_after')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const newBalance =
      newTransactions?.balance_after ?? currentBalance - amount;

    // Get transaction ID from the consume_credits result or latest transaction
    const { data: latestTransaction } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', user_id)
      .eq('metadata->>idempotency_key', idempotency_key)
      .single();

    const transactionId = latestTransaction?.id || null;

    // Update API key last used timestamp
    try {
      await updateApiKeyLastUsed(toolId);
    } catch (error) {
      // Don't fail the request if this fails, just log it
      console.error('Error updating API key last used:', error);
    }

    // Log successful credit consumption
    logCreditConsumption({
      userId: user_id,
      toolId: toolId,
      toolName: toolData.toolName,
      amount: amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      reason: reason,
      transactionId: transactionId || undefined,
      ip: clientIp
    });

    // Return success response
    return NextResponse.json({
      success: true,
      new_balance: newBalance,
      transaction_id: transactionId,
    });
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Handle other errors
    console.error('Error in /api/v1/credits/consume:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}


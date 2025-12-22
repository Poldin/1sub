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
 * - Idempotency support via idempotency_key
 * - Uses improved consume_credits RPC with atomic operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database/client';
import {
  findToolByApiKey,
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  safeValidate,
  creditConsumeRequestSchema,
  logApiKeyAuth,
  logCreditConsumption,
  logRateLimitExceeded,
  logValidationError,
  logInsufficientCredits,
} from '@/security';
import { sendCreditsConsumed } from '@/domains/webhooks';

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
    const toolData = await findToolByApiKey(apiKey);
    if (!toolData.success) {
      // Track authentication failures for security monitoring
      const failureRateLimit = checkRateLimit(
        `auth-failures:${clientIp}`,
        RATE_LIMITS.AUTH_FAILURES
      );

      logApiKeyAuth({
        success: false,
        apiKey: apiKey.substring(0, 8) + '...',
        reason: toolData.error || 'Invalid API key',
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

    const toolId = toolData.toolId!;
    const toolName = toolData.toolName || 'Unknown';
    const metadata = toolData.metadata || {};

    // Log successful authentication
    logApiKeyAuth({
      success: true,
      apiKey: apiKey.substring(0, 8) + '...',
      toolId,
      toolName,
      ip: clientIp
    });

    const supabase = await createServerClient();

    // Verify tool is active
    if (!toolData.isActive) {
      return NextResponse.json(
        {
          error: 'Tool inactive',
          message: 'The tool associated with this API key is not active',
        },
        { status: 403 }
      );
    }

    // Verify API key is active in metadata
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

    // Consume credits using improved RPC function with atomic operations
    // The RPC now handles:
    // - Idempotency checking
    // - Row-level locking on user_balances table to prevent race conditions
    // - Balance validation
    // - Atomic balance updates via user_balances table
    const { data: result, error: consumeError } = await supabase.rpc(
      'consume_credits',
      {
        p_user_id: user_id,
        p_amount: amount,
        p_reason: reason,
        p_idempotency_key: idempotency_key,
        p_tool_id: toolId,
        p_metadata: {
          tool_name: toolName,
          api_consumption: true,
        }
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

    // Handle RPC response
    const rpcResult = result as {
      success: boolean;
      transaction_id?: string;
      balance_before: number;
      balance_after: number;
      is_duplicate?: boolean;
      error?: string;
      required?: number;
    };

    if (!rpcResult.success) {
      // Handle specific errors from RPC
      if (rpcResult.error === 'Insufficient credits') {
        logInsufficientCredits({
          userId: user_id,
          toolId: toolId,
          required: amount,
          available: rpcResult.balance_before,
          ip: clientIp
        });

        return NextResponse.json(
          {
            error: 'Insufficient credits',
            message: 'User does not have sufficient credits',
            current_balance: rpcResult.balance_before,
            required: amount,
            shortfall: amount - rpcResult.balance_before,
          },
          { status: 400 }
        );
      }

      // Other errors
      return NextResponse.json(
        {
          error: 'Failed to consume credits',
          message: rpcResult.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Handle duplicate request (idempotency)
    if (rpcResult.is_duplicate) {
      return NextResponse.json({
        success: true,
        new_balance: rpcResult.balance_after,
        transaction_id: rpcResult.transaction_id,
        is_duplicate: true,
        message: 'This request has already been processed',
      });
    }

    // Send credits.consumed webhook (async, don't await)
    sendCreditsConsumed({
      toolId,
      userId: user_id,
      amount,
      balanceRemaining: rpcResult.balance_after,
      transactionId: rpcResult.transaction_id || '',
    }).catch(err => {
      console.error('[Webhook] Failed to send credits consumed webhook:', err);
    });

    // Log successful credit consumption
    logCreditConsumption({
      userId: user_id,
      toolId: toolId,
      toolName: toolName,
      amount: amount,
      balanceBefore: rpcResult.balance_before,
      balanceAfter: rpcResult.balance_after,
      reason: reason,
      transactionId: rpcResult.transaction_id,
      ip: clientIp
    });

    // Return success response
    return NextResponse.json({
      success: true,
      new_balance: rpcResult.balance_after,
      transaction_id: rpcResult.transaction_id,
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

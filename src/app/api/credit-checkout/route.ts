/**
 * Legacy Credit Checkout API
 *
 * ⚠️ DEPRECATED: This endpoint is deprecated and will be removed in a future version.
 *
 * SECURITY ISSUES ADDRESSED:
 * - Added authentication (was accepting userId from request body)
 * - Added revocation checking
 * - Standardized error codes
 *
 * MIGRATION PATH:
 * Use the OAuth-like vendor integration flow instead:
 * 1. POST /api/v1/authorize/initiate - Generate authorization code
 * 2. POST /api/v1/authorize/exchange - Exchange code for verification token
 * 3. POST /api/v1/verify - Verify access periodically
 * 4. POST /api/v1/credits/consume - Consume credits with proper verification
 *
 * WHY THIS IS DEPRECATED:
 * - Returns JWT tokens (self-verifiable authority that bypasses verification)
 * - Doesn't fit the single-path enforcement model
 * - Cannot enforce revocation in real-time (tokens cached by vendors)
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { withApiAuth } from '@/lib/auth/api-middleware';
import { checkRevocation } from '@/domains/auth/service';
import { createServiceClient } from '@/infrastructure/database/client';

export async function POST(request: NextRequest) {
  // DEPRECATION WARNING: Log usage for migration tracking
  console.warn('[DEPRECATION] Legacy /api/credit-checkout endpoint called', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    sunsetDate: '2026-06-01',
    migration: 'Use /api/v1/authorize flow instead',
    guideUrl: 'https://docs.1sub.io/migrations/credit-checkout-to-v1',
  });

  // Wrap with authentication middleware
  return withApiAuth(request, async (req, authenticatedUser) => {
      try {
        const { userId, toolId } = await req.json();

      const supabase = createServiceClient();

      // Validate required parameters
      if (!userId || !toolId) {
        return NextResponse.json(
          { error: 'Missing userId or toolId' },
          { status: 400 }
        );
      }

      // SECURITY: Verify that authenticated user matches the userId in request
      if (authenticatedUser.id !== userId) {
        console.warn('[SECURITY] User attempted to checkout for different user', {
          authenticatedUser: authenticatedUser.id,
          requestedUser: userId,
        });
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You can only checkout for your own account'
          },
          { status: 403 }
        );
      }

      // CRITICAL: Check if access has been revoked
      const revocationCheck = await checkRevocation(userId, toolId);
      if (revocationCheck.revoked) {
        console.info('[Auth] Access revoked, blocking credit checkout', {
          userId,
          toolId,
          reason: revocationCheck.reason,
          revokedAt: revocationCheck.revokedAt,
        });
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Your access to this tool has been revoked',
            reason: revocationCheck.reason,
            revokedAt: revocationCheck.revokedAt,
          },
          { status: 403 }
        );
      }

    // Fetch tool details
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('*')
      .eq('id', toolId)
      .eq('is_active', true)
      .single();

      if (toolError || !tool) {
        return NextResponse.json(
          { error: 'Tool not found or inactive' },
          { status: 404 }
        );
      }

      // Determine credit cost from tool
      const creditCost = tool.credit_cost_per_use || 0;

      if (creditCost <= 0) {
        return NextResponse.json(
          { error: 'Tool does not have a valid credit cost configured' },
          { status: 400 }
        );
      }

    // Generate idempotency key for this request
    const idempotencyKey = `legacy-checkout-${toolId}-${userId}-${Date.now()}`;

    // Consume credits using improved RPC function with atomic operations
    // The RPC now handles:
    // - Row-level locking on user_balances table to prevent race conditions
    // - Balance validation
    // - Atomic balance updates via user_balances table
    // - Idempotency checking
    const { data: consumeResult, error: consumeError } = await supabase
      .rpc('consume_credits', {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: `Tool usage: ${tool.name}`,
        p_idempotency_key: idempotencyKey,
        p_tool_id: toolId,
        p_metadata: {
          tool_name: tool.name,
          legacy_checkout: true,
          timestamp: new Date().toISOString()
        }
      });

      if (consumeError) {
        console.error('Error consuming credits:', consumeError);
        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        );
      }

      // Handle RPC response
      const rpcResult = consumeResult as {
        success: boolean;
        transaction_id?: string;
        balance_before: number;
        balance_after: number;
        is_duplicate?: boolean;
        error?: string;
      };

      if (!rpcResult.success) {
        // Handle specific errors from RPC
        if (rpcResult.error === 'Insufficient credits') {
          return NextResponse.json(
            {
              error: 'Payment required',
              message: 'Insufficient credits',
              currentBalance: rpcResult.balance_before,
              requiredCredits: creditCost,
              shortfall: creditCost - rpcResult.balance_before
            },
            { status: 402 } // 402 Payment Required (standardized)
          );
        }

        // Other errors
        return NextResponse.json(
          { error: rpcResult.error || 'Failed to deduct credits' },
          { status: 500 }
        );
      }

    // Create usage log (optional - for analytics and debugging)
    const { error: usageLogError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        tool_id: toolId,
        credits_consumed: creditCost,
        status: 'completed',
        metadata: {
          tool_name: tool.name,
          checkout_timestamp: new Date().toISOString(),
          transaction_id: rpcResult.transaction_id,
          balance_before: rpcResult.balance_before,
          balance_after: rpcResult.balance_after
        }
      });

    if (usageLogError) {
      console.error('Error creating usage log:', usageLogError);
      // Don't fail the request, just log the error
    }

    // Generate short-lived access token (1 hour)
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const accessToken = jwt.sign(
      { 
        userId, 
        toolId, 
        type: 'tool_access',
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256' }
    );

      // Add deprecation headers
      const response = NextResponse.json({
        success: true,
        newBalance: rpcResult.balance_after,
        toolUrl: tool.url,
        accessToken,
        transactionId: rpcResult.transaction_id,
        tool: {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          creditCost
        },
        // Deprecation notice
        _deprecation: {
          deprecated: true,
          message: 'This endpoint is deprecated. Please migrate to the OAuth-like vendor integration flow.',
          migrationGuide: 'https://docs.1sub.io/api/vendor-integration',
          sunset: '2026-06-01', // 6 months from now
          alternatives: {
            authorize: '/api/v1/authorize/initiate',
            exchange: '/api/v1/authorize/exchange',
            verify: '/api/v1/verify',
            credits: '/api/v1/credits/consume'
          }
        }
      });

      // Add deprecation headers for automated detection
      response.headers.set('Deprecation', 'true');
      response.headers.set('Sunset', 'Sat, 01 Jun 2026 00:00:00 GMT');
      response.headers.set('Link', '<https://docs.1sub.io/api/vendor-integration>; rel="alternate"');

      return response;

    } catch (error) {
      console.error('Credit checkout error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

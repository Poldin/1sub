/**
 * API Endpoint: /api/v1/verify-user
 * 
 * Verifies a JWT token and returns user information for external tool access.
 * This endpoint is called by external tools to verify user authentication.
 * 
 * Features:
 * - Rate limiting (60 requests per minute per IP)
 * - Input validation
 * - Security audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToolAccessToken } from '@/lib/jwt';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { safeValidate, tokenVerifyRequestSchema } from '@/lib/validation';
import { logTokenVerification, logRateLimitExceeded, logValidationError } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(
      `verify-user:${clientIp}`,
      RATE_LIMITS.VERIFY_USER
    );

    if (!rateLimitResult.success) {
      logRateLimitExceeded({
        endpoint: '/api/v1/verify-user',
        identifier: clientIp,
        limit: RATE_LIMITS.VERIFY_USER.limit,
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
            'X-RateLimit-Limit': RATE_LIMITS.VERIFY_USER.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = safeValidate(tokenVerifyRequestSchema, body);
    if (!validation.success) {
      logValidationError({
        endpoint: '/api/v1/verify-user',
        error: validation.error,
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

    const { token } = validation.data;

    // Verify the token
    try {
      const decoded = verifyToolAccessToken(token);

      // FIX: Removed redundant expiry check - jwt.verify() already handles this
      // The verifyToolAccessToken function will throw TokenExpiredError if expired

      // Log successful verification
      logTokenVerification({
        success: true,
        userId: decoded.userId,
        toolId: decoded.toolId,
        checkoutId: decoded.checkoutId,
        ip: clientIp
      });

      // Return user information
      return NextResponse.json({
        valid: true,
        user_id: decoded.userId,
        tool_id: decoded.toolId,
        checkout_id: decoded.checkoutId,
        expires_at: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
      });
    } catch (error) {
      // Log failed verification
      logTokenVerification({
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        ip: clientIp
      });

      // Handle verification errors
      if (error instanceof Error) {
        if (error.message === 'Token has expired') {
          return NextResponse.json(
            {
              error: 'Token expired',
              message: 'The provided token has expired',
            },
            { status: 401 }
          );
        }
        if (error.message === 'Invalid token') {
          return NextResponse.json(
            {
              error: 'Invalid token',
              message: 'The provided token is invalid',
            },
            { status: 401 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Token verification failed',
          message: 'Failed to verify the provided token',
        },
        { status: 401 }
      );
    }
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
    console.error('Error in /api/v1/verify-user:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}


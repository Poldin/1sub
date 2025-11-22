/**
 * API Endpoint: /api/v1/refresh-token
 * 
 * Refreshes an expired access token using a valid refresh token.
 * This allows users to continue using tools without re-authenticating.
 * 
 * Features:
 * - Rate limiting (30 requests per minute per IP)
 * - Input validation
 * - Security audit logging
 * - Token validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, verifyRefreshToken } from '@/lib/token-refresh';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { safeValidate } from '@/lib/validation';
import { logTokenRefresh, logRateLimitExceeded, logValidationError } from '@/lib/audit-log';
import { z } from 'zod';

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // Rate limiting for token refresh
    const rateLimitResult = checkRateLimit(
      `token-refresh:${clientIp}`,
      {
        limit: 30,
        windowMs: 60 * 1000, // 1 minute
      }
    );

    if (!rateLimitResult.success) {
      logRateLimitExceeded({
        endpoint: '/api/v1/refresh-token',
        identifier: clientIp,
        limit: 30,
        ip: clientIp,
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many refresh requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = safeValidate(refreshTokenSchema, body);

    if (!validation.success) {
      logValidationError({
        endpoint: '/api/v1/refresh-token',
        error: validation.error,
        input: { refresh_token: '***' }, // Mask token in logs
        ip: clientIp,
      });

      return NextResponse.json(
        {
          error: 'Invalid request',
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const { refresh_token } = validation.data;

    // Verify and decode refresh token
    try {
      const decoded = verifyRefreshToken(refresh_token);

      // Generate new access token
      const result = await refreshAccessToken(refresh_token);

      // Log successful token refresh
      logTokenRefresh({
        success: true,
        userId: decoded.userId,
        toolId: decoded.toolId,
        checkoutId: decoded.checkoutId,
        ip: clientIp,
      });

      return NextResponse.json({
        success: true,
        access_token: result.accessToken,
        expires_at: result.expiresAt,
        token_type: 'Bearer',
      });
    } catch (error) {
      // Log failed refresh
      logTokenRefresh({
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        ip: clientIp,
      });

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Refresh token has expired') {
          return NextResponse.json(
            {
              error: 'Refresh token expired',
              message: 'Your session has expired. Please re-authenticate.',
            },
            { status: 401 }
          );
        }
        if (error.message === 'Invalid refresh token' || error.message === 'Token is not a refresh token') {
          return NextResponse.json(
            {
              error: 'Invalid refresh token',
              message: 'The provided refresh token is invalid.',
            },
            { status: 401 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Token refresh failed',
          message: 'Failed to refresh access token.',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}


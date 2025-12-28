/**
 * API Endpoint: POST /api/v1/authorize/exchange
 *
 * Exchanges an authorization code for a verification token and entitlements.
 * Called by vendors server-to-server after receiving the auth code redirect.
 *
 * This endpoint:
 * 1. Authenticates the vendor via API key
 * 2. Validates and exchanges the authorization code
 * 3. Returns a verification token and user entitlements
 * 4. Sends entitlement.granted webhook to vendor
 *
 * Auth: Bearer token (vendor API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { findToolByApiKey, checkRateLimit, getClientIp } from '@/security';
import { exchangeAuthorizationCode } from '@/domains/auth';
import { getEntitlements, formatEntitlementsForResponse } from '@/domains/verification';
import { notifyEntitlementGranted } from '@/domains/webhooks';
import { z } from 'zod';

// ============================================================================
// RATE LIMIT CONFIG
// ============================================================================

const EXCHANGE_RATE_LIMIT = {
  limit: 60,
  windowMs: 60000, // 1 minute
};

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const exchangeRequestSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url('Invalid redirect URI format').optional(),
});

type ExchangeRequest = z.infer<typeof exchangeRequestSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface ExchangeResponse {
  valid: true;
  grantId: string;
  onesubUserId: string;
  entitlements: {
    planId: string | null;
    creditsRemaining: number | null;
    features: string[];
    limits: Record<string, number>;
  };
  verificationToken: string;
  expiresAt: number;
}

interface ExchangeErrorResponse {
  valid: false;
  error: string;
  message: string;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // =========================================================================
    // 1. Extract and Verify API Key
    // =========================================================================
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: 'UNAUTHORIZED',
          message: 'API key is required in Authorization header (Bearer token)',
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // =========================================================================
    // 2. Rate Limiting
    // =========================================================================
    const rateLimitResult = checkRateLimit(
      `exchange:${apiKey.substring(0, 20)}`,
      EXCHANGE_RATE_LIMIT
    );

    if (!rateLimitResult.success) {
      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': EXCHANGE_RATE_LIMIT.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // =========================================================================
    // 3. Verify API Key and Get Tool
    // =========================================================================
    const toolData = await findToolByApiKey(apiKey);

    if (!toolData.success) {
      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: 'UNAUTHORIZED',
          message: toolData.error || 'Invalid API key',
        },
        { status: 401 }
      );
    }

    const toolId = toolData.toolId!;

    if (!toolData.isActive) {
      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: 'TOOL_NOT_ACTIVE',
          message: 'Tool is not active',
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // 4. Parse and Validate Request
    // =========================================================================
    let body: ExchangeRequest;
    try {
      const rawBody = await request.json();
      const parseResult = exchangeRequestSchema.safeParse(rawBody);

      if (!parseResult.success) {
        return NextResponse.json<ExchangeErrorResponse>(
          {
            valid: false,
            error: 'INVALID_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid request body',
          },
          { status: 400 }
        );
      }

      body = parseResult.data;
    } catch {
      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: 'INVALID_REQUEST',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 5. Exchange Authorization Code
    // =========================================================================
    const exchangeResult = await exchangeAuthorizationCode(
      body.code,
      toolId,
      body.redirectUri
    );

    if (!exchangeResult.success) {
      // Map error codes to HTTP status
      let status = 400;
      if (exchangeResult.error === 'ACCESS_REVOKED') {
        status = 403;
      }

      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: exchangeResult.error || 'EXCHANGE_FAILED',
          message: exchangeResult.message || 'Failed to exchange authorization code',
        },
        { status }
      );
    }

    // =========================================================================
    // 6. Get User Entitlements
    // =========================================================================
    const entitlementsResult = await getEntitlements(
      exchangeResult.userId!,
      toolId
    );

    if (!entitlementsResult.success || !entitlementsResult.entitlements) {
      console.error('[Exchange] Failed to get entitlements:', entitlementsResult.error);
      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: 'NO_SUBSCRIPTION',
          message: 'No active subscription found for this tool',
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // CRITICAL SECURITY CHECK: Verify subscription is active
    // Prevents exchange from succeeding when subscription is cancelled/inactive
    if (!entitlementsResult.entitlements.active) {
      console.warn('[Exchange] Subscription not active:', {
        userId: exchangeResult.userId,
        toolId,
        status: entitlementsResult.entitlements.status,
      });

      return NextResponse.json<ExchangeErrorResponse>(
        {
          valid: false,
          error: 'SUBSCRIPTION_INACTIVE',
          message: `Subscription is ${entitlementsResult.entitlements.status}. Please activate your subscription.`,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    const entitlements = formatEntitlementsForResponse(entitlementsResult.entitlements);

    // =========================================================================
    // 7. Send entitlement.granted Webhook (NON-BLOCKING)
    // =========================================================================
    notifyEntitlementGranted(
      toolId,
      exchangeResult.userId!,
      exchangeResult.grantId!,
      entitlements.planId || 'default',
      entitlements.creditsRemaining || undefined
    );

    // =========================================================================
    // 8. Return Success Response
    // =========================================================================
    return NextResponse.json<ExchangeResponse>(
      {
        valid: true,
        grantId: exchangeResult.grantId!,
        onesubUserId: exchangeResult.userId!,
        entitlements,
        verificationToken: exchangeResult.verificationToken!,
        expiresAt: Math.floor(exchangeResult.tokenExpiresAt!.getTime() / 1000),
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': EXCHANGE_RATE_LIMIT.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
        },
      }
    );

  } catch (error) {
    console.error('[Exchange] Unexpected error:', error);
    return NextResponse.json<ExchangeErrorResponse>(
      {
        valid: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

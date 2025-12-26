/**
 * API Endpoint: POST /api/v1/verify
 *
 * Verifies a verification token and returns updated entitlements.
 * Called by vendors to check if access is still valid.
 *
 * STATE-OF-THE-ART OPTIMIZATION:
 * - READ-ONLY hot path (no DB writes on verify)
 * - Cache-first entitlement lookups
 * - Token rotation only when needed (< 2 hours to expiry)
 * - Event-driven invalidation via webhooks
 *
 * This endpoint:
 * 1. Authenticates the vendor via API key
 * 2. Validates the verification token (READ-ONLY)
 * 3. Returns cached entitlements (or fresh on miss)
 * 4. Rotates token ONLY if near expiry
 *
 * Auth: Bearer token (vendor API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { findToolByApiKey, checkRateLimit, getClientIp } from '@/security';
import { validateTokenReadOnly, rotateToken, checkRevocation } from '@/domains/auth';
import { getEntitlementsWithAuthority, formatEntitlementsForResponse } from '@/domains/verification';
import { z } from 'zod';

// ============================================================================
// RATE LIMIT CONFIG
// ============================================================================

const VERIFY_RATE_LIMIT = {
  limit: 120, // 2 per second average
  windowMs: 60000, // 1 minute
};

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const verifyRequestSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
});

type VerifyRequest = z.infer<typeof verifyRequestSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface VerifySuccessResponse {
  valid: true;
  onesubUserId: string;
  entitlements: {
    planId: string | null;
    creditsRemaining: number | null;
    features: string[];
    limits: Record<string, number>;
  };
  /** Current token (or new token if rotated) */
  verificationToken: string;
  /** Unix timestamp - use cached entitlements until this time */
  cacheUntil: number;
  /** Unix timestamp - verify again before this time (longer than cacheUntil) */
  nextVerificationBefore: number;
  /** True if a new token was issued (rotation occurred) */
  tokenRotated?: boolean;
}

interface VerifyRevokedResponse {
  valid: false;
  error: string;
  reason: string;
  revokedAt?: number;
  action: 'terminate_session' | 'reauthenticate';
}

type VerifyResponse = VerifySuccessResponse | VerifyRevokedResponse;

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
      return NextResponse.json<VerifyRevokedResponse>(
        {
          valid: false,
          error: 'UNAUTHORIZED',
          reason: 'API key is required in Authorization header (Bearer token)',
          action: 'terminate_session',
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // =========================================================================
    // 2. Rate Limiting
    // =========================================================================
    const rateLimitResult = checkRateLimit(
      `verify:${apiKey.substring(0, 20)}`,
      VERIFY_RATE_LIMIT
    );

    if (!rateLimitResult.success) {
      return NextResponse.json<VerifyRevokedResponse>(
        {
          valid: false,
          error: 'RATE_LIMITED',
          reason: 'Too many requests. Please try again later.',
          action: 'terminate_session',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': VERIFY_RATE_LIMIT.limit.toString(),
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
      return NextResponse.json<VerifyRevokedResponse>(
        {
          valid: false,
          error: 'UNAUTHORIZED',
          reason: toolData.error || 'Invalid API key',
          action: 'terminate_session',
        },
        { status: 401 }
      );
    }

    const toolId = toolData.toolId!;

    if (!toolData.isActive) {
      return NextResponse.json<VerifyRevokedResponse>(
        {
          valid: false,
          error: 'TOOL_NOT_ACTIVE',
          reason: 'Tool is not active',
          action: 'terminate_session',
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // 4. Parse and Validate Request
    // =========================================================================
    let body: VerifyRequest;
    try {
      const rawBody = await request.json();
      const parseResult = verifyRequestSchema.safeParse(rawBody);

      if (!parseResult.success) {
        return NextResponse.json<VerifyRevokedResponse>(
          {
            valid: false,
            error: 'INVALID_REQUEST',
            reason: parseResult.error.errors[0]?.message || 'Invalid request body',
            action: 'terminate_session',
          },
          { status: 400 }
        );
      }

      body = parseResult.data;
    } catch {
      return NextResponse.json<VerifyRevokedResponse>(
        {
          valid: false,
          error: 'INVALID_REQUEST',
          reason: 'Request body must be valid JSON',
          action: 'terminate_session',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 5. Validate Token (READ-ONLY - no DB writes)
    // =========================================================================
    const validateResult = await validateTokenReadOnly(body.verificationToken, toolId);

    if (!validateResult.valid) {
      // Map error to appropriate HTTP status
      let status = 403;
      if (validateResult.error === 'INVALID_TOKEN') {
        status = 401;
      } else if (validateResult.error === 'TOKEN_EXPIRED') {
        status = 401;
      }

      return NextResponse.json<VerifyRevokedResponse>(
        {
          valid: false,
          error: validateResult.error || 'VERIFICATION_FAILED',
          reason: validateResult.reason || 'Token verification failed',
          action: validateResult.action || 'terminate_session',
        },
        { status }
      );
    }

    // =========================================================================
    // 6. Get Entitlements (CACHE-FIRST)
    // =========================================================================
    const entitlementsResult = await getEntitlementsWithAuthority(
      validateResult.userId!,
      toolId
    );

    // =========================================================================
    // 6a. SECURITY: Check for explicit revocation (even on cache hit)
    // This prevents revoked users from accessing services via cached entitlements
    // =========================================================================
    const revocationCheck = await checkRevocation(validateResult.userId!, toolId);

    if (revocationCheck.revoked) {
      return NextResponse.json<VerifyRevokedResponse>(
        {
          valid: false,
          error: 'ACCESS_REVOKED',
          reason: revocationCheck.reason || 'Access has been revoked',
          revokedAt: revocationCheck.revokedAt ? Math.floor(revocationCheck.revokedAt.getTime() / 1000) : undefined,
          action: 'terminate_session',
        },
        { status: 403 }
      );
    }

    // Check if subscription is still active
    if (entitlementsResult.success && entitlementsResult.entitlements) {
      if (!entitlementsResult.entitlements.active) {
        return NextResponse.json<VerifyRevokedResponse>(
          {
            valid: false,
            error: 'SUBSCRIPTION_INACTIVE',
            reason: `Subscription is ${entitlementsResult.entitlements.status}`,
            action: 'terminate_session',
          },
          { status: 403 }
        );
      }
    }

    const entitlements = entitlementsResult.entitlements
      ? formatEntitlementsForResponse(entitlementsResult.entitlements)
      : { planId: null, creditsRemaining: null, features: [], limits: {} };

    // =========================================================================
    // 7. Rotate Token ONLY if Needed (< 2 hours to expiry)
    // =========================================================================
    let verificationToken = body.verificationToken;
    let tokenRotated = false;

    if (validateResult.needsRotation) {
      const rotateResult = await rotateToken(body.verificationToken, toolId);
      if (rotateResult.success && rotateResult.verificationToken) {
        verificationToken = rotateResult.verificationToken;
        tokenRotated = true;
      }
      // If rotation fails, continue with current token (still valid)
    }

    // =========================================================================
    // 8. Return Success Response
    // =========================================================================
    const now = Date.now();
    const cacheUntil = Math.floor((entitlementsResult.authorityExpiresAt || now + 15 * 60 * 1000) / 1000);
    const nextVerificationBefore = Math.floor((now + 30 * 60 * 1000) / 1000); // 30 minutes

    return NextResponse.json<VerifySuccessResponse>(
      {
        valid: true,
        onesubUserId: validateResult.userId!,
        entitlements,
        verificationToken,
        cacheUntil,
        nextVerificationBefore,
        ...(tokenRotated && { tokenRotated: true }),
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': VERIFY_RATE_LIMIT.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
          // Cache control hints
          'Cache-Control': 'private, no-store',
          // Indicate if response came from cache
          'X-Cache': entitlementsResult.fromCache ? 'HIT' : 'MISS',
        },
      }
    );

  } catch (error) {
    console.error('[Verify] Unexpected error:', error);
    return NextResponse.json<VerifyRevokedResponse>(
      {
        valid: false,
        error: 'INTERNAL_ERROR',
        reason: 'An unexpected error occurred',
        action: 'terminate_session',
      },
      { status: 500 }
    );
  }
}

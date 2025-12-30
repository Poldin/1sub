/**
 * API Endpoint: POST /api/v1/magiclogin
 *
 * Generates a signed Magic Login URL for seamless user authentication.
 * Called internally by 1Sub UI when a user clicks "Launch Magic Login".
 *
 * SECURITY FEATURES:
 * - Server-side timestamp validation (5-minute TTL)
 * - Nonce-based replay protection (single-use URLs)
 * - URL validation (HTTPS required, no private IPs)
 * - Rate limiting per user and per tool
 * - Subscription and revocation checks
 *
 * URL Format: {magic_login_url}?user={oneSubUserId}&ts={timestamp}&nonce={nonce}&sig={hmac_sha256}
 *
 * Auth: User session (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database/client';
import { createServiceClient } from '@/infrastructure/database/client';
import { hasActiveSubscription } from '@/domains/verification';
import { checkRevocation } from '@/domains/auth';
import {
  checkRateLimit,
  getClientIp,
  MAGIC_LOGIN_CONFIG,
  generateSignedMagicLoginParams,
  validateMagicLoginUrl,
} from '@/security';
import { z } from 'zod';

// ============================================================================
// RATE LIMIT CONFIG
// ============================================================================

const RATE_LIMITS = {
  /** Per-user rate limit: 10 requests per minute */
  PER_USER: {
    limit: MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_USER,
    windowMs: 60000,
  },
  /** Per-tool rate limit: 100 requests per minute */
  PER_TOOL: {
    limit: MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_TOOL,
    windowMs: 60000,
  },
} as const;

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const magicLoginRequestSchema = z.object({
  toolId: z.string().uuid('Invalid tool ID format'),
  test: z.boolean().optional(), // For vendor testing - skips subscription check
});

type MagicLoginRequest = z.infer<typeof magicLoginRequestSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface MagicLoginSuccessResponse {
  success: true;
  magicLoginUrl: string;
  oneSubUserId: string;
  expiresIn: number; // seconds
}

interface MagicLoginErrorResponse {
  success: false;
  error: string;
  message: string;
}

type MagicLoginResponse = MagicLoginSuccessResponse | MagicLoginErrorResponse;

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // =========================================================================
    // 1. Authenticate User via Supabase Session
    // =========================================================================
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // =========================================================================
    // 2. Rate Limiting - Per User
    // =========================================================================
    const userRateLimitResult = checkRateLimit(
      `magiclogin:user:${user.id}`,
      RATE_LIMITS.PER_USER
    );

    if (!userRateLimitResult.success) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many Magic Login requests. Please wait before trying again.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.PER_USER.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': userRateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // =========================================================================
    // 3. Parse and Validate Request
    // =========================================================================
    let body: MagicLoginRequest;
    try {
      const rawBody = await request.json();
      const parseResult = magicLoginRequestSchema.safeParse(rawBody);

      if (!parseResult.success) {
        return NextResponse.json<MagicLoginErrorResponse>(
          {
            success: false,
            error: 'INVALID_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid request body',
          },
          { status: 400 }
        );
      }

      body = parseResult.data;
    } catch {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    const { toolId, test: isTestMode } = body;

    // =========================================================================
    // 4. Rate Limiting - Per Tool
    // =========================================================================
    const toolRateLimitResult = checkRateLimit(
      `magiclogin:tool:${toolId}`,
      RATE_LIMITS.PER_TOOL
    );

    if (!toolRateLimitResult.success) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: 'This tool is receiving too many Magic Login requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': toolRateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // =========================================================================
    // 5. Verify Tool Exists and is Active
    // =========================================================================
    const serviceClient = createServiceClient();
    const { data: tool, error: toolError } = await serviceClient
      .from('tools')
      .select('id, name, is_active, vendor_id')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'TOOL_NOT_FOUND',
          message: 'Tool not found',
        },
        { status: 404 }
      );
    }

    if (!tool.is_active) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'TOOL_NOT_ACTIVE',
          message: 'Tool is not active',
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // 6. Check if Test Mode - Vendor can test without subscription
    // =========================================================================
    let skipSubscriptionCheck = false;

    if (isTestMode) {
      // Verify the current user IS the vendor for this tool
      const isVendorForTool = tool.vendor_id === user.id;

      if (isVendorForTool) {
        skipSubscriptionCheck = true;
      }
      // If not the vendor, silently continue with normal subscription check
    }

    // =========================================================================
    // 7. Check User Has Active Subscription (skipped in test mode for vendors)
    // =========================================================================
    if (!skipSubscriptionCheck) {
      const hasSubscription = await hasActiveSubscription(user.id, toolId);

      if (!hasSubscription) {
        return NextResponse.json<MagicLoginErrorResponse>(
          {
            success: false,
            error: 'NO_SUBSCRIPTION',
            message: 'No active subscription for this tool',
          },
          { status: 402 }
        );
      }

      // =========================================================================
      // 8. Check Access Not Revoked
      // =========================================================================
      const revocationCheck = await checkRevocation(user.id, toolId);

      if (revocationCheck.revoked) {
        return NextResponse.json<MagicLoginErrorResponse>(
          {
            success: false,
            error: 'ACCESS_REVOKED',
            message: revocationCheck.reason || 'Access has been revoked',
          },
          { status: 403 }
        );
      }
    }

    // =========================================================================
    // 9. Get Tool's API Key Metadata (Magic Login URL and Secret)
    // =========================================================================
    const { data: apiKeyData, error: apiKeyError } = await serviceClient
      .from('api_keys')
      .select('metadata')
      .eq('tool_id', toolId)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'API_KEY_NOT_FOUND',
          message: 'Tool configuration not found',
        },
        { status: 500 }
      );
    }

    const metadata = (apiKeyData.metadata as Record<string, unknown>) || {};
    const magicLoginUrl = metadata.magic_login_url as string | undefined;
    const magicLoginSecret = metadata.magic_login_secret as string | undefined;

    if (!magicLoginUrl) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'MAGIC_LOGIN_NOT_CONFIGURED',
          message: 'Magic Login URL not configured for this tool',
        },
        { status: 400 }
      );
    }

    if (!magicLoginSecret) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'MAGIC_LOGIN_SECRET_NOT_CONFIGURED',
          message: 'Magic Login Secret not configured for this tool',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 10. Validate Magic Login URL (HTTPS, no private IPs)
    // =========================================================================
    const isDevelopment = process.env.NODE_ENV === 'development';
    const urlValidation = validateMagicLoginUrl(magicLoginUrl, isDevelopment);

    if (!urlValidation.valid) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'INVALID_MAGIC_LOGIN_URL',
          message: urlValidation.error || 'Invalid Magic Login URL configuration',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 11. Generate Signed URL with Nonce (Replay Protection)
    // =========================================================================
    const { timestamp, nonce, signature } = generateSignedMagicLoginParams(
      user.id,
      magicLoginSecret
    );

    // Build the Magic Login URL with all parameters
    const url = new URL(urlValidation.normalizedUrl!);
    url.searchParams.set('user', user.id);
    url.searchParams.set('ts', timestamp.toString());
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('sig', signature);

    const finalUrl = url.toString();

    // =========================================================================
    // 12. Return Success Response
    // =========================================================================
    return NextResponse.json<MagicLoginSuccessResponse>(
      {
        success: true,
        magicLoginUrl: finalUrl,
        oneSubUserId: user.id,
        expiresIn: MAGIC_LOGIN_CONFIG.TTL_SECONDS,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.PER_USER.limit.toString(),
          'X-RateLimit-Remaining': userRateLimitResult.remaining.toString(),
        },
      }
    );

  } catch (error) {
    // Log error securely without exposing details
    console.error('[MagicLogin] Internal error:', error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json<MagicLoginErrorResponse>(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

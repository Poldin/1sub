/**
 * API Endpoint: POST /api/v1/magiclogin
 *
 * Generates a signed Magic Login URL for seamless user authentication.
 * Called internally by 1Sub UI when a user clicks "Launch Magic Login".
 *
 * This endpoint:
 * 1. Authenticates the user via Supabase session
 * 2. Validates the user has an active subscription for the tool
 * 3. Checks the user's access hasn't been revoked
 * 4. Generates a signed URL with HMAC signature using the vendor's API key
 * 5. Redirects the user to the vendor's Magic Login URL
 *
 * The vendor can verify the signature locally without any API call to 1Sub.
 *
 * URL Format: {magic_login_url}?user={oneSubUserId}&ts={timestamp}&sig={hmac_sha256}
 *
 * Auth: User session (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database/client';
import { createServiceClient } from '@/infrastructure/database/client';
import { hasActiveSubscription } from '@/domains/verification';
import { checkRevocation } from '@/domains/auth';
import { z } from 'zod';
import crypto from 'crypto';

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
// CONSTANTS
// ============================================================================

const MAGIC_LOGIN_TTL_SECONDS = 60; // Link expires in 60 seconds

// ============================================================================
// HELPER: Generate HMAC Signature
// ============================================================================

function generateSignature(userId: string, timestamp: number, apiKey: string): string {
  const data = `${userId}${timestamp}`;
  return crypto.createHmac('sha256', apiKey).update(data).digest('hex');
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
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
    // 2. Parse and Validate Request
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
    // 3. Verify Tool Exists and is Active
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
    // 3.5. Check if Test Mode - Vendor can test without subscription
    // =========================================================================
    let skipSubscriptionCheck = false;
    
    if (isTestMode) {
      // In tools table, vendor_id is directly the user_id of the vendor
      // So we just check if the current user IS the vendor for this tool
      const isVendorForTool = tool.vendor_id === user.id;
      
      console.log('[MagicLogin] Test mode - User:', user.id, 'Tool vendor:', tool.vendor_id, 'Match:', isVendorForTool);
      
      if (isVendorForTool) {
        skipSubscriptionCheck = true;
      }
    }

    // =========================================================================
    // 4. Check User Has Active Subscription (skipped in test mode for vendors)
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
      // 5. Check Access Not Revoked
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
    // 6. Get Tool's API Key and Magic Login URL
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
          message: 'Tool API key not configured',
        },
        { status: 500 }
      );
    }

    const metadata = (apiKeyData.metadata as Record<string, unknown>) || {};
    const magicLoginUrl = metadata.magic_login_url as string | undefined;

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

    // =========================================================================
    // 7. Get Magic Login Secret for Signing
    // Each tool has a dedicated magic_login_secret for signing Magic Login URLs.
    // This is separate from webhook_secret for better security isolation.
    // =========================================================================
    const magicLoginSecret = metadata.magic_login_secret as string | undefined;

    if (!magicLoginSecret) {
      return NextResponse.json<MagicLoginErrorResponse>(
        {
          success: false,
          error: 'MAGIC_LOGIN_SECRET_NOT_CONFIGURED',
          message: 'Magic Login Secret must be configured. Generate one in the vendor dashboard.',
        },
        { status: 400 }
      );
    }

    const signingSecret = magicLoginSecret;

    // =========================================================================
    // 8. Generate Signed URL
    // =========================================================================
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(user.id, timestamp, signingSecret);

    // Build the Magic Login URL
    const url = new URL(magicLoginUrl);
    url.searchParams.set('user', user.id);
    url.searchParams.set('ts', timestamp.toString());
    url.searchParams.set('sig', signature);

    const finalUrl = url.toString();

    // =========================================================================
    // 9. Return Success Response
    // =========================================================================
    return NextResponse.json<MagicLoginSuccessResponse>(
      {
        success: true,
        magicLoginUrl: finalUrl,
        oneSubUserId: user.id,
        expiresIn: MAGIC_LOGIN_TTL_SECONDS,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[MagicLogin] Unexpected error:', error);
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


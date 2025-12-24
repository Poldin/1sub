/**
 * API Endpoint: POST /api/v1/authorize/initiate
 *
 * Initiates the vendor authorization flow by generating an authorization code.
 * Called internally by the 1sub UI when a user clicks "Launch Tool".
 *
 * This endpoint:
 * 1. Verifies the user is authenticated
 * 2. Checks user has an active subscription to the tool
 * 3. Generates a single-use authorization code (60s TTL)
 * 4. Returns the authorization URL for redirect
 *
 * Auth: User session (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database/client';
import { createAuthorizationCode, generateState, checkRevocation } from '@/domains/auth';
import { hasActiveSubscription } from '@/domains/verification';
import { z } from 'zod';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const initiateRequestSchema = z.object({
  toolId: z.string().uuid('Invalid tool ID format'),
  redirectUri: z.string().url('Invalid redirect URI format').optional(),
  state: z.string().min(16).max(256).optional(),
});

type InitiateRequest = z.infer<typeof initiateRequestSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface InitiateResponse {
  authorizationUrl: string;
  code: string;
  expiresAt: string;
  state: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // =========================================================================
    // 1. Authenticate User
    // =========================================================================
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // =========================================================================
    // 2. Parse and Validate Request
    // =========================================================================
    let body: InitiateRequest;
    try {
      const rawBody = await request.json();
      const parseResult = initiateRequestSchema.safeParse(rawBody);

      if (!parseResult.success) {
        return NextResponse.json<ErrorResponse>(
          {
            error: 'INVALID_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid request body',
          },
          { status: 400 }
        );
      }

      body = parseResult.data;
    } catch {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'INVALID_REQUEST',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    const { toolId, state: providedState } = body;

    // =========================================================================
    // 3. Verify Tool Exists and is Active
    // =========================================================================
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id, name, is_active, url')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'TOOL_NOT_FOUND',
          message: 'Tool not found',
        },
        { status: 404 }
      );
    }

    if (!tool.is_active) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'TOOL_NOT_ACTIVE',
          message: 'Tool is not currently active',
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // 4. Check User Has Active Subscription
    // =========================================================================
    const hasSubscription = await hasActiveSubscription(user.id, toolId);

    if (!hasSubscription) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'NO_SUBSCRIPTION',
          message: 'You do not have an active subscription to this tool',
        },
        { status: 402 } // 402 Payment Required (standardized)
      );
    }

    // =========================================================================
    // 5. Check if Access Has Been Revoked
    // =========================================================================
    // CRITICAL: Check revocation BEFORE generating authorization code
    // This prevents users from launching tools after their access is revoked
    const revocationCheck = await checkRevocation(user.id, toolId);
    if (revocationCheck.revoked) {
      console.info('[Authorize Initiate] Access revoked, blocking authorization', {
        userId: user.id,
        toolId,
        toolName: tool.name,
        reason: revocationCheck.reason,
        revokedAt: revocationCheck.revokedAt,
      });

      return NextResponse.json<ErrorResponse>(
        {
          error: 'ACCESS_REVOKED',
          message: 'Your access to this tool has been revoked',
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // 6. Get or Validate Redirect URI
    // =========================================================================
    let redirectUri = body.redirectUri;

    if (!redirectUri) {
      // Get configured redirect URI from tool's API key metadata
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select('metadata')
        .eq('tool_id', toolId)
        .eq('is_active', true)
        .single();

      const metadata = (apiKey?.metadata as Record<string, unknown>) || {};
      const toolRedirectUri = metadata.redirect_uri as string | undefined;

      if (!toolRedirectUri) {
        return NextResponse.json<ErrorResponse>(
          {
            error: 'REDIRECT_NOT_CONFIGURED',
            message: 'Tool has not configured a redirect URI',
          },
          { status: 400 }
        );
      }

      redirectUri = toolRedirectUri;
    }

    // =========================================================================
    // 7. Generate State if Not Provided
    // =========================================================================
    const state = providedState || generateState();

    // =========================================================================
    // 8. Create Authorization Code
    // =========================================================================
    const authResult = await createAuthorizationCode(
      toolId,
      user.id,
      redirectUri,
      state
    );

    // =========================================================================
    // 9. Return Authorization URL
    // =========================================================================
    return NextResponse.json<InitiateResponse>(
      {
        authorizationUrl: authResult.authorizationUrl,
        code: authResult.code,
        expiresAt: authResult.expiresAt.toISOString(),
        state,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Authorize Initiate] Unexpected error:', error);
    return NextResponse.json<ErrorResponse>(
      {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

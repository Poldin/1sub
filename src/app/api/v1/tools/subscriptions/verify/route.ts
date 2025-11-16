/**
 * API Endpoint: POST /api/v1/tools/subscriptions/verify
 * 
 * Verifies if a user has an active subscription to the calling tool.
 * This endpoint is called by external tools to check subscription status.
 * 
 * Features:
 * - Bearer token authentication (tool API key)
 * - Per-tool scoping (only returns data for the authenticated tool)
 * - Rate limiting (100 requests per minute per tool)
 * - Input validation
 * - Security audit logging
 * - Support for oneSubUserId or emailSha256 lookup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findToolByApiKey } from '@/lib/api-keys';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { getCurrentBalance } from '@/lib/credits-service';
import type { 
  VerifySubscriptionRequest, 
  VerifySubscriptionResponse,
  APIError 
} from '@/lib/tool-verification-types';
import crypto from 'crypto';

// Extend RATE_LIMITS if needed
const VERIFY_SUBSCRIPTION_RATE_LIMIT = {
  limit: 100,
  windowMs: 60000, // 1 minute
};

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  try {
    // =======================================================================
    // 1. Authentication - Extract and verify API key
    // =======================================================================
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<APIError>(
        {
          error: 'Unauthorized',
          message: 'API key is required in Authorization header (Bearer token)',
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // =======================================================================
    // 2. Rate Limiting - Per API key
    // =======================================================================
    const rateLimitResult = checkRateLimit(
      `verify-subscription:${apiKey.substring(0, 20)}`,
      VERIFY_SUBSCRIPTION_RATE_LIMIT
    );

    if (!rateLimitResult.success) {
      return NextResponse.json<APIError>(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': VERIFY_SUBSCRIPTION_RATE_LIMIT.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // =======================================================================
    // 3. Verify Tool API Key
    // =======================================================================
    const toolData = await findToolByApiKey(apiKey);

    if (!toolData) {
      return NextResponse.json<APIError>(
        {
          error: 'Unauthorized',
          message: 'Invalid API key',
        },
        { status: 401 }
      );
    }

    if (!toolData.isActive) {
      return NextResponse.json<APIError>(
        {
          error: 'Forbidden',
          message: 'Tool is not active',
        },
        { status: 403 }
      );
    }

    // =======================================================================
    // 4. Parse and Validate Request Body
    // =======================================================================
    let body: VerifySubscriptionRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    const { oneSubUserId, emailSha256 } = body;

    // Must provide either oneSubUserId or emailSha256
    if (!oneSubUserId && !emailSha256) {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'Either oneSubUserId or emailSha256 is required',
        },
        { status: 422 }
      );
    }

    // =======================================================================
    // 5. Resolve User ID
    // =======================================================================
    const supabase = await createClient();
    let resolvedUserId: string | null = null;

    if (oneSubUserId) {
      // Preferred: Direct user ID lookup
      resolvedUserId = oneSubUserId;
    } else if (emailSha256) {
      // Fallback: Email hash lookup
      // Query auth.users to find user by email hash
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('[Verify Subscription] Error listing users:', usersError);
        return NextResponse.json<APIError>(
          {
            error: 'Internal error',
            message: 'Failed to resolve user from email',
          },
          { status: 500 }
        );
      }

      // Find user with matching email hash
      const matchingUser = users.users.find(user => {
        if (!user.email) return false;
        const normalizedEmail = user.email.toLowerCase().trim();
        const hash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
        return hash === emailSha256.toLowerCase();
      });

      if (matchingUser) {
        resolvedUserId = matchingUser.id;
      }
    }

    if (!resolvedUserId) {
      return NextResponse.json<APIError>(
        {
          error: 'Not found',
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    // =======================================================================
    // 6. Query Subscription for This Tool
    // =======================================================================
    const { data: subscription, error: subscriptionError } = await supabase
      .from('tool_subscriptions')
      .select('*')
      .eq('user_id', resolvedUserId)
      .eq('tool_id', toolData.toolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      console.error('[Verify Subscription] Error fetching subscription:', subscriptionError);
      return NextResponse.json<APIError>(
        {
          error: 'Internal error',
          message: 'Failed to fetch subscription',
        },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json<APIError>(
        {
          error: 'Not found',
          message: 'No subscription found for this tool',
        },
        { status: 404 }
      );
    }

    // =======================================================================
    // 7. Get User Credits Balance
    // =======================================================================
    let creditsRemaining = 0;
    try {
      creditsRemaining = await getCurrentBalance(resolvedUserId);
    } catch (error) {
      console.error('[Verify Subscription] Error fetching credits:', error);
      // Don't fail the request, just set to 0
    }

    // =======================================================================
    // 8. Determine Subscription Status and Activity
    // =======================================================================
    const status = subscription.status || 'active';
    const isActive = ['active', 'trialing'].includes(status);
    
    // Parse metadata for additional fields
    const metadata = (subscription.metadata as Record<string, unknown>) || {};
    const trialEndsAt = metadata.trial_ends_at as string | undefined;
    const cancelAtPeriodEnd = metadata.cancel_at_period_end as boolean | undefined || false;
    const lastPaymentStatus = metadata.last_payment_status as 'paid' | 'failed' | 'pending' | undefined;

    // =======================================================================
    // 9. Update Last Verified Timestamp (optional, for analytics)
    // =======================================================================
    // Check if there's a tool_user_link to update
    const { data: linkData } = await supabase
      .from('tool_user_links')
      .select('id')
      .eq('tool_id', toolData.toolId)
      .eq('onesub_user_id', resolvedUserId)
      .maybeSingle();

    if (linkData) {
      await supabase
        .from('tool_user_links')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', linkData.id);
    }

    // =======================================================================
    // 10. Build and Return Response
    // =======================================================================
    const response: VerifySubscriptionResponse = {
      active: isActive,
      status: status as VerifySubscriptionResponse['status'],
      planId: subscription.period, // period is 'monthly' or 'yearly'
      productId: toolData.toolId,
      currentPeriodStart: subscription.created_at || new Date().toISOString(),
      currentPeriodEnd: subscription.next_billing_date,
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      seats: 1, // Current schema doesn't support multiple seats
      quantity: 1, // Current schema doesn't support quantity
      creditsRemaining: creditsRemaining,
    };

    // Add optional fields
    if (trialEndsAt) {
      response.trialEndsAt = trialEndsAt;
    }
    if (lastPaymentStatus) {
      response.lastPaymentStatus = lastPaymentStatus;
    }

    return NextResponse.json<VerifySubscriptionResponse>(response, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': VERIFY_SUBSCRIPTION_RATE_LIMIT.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
      }
    });

  } catch (error) {
    console.error('[Verify Subscription] Unexpected error:', error);
    return NextResponse.json<APIError>(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}


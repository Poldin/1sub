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
 * - Support for oneSubUserId, toolUserId, or emailSha256 lookup
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

    const { oneSubUserId, toolUserId, emailSha256 } = body;

    // Additional rate limit for email-based lookups (more expensive)
    if (emailSha256) {
      const emailRateLimitResult = checkRateLimit(
        `verify-subscription-email:${apiKey.substring(0, 20)}`,
        {
          limit: 30,
          windowMs: 60000, // 1 minute
        }
      );

      if (!emailRateLimitResult.success) {
        return NextResponse.json<APIError>(
          {
            error: 'Rate limit exceeded',
            message: 'Too many email-based lookups. Use oneSubUserId for better performance.',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '30',
              'X-RateLimit-Remaining': emailRateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': new Date(emailRateLimitResult.resetAt).toISOString(),
              'Retry-After': emailRateLimitResult.retryAfter?.toString() || '60'
            }
          }
        );
      }
    }

    // Must provide at least one identifier
    if (!oneSubUserId && !toolUserId && !emailSha256) {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'Either oneSubUserId, toolUserId, or emailSha256 is required',
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
    } else if (toolUserId) {
      // Second preference: Lookup via tool_user_links
      const { data: linkData, error: linkError } = await supabase
        .from('tool_user_links')
        .select('onesub_user_id')
        .eq('tool_id', toolData.toolId)
        .eq('tool_user_id', toolUserId)
        .maybeSingle();

      if (linkError) {
        console.error('[Verify Subscription] Error querying tool_user_links:', linkError);
        return NextResponse.json<APIError>(
          {
            error: 'Internal error',
            message: 'Failed to resolve user from tool user ID',
          },
          { status: 500 }
        );
      }

      if (linkData) {
        resolvedUserId = linkData.onesub_user_id;
      }
    } else if (emailSha256) {
      // Fallback: Email hash lookup using indexed column
      // This is much faster than the old O(n) scan approach

      // Timing protection: Track start time to prevent timing attacks
      const lookupStartTime = Date.now();

      const { data: lookupResult, error: lookupError } = await supabase
        .rpc('lookup_user_by_email_sha256', {
          p_email_sha256: emailSha256.toLowerCase()
        })
        .maybeSingle<{ user_id: string }>();

      if (lookupError) {
        console.error('[Verify Subscription] Error looking up user by email:', lookupError);
        return NextResponse.json<APIError>(
          {
            error: 'Internal error',
            message: 'Failed to resolve user from email',
          },
          { status: 500 }
        );
      }

      if (lookupResult) {
        resolvedUserId = lookupResult.user_id;
      }

      // Ensure minimum response time to prevent timing-based enumeration
      const lookupDuration = Date.now() - lookupStartTime;
      if (lookupDuration < 100) {
        await new Promise(resolve => setTimeout(resolve, 100 - lookupDuration));
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
    } else if (emailSha256 && resolvedUserId) {
      // Auto-create tool_user_link for email-based lookups for efficiency
      // This allows future verifications to use toolUserId (faster)
      try {
        const { error: linkError } = await supabase
          .from('tool_user_links')
          .insert({
            tool_id: toolData.toolId,
            onesub_user_id: resolvedUserId,
            tool_user_id: `email_${emailSha256.substring(0, 12)}`,
            link_method: 'email_link',
            metadata: {
              auto_linked: true,
              linked_via: 'email_sha256_lookup',
              email_sha256: emailSha256,
              created_at: new Date().toISOString()
            }
          });

        if (linkError) {
          console.error('[Verify Subscription] Failed to create auto-link:', linkError);
          // Don't fail the request, just log the error
        }
      } catch (error) {
        console.error('[Verify Subscription] Exception creating auto-link:', error);
        // Don't fail the request
      }
    }

    // =======================================================================
    // 10. Build and Return Response
    // =======================================================================
    const response: VerifySubscriptionResponse = {
      oneSubUserId: resolvedUserId, // Return user ID for caching
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



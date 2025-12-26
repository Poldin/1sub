/**
 * Entitlements Library
 *
 * Provides functions for looking up user entitlements to tools.
 * Used by both the /authorize/exchange and /verify endpoints.
 *
 * Entitlements include:
 * - Plan ID (subscription tier)
 * - Credits remaining
 * - Features (from tool/plan configuration)
 * - Limits (API calls, storage, etc.)
 *
 * OPTIMIZATION (State-of-the-Art):
 * - Cache-first lookups via Redis/memory
 * - DB queries only on cache miss
 * - Event-driven cache invalidation
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getCurrentBalance } from '@/lib/credits-service';
import {
  getCachedEntitlements,
  setCachedEntitlements,
  invalidateCachedEntitlements,
} from '@/infrastructure/cache/redis';

// Initialize Supabase client with service role for backend operations
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// TYPES
// ============================================================================

export interface Entitlements {
  /** The subscription plan ID (e.g., 'monthly', 'yearly', 'pro') */
  planId: string | null;

  /** Credits remaining for this user */
  creditsRemaining: number | null;

  /** Feature flags enabled for this user */
  features: string[];

  /** Usage limits for this user */
  limits: Record<string, number>;

  /** Subscription status */
  status: SubscriptionStatus;

  /** Whether the subscription is currently active */
  active: boolean;

  /** When the current period ends */
  currentPeriodEnd: string | null;

  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
}

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'failed'
  | 'none';

export interface EntitlementLookupResult {
  success: boolean;
  entitlements?: Entitlements;
  error?: string;
  message?: string;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Gets the entitlements for a user on a specific tool.
 *
 * Looks up:
 * 1. Active subscription to the tool
 * 2. User's credit balance
 * 3. Tool-specific features (from tool metadata)
 * 4. Plan-specific limits (from product metadata)
 *
 * @param userId - The 1sub user ID
 * @param toolId - The tool ID
 * @returns Entitlements or error
 */
export async function getEntitlements(
  userId: string,
  toolId: string
): Promise<EntitlementLookupResult> {
  const supabase = getServiceClient();

  try {
    // =========================================================================
    // 1. Query Active Subscription
    // =========================================================================
    const { data: subscription, error: subError } = await supabase
      .from('tool_subscriptions')
      .select(`
        id,
        status,
        period,
        credits_per_period,
        next_billing_date,
        created_at,
        metadata,
        checkout_id
      `)
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('[Entitlements] Error querying subscription:', subError);
      return {
        success: false,
        error: 'LOOKUP_FAILED',
        message: 'Failed to query subscription',
      };
    }

    // No active subscription
    if (!subscription) {
      // Check for any cancelled subscription (for historical context)
      const { data: cancelledSub } = await supabase
        .from('tool_subscriptions')
        .select('status, cancelled_at')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .eq('status', 'cancelled')
        .order('cancelled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        success: true,
        entitlements: {
          planId: null,
          creditsRemaining: null,
          features: [],
          limits: {},
          status: cancelledSub ? 'cancelled' : 'none',
          active: false,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      };
    }

    // =========================================================================
    // 2. Get User Credit Balance
    // =========================================================================
    let creditsRemaining: number | null = null;
    try {
      creditsRemaining = await getCurrentBalance(userId);
    } catch (error) {
      console.error('[Entitlements] Error getting credit balance:', error);
      // Don't fail, just leave as null
    }

    // =========================================================================
    // 3. Get Tool Features
    // =========================================================================
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('metadata')
      .eq('id', toolId)
      .single();

    let features: string[] = [];
    let limits: Record<string, number> = {};

    if (!toolError && tool) {
      const toolMetadata = (tool.metadata as Record<string, unknown>) || {};

      // Extract features from tool metadata
      if (Array.isArray(toolMetadata.features)) {
        features = toolMetadata.features as string[];
      }

      // Extract limits from tool metadata
      if (typeof toolMetadata.limits === 'object' && toolMetadata.limits) {
        limits = toolMetadata.limits as Record<string, number>;
      }
    }

    // =========================================================================
    // 4. Get Product/Plan Specific Features (if checkout has product info)
    // =========================================================================
    if (subscription.checkout_id) {
      const { data: checkout, error: checkoutError } = await supabase
        .from('checkouts')
        .select('metadata')
        .eq('id', subscription.checkout_id)
        .single();

      if (!checkoutError && checkout) {
        const checkoutMetadata = (checkout.metadata as Record<string, unknown>) || {};
        const selectedPricing = checkoutMetadata.selected_pricing as Record<string, unknown>;

        if (selectedPricing) {
          // Merge product-specific features
          if (Array.isArray(selectedPricing.features)) {
            features = [...new Set([...features, ...(selectedPricing.features as string[])])];
          }

          // Merge product-specific limits (product limits override tool defaults)
          if (typeof selectedPricing.limits === 'object' && selectedPricing.limits) {
            limits = { ...limits, ...(selectedPricing.limits as Record<string, number>) };
          }
        }
      }
    }

    // =========================================================================
    // 5. Parse Subscription Metadata
    // =========================================================================
    const subMetadata = (subscription.metadata as Record<string, unknown>) || {};
    const cancelAtPeriodEnd = (subMetadata.cancel_at_period_end as boolean) || false;

    // Determine if active
    const status = subscription.status as SubscriptionStatus;
    const active = ['active', 'trialing'].includes(status);

    // =========================================================================
    // 6. Return Entitlements
    // =========================================================================
    return {
      success: true,
      entitlements: {
        planId: subscription.period || null, // 'monthly', 'yearly', etc.
        creditsRemaining,
        features,
        limits,
        status,
        active,
        currentPeriodEnd: subscription.next_billing_date || null,
        cancelAtPeriodEnd,
      },
    };
  } catch (error) {
    console.error('[Entitlements] Unexpected error:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}

/**
 * Checks if a user has an active subscription to a tool.
 * Faster than getEntitlements when you just need a boolean check.
 *
 * @param userId - The 1sub user ID
 * @param toolId - The tool ID
 * @returns Whether the user has an active subscription
 */
export async function hasActiveSubscription(
  userId: string,
  toolId: string
): Promise<boolean> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('tool_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('tool_id', toolId)
    .in('status', ['active', 'trialing'])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Entitlements] Error checking subscription:', error);
    return false;
  }

  return data !== null;
}

/**
 * Gets entitlements for multiple tools at once.
 * Useful for dashboard views.
 *
 * @param userId - The 1sub user ID
 * @param toolIds - Array of tool IDs
 * @returns Map of tool ID to entitlements
 */
export async function getEntitlementsForTools(
  userId: string,
  toolIds: string[]
): Promise<Map<string, Entitlements>> {
  const supabase = getServiceClient();
  const result = new Map<string, Entitlements>();

  // Get all subscriptions in one query
  const { data: subscriptions, error: subError } = await supabase
    .from('tool_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('tool_id', toolIds)
    .in('status', ['active', 'trialing', 'past_due']);

  if (subError) {
    console.error('[Entitlements] Error querying subscriptions:', subError);
    return result;
  }

  // Get credit balance once
  let creditsRemaining: number | null = null;
  try {
    creditsRemaining = await getCurrentBalance(userId);
  } catch (error) {
    console.error('[Entitlements] Error getting credit balance:', error);
  }

  // Build entitlements map
  for (const toolId of toolIds) {
    const subscription = subscriptions?.find(s => s.tool_id === toolId);

    if (!subscription) {
      result.set(toolId, {
        planId: null,
        creditsRemaining: null,
        features: [],
        limits: {},
        status: 'none',
        active: false,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
      continue;
    }

    const subMetadata = (subscription.metadata as Record<string, unknown>) || {};
    const status = subscription.status as SubscriptionStatus;

    result.set(toolId, {
      planId: subscription.period || null,
      creditsRemaining,
      features: [],
      limits: {},
      status,
      active: ['active', 'trialing'].includes(status),
      currentPeriodEnd: subscription.next_billing_date || null,
      cancelAtPeriodEnd: (subMetadata.cancel_at_period_end as boolean) || false,
    });
  }

  return result;
}

/**
 * Formats entitlements for API response.
 * Converts to the format expected by vendors.
 *
 * @param entitlements - The entitlements to format
 * @returns Formatted entitlements for API response
 */
export function formatEntitlementsForResponse(entitlements: Entitlements): {
  planId: string | null;
  creditsRemaining: number | null;
  features: string[];
  limits: Record<string, number>;
} {
  return {
    planId: entitlements.planId,
    creditsRemaining: entitlements.creditsRemaining,
    features: entitlements.features,
    limits: entitlements.limits,
  };
}

// ============================================================================
// CACHED ENTITLEMENTS (STATE-OF-THE-ART OPTIMIZATION)
// ============================================================================

/**
 * Configuration for cache behavior
 */
export interface CacheOptions {
  /** Skip cache and force DB lookup */
  bypassCache?: boolean;
  /** Custom TTL in seconds (default: 15 minutes) */
  ttlSeconds?: number;
  /** Include fresh credit balance (bypasses credit cache) */
  freshCredits?: boolean;
}

/**
 * Gets entitlements with caching.
 * This is the primary function for the /verify hot path.
 *
 * Cache behavior:
 * - First checks Redis/memory cache
 * - On miss, queries DB and caches result
 * - Cache TTL: 15 minutes (configurable)
 * - Invalidated by webhooks on subscription changes
 *
 * @param userId - The 1sub user ID
 * @param toolId - The tool ID
 * @param options - Cache options
 * @returns Entitlements (cached or fresh)
 */
export async function getEntitlementsWithCache(
  userId: string,
  toolId: string,
  options: CacheOptions = {}
): Promise<EntitlementLookupResult> {
  const { bypassCache = false, ttlSeconds = 900, freshCredits = false } = options;

  // 1. Try cache first (unless bypassed)
  if (!bypassCache) {
    const cached = await getCachedEntitlements(toolId, userId);
    if (cached) {
      // Optionally refresh just the credit balance
      if (freshCredits) {
        try {
          const freshBalance = await getCurrentBalance(userId);
          return {
            success: true,
            entitlements: {
              ...cached,
              creditsRemaining: freshBalance,
            },
          };
        } catch {
          // Return cached credits if fresh lookup fails
        }
      }
      return { success: true, entitlements: cached };
    }
  }

  // 2. Cache miss - fetch from DB
  const result = await getEntitlements(userId, toolId);

  // 3. Cache successful results
  if (result.success && result.entitlements) {
    await setCachedEntitlements(toolId, userId, result.entitlements, ttlSeconds);
  }

  return result;
}

/**
 * Invalidates cached entitlements for a user+tool pair.
 * Called when:
 * - Subscription is cancelled/changed
 * - Access is revoked
 * - Plan is upgraded/downgraded
 *
 * @param userId - The 1sub user ID
 * @param toolId - The tool ID
 */
export async function invalidateEntitlements(
  userId: string,
  toolId: string
): Promise<void> {
  await invalidateCachedEntitlements(toolId, userId);
}

/**
 * Gets entitlements and returns authority window info.
 * Used by the optimized /verify endpoint.
 *
 * Returns:
 * - entitlements: The entitlement data
 * - authorityExpiresAt: When the vendor should re-verify (cache TTL)
 * - fromCache: Whether this was a cache hit
 *
 * @param userId - The 1sub user ID
 * @param toolId - The tool ID
 * @param options - Cache options
 */
export async function getEntitlementsWithAuthority(
  userId: string,
  toolId: string,
  options: CacheOptions = {}
): Promise<{
  success: boolean;
  entitlements?: Entitlements;
  authorityExpiresAt?: number;
  fromCache?: boolean;
  error?: string;
  message?: string;
}> {
  const ttlSeconds = options.ttlSeconds || 900; // 15 minutes default
  const ttlMs = ttlSeconds * 1000;

  // Check cache first
  if (!options.bypassCache) {
    const cached = await getCachedEntitlements(toolId, userId);
    if (cached) {
      return {
        success: true,
        entitlements: cached,
        authorityExpiresAt: Date.now() + ttlMs,
        fromCache: true,
      };
    }
  }

  // Cache miss - fetch from DB
  const result = await getEntitlements(userId, toolId);

  if (!result.success) {
    return result;
  }

  // Cache the result
  if (result.entitlements) {
    await setCachedEntitlements(toolId, userId, result.entitlements, ttlSeconds);
  }

  return {
    success: true,
    entitlements: result.entitlements,
    authorityExpiresAt: Date.now() + ttlMs,
    fromCache: false,
  };
}

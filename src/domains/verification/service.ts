/**
 * Verification Domain Service (Entitlements)
 *
 * CANONICAL SOURCE: All entitlement lookups MUST use this service.
 *
 * Provides functions for looking up user entitlements to tools.
 * Used by both the /authorize/exchange and /verify endpoints.
 *
 * Entitlements include:
 * - Plan ID (subscription tier)
 * - Credits remaining
 * - Features (from tool/plan configuration)
 * - Limits (API calls, storage, etc.)
 */

import { createServiceClient } from '@/infrastructure/database/client';
import { getCurrentBalanceService } from '@/domains/credits';
import { getCache, setCache, deleteCache } from '@/infrastructure/cache';

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'failed'
  | 'none';

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

export interface EntitlementLookupResult {
  success: boolean;
  entitlements?: Entitlements;
  error?: string;
  message?: string;
}

export interface CacheOptions {
  /** Skip cache and force DB lookup */
  bypassCache?: boolean;
  /** Custom TTL in seconds (default: 15 minutes) */
  ttlSeconds?: number;
  /** Include fresh credit balance (bypasses credit cache) */
  freshCredits?: boolean;
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

function getEntitlementsCacheKey(toolId: string, userId: string): string {
  return `entitlements:${toolId}:${userId}`;
}

async function getCachedEntitlements(
  toolId: string,
  userId: string
): Promise<Entitlements | null> {
  const key = getEntitlementsCacheKey(toolId, userId);
  return getCache<Entitlements>(key);
}

async function setCachedEntitlements(
  toolId: string,
  userId: string,
  entitlements: Entitlements,
  ttlSeconds: number = 900
): Promise<void> {
  const key = getEntitlementsCacheKey(toolId, userId);
  await setCache(key, entitlements, ttlSeconds);
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Gets the entitlements for a user on a specific tool.
 */
export async function getEntitlements(
  userId: string,
  toolId: string
): Promise<EntitlementLookupResult> {
  const supabase = createServiceClient();

  try {
    // 1. Query Active Subscription
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
      console.error('[Verification] Error querying subscription:', subError);
      return {
        success: false,
        error: 'LOOKUP_FAILED',
        message: 'Failed to query subscription',
      };
    }

    // No active subscription
    if (!subscription) {
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

    // 2. Get User Credit Balance
    let creditsRemaining: number | null = null;
    try {
      creditsRemaining = await getCurrentBalanceService(userId);
    } catch (error) {
      console.error('[Verification] Error getting credit balance:', error);
    }

    // 3. Get Tool Features
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('metadata')
      .eq('id', toolId)
      .single();

    let features: string[] = [];
    let limits: Record<string, number> = {};

    if (!toolError && tool) {
      const toolMetadata = (tool.metadata as Record<string, unknown>) || {};

      if (Array.isArray(toolMetadata.features)) {
        features = toolMetadata.features as string[];
      }

      if (typeof toolMetadata.limits === 'object' && toolMetadata.limits) {
        limits = toolMetadata.limits as Record<string, number>;
      }
    }

    // 4. Get Product/Plan Specific Features
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
          if (Array.isArray(selectedPricing.features)) {
            features = [...new Set([...features, ...(selectedPricing.features as string[])])];
          }

          if (typeof selectedPricing.limits === 'object' && selectedPricing.limits) {
            limits = { ...limits, ...(selectedPricing.limits as Record<string, number>) };
          }
        }
      }
    }

    // 5. Parse Subscription Metadata
    const subMetadata = (subscription.metadata as Record<string, unknown>) || {};
    const cancelAtPeriodEnd = (subMetadata.cancel_at_period_end as boolean) || false;

    const status = subscription.status as SubscriptionStatus;
    const active = ['active', 'trialing'].includes(status);

    return {
      success: true,
      entitlements: {
        planId: subscription.period || null,
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
    console.error('[Verification] Unexpected error:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}

/**
 * Gets entitlements with caching.
 * Primary function for the /verify hot path.
 */
export async function getEntitlementsWithCache(
  userId: string,
  toolId: string,
  options: CacheOptions = {}
): Promise<EntitlementLookupResult> {
  const { bypassCache = false, ttlSeconds = 900, freshCredits = false } = options;

  // Try cache first
  if (!bypassCache) {
    const cached = await getCachedEntitlements(toolId, userId);
    if (cached) {
      if (freshCredits) {
        try {
          const freshBalance = await getCurrentBalanceService(userId);
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

  // Cache miss - fetch from DB
  const result = await getEntitlements(userId, toolId);

  // Cache successful results
  if (result.success && result.entitlements) {
    await setCachedEntitlements(toolId, userId, result.entitlements, ttlSeconds);
  }

  return result;
}

/**
 * Gets entitlements with authority window info.
 * Used by the optimized /verify endpoint.
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
  const ttlSeconds = options.ttlSeconds || 900;
  const ttlMs = ttlSeconds * 1000;

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

  const result = await getEntitlements(userId, toolId);

  if (!result.success) {
    return result;
  }

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

/**
 * Checks if a user has an active subscription to a tool.
 */
export async function hasActiveSubscription(userId: string, toolId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tool_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('tool_id', toolId)
    .in('status', ['active', 'trialing'])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Verification] Error checking subscription:', error);
    return false;
  }

  return data !== null;
}

/**
 * Gets entitlements for multiple tools at once.
 */
export async function getEntitlementsForTools(
  userId: string,
  toolIds: string[]
): Promise<Map<string, Entitlements>> {
  const supabase = createServiceClient();
  const result = new Map<string, Entitlements>();

  const { data: subscriptions, error: subError } = await supabase
    .from('tool_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('tool_id', toolIds)
    .in('status', ['active', 'trialing', 'past_due']);

  if (subError) {
    console.error('[Verification] Error querying subscriptions:', subError);
    return result;
  }

  let creditsRemaining: number | null = null;
  try {
    creditsRemaining = await getCurrentBalanceService(userId);
  } catch (error) {
    console.error('[Verification] Error getting credit balance:', error);
  }

  for (const toolId of toolIds) {
    const subscription = subscriptions?.find((s) => s.tool_id === toolId);

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
 * Invalidates cached entitlements.
 */
export async function invalidateEntitlements(userId: string, toolId: string): Promise<void> {
  const key = getEntitlementsCacheKey(toolId, userId);
  await deleteCache(key);
}

/**
 * Formats entitlements for API response.
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

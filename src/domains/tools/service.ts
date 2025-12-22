/**
 * Tools Domain Service
 *
 * CANONICAL SOURCE: All tool management operations MUST use this service.
 *
 * Handles:
 * - Tool queries and listings
 * - Tool statistics
 * - Tool subscriptions lookup
 */

import { createServiceClient, createServerClient } from '@/infrastructure/database/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  icon_url: string | null;
  cover_image_url: string | null;
  website_url: string | null;
  vendor_id: string;
  category: string | null;
  status: 'draft' | 'pending' | 'active' | 'suspended' | 'archived';
  is_featured: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ToolWithStats extends Tool {
  payingUsers: number;
  activeSubscriptions: number;
}

export interface ToolSubscription {
  id: string;
  user_id: string;
  tool_id: string;
  status: string;
  period: string | null;
  stripe_subscription_id: string | null;
  next_billing_date: string | null;
  created_at: string;
  cancelled_at: string | null;
}

// ============================================================================
// TOOL QUERIES
// ============================================================================

/**
 * Gets a tool by ID.
 */
export async function getToolById(toolId: string): Promise<Tool | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.from('tools').select('*').eq('id', toolId).single();

  if (error || !data) {
    return null;
  }

  return data as Tool;
}

/**
 * Gets a tool by slug.
 */
export async function getToolBySlug(slug: string): Promise<Tool | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.from('tools').select('*').eq('slug', slug).single();

  if (error || !data) {
    return null;
  }

  return data as Tool;
}

/**
 * Gets all active tools.
 */
export async function getActiveTools(): Promise<Tool[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Tools] Error fetching active tools:', error);
    return [];
  }

  return (data || []) as Tool[];
}

/**
 * Gets featured tools.
 */
export async function getFeaturedTools(): Promise<Tool[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Tools] Error fetching featured tools:', error);
    return [];
  }

  return (data || []) as Tool[];
}

/**
 * Gets tools by category.
 */
export async function getToolsByCategory(category: string): Promise<Tool[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('status', 'active')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Tools] Error fetching tools by category:', error);
    return [];
  }

  return (data || []) as Tool[];
}

/**
 * Gets tools owned by a vendor.
 */
export async function getToolsByVendor(vendorId: string): Promise<Tool[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Tools] Error fetching vendor tools:', error);
    return [];
  }

  return (data || []) as Tool[];
}

// ============================================================================
// TOOL STATISTICS
// ============================================================================

/**
 * Counts unique paying users for a tool.
 */
export async function countPayingUsers(toolId: string): Promise<number> {
  const supabase = createServiceClient();

  // Get subscription users
  const { data: subscriptionUsers, error: subError } = await supabase
    .from('tool_subscriptions')
    .select('user_id')
    .eq('tool_id', toolId);

  if (subError) {
    console.error('[Tools] Error fetching subscription users:', subError);
  }

  // Get one-time purchase users
  const { data: purchaseUsers, error: purchaseError } = await supabase
    .from('checkouts')
    .select('user_id, metadata')
    .eq('type', 'tool_purchase')
    .eq('status', 'completed');

  if (purchaseError) {
    console.error('[Tools] Error fetching purchase users:', purchaseError);
  }

  const userIds = new Set<string>();

  // Add subscription users
  subscriptionUsers?.forEach((sub) => {
    if (sub.user_id) {
      userIds.add(sub.user_id);
    }
  });

  // Add purchase users for this tool
  purchaseUsers?.forEach((purchase) => {
    if (purchase.user_id && purchase.metadata) {
      const metadata = purchase.metadata as Record<string, unknown>;
      if (metadata.tool_id === toolId) {
        userIds.add(purchase.user_id);
      }
    }
  });

  return userIds.size;
}

/**
 * Counts active subscriptions for a tool.
 */
export async function countActiveSubscriptions(toolId: string): Promise<number> {
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from('tool_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('tool_id', toolId)
    .in('status', ['active', 'trialing']);

  if (error) {
    console.error('[Tools] Error counting subscriptions:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Gets a tool with statistics.
 */
export async function getToolWithStats(toolId: string): Promise<ToolWithStats | null> {
  const tool = await getToolById(toolId);
  if (!tool) {
    return null;
  }

  const [payingUsers, activeSubscriptions] = await Promise.all([
    countPayingUsers(toolId),
    countActiveSubscriptions(toolId),
  ]);

  return {
    ...tool,
    payingUsers,
    activeSubscriptions,
  };
}

// ============================================================================
// USER SUBSCRIPTIONS
// ============================================================================

/**
 * Gets a user's subscription to a specific tool.
 */
export async function getUserToolSubscription(
  userId: string,
  toolId: string
): Promise<ToolSubscription | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('tool_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('tool_id', toolId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ToolSubscription;
}

/**
 * Gets all subscriptions for a user.
 */
export async function getUserSubscriptions(userId: string): Promise<ToolSubscription[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('tool_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Tools] Error fetching user subscriptions:', error);
    return [];
  }

  return (data || []) as ToolSubscription[];
}

/**
 * Gets active subscriptions for a user.
 */
export async function getUserActiveSubscriptions(userId: string): Promise<ToolSubscription[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('tool_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Tools] Error fetching active subscriptions:', error);
    return [];
  }

  return (data || []) as ToolSubscription[];
}

/**
 * Checks if user has access to a tool.
 */
export async function hasToolAccess(userId: string, toolId: string): Promise<boolean> {
  const subscription = await getUserToolSubscription(userId, toolId);
  return subscription !== null;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Cancels a subscription.
 */
export async function cancelSubscription(
  subscriptionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  // Verify ownership
  const { data: subscription, error: fetchError } = await supabase
    .from('tool_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !subscription) {
    return { success: false, error: 'Subscription not found' };
  }

  if (subscription.status === 'cancelled') {
    return { success: true };
  }

  // Update subscription status
  const { error: updateError } = await supabase
    .from('tool_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      metadata: {
        ...(subscription.metadata as Record<string, unknown>),
        cancel_at_period_end: true,
      },
    })
    .eq('id', subscriptionId);

  if (updateError) {
    console.error('[Tools] Error cancelling subscription:', updateError);
    return { success: false, error: 'Failed to cancel subscription' };
  }

  return { success: true };
}

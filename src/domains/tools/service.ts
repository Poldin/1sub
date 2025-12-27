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
// TOOL MUTATIONS
// ============================================================================

/**
 * Creates a new tool with automatic slug generation.
 */
export async function createTool(params: {
  name: string;
  short_description: string;
  description: string | null;
  website_url: string;
  vendor_id: string;
  icon_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  metadata: Record<string, unknown>;
  status?: 'draft' | 'pending' | 'active';
}): Promise<{ success: boolean; tool?: Tool; error?: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tools')
    .insert({
      ...params,
      status: params.status || 'draft',
      is_featured: false,
      // Backward compatibility - keep legacy fields in sync
      is_active: params.status === 'active',
      user_profile_id: params.vendor_id,
      url: params.website_url,
    })
    .select()
    .single();

  if (error) {
    console.error('[Tools] Error creating tool:', error);
    return { success: false, error: error.message };
  }

  return { success: true, tool: data as Tool };
}

/**
 * Updates a tool.
 */
export async function updateTool(
  toolId: string,
  updates: Partial<Omit<Tool, 'id' | 'created_at' | 'updated_at' | 'vendor_id'>>
): Promise<{ success: boolean; tool?: Tool; error?: string }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('tools')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      // Backward compatibility - keep legacy fields in sync
      ...(updates.website_url && { url: updates.website_url }),
      ...(updates.status && { is_active: updates.status === 'active' }),
    })
    .eq('id', toolId)
    .select()
    .single();

  if (error) {
    console.error('[Tools] Error updating tool:', error);
    return { success: false, error: error.message };
  }

  return { success: true, tool: data as Tool };
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
 * Batch count paying users for multiple tools.
 * More efficient than calling countPayingUsers multiple times.
 *
 * @param toolIds - Array of tool IDs to count users for
 * @returns Promise resolving to a Map of toolId → paying user count
 */
export async function batchCountPayingUsers(toolIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  // Initialize all counts to 0
  toolIds.forEach(id => counts.set(id, 0));

  if (toolIds.length === 0) {
    return counts;
  }

  try {
    const supabase = createServiceClient();

    // Get all subscriptions for these tools
    const { data: subscriptions, error: subError } = await supabase
      .from('tool_subscriptions')
      .select('tool_id, user_id')
      .in('tool_id', toolIds);

    if (subError) {
      console.error('[Tools] Error fetching subscriptions:', subError);
    }

    // Get all completed purchases
    const { data: purchases, error: purchaseError } = await supabase
      .from('checkouts')
      .select('user_id, metadata')
      .eq('type', 'tool_purchase');

    if (purchaseError) {
      console.error('[Tools] Error fetching purchases:', purchaseError);
    }

    // Track unique users per tool
    const usersByTool = new Map<string, Set<string>>();
    toolIds.forEach(id => usersByTool.set(id, new Set()));

    // Add subscription users
    if (subscriptions) {
      subscriptions.forEach((sub: { tool_id: string | null; user_id: string | null }) => {
        if (sub.tool_id && sub.user_id) {
          const userSet = usersByTool.get(sub.tool_id);
          if (userSet) {
            userSet.add(sub.user_id);
          }
        }
      });
    }

    // Add purchase users
    if (purchases) {
      purchases.forEach((purchase: { user_id: string | null; metadata: unknown }) => {
        if (purchase.user_id && purchase.metadata) {
          const metadata = purchase.metadata as Record<string, unknown>;
          if (metadata.tool_id && metadata.status === 'completed') {
            const userSet = usersByTool.get(metadata.tool_id as string);
            if (userSet) {
              userSet.add(purchase.user_id);
            }
          }
        }
      });
    }

    // Convert Sets to counts
    usersByTool.forEach((userSet, toolId) => {
      counts.set(toolId, userSet.size);
    });

    return counts;
  } catch (error) {
    console.error('[Tools] Error batch counting paying users:', error);
    return counts; // Return initialized counts (all 0) on error
  }
}

/**
 * Checks if a user is a paying user for a specific tool.
 * A "paying user" is someone who has either a subscription or a completed one-time purchase.
 *
 * @param userId - The user ID to check
 * @param toolId - The tool ID to check
 * @returns Promise resolving to true if user has paid for the tool
 */
export async function isPayingUser(userId: string, toolId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    // Check for subscription
    const { data: subscription } = await supabase
      .from('tool_subscriptions')
      .select('id')
      .eq('tool_id', toolId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (subscription) {
      return true;
    }

    // Check for completed purchase
    const { data: purchases } = await supabase
      .from('checkouts')
      .select('id, metadata')
      .eq('type', 'tool_purchase')
      .eq('user_id', userId);

    if (purchases && purchases.length > 0) {
      return purchases.some((p: { metadata: unknown }) => {
        const metadata = p.metadata as Record<string, unknown>;
        return metadata?.tool_id === toolId && metadata?.status === 'completed';
      });
    }

    return false;
  } catch (error) {
    console.error('[Tools] Error checking paying user status:', error);
    return false;
  }
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

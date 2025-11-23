/**
 * Tool Payment Counting Utility
 * 
 * Counts unique paying users for tools by querying:
 * 1. tool_subscriptions - All subscriptions (active or cancelled)
 * 2. checkouts - Completed one-time purchases
 * 
 * Users are deduplicated across both sources.
 */

import { createClient } from '@/lib/supabase/client';

interface CheckoutMetadata {
    tool_id?: string;
    status?: string;
    [key: string]: unknown;
}

/**
 * Count unique paying users for a specific tool
 * A "paying user" is someone who has either:
 * - A subscription (any status) in tool_subscriptions
 * - A completed one-time purchase in checkouts
 * 
 * @param toolId - The tool ID to count users for
 * @returns Promise resolving to the count of unique paying users
 */
export async function countPayingUsersForTool(toolId: string): Promise<number> {
    try {
        const supabase = createClient();

        // Get unique user IDs from subscriptions
        const { data: subscriptionUsers, error: subError } = await supabase
            .from('tool_subscriptions')
            .select('user_id')
            .eq('tool_id', toolId);

        if (subError) {
            console.error('Error fetching subscription users:', subError);
        }

        // Get unique user IDs from completed one-time purchases
        const { data: purchaseUsers, error: purchaseError } = await supabase
            .from('checkouts')
            .select('user_id, metadata')
            .eq('type', 'tool_purchase');

        if (purchaseError) {
            console.error('Error fetching purchase users:', purchaseError);
        }

        // Collect all unique user IDs
        const userIdSet = new Set<string>();

        // Add subscription users
        if (subscriptionUsers) {
            subscriptionUsers.forEach((sub: { user_id: string | null }) => {
                if (sub.user_id) {
                    userIdSet.add(sub.user_id);
                }
            });
        }

        // Add purchase users (filter by tool_id and completed status in metadata)
        if (purchaseUsers) {
            purchaseUsers.forEach((purchase: { user_id: string | null; metadata: unknown }) => {
                if (purchase.user_id && purchase.metadata) {
                    const metadata = purchase.metadata as CheckoutMetadata;
                    if (metadata.tool_id === toolId && metadata.status === 'completed') {
                        userIdSet.add(purchase.user_id);
                    }
                }
            });
        }

        return userIdSet.size;
    } catch (error) {
        console.error('Error counting paying users:', error);
        return 0; // Default to 0 on error
    }
}

/**
 * Batch count paying users for multiple tools
 * More efficient than calling countPayingUsersForTool multiple times
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
        const supabase = createClient();

        // Get all subscriptions for these tools
        const { data: subscriptions, error: subError } = await supabase
            .from('tool_subscriptions')
            .select('tool_id, user_id')
            .in('tool_id', toolIds);

        if (subError) {
            console.error('Error fetching subscriptions:', subError);
        }

        // Get all completed purchases
        const { data: purchases, error: purchaseError } = await supabase
            .from('checkouts')
            .select('user_id, metadata')
            .eq('type', 'tool_purchase');

        if (purchaseError) {
            console.error('Error fetching purchases:', purchaseError);
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
                    const metadata = purchase.metadata as CheckoutMetadata;
                    if (metadata.tool_id && metadata.status === 'completed') {
                        const userSet = usersByTool.get(metadata.tool_id);
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
        console.error('Error batch counting paying users:', error);
        return counts; // Return initialized counts (all 0) on error
    }
}

/**
 * Helper to check if a user is a paying user for a specific tool
 * @param userId - The user ID to check
 * @param toolId - The tool ID to check
 * @returns Promise resolving to true if user has paid for the tool
 */
export async function isPayingUser(userId: string, toolId: string): Promise<boolean> {
    try {
        const supabase = createClient();

        // Check for subscription
        const { data: subscription } = await supabase
            .from('tool_subscriptions')
            .select('id')
            .eq('tool_id', toolId)
            .eq('user_id', userId)
            .limit(1)
            .single();

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
                const metadata = p.metadata as CheckoutMetadata;
                return metadata?.tool_id === toolId && metadata?.status === 'completed';
            });
        }

        return false;
    } catch (error) {
        console.error('Error checking paying user status:', error);
        return false;
    }
}

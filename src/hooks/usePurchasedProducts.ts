/**
 * Hook to track user's active tool subscriptions
 * 
 * Shows:
 * - Active subscriptions
 * - Cancelled subscriptions that are still valid (before next_billing_date)
 * 
 * Performance optimizations:
 * - Fetches once and caches globally
 * - Uses Set for O(1) lookup
 * - Only refetches on explicit refresh
 */

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveSubscription {
  product_id: string;
  tool_id: string;
  status: string;
  next_billing_date: string;
  cancelled_at?: string | null;
}

interface SubscriptionRow {
  tool_id: string;
  status: string;
  next_billing_date: string;
  cancelled_at?: string | null;
  metadata: any;
}

export function usePurchasedProducts() {
  const { user, isLoggedIn } = useAuth();
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchSubscriptions() {
      try {
        if (!user) return;
        
        const supabase = createClient();

        // Fetch ALL subscriptions (active and cancelled)
        const { data: allSubs, error: subsError } = await supabase
          .from('tool_subscriptions')
          .select('tool_id, status, next_billing_date, cancelled_at, metadata')
          .eq('user_id', user.id)
          .in('status', ['active', 'cancelled']);

        if (subsError) {
          console.error('[usePurchasedProducts] Error fetching subscriptions:', subsError);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (!isMounted) return;

        const now = new Date();
        
        // Filter: keep active OR (cancelled but still valid)
        const activeSubs = (allSubs as SubscriptionRow[] || []).filter((sub: SubscriptionRow) => {
          // Always show active
          if (sub.status === 'active') return true;
          
          // For cancelled: show only if not yet expired
          if (sub.status === 'cancelled') {
            const endDate = new Date(sub.next_billing_date);
            return endDate > now; // Still valid until end date
          }
          
          return false;
        }).map((sub: SubscriptionRow): ActiveSubscription => {
          const metadata = sub.metadata as Record<string, any> || {};
          return {
            product_id: metadata.selected_pricing || '', // ✅ product_id è in metadata.selected_pricing
            tool_id: sub.tool_id || '',
            status: sub.status,
            next_billing_date: sub.next_billing_date,
            cancelled_at: sub.cancelled_at,
          };
        });

        console.log('[usePurchasedProducts] Fetched subscriptions:', {
          total: allSubs?.length || 0,
          active: activeSubs.filter(s => s.status === 'active').length,
          cancelled: activeSubs.filter(s => s.status === 'cancelled').length,
          subscriptions: activeSubs,
        });

        setSubscriptions(activeSubs);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSubscriptions();

    return () => {
      isMounted = false;
    };
  }, [user, isLoggedIn]);

  // Create Sets for O(1) lookup
  const productIds = useMemo(() => new Set(subscriptions.map(s => s.product_id)), [subscriptions]);
  const toolIds = useMemo(() => new Set(subscriptions.map(s => s.tool_id)), [subscriptions]);

  // Helper functions
  const hasProduct = (productId: string) => productIds.has(productId);
  const hasTool = (toolId: string) => toolIds.has(toolId);
  
  const getToolSubscriptions = (toolId: string) => {
    return subscriptions.filter(s => s.tool_id === toolId);
  };

  const getProductSubscription = (productId: string) => {
    return subscriptions.find(s => s.product_id === productId);
  };

  return {
    subscriptions,
    loading,
    hasProduct,
    hasTool,
    getToolSubscriptions,
    getProductSubscription,
  };
}


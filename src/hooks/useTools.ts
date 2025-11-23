'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { Tool } from '@/lib/tool-types';
import { batchCountPayingUsers } from '@/lib/tool-payments';

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetcher function for SWR to get tools from Supabase
 * Fetches all tool data with products for complete information
 * Enriches each tool with paying user counts for dynamic phase calculation
 */
async function fetchTools(): Promise<Tool[]> {
  try {
    const supabase = createClient();

    const { data: toolsData, error: fetchError } = await supabase
      .from('tools')
      .select(`
        *,
        products:tool_products(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      // Check if it's a refresh token error
      const errorMessage = fetchError.message || fetchError.toString() || '';
      if (
        errorMessage.includes('Refresh Token') ||
        errorMessage.includes('refresh_token') ||
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found')
      ) {
        console.warn('Invalid refresh token detected in fetchTools, clearing session');
        // Clear session and cookies
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutError) {
          // Ignore sign out errors
        }
        // Return empty array instead of throwing
        return [];
      }

      console.error('Error fetching tools:', fetchError);
      throw new Error(`Failed to load tools: ${fetchError.message}`);
    }

    // Enrich tools with paying user counts for dynamic phase calculation
    if (toolsData && toolsData.length > 0) {
      try {
        const toolIds = toolsData.map((t: Tool) => t.id);
        const payingUserCounts = await batchCountPayingUsers(toolIds);

        // Add paying user count to each tool's metadata
        return toolsData.map((tool: Tool) => ({
          ...tool,
          metadata: {
            ...tool.metadata,
            paying_user_count: payingUserCounts.get(tool.id) ?? 0
          }
        }));
      } catch (countError) {
        console.error('Error counting paying users, continuing without counts:', countError);
        // Return tools without counts on error (will default to Alpha phase)
        return toolsData;
      }
    }

    return toolsData || [];
  } catch (err) {
    // Check if it's a refresh token error (including AuthApiError)
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorName = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';

    if (
      errorName === 'AuthApiError' ||
      errorMessage.includes('Refresh Token') ||
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('Invalid Refresh Token') ||
      errorMessage.includes('Refresh Token Not Found')
    ) {
      console.warn('Refresh token error in fetchTools, clearing session and returning empty array');
      // Try to clear session - use the helper from client.ts if available
      try {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: 'local' });
      } catch (clearError) {
        // Ignore errors - cookies will be cleared by the global handler
      }
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }

    console.error('Unexpected error in fetchTools:', err);
    throw err;
  }
}

/**
 * Custom hook to fetch tools from Supabase with SWR caching
 * Provides tools data with loading and error states
 * Automatically caches and revalidates data
 * Can be reused across components for consistent data fetching
 */
export function useTools(): UseToolsReturn {
  const { data, error, isLoading, mutate } = useSWR<Tool[]>(
    'tools-list',
    fetchTools,
    {
      // Cache for 5 minutes, revalidate on focus
      dedupingInterval: 300000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Retry on error with exponential backoff
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Don't throw errors, handle them gracefully
      shouldRetryOnError: true,
      onError: (err) => {
        console.error('SWR error fetching tools:', err);
      },
    }
  );

  return {
    tools: data || [],
    loading: isLoading,
    error: error ? (error.message || 'Failed to load tools') : null,
    refetch: async () => {
      await mutate();
    },
  };
}

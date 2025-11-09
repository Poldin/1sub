'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { Tool } from '@/lib/tool-types';

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetcher function for SWR to get tools from Supabase
 * Fetches all tool data with products for complete information
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
      console.error('Error fetching tools:', fetchError);
      throw new Error(`Failed to load tools: ${fetchError.message}`);
    }

    return toolsData || [];
  } catch (err) {
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


'use client';

import useSWR from 'swr';
import { Tool } from '@/lib/tool-types';

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetcher function for SWR to get tools from the public API
 * Fetches all tool data with products for complete information
 * Uses server-side API to avoid RLS and auth token issues on mobile devices
 */
async function fetchTools(): Promise<Tool[]> {
  try {
    const response = await fetch('/api/public/tools', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      console.error('Error fetching tools from API:', errorData);
      throw new Error(errorData.error || `Failed to load tools: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tools || [];
  } catch (err) {
    console.error('Unexpected error in fetchTools:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to load tools: ${errorMessage}`);
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
      // Retry on error with exponential backoff - limited retries for mobile
      errorRetryCount: 2, // Reduced from 3 to prevent infinite loading on mobile
      errorRetryInterval: 3000, // Reduced from 5000 for faster feedback
      // Custom retry logic to prevent infinite retries on mobile
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry if we've exceeded max retries
        if (retryCount >= 2) {
          console.warn('Max retry count reached for tools fetch');
          return;
        }
        // Don't retry for specific errors that won't be fixed by retrying
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          console.warn('Network error, limiting retries:', error.message);
        }
        // Retry with exponential backoff
        setTimeout(() => revalidate({ retryCount }), 3000 * (retryCount + 1));
      },
      // Don't throw errors, handle them gracefully
      shouldRetryOnError: true,
      onError: (err) => {
        console.error('[useTools] SWR error fetching tools:', err);
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

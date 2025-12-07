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
 * Optimized with timeout for slow networks
 */
async function fetchTools(): Promise<Tool[]> {
  try {
    // Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('/api/public/tools', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      console.error('Error fetching tools from API:', errorData);
      
      // Provide friendlier error message for authentication issues
      if (response.status === 401) {
        throw new Error('Unable to load tools at this time. Please try again later.');
      }
      
      throw new Error(errorData.error || `Failed to load tools: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tools || [];
  } catch (err) {
    // Handle abort errors gracefully
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Tools fetch timed out:', err);
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
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
      // Cache for 5 minutes to reduce network requests on mobile
      dedupingInterval: 300000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Keep previous data while revalidating for better UX
      keepPreviousData: true,
      // Reduced retries for mobile - fail fast to show error state
      errorRetryCount: 2,
      errorRetryInterval: 2000, // Reduced to 2 seconds
      // Custom retry logic optimized for mobile
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry if we've exceeded max retries
        if (retryCount >= 2) {
          console.warn('[useTools] Max retry count reached');
          return;
        }
        // Don't retry for timeout or network errors - show error state instead
        if (error.message?.includes('timed out') || 
            error.message?.includes('network') || 
            error.message?.includes('fetch')) {
          console.warn('[useTools] Network/timeout error, stopping retries:', error.message);
          return;
        }
        // Retry with backoff
        setTimeout(() => revalidate({ retryCount }), 2000 * (retryCount + 1));
      },
      shouldRetryOnError: true,
      onError: (err) => {
        console.error('[useTools] SWR error:', err.message);
      },
      onSuccess: (data) => {
        console.log('[useTools] Successfully loaded', data?.length || 0, 'tools');
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

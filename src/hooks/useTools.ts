'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tool } from '@/lib/tool-types';

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch tools from Supabase
 * Provides tools data with loading and error states
 * Can be reused across components for consistent data fetching
 */
export function useTools(): UseToolsReturn {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = async () => {
    try {
      setLoading(true);
      setError(null);

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
        setError('Failed to load tools');
        return;
      }

      setTools(toolsData || []);
    } catch (err) {
      console.error('Unexpected error fetching tools:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  return {
    tools,
    loading,
    error,
    refetch: fetchTools,
  };
}


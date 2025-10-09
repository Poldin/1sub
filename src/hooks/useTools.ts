import { useEffect, useState } from 'react';

export interface ToolItem { 
  id: string; 
  name: string; 
  description: string;
  credit_cost_per_use: number;
  is_active: boolean;
  url: string;
  created_at: string;
  updated_at: string;
}

export function useTools() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/v1/tools');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }
        
        const data = await response.json();
        setTools(data.tools || []);
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tools');
        setTools([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  return { tools, loading, error };
}



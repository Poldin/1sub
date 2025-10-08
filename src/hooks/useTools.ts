import { useEffect, useState } from 'react';

export interface ToolItem { id: string; name: string; url: string }

export function useTools() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: fetch from API later
    setTools([]);
    setLoading(false);
  }, []);

  return { tools, loading };
}



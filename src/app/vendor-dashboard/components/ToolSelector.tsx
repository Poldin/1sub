'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Tool {
  id: string;
  name: string;
}

interface ToolSelectorProps {
  userId: string;
  currentToolId?: string;
}

export default function ToolSelector({ userId, currentToolId }: ToolSelectorProps) {
  const router = useRouter();
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToolId, setSelectedToolId] = useState<string>('');

  useEffect(() => {
    const fetchTools = async () => {
      if (!userId) return;
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tools')
          .select('id, name')
          .eq('user_profile_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setTools(data);
          
          // Priority: currentToolId > localStorage > first tool
          if (currentToolId) {
            setSelectedToolId(currentToolId);
            localStorage.setItem('selectedToolId', currentToolId);
          } else {
            const savedToolId = localStorage.getItem('selectedToolId');
            // Check if saved tool still exists
            const toolExists = savedToolId && data.some(tool => tool.id === savedToolId);
            setSelectedToolId(toolExists ? savedToolId : data[0].id);
            // Update localStorage if we're using the first tool
            if (!toolExists) {
              localStorage.setItem('selectedToolId', data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching tools:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTools();
  }, [userId, currentToolId]);

  const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === 'create-new') {
      router.push('/vendor-dashboard/publish');
    } else if (value) {
      // Save selection to localStorage
      localStorage.setItem('selectedToolId', value);
      setSelectedToolId(value);
      router.push(`/vendor-dashboard/tools/${value}/edit`);
    }
  };

  if (isLoading || tools.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <select
        value={selectedToolId}
        onChange={handleToolChange}
        className="appearance-none bg-[#1f2937] border border-[#374151] text-[#ededed] text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent hover:bg-[#374151] transition-colors cursor-pointer min-w-[180px]"
      >
        {tools.map((tool) => (
          <option key={tool.id} value={tool.id}>
            {tool.name}
          </option>
        ))}
        <option value="create-new" className="text-[#3ecf8e] font-semibold">
          + Create New Tool
        </option>
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
    </div>
  );
}


'use client';

import { useState, useEffect, useMemo } from 'react';
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
  onToolChange?: (toolId: string, toolName: string) => void;
  onToolsFetched?: (tools: Tool[]) => void;
  refreshToken?: number;
}

export default function ToolSelector({
  userId,
  currentToolId,
  onToolChange,
  onToolsFetched,
  refreshToken = 0,
}: ToolSelectorProps) {
  const router = useRouter();
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToolId, setSelectedToolId] = useState<string>('');

  useEffect(() => {
    const fetchTools = async () => {
      if (!userId) return;

      try {
        // Use the server-side API endpoint for consistent, secure tool fetching
        const response = await fetch('/api/vendor/tools');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tools');
        }
        
        const result = await response.json();
        const data = result.tools;

        if (data) {
          setTools(data);
          onToolsFetched?.(data);

          if (data.length === 0) {
            setSelectedToolId('');
            localStorage.removeItem('selectedToolId');
            return;
          }

          // Priority: currentToolId > localStorage > first tool
          let initialToolId: string | null = null;

          if (currentToolId && data.some((tool: Tool) => tool.id === currentToolId)) {
            initialToolId = currentToolId;
          } else {
            const savedToolId = localStorage.getItem('selectedToolId');
            const toolExists = savedToolId && data.some((tool: Tool) => tool.id === savedToolId);
            initialToolId = toolExists ? savedToolId! : data[0].id;
          }

          if (initialToolId) {
            setSelectedToolId(initialToolId);
            localStorage.setItem('selectedToolId', initialToolId);
            const initialTool = data.find((tool: Tool) => tool.id === initialToolId);
            if (initialTool && onToolChange) {
              onToolChange(initialTool.id, initialTool.name);
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
  }, [userId, currentToolId, refreshToken]);

  const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'create-new') {
      router.push('/vendor-dashboard/publish');
    } else if (value) {
      // Save selection to localStorage
      localStorage.setItem('selectedToolId', value);
      setSelectedToolId(value);

      // Find the tool name and call the callback
      const selectedTool = tools.find((tool: Tool) => tool.id === value);
      if (selectedTool && onToolChange) {
        onToolChange(value, selectedTool.name);
      }
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
        className="appearance-none bg-[#1f2937] border border-[#374151] text-[#ededed] text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent hover:bg-[#374151] transition-colors cursor-pointer min-w-[200px]"
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


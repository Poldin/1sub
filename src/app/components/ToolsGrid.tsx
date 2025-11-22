'use client';

import { useState } from 'react';
import { Tool } from '@/lib/tool-types';
import { useTools } from '@/hooks/useTools';
import ToolCard from './ToolCard';
import ToolDialog from './ToolDialog';

interface ToolsGridProps {
  onToolLaunch?: (toolId: string) => void;
  highlightedToolId?: string | null;
  searchTerm?: string;
  tools?: Tool[]; // Optional: allow passing tools directly
  loading?: boolean;
  error?: string | null;
}

export default function ToolsGrid({
  onToolLaunch,
  highlightedToolId,
  searchTerm = '',
  tools: externalTools,
  loading: externalLoading,
  error: externalError
}: ToolsGridProps) {
  // Use provided tools or fetch internally
  const internalData = useTools();
  const tools = externalTools ?? internalData.tools;
  const toolsLoading = externalLoading ?? internalData.loading;
  const toolsError = externalError ?? internalData.error;

  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter tools based on search term
  const filteredTools = tools.filter(tool => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const matchesName = tool.name.toLowerCase().includes(searchLower);
    const matchesDescription = tool.description?.toLowerCase().includes(searchLower);
    const matchesTags = tool.metadata?.ui?.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    return matchesName || matchesDescription || matchesTags;
  });

  // Handle tool card click to open dialog
  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool);
    setIsDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedTool(null), 300); // Delay clearing to allow animation
  };

  // Handle launch/start click
  const handleLaunchClick = (tool: Tool) => {
    if (onToolLaunch) {
      onToolLaunch(tool.id);
    } else {
      // Default behavior: open dialog
      setSelectedTool(tool);
      setIsDialogOpen(true);
    }
  };

  // Loading State
  if (toolsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading tools...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (toolsError && !toolsLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-2">Error loading tools</p>
        <p className="text-[#9ca3af] text-sm">{toolsError}</p>
      </div>
    );
  }

  // Empty State
  if (!toolsLoading && !toolsError && filteredTools.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#9ca3af] text-lg">
          {searchTerm ? 'No tools found matching your search' : 'No tools available yet'}
        </p>
        <p className="text-[#6b7280] text-sm mt-2">
          {searchTerm ? 'Try a different search term' : 'Check back soon for new tools!'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-4 sm:gap-6">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            id={`tool-${tool.id}`}
            className="w-80 sm:w-[22rem]"
          >
            <ToolCard
              tool={tool}
              mode="marketing"
              onViewClick={() => handleToolClick(tool)}
              onLaunchClick={() => handleLaunchClick(tool)}
              isHighlighted={highlightedToolId === tool.id}
            />
          </div>
        ))}
      </div>

      {/* Tool Dialog */}
      {selectedTool && (
        <ToolDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          tool={selectedTool}
          onToolLaunch={onToolLaunch}
        />
      )}
    </>
  );
}


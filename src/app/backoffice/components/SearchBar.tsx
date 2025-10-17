'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ExternalLink } from 'lucide-react';

// Mock data
const mockTools = [
  { id: '1', name: 'AI Assistant', description: 'Advanced AI tool for productivity', credits: 5 },
  { id: '2', name: 'Data Analyzer', description: 'Analyze your data with ease', credits: 10 },
  { id: '3', name: 'Content Generator', description: 'Generate amazing content', credits: 8 },
  { id: '4', name: 'Image Editor', description: 'Edit images professionally', credits: 6 },
  { id: '5', name: 'Video Creator', description: 'Create stunning videos', credits: 15 },
  { id: '6', name: 'SEO Optimizer', description: 'Optimize your content for search engines', credits: 7 },
  { id: '7', name: 'Code Analyzer', description: 'Analyze and improve your code', credits: 12 },
  { id: '8', name: 'Text to Speech', description: 'Convert text to natural speech', credits: 4 },
];

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredResults, setFilteredResults] = useState(mockTools);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter results based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = mockTools.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredResults(filtered);
      setIsOpen(true);
    } else {
      setFilteredResults(mockTools);
      setIsOpen(false);
    }
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToolClick = (toolId: string) => {
    console.log('Tool clicked:', toolId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="flex-1 min-w-0 max-w-xs sm:max-w-sm lg:max-w-2xl lg:mx-auto" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery && setIsOpen(true)}
          className="w-full px-3 py-1.5 sm:py-2 pl-8 bg-[#1f2937] border border-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-[#ededed] text-sm"
        />
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
          <Search className="w-4 h-4" />
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1f2937] border border-[#374151] rounded-lg shadow-xl max-h-96 overflow-y-auto z-[60]">
            {filteredResults.length > 0 ? (
              <div className="py-2">
                {filteredResults.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    className="w-full px-4 py-3 hover:bg-[#374151] transition-colors text-left flex items-start gap-3 group"
                  >
                    <div className="bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] p-2 rounded-lg flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-[#ededed] group-hover:text-[#3ecf8e] transition-colors mb-1">
                        {tool.name}
                      </h4>
                      <p className="text-xs text-[#9ca3af] line-clamp-1">
                        {tool.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[#9ca3af]">
                <p className="text-sm">No tools found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


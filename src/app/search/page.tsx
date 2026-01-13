'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolCard_SEO from '../components/ToolCard_SEO';
import ToolCardSkeleton from '../components/ToolCardSkeleton';
import { useTools } from '@/hooks/useTools';

function SearchContent() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Fetch tools from database
  const { tools, loading, error, refetch } = useTools();

  // Initialize search term from URL parameter if present
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchTerm(query);
    }
  }, [searchParams]);

  // Add timeout mechanism for slow networks
  useEffect(() => {
    if (loading && tools.length === 0) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);

      return () => {
        clearTimeout(timer);
        setLoadingTimeout(false);
      };
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, tools.length]);

  // Filter tools based on search term
  const filteredTools = useMemo(() => {
    if (!searchTerm) return tools;
    const searchLower = searchTerm.toLowerCase();
    return tools.filter(tool => {
      const matchesName = tool.name.toLowerCase().includes(searchLower);
      const matchesDescription = tool.description?.toLowerCase().includes(searchLower);
      const matchesTags = tool.metadata?.ui?.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      return matchesName || matchesDescription || matchesTags;
    });
  }, [tools, searchTerm]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] pb-40 sm:pb-0 overflow-x-hidden w-full">
      <Header />

      {/* Search Section */}
      <section className="py-8 md:py-12 lg:py-16 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">

          {/* Search Bar */}
          <div className="mb-8 max-w-3xl mx-auto">
            <div className="relative mb-6 group">
              <input 
                type="text" 
                placeholder="Search tools and services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 pl-14 bg-[#1f2937] border-2 border-[#374151] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e] text-[#ededed] text-lg transition-all group-hover:border-[#3ecf8e]/50"
                autoFocus
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#3ecf8e] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#ededed] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Category Pills */}
            <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-2">
              {['AI', 'Design', 'Analytics', 'Video', 'Marketing', 'Code'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSearchTerm(category)}
                  className={`group/cat flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    searchTerm === category
                      ? 'bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-white shadow-lg shadow-[#3ecf8e]/30'
                      : 'bg-[#1f2937] border border-[#374151] text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] hover:text-[#3ecf8e]'
                  }`}
                >
                  {category}
                </button>
              ))}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-[#374151] text-[#d1d5db] hover:bg-[#3ecf8e] hover:text-white transition-all duration-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Loading State - Show skeleton cards */}
          {loading && tools.length === 0 && !loadingTimeout && !error && (
            <div className="mb-8 mt-8">
              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center px-0 sm:px-0">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={`skeleton-${i}`} className="w-full sm:w-[22rem]">
                    <ToolCardSkeleton />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Timeout State */}
          {loadingTimeout && tools.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <svg className="w-12 h-12 text-yellow-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-yellow-400 mb-2 font-semibold">Taking longer than expected</p>
              </div>
              <p className="text-[#9ca3af] text-sm mb-4 max-w-md mx-auto">
                The tools are taking a while to load. This might be due to a slow network connection or server delay.
              </p>
              <button
                onClick={() => {
                  setLoadingTimeout(false);
                  refetch();
                }}
                className="px-6 py-3 bg-[#3ecf8e] text-black rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Error State */}
          {error && !loading && !loadingTimeout && (
            <div className="text-center py-12">
              <div className="inline-block p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 mb-2 font-semibold">Error loading tools</p>
              </div>
              <p className="text-[#9ca3af] text-sm mb-4 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => refetch()}
                className="px-6 py-3 bg-[#3ecf8e] text-black rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tools Grid */}
          {!loadingTimeout && !error && filteredTools.length > 0 && (
            <div className="mb-8 mt-8">
              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center px-0 sm:px-0">
                {filteredTools.map((tool) => (
                  <div key={tool.id} className="w-full sm:w-[22rem]">
                    <ToolCard_SEO 
                      tool={tool} 
                      mode="marketing"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Empty State - when no tools available */}
          {!loading && !error && !loadingTimeout && filteredTools.length === 0 && tools.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-4 mb-4 bg-[#374151]/30 border border-[#374151] rounded-lg">
                <svg className="w-12 h-12 text-[#9ca3af] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-[#9ca3af] text-lg mb-2">No tools available yet</p>
              </div>
              <p className="text-[#6b7280] text-sm">Check back soon for new tools!</p>
            </div>
          )}

          {/* Empty Search Results */}
          {!loading && !loadingTimeout && filteredTools.length === 0 && tools.length > 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-4 mb-4 bg-[#374151]/30 border border-[#374151] rounded-lg">
                <svg className="w-12 h-12 text-[#9ca3af] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-[#9ca3af] text-lg mb-2">No tools found matching your search</p>
              </div>
              <p className="text-[#6b7280] text-sm mb-4">Try a different search term or clear your search</p>
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-[#3ecf8e] text-black rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
              >
                Show All Tools
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3ecf8e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

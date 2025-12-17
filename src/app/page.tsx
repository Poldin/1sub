'use client';

import { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from './components/Header';
import Footer from './components/Footer';
import ToolCard from './components/ToolCard';
import ToolCardSkeleton from './components/ToolCardSkeleton';
import PricingExplainer from './components/PricingExplainer';
import TrustIndicators from './components/TrustIndicators';
import { useTools } from '@/hooks/useTools';
import { Tool } from '@/lib/tool-types';
import { useAuth } from '@/contexts/AuthContext';

// Lazy-load del ToolDialog per ridurre il bundle iniziale
const ToolDialog = lazy(() => import('./components/ToolDialog'));

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Get auth state from context
  const { isLoggedIn } = useAuth();
  
  // Fetch tools from database
  const { tools, loading, error, refetch } = useTools();

  // Add timeout mechanism for slow networks (especially mobile)
  // Reduced timeout to 10 seconds for better mobile UX
  useEffect(() => {
    if (loading && tools.length === 0) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // Reduced from 15000 to 10000

      return () => {
        clearTimeout(timer);
        setLoadingTimeout(false);
      };
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, tools.length]);

  // Handle shared tool link - open tool dialog if tid parameter is present
  useEffect(() => {
    const tid = searchParams.get('tid');
    if (tid && tools.length > 0 && !loading) {
      const sharedTool = tools.find(tool => tool.id === tid);
      if (sharedTool) {
        setSelectedToolId(tid);
        setIsDialogOpen(true);
        // Clean up URL without reloading the page
        window.history.replaceState({}, '', '/');
      }
    }
  }, [searchParams, tools, loading]);

  // Trova il tool selezionato dal ID per evitare riferimenti instabili
  // Questo evita re-render quando SWR ricarica i dati ma il tool è lo stesso
  const selectedTool = useMemo(() => {
    if (!selectedToolId) return null;
    return tools.find(tool => tool.id === selectedToolId) || null;
  }, [tools, selectedToolId]);

  // Filter tools based on search term - MEMOIZED per evitare ricalcoli
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

  // Handle tool card click to open dialog - MEMOIZED callback
  // Usa solo l'ID per evitare problemi con riferimenti instabili
  const handleToolClick = useCallback((tool: Tool) => {
    setSelectedToolId(tool.id);
    setIsDialogOpen(true);
  }, []);

  // Create stable callback map for tools to avoid re-renders
  // This ensures each ToolCard gets a stable callback reference
  const toolClickCallbacks = useMemo(() => {
    const map = new Map<string, () => void>();
    filteredTools.forEach(tool => {
      map.set(tool.id, () => handleToolClick(tool));
    });
    return map;
  }, [filteredTools, handleToolClick]);

  // Handle dialog close - MEMOIZED callback
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    // Delay clearing to allow animation - usa l'ID invece dell'oggetto
    setTimeout(() => setSelectedToolId(null), 300);
  }, []);

  // Handle tool launch - creates checkout and navigates
  const handleToolLaunch = useCallback(async (toolId: string, selectedProductId?: string) => {
    try {
      // Check authentication first
      const profileResponse = await fetch('/api/user/profile');
      
      if (profileResponse.status === 401) {
        // Not authenticated - redirect to login with tool info
        router.push(`/login?redirect=/&tool=${toolId}`);
        return;
      }

      if (!profileResponse.ok) {
        alert('Failed to verify authentication. Please try again.');
        return;
      }

      // Create checkout session
      const checkoutResponse = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_id: toolId,
          selected_product_id: selectedProductId,
        }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        alert(errorData.error || 'Failed to create checkout');
        return;
      }

      const { checkout_id } = await checkoutResponse.json();

      // Open checkout page in a new tab
      const checkoutUrl = `/credit_checkout/${checkout_id}`;
      window.open(checkoutUrl, '_blank');
    } catch (error) {
      console.error('Error launching tool:', error);
      alert('An error occurred. Please try again.');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] pb-40 sm:pb-0 overflow-x-hidden w-full">
      {/* Mobile Sticky CTA - Bottom - z-index set to not interfere with cards */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-30 sm:hidden pointer-events-none">
        <a
          href={isLoggedIn ? "/backoffice" : "/login"}
          className="flex items-center justify-center w-full px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full shadow-lg shadow-[#3ecf8e]/30 active:scale-95 transition-transform pointer-events-auto"
        >
          <span className="flex items-center gap-2">
            {isLoggedIn ? "Enter!" : "get started now"}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </a>
      </div>

      <Header />

      {/* Hero Section */}
      <section className="relative section-padding text-center overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3ecf8e]/10 via-[#0a0a0a] to-[#2dd4bf]/10 animate-gradient opacity-50"></div>
        
        {/* Floating Particles Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#3ecf8e] rounded-full opacity-60 animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-[#2dd4bf] rounded-full opacity-40 animate-float delay-200"></div>
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-[#3ecf8e] rounded-full opacity-50 animate-float delay-400"></div>
          <div className="absolute top-2/3 right-1/3 w-3 h-3 bg-[#2dd4bf] rounded-full opacity-30 animate-float delay-300"></div>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in-up opacity-0">
            1 subscription,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] animate-gradient">
              countless tools
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-[#d1d5db] max-w-3xl mx-auto mb-8 leading-relaxed animate-fade-in-up delay-200 opacity-0">
            access a vast collection of tools with 1 single subscription. 
          </p>
          
          <div className="animate-fade-in-up delay-400 opacity-0">
            <a
              href={isLoggedIn ? "/backoffice" : "/login"}
              id="join"
              className="group relative inline-flex items-center justify-center px-10 py-5 text-lg sm:text-xl font-bold bg-transparent border-2 border-[#3ecf8e] rounded-full transition-all duration-300 hover:scale-105 animate-pulse-glow active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-3 text-[#3ecf8e]">
                {isLoggedIn ? "Enter!" : "join us today!"}
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
          </div>

          {/* Trust Indicators Mini */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-4 text-sm text-[#9ca3af] animate-fade-in-up delay-500 opacity-0">
            <div className="flex items-center gap-2">
              <span>secure & trusted</span>
            </div>
            <div className="flex items-center gap-2">
              <span>cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Explainer Section */}
      <section className="section-padding">
        <PricingExplainer />
      </section>

      {/* Tools Showcase - Extra padding on mobile for sticky CTA */}
      <section className="py-0 md:py-10 lg:py-16 bg-[#0a0a0a] pb-28 sm:pb-16">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          
          {/* Search Bar */}
          <div className="mb-8 max-w-3xl mx-auto" suppressHydrationWarning>
            <div className="text-center mb-4">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">explore our tools</h2>
              <p className="text-[#9ca3af]">search by name, category, or feature</p>
            </div>

            <div className="relative mb-6 group">
              <input 
                type="text" 
                placeholder="Search tools and services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 pl-14 bg-[#1f2937] border-2 border-[#374151] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e] text-[#ededed] text-lg transition-all group-hover:border-[#3ecf8e]/50"
                suppressHydrationWarning
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
            <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-2" suppressHydrationWarning>
              {['AI', 'Design', 'Analytics', 'Video', 'Marketing', 'Code'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSearchTerm(category)}
                  className={`group/cat flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    searchTerm === category
                      ? 'bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-white shadow-lg shadow-[#3ecf8e]/30'
                      : 'bg-[#1f2937] border border-[#374151] text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] hover:text-[#3ecf8e]'
                  }`}
                  suppressHydrationWarning
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
          
          {/* Loading State - Show skeleton cards instead of spinner */}
          {/* Only show skeletons if we're loading AND don't have any tools yet AND haven't timed out */}
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

          {/* Loading Timeout State - Higher priority than error state */}
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

          {/* Error State - Only show if there's an error and no timeout message */}
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

          {/* All Tools Section - Show tools as soon as we have data (optimistic rendering) */}
          {/* This takes precedence over loading/error states to show cached data immediately */}
          {!loadingTimeout && !error && filteredTools.length > 0 && (
            <div className="mb-8 mt-8">
              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center px-0 sm:px-0">
                {filteredTools.map((tool) => {
                  // Usa callback stabili dal Map per evitare re-render non necessari
                  const handleClick = toolClickCallbacks.get(tool.id) || (() => handleToolClick(tool));
                  return (
                    <div key={tool.id} className="w-full sm:w-[22rem]">
                      <ToolCard 
                        tool={tool} 
                        mode="marketing" 
                        onViewClick={handleClick} 
                        onLaunchClick={handleClick} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Empty State - when no tools match search or no tools available */}
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
              <p className="text-[#6b7280] text-sm">Try a different search term or clear your search</p>
            </div>
          )}
        </div>
      </section>

      {/* Community Section */}
      <section className="section-padding bg-gradient-to-b from-[#111111] to-[#0a0a0a] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Community - Simple Text + CTA */}
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-base sm:text-lg text-[#d1d5db] mb-4">
              Connect with users, share tips, and discover new tools together.
            </p>
            <a
              href="https://discord.gg/R87YSYpKK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5865F2] text-white rounded-xl font-semibold hover:bg-[#4752C4] transition-all hover:scale-105"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0 a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              join Discord
            </a>
          </div>

          {/* Vendor Box - Full Width */}
          <div className="md:bg-[#1f2937] md:border-2 md:border-[#374151] md:rounded-3xl md:p-12 md:hover:border-[#3ecf8e] transition-all">
            {/* Header */}
            <div className="mb-6 md:mb-8 flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">
                  want to publish your tool in 1sub?
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-[#d1d5db]">
                  Get discovered by a community of adopters.
                </p>
              </div>
              <span className="bg-[#3ecf8e]/20 text-[#3ecf8e] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold border border-[#3ecf8e]/30 whitespace-nowrap">
                1st month is free
              </span>
            </div>

            {/* Platform Fee + Business Rules Section */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
              <div className="grid md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
                {/* 15% Badge - Left */}
                <div className="flex justify-center md:justify-start">
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-bold text-[#3ecf8e] mb-1 md:mb-2">15%</div>
                    <div className="text-base md:text-lg text-[#9ca3af]">Platform fee</div>
                  </div>
                </div>

                {/* Business Rules - Right */}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Your business, your rules</h3>
                  <p className="text-sm sm:text-base text-[#d1d5db] mb-4 md:mb-6 leading-relaxed">
                    We don't limit your creativity. We just aim to be the main channel for users to discover and use your tool. Choose any business model that suits you.
                  </p>
                  
                  {/* Pricing Models */}
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    <button className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-[#1f2937] border border-[#374151] text-[#d1d5db] rounded-full font-semibold hover:border-[#3ecf8e] hover:text-[#3ecf8e] transition-all">
                      one time (OT)
                    </button>
                    <button className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-[#1f2937] border border-[#374151] text-[#d1d5db] rounded-full font-semibold hover:border-[#3ecf8e] hover:text-[#3ecf8e] transition-all">
                      subscription (S)
                    </button>
                    <button className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-[#1f2937] border border-[#374151] text-[#d1d5db] rounded-full font-semibold hover:border-[#3ecf8e] hover:text-[#3ecf8e] transition-all">
                      consumption based (CB)
                    </button>
                    <button className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-[#1f2937] border border-[#374151] text-[#d1d5db] rounded-full font-semibold hover:border-[#3ecf8e] hover:text-[#3ecf8e] transition-all">
                      hybrid model
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Links */}
            <div className="flex flex-col gap-1 sm:gap-3 items-end">
              <a
                href="/register"
                className="group/btn pb-0 text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] hover:opacity-80 transition-opacity"
              >
                submit your tool
              </a>
              <a
                href="/vendors"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 pt-0 sm:pt-1 text-sm sm:text-base text-[#d1d5db] hover:text-[#3ecf8e] transition-colors"
              >
                learn more to become a vendor
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Tool Dialog - Renderizzato solo quando aperto */}
      {/* Isolato dal re-render del componente padre usando key basata sull'ID */}
      {isDialogOpen && selectedTool && (
        <Suspense fallback={null}>
          <ToolDialog
            key={selectedTool.id}
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            tool={selectedTool}
            onToolLaunch={handleToolLaunch}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3ecf8e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

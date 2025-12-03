'use client';

import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Footer from './components/Footer';
import ToolCard from './components/ToolCard';
import PricingExplainer from './components/PricingExplainer';
import TrustIndicators from './components/TrustIndicators';
import { useTools } from '@/hooks/useTools';
import { Tool } from '@/lib/tool-types';

// Lazy-load del ToolDialog per ridurre il bundle iniziale
const ToolDialog = lazy(() => import('./components/ToolDialog'));

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Fetch tools from database
  const { tools, loading, error } = useTools();

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
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] pb-20 sm:pb-0">
      {/* Mobile Sticky CTA - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-40 sm:hidden">
        <a
          href="/login"
          className="flex items-center justify-center w-full px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full shadow-lg shadow-[#3ecf8e]/30 active:scale-95 transition-transform"
        >
          <span className="flex items-center gap-2">
            get started now
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </a>
      </div>

      {/* Header with Sticky CTA */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#374151] z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-[#3ecf8e]">
                1sub<span className="text-[#9ca3af] font-normal">.io</span>
              </h1>
            </div>
            
            {/* Navigation Links */}
            <div className="flex items-center gap-4">
              <span className="hidden md:flex items-center gap-2 text-sm text-[#9ca3af]">
                <span className="w-2 h-2 bg-[#3ecf8e] rounded-full animate-pulse"></span>
                {loading ? 'Loading...' : `${tools.length}+ tools available`}
              </span>
              <a
                href="/login"
                className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#3ecf8e]/30"
              >
                <span className="relative z-10 flex items-center gap-2">
                  get started
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </header>

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
          
          {/* Tools Counter Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-[#1f2937] border border-[#374151] rounded-full animate-scale-in delay-300 opacity-0">
            <div className="w-2 h-2 bg-[#3ecf8e] rounded-full animate-pulse"></div>
            <span className="text-sm text-[#d1d5db]">
              {loading ? (
                'Loading tools...'
              ) : (
                <>
                  <span className="text-[#3ecf8e] font-semibold">{tools.length}+ tools</span> available now
                </>
              )}
            </span>
          </div>
          
          <div className="animate-fade-in-up delay-400 opacity-0">
            <a
              href="/login"
              id="join"
              className="group relative inline-flex items-center justify-center px-10 py-5 text-lg sm:text-xl font-bold bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 animate-pulse-glow active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-3 text-white">
                join us today!
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#2dd4bf] to-[#3ecf8e] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
          </div>

          {/* Trust Indicators Mini */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-sm text-[#9ca3af] animate-fade-in-up delay-500 opacity-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#3ecf8e]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span>1,000+ active users</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#3ecf8e]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>secure & trusted</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#3ecf8e]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Explainer Section */}
      <section className="section-padding">
        <PricingExplainer />
      </section>

      {/* Tools Showcase */}
      <section className="section-padding bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
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
            <div className="flex flex-wrap justify-center gap-2" suppressHydrationWarning>
              {['AI', 'Design', 'Analytics', 'Video', 'Marketing', 'Code'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSearchTerm(category)}
                  className={`group/cat px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    searchTerm === category
                      ? 'bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-white shadow-lg shadow-[#3ecf8e]/30 scale-105'
                      : 'bg-[#1f2937] border border-[#374151] text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] hover:text-[#3ecf8e] hover:scale-105'
                  }`}
                  suppressHydrationWarning
                >
                  {category}
                  <span className={`ml-1 transition-opacity duration-300 ${
                    searchTerm === category ? 'opacity-100' : 'opacity-0 group-hover/cat:opacity-100'
                  }`}>
                    ✓
                  </span>
                </button>
              ))}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-[#374151] text-[#d1d5db] hover:bg-[#3ecf8e] hover:text-white transition-all duration-300 hover:scale-105"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Loading / Error State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
                <p className="mt-4 text-[#9ca3af]">Loading tools...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-2">Error loading tools</p>
              <p className="text-[#9ca3af] text-sm">{error}</p>
            </div>
          )}

          {/* All Tools Section */}
          {!loading && !error && filteredTools.length > 0 && (
            <div className="mb-8 mt-8">
              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
                {filteredTools.map((tool) => {
                  // Usa callback stabili dal Map per evitare re-render non necessari
                  const handleClick = toolClickCallbacks.get(tool.id) || (() => handleToolClick(tool));
                  return (
                    <div key={tool.id} className="w-80 sm:w-[22rem]">
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
        </div>
      </section>

      {/* Community & Vendor Section */}
      <section className="section-padding bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Community Card */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-[#d1d5db]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <h2 className="text-2xl font-bold">join our community</h2>
              </div>
              
              <p className="text-[#d1d5db] mb-6 leading-relaxed">
                Connect with users, share tips, and discover new tools together.
              </p>
              
              <div className="flex flex-col gap-3">
                <a
                  href="/login"
                  className="group/btn flex items-center justify-center gap-2 px-6 py-3 bg-[#374151] text-[#d1d5db] rounded-xl font-semibold hover:bg-[#4B5563] transition-colors"
                >
                  get started
                  <svg className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#5865F2] text-white rounded-xl font-semibold hover:bg-[#4752C4] transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0 a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  join Discord
                </a>
              </div>
            </div>

            {/* Vendor Card */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-[#d1d5db]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
                <h2 className="text-2xl font-bold">for vendors</h2>
                <span className="bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-1 rounded text-xs font-bold border border-[#3ecf8e]/30">
                  1st month is free
                </span>
              </div>
              
              <p className="text-[#d1d5db] mb-6 leading-relaxed">
                Get discovered by thousands of subscribers.
              </p>
              
              <div className="flex flex-col gap-3">
                <a
                  href="/register"
                  className="group/btn flex items-center justify-center gap-2 px-6 py-3 bg-[#374151] text-[#d1d5db] rounded-xl font-semibold hover:bg-[#4B5563] transition-colors"
                >
                  submit your tool
                  <svg className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a
                  href="/vendors"
                  className="flex items-center justify-center gap-2 px-6 py-3 text-[#d1d5db] underline hover:text-[#ededed] transition-colors"
                >
                  learn more
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust Indicators & Social Proof */}
      <TrustIndicators />

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

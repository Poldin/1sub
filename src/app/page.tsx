'use client';

import { useState, useRef, useEffect } from 'react';
import { Users } from 'lucide-react';
import Footer from './components/Footer';
import ToolCard from './components/ToolCard';
import ToolDialog from './components/ToolDialog';
import { createClient } from '@/lib/supabase/client';
import { Tool } from '@/lib/tool-types';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch tools from database
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setToolsLoading(true);
        setToolsError(null);

        const supabase = createClient();
        const { data: toolsData, error } = await supabase
          .from('tools')
          .select(`
            *,
            products:tool_products(*)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tools:', error);
          setToolsError('Failed to load tools');
          return;
        }

        setTools(toolsData || []);
      } catch (err) {
        console.error('Unexpected error fetching tools:', err);
        setToolsError('An unexpected error occurred');
      } finally {
        setToolsLoading(false);
      }
    };

    fetchTools();
  }, []);
  
  // Carousel drag and auto-scroll functionality
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter tools based on search term
  const filteredTools = tools.filter(tool => {
    const searchLower = searchTerm.toLowerCase();
    const matchesName = tool.name.toLowerCase().includes(searchLower);
    const matchesDescription = tool.description?.toLowerCase().includes(searchLower);
    const matchesTags = tool.metadata?.ui?.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    return matchesName || matchesDescription || matchesTags;
  });

  // Drag to scroll functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setUserInteracting(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
    carouselRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (carouselRef.current) {
      carouselRef.current.style.cursor = 'grab';
    }
    // Reset user interaction after 3 seconds
    setTimeout(() => {
      setUserInteracting(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (carouselRef.current) {
      carouselRef.current.style.cursor = 'grab';
    }
  };

  // Auto-scroll functionality
  useEffect(() => {
    const startAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      
      autoScrollIntervalRef.current = setInterval(() => {
        // Only auto-scroll on tablet+ where carousel is visible
        if (!userInteracting && carouselRef.current && window.innerWidth >= 640) {
          const carousel = carouselRef.current;
          const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
          
          if (carousel.scrollLeft >= maxScrollLeft) {
            // Reset to beginning when reached the end
            carousel.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            // Scroll to the right
            carousel.scrollBy({ left: 344, behavior: 'smooth' }); // w-80 + gap-6
          }
        }
      }, 3000); // Auto-scroll every 3 seconds
    };

    startAutoScroll();

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [userInteracting]);

  // Handle scroll events to detect user interaction
  const handleScroll = () => {
    setUserInteracting(true);
    setTimeout(() => {
      setUserInteracting(false);
    }, 3000);
  };

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
    setSelectedTool(tool);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#374151] z-50">
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

              <a
                href="/login"
                className="btn-secondary text-sm sm:text-base"
              >
                join us
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding text-center">
        <div className="mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            1 subscription,{" "}
            <span className="text-[#3ecf8e]">countless tools</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-[#d1d5db] max-w-3xl mx-auto mb-6 leading-relaxed">
            access a vast collection of tools with 1 single subscription. 
          </p>
          
          
          <a
            href="/login"
            id="join"
            className="btn-secondary text-sm sm:text-base px-2"
          >
            join us today!
          </a>
        </div>
      </section>

      {/* Tools Showcase */}
      <section className="section-padding bg-[#111111]">
        <div className="mx-auto">
          
          {/* Credit Explanation */}
          <div className="text-center mb-6">
            <p className="text-lg text-[#d1d5db]">
              1 <span className="text-[#3ecf8e] font-semibold">CR</span> = 1 credit = €1
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Search tools and services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-[#1f2937] border border-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-[#ededed] text-base"
              />
              <div className="absolute left-4 top-3.5 text-[#9ca3af]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Search Tags */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setSearchTerm('AI')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                AI
              </button>
              <button
                onClick={() => setSearchTerm('Design')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Design
              </button>
              <button
                onClick={() => setSearchTerm('Analytics')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Analytics
              </button>
              <button
                onClick={() => setSearchTerm('Video')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Video
              </button>
              <button
                onClick={() => setSearchTerm('Marketing')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Marketing
              </button>
              <button
                onClick={() => setSearchTerm('Code')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Code
              </button>
            </div>
          </div>
          
          {/* Loading State */}
          {toolsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
                <p className="mt-4 text-[#9ca3af]">Loading tools...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {toolsError && !toolsLoading && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-2">Error loading tools</p>
              <p className="text-[#9ca3af] text-sm">{toolsError}</p>
            </div>
          )}

          {/* Empty State */}
          {!toolsLoading && !toolsError && tools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#9ca3af] text-lg">No tools available yet</p>
              <p className="text-[#6b7280] text-sm mt-2">Check back soon for new tools!</p>
            </div>
          )}

          {/* Mobile Carousel */}
          {!toolsLoading && !toolsError && filteredTools.length > 0 && (
            <div className="mb-8 mt-12 sm:hidden">
              <div className="w-full overflow-hidden">
                <div 
                  className="flex gap-4 overflow-x-auto pb-4 px-1" 
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {filteredTools.map((tool) => (
                    <div key={tool.id} className="flex-shrink-0 w-80 min-w-[20rem]">
                      <ToolCard 
                        tool={tool} 
                        mode="marketing"
                        onViewClick={() => handleToolClick(tool)} 
                        onLaunchClick={() => handleLaunchClick(tool)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Carousel */}
          {!toolsLoading && !toolsError && filteredTools.length > 0 && (
            <div className="mb-4 mt-4 hidden sm:block">
              <div 
                ref={carouselRef}
                className="flex gap-6 overflow-x-auto py-4 scrollbar-hide cursor-grab select-none" 
                style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onScroll={handleScroll}
              >
                {filteredTools.map((tool) => (
                  <div key={tool.id} className="flex-shrink-0 w-[22rem]">
                    <ToolCard 
                      tool={tool} 
                      mode="marketing"
                      onViewClick={() => handleToolClick(tool)} 
                      onLaunchClick={() => handleLaunchClick(tool)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Tools Section */}
          {!toolsLoading && !toolsError && filteredTools.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">All Tools</h2>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                {filteredTools.map((tool) => (
                  <div key={tool.id} className="w-80 sm:w-[22rem]">
                    <ToolCard 
                      tool={tool} 
                      mode="marketing"
                      onViewClick={() => handleToolClick(tool)} 
                      onLaunchClick={() => handleLaunchClick(tool)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Community Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            join our community
          </h2>
          <p className="text-lg text-[#d1d5db] mb-6 leading-relaxed">
            Connect, share, and discover new ways to optimize. <br />Our community helps you make the most 
            of every subscription.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/login"
              className="btn-secondary text-sm sm:text-base px-2"
            >
              join 1sub now!
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5865F2] text-white px-2 py-0.5 rounded-md text-sm sm:text-base hover:bg-[#4752C4] transition-colors border-2 border-white/20 hover:border-white/40"
            >
              join our Discord
            </a>
          </div>
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-[#059669] to-[#047857] rounded-lg p-8 sm:p-12 text-center shadow-2xl border-2 border-white/60">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
              bring new members and earn            
            </h2>
            
            {/* Commission Tiers - Step Visualization */}
            <div className="mb-6 flex items-end justify-center gap-1 sm:gap-2 px-4">
              {/* 1% Tier - Smallest */}
              <div className="flex flex-col items-center">
                <div className="border-2 border-white/80 rounded-lg p-3 sm:p-4 mb-2 w-20 sm:w-24 h-16 sm:h-16 flex flex-col items-center justify-center">
                  <div className="text-3xl sm:text-4xl font-black text-white opacity-40">1%</div>
                </div>
              </div>

            {/* 5% Tier - Smallest */}
              <div className="flex flex-col items-center">
                <div className="border-2 border-white/80 rounded-lg p-3 sm:p-4 mb-2 w-20 sm:w-24 h-24 sm:h-28 flex flex-col items-center justify-center">
                  <div className="text-3xl sm:text-4xl font-black text-white opacity-60">5%</div>
                </div>
              </div>
              
              {/* 2% Tier - Medium */}
              <div className="flex flex-col items-center">
                <div className="border-2 border-white/90 rounded-lg p-4 sm:p-6 mb-2 w-24 sm:w-32 h-32 sm:h-40 flex flex-col items-center justify-center">
                  <div className="text-4xl sm:text-5xl font-black text-white opacity-80">10%</div>
                </div>
              </div>
              
              {/* 3% Tier - Largest */}
              <div className="flex flex-col items-center">
                <div className="border-3 border-white rounded-lg p-6 sm:p-8 mb-2 w-28 sm:w-40 h-40 sm:h-52 flex flex-col items-center justify-center">
                  <div className="text-5xl sm:text-7xl font-black text-white opacity-100">15%</div>
                </div>
              </div>
            </div>
            
            <p className="text-xl sm:text-2xl text-green-50 font-semibold mb-4">
              lifetime commission
            </p>
            
            <p className="text-base text-green-200 mb-8 max-w-2xl mx-auto opacity-80">
            Earn commission for every new member you refer when they use tools with 1sub. Once entered, you get the commission until member leaves.
            </p>
            <a
              href="/login"
              className="inline-block bg-white text-[#059669] px-8 py-3 rounded-lg font-semibold text-lg hover:bg-green-50 transition-colors shadow-lg"
            >
              join us and share
            </a>
            <p className="text-sm text-green-100 mt-4 opacity-70">
              <a 
                href="/tc_referral" 
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
              >
                Terms and conditions
              </a> apply
            </p>
          </div>
        </div>
      </section>

      {/* Tool Provider Section */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            want to feature your tool?
          </h2>
          <p className="text-lg text-[#d1d5db] mb-4 leading-relaxed">
            Join 1sub and get discovered by thousands of subscribers.
          </p>
          <p className="text-base text-[#3ecf8e] mb-8 font-semibold">
            Get a headstart, 1st month is free of fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
            <a
              href="/register"
              className="btn-secondary"
            >
              <span className="font-bold">sign up and submit</span>
            </a>
            <a
              href="/vendors"
              className="btn-primary text-sm sm:text-base"
            >
              discover more
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Tool Dialog */}
      {selectedTool && (
        <ToolDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          tool={selectedTool}
        />
      )}
    </div>
  );
}

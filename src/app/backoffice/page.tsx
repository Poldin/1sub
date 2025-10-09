'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, User, Users, LogOut, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import ShareAndEarnDialog from './components/ShareAndEarn';
import { useUser } from '@/hooks/useUser';
import { useCredits } from '@/hooks/useCredits';
import { useTools, ToolItem as Tool } from '@/hooks/useTools';
import { supabaseClient } from '@/lib/supabaseClient';
import { launchTool } from '@/lib/api-client';

// Helper function to format adoption numbers
const formatAdoptions = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export default function Backoffice() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { balance: credits, loading: creditsLoading } = useCredits(user?.id);
  const { tools, loading: toolsLoading, error: toolsError } = useTools();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  // Carousel drag and auto-scroll functionality
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const openShareDialog = () => {
    setIsShareDialogOpen(true);
  };

  const closeShareDialog = () => {
    setIsShareDialogOpen(false);
  };

  const handleLaunchTool = async (toolId: string) => {
    try {
      const result = await launchTool(parseInt(toolId));
      // Redirect to the tool with the access token
      window.open(result.launchUrl, '_blank');
    } catch (error: unknown) {
      console.error('Failed to launch tool:', error);
      if (error instanceof Error && error.message.includes('Insufficient credits')) {
        alert(`Insufficient credits. You need more credits to launch this tool.`);
      } else {
        alert('Failed to launch tool. Please try again.');
      }
    }
  };

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

  // Show loading state while checking authentication
  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3ecf8e] mx-auto mb-4"></div>
          <p className="text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        credits={creditsLoading ? 0 : credits}
        onShareAndEarnClick={openShareDialog}
        userId={user?.id || ''}
        onCreditsUpdated={() => {
          // Force refresh credits by updating the dependency
          window.location.reload();
        }}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar con Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden">
          <div className="flex items-center justify-center gap-2 p-2 sm:p-3 min-w-0 lg:justify-between">
            {/* Hamburger Button */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
            </button>
            
            {/* Search Bar - Centered on desktop */}
            <div className="flex-1 min-w-0 max-w-xs sm:max-w-sm lg:max-w-2xl lg:mx-auto">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search..."
                  className="w-full px-2 sm:px-3 py-2 sm:py-3 pl-7 sm:pl-8 bg-[#1f2937] border border-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-[#ededed] text-sm sm:text-base"
                />
                <div className="absolute left-2 top-2.5 sm:top-3.5 text-[#9ca3af]">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Profile Button with Logout */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-[#1f2937] hover:bg-[#374151] rounded-lg transition-colors flex-shrink-0" data-testid="user-menu">
                <User className="w-6 h-6 sm:w-5 sm:h-5 text-[#3ecf8e]" />
                <span className="hidden lg:block text-sm font-medium text-[#ededed]">
                  {user?.fullName || user?.email || 'profile'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 p-1.5 sm:p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="hidden lg:block text-sm font-medium text-red-400">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-8 overflow-x-hidden" data-testid="dashboard-content">
          <div className="max-w-7xl mx-auto">

            {/* Categories */}
            {/* <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Categories</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">🤖</div>
                  <h3 className="font-semibold text-sm">AI Tools</h3>
                  <p className="text-xs text-[#9ca3af]">24 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="font-semibold text-sm">Analytics</h3>
                  <p className="text-xs text-[#9ca3af]">18 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">🎨</div>
                  <h3 className="font-semibold text-sm">Design</h3>
                  <p className="text-xs text-[#9ca3af]">32 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">💼</div>
                  <h3 className="font-semibold text-sm">Business</h3>
                  <p className="text-xs text-[#9ca3af]">15 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">🔧</div>
                  <h3 className="font-semibold text-sm">Developer</h3>
                  <p className="text-xs text-[#9ca3af]">28 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">📱</div>
                  <h3 className="font-semibold text-sm">Mobile</h3>
                  <p className="text-xs text-[#9ca3af]">12 tools</p>
                </div>
              </div>
            </div> */}

            {/* Mobile Carousel */}
            <div className="mb-8 sm:hidden">
              <div className="w-full overflow-hidden">
                {toolsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3ecf8e]"></div>
                    <span className="ml-2 text-[#9ca3af]">Loading tools...</span>
                  </div>
                ) : toolsError ? (
                  <div className="text-center py-8 text-red-400">
                    <p>Error loading tools: {toolsError}</p>
                  </div>
                ) : tools.length === 0 ? (
                  <div className="text-center py-8 text-[#9ca3af]">
                    <p>No tools available</p>
                  </div>
                ) : (
                  <div 
                    className="flex gap-4 overflow-x-auto pb-4 px-1" 
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    {tools.map((tool) => (
                      <div key={tool.id} data-testid="tool-card" className="bg-[#1f2937] rounded-lg overflow-hidden hover:shadow-lg hover:shadow-[#3ecf8e]/10 transition-shadow cursor-pointer flex-shrink-0 w-84 min-w-84 flex flex-col">
                        <div className="h-36 bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] flex items-center justify-center">
                          <div className="text-4xl">🔧</div>
                        </div>
                        <div className="p-3 flex flex-col flex-1">
                          <h3 className="font-bold mb-1 text-base">{tool.name}</h3>
                          <p className="text-[#9ca3af] text-sm mb-2 line-clamp-2 flex-1">{tool.description}</p>
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1">
                              <span className="text-[#3ecf8e] font-bold text-sm">{tool.credit_cost_per_use} credits</span>
                            </div>
                            <span className="bg-[#3ecf8e] text-black px-2 py-1 rounded text-sm font-bold">Active</span>
                          </div>
                          <button
                            onClick={() => handleLaunchTool(tool.id)}
                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#3ecf8e] text-black rounded-lg font-medium hover:bg-[#2dd4bf] transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Launch Tool
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Carousel */}
            <div className="mb-8 hidden sm:block">
              {toolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3ecf8e]"></div>
                  <span className="ml-2 text-[#9ca3af]">Loading tools...</span>
                </div>
              ) : toolsError ? (
                <div className="text-center py-8 text-red-400">
                  <p>Error loading tools: {toolsError}</p>
                </div>
              ) : tools.length === 0 ? (
                <div className="text-center py-8 text-[#9ca3af]">
                  <p>No tools available</p>
                </div>
              ) : (
                <div 
                  ref={carouselRef}
                  className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide cursor-grab select-none" 
                  style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onScroll={handleScroll}
                >
                  {tools.map((tool) => (
                    <div key={tool.id} data-testid="tool-card" className="bg-[#1f2937] rounded-lg overflow-hidden hover:shadow-lg hover:shadow-[#3ecf8e]/10 transition-shadow cursor-pointer flex-shrink-0 w-[22rem] flex flex-col">
                      <div className="h-40 bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] flex items-center justify-center">
                        <div className="text-5xl">🔧</div>
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-bold mb-1">{tool.name}</h3>
                        <p className="text-[#9ca3af] text-xs mb-2 flex-1">{tool.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-[#3ecf8e] font-bold">{tool.credit_cost_per_use} credits</span>
                          </div>
                          <span className="bg-[#3ecf8e] text-black px-2 py-1 rounded text-xs font-bold">Active</span>
                        </div>
                        <button
                          onClick={() => handleLaunchTool(tool.id)}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#3ecf8e] text-black rounded-lg font-medium hover:bg-[#2dd4bf] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Launch Tool
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


            {/* All Tools Section */}
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">All</h2>
              {toolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3ecf8e]"></div>
                  <span className="ml-2 text-[#9ca3af]">Loading tools...</span>
                </div>
              ) : tools.length === 0 ? (
                <div className="text-center py-8 text-[#9ca3af]">
                  <p>No tools available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {tools.map((tool) => (
                    <div key={tool.id} className="bg-[#1f2937] rounded-lg overflow-hidden hover:shadow-lg hover:shadow-[#3ecf8e]/10 transition-shadow cursor-pointer flex flex-col">
                      <div className="h-32 sm:h-40 bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] flex items-center justify-center">
                        <div className="text-4xl sm:text-5xl">🔧</div>
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-bold mb-1">{tool.name}</h3>
                        <p className="text-[#9ca3af] text-xs mb-2 flex-1">{tool.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-[#3ecf8e] font-bold">{tool.credit_cost_per_use} credits</span>
                          </div>
                          <span className="bg-[#3ecf8e] text-black px-2 py-1 rounded text-xs font-bold">Active</span>
                        </div>
                        <button
                          onClick={() => handleLaunchTool(tool.id)}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#3ecf8e] text-black rounded-lg font-medium hover:bg-[#2dd4bf] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Launch Tool
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#111111] border-t border-[#374151] mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#3ecf8e] mb-2">
                1sub<span className="text-[#9ca3af] font-normal">.io</span>
              </h3>
              <p className="text-[#9ca3af] mb-4">
                1 subscription, countless tools.
              </p>
              
              {/* Submit Tool Button */}
              <div className="mb-6">
                <a
                  href="/submit"
                  className="btn-secondary text-sm sm:text-base"
                >
                  submit your tool
                </a>
              </div>
              
              <div className="flex justify-center gap-6 text-sm">
                <a
                  href="/privacy"
                  className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="/terms"
                  className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
                >
                  Terms and Conditions
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Share and Earn Dialog - Outside sidebar */}
      <ShareAndEarnDialog 
        isOpen={isShareDialogOpen} 
        onClose={closeShareDialog} 
      />
    </div>
  );
}


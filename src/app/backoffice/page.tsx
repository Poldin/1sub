'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, User, Users, LogOut, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import ShareAndEarnDialog from './components/ShareAndEarn';
import { useUser } from '@/hooks/useUser';
import { useCredits } from '@/hooks/useCredits';
import { supabaseClient } from '@/lib/supabaseClient';
import { launchTool } from '@/lib/api-client';

// Mock database for tools
const mockTools = [
  { id: 1, name: "AI Content Generator", description: "Generate high-quality content with advanced AI", emoji: "🤖", rating: 4.8, adoptions: 12500, badge: "Popular", badgeColor: "bg-[#3ecf8e] text-black", gradient: "from-[#3ecf8e] to-[#2dd4bf]" },
  { id: 2, name: "Advanced Analytics", description: "Deep insights into your business metrics", emoji: "📊", rating: 4.6, adoptions: 8900, badge: "New", badgeColor: "bg-blue-500 text-white", gradient: "from-purple-500 to-pink-500" },
  { id: 3, name: "Design Studio Pro", description: "Professional design tools for everyone", emoji: "🎨", rating: 4.9, adoptions: 15600, badge: "Trending", badgeColor: "bg-orange-500 text-white", gradient: "from-orange-500 to-red-500" },
  { id: 4, name: "Video Editor Plus", description: "Edit videos like a pro with AI assistance", emoji: "🎬", rating: 4.7, adoptions: 7300, badge: "Hot", badgeColor: "bg-red-500 text-white", gradient: "from-red-500 to-pink-600" },
  { id: 5, name: "Code Assistant", description: "AI-powered coding companion for developers", emoji: "💻", rating: 4.5, adoptions: 9800, badge: "Dev", badgeColor: "bg-green-500 text-white", gradient: "from-green-500 to-teal-500" },
  { id: 6, name: "Photo Enhancer", description: "Enhance your photos with AI magic", emoji: "📸", rating: 4.8, adoptions: 11200, badge: "Popular", badgeColor: "bg-[#3ecf8e] text-black", gradient: "from-cyan-500 to-blue-500" },
  { id: 7, name: "Social Media Manager", description: "Automate your social media presence", emoji: "📱", rating: 4.4, adoptions: 6750, badge: "Social", badgeColor: "bg-purple-500 text-white", gradient: "from-purple-500 to-indigo-500" },
  { id: 8, name: "Email Marketing Pro", description: "Create stunning email campaigns", emoji: "📧", rating: 4.6, adoptions: 5400, badge: "Marketing", badgeColor: "bg-yellow-500 text-black", gradient: "from-yellow-500 to-orange-400" },
  { id: 9, name: "Voice Synthesizer", description: "Convert text to natural-sounding speech", emoji: "🔊", rating: 4.3, adoptions: 3200, badge: "Audio", badgeColor: "bg-indigo-500 text-white", gradient: "from-indigo-500 to-purple-600" },
  { id: 10, name: "Data Visualizer", description: "Transform data into beautiful charts", emoji: "📈", rating: 4.7, adoptions: 8100, badge: "Charts", badgeColor: "bg-teal-500 text-white", gradient: "from-teal-500 to-green-600" }
];

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

  const handleLaunchTool = async (toolId: number) => {
    try {
      const result = await launchTool(toolId);
      // Redirect to the tool with the access token
      window.open(result.launchUrl, '_blank');
    } catch (error) {
      console.error('Failed to launch tool:', error);
      alert('Failed to launch tool. Please try again.');
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
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-[#1f2937] hover:bg-[#374151] rounded-lg transition-colors flex-shrink-0">
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
        <div className="p-3 sm:p-4 lg:p-8 overflow-x-hidden">
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
                <div 
                  className="flex gap-4 overflow-x-auto pb-4 px-1" 
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {mockTools.map((tool) => (
                    <div key={tool.id} className="bg-[#1f2937] rounded-lg overflow-hidden hover:shadow-lg hover:shadow-[#3ecf8e]/10 transition-shadow cursor-pointer flex-shrink-0 w-84 min-w-84 flex flex-col">
                      <div className={`h-36 bg-gradient-to-br ${tool.gradient} flex items-center justify-center`}>
                        <div className="text-4xl">{tool.emoji}</div>
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-bold mb-1 text-base">{tool.name}</h3>
                        <p className="text-[#9ca3af] text-sm mb-2 line-clamp-2 flex-1">{tool.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-1">
                            <span className="text-[#3ecf8e] font-bold text-sm">★ {tool.rating}</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-[#9ca3af]" />
                              <span className="text-[#9ca3af] font-thin text-sm">{formatAdoptions(tool.adoptions)}</span>
                            </div>
                          </div>
                          <span className={`${tool.badgeColor} px-2 py-1 rounded text-sm font-bold`}>{tool.badge}</span>
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
              </div>
            </div>

            {/* Desktop Carousel */}
            <div className="mb-8 hidden sm:block">
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
                {mockTools.map((tool) => (
                  <div key={tool.id} className="bg-[#1f2937] rounded-lg overflow-hidden hover:shadow-lg hover:shadow-[#3ecf8e]/10 transition-shadow cursor-pointer flex-shrink-0 w-[22rem] flex flex-col">
                    <div className={`h-40 bg-gradient-to-br ${tool.gradient} flex items-center justify-center`}>
                      <div className="text-5xl">{tool.emoji}</div>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold mb-1">{tool.name}</h3>
                      <p className="text-[#9ca3af] text-xs mb-2 flex-1">{tool.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-[#3ecf8e] font-bold">★ {tool.rating}</span>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-[#9ca3af] font-thin" />
                            <span className="text-[#9ca3af] font-thin">{formatAdoptions(tool.adoptions)}</span>
                          </div>
                        </div>
                        <span className={`${tool.badgeColor} px-2 py-1 rounded text-xs font-bold`}>{tool.badge}</span>
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
            </div>


            {/* All Tools Section */}
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">All</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {mockTools.map((tool) => (
                  <div key={tool.id} className="bg-[#1f2937] rounded-lg overflow-hidden hover:shadow-lg hover:shadow-[#3ecf8e]/10 transition-shadow cursor-pointer flex flex-col">
                    <div className={`h-32 sm:h-40 bg-gradient-to-br ${tool.gradient} flex items-center justify-center`}>
                      <div className="text-4xl sm:text-5xl">{tool.emoji}</div>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold mb-1">{tool.name}</h3>
                      <p className="text-[#9ca3af] text-xs mb-2 flex-1">{tool.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-[#3ecf8e] font-bold">★ {tool.rating}</span>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-[#9ca3af] font-thin" />
                            <span className="text-[#9ca3af] font-thin">{formatAdoptions(tool.adoptions)}</span>
                          </div>
                        </div>
                        <span className={`${tool.badgeColor} px-2 py-1 rounded text-xs font-bold`}>{tool.badge}</span>
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


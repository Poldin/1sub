'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Menu, User, Users, LogOut, ExternalLink, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from './components/Sidebar';
import ShareAndEarnDialog from './components/ShareAndEarn';
import SearchBar from './components/SearchBar';

// Mock Tool type
type Tool = {
  id: string;
  name: string;
  description: string;
  credit_cost_per_use: number;
};

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
  
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const tools: Tool[] = [
    { id: '1', name: 'AI Assistant', description: 'Advanced AI tool for productivity', credit_cost_per_use: 5 },
    { id: '2', name: 'Data Analyzer', description: 'Analyze your data with ease', credit_cost_per_use: 10 },
    { id: '3', name: 'Content Generator', description: 'Generate amazing content', credit_cost_per_use: 8 },
    { id: '4', name: 'Image Editor', description: 'Edit images professionally', credit_cost_per_use: 6 },
    { id: '5', name: 'Video Creator', description: 'Create stunning videos', credit_cost_per_use: 15 },
    { id: '6', name: 'SEO Optimizer', description: 'Optimize your content for search engines', credit_cost_per_use: 7 },
  ];
  const toolsLoading = false;
  const toolsError = null;
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('user'); // Change to 'vendor' to test vendor view

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsMenuOpen(savedSidebarState === 'true');
    }
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();

        setUser({
          id: data.id,
          fullName: data.fullName || null,
          email: data.email || '',
        });

        if (data.role) {
          setUserRole(data.role);
        }

        if (data.credits !== undefined) {
          setCredits(data.credits);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Carousel drag and auto-scroll functionality
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    // Save sidebar state to localStorage
    localStorage.setItem('sidebarOpen', String(newState));
  };

  const openShareDialog = () => {
    setIsShareDialogOpen(true);
  };

  const closeShareDialog = () => {
    setIsShareDialogOpen(false);
  };

  const handleLaunchTool = (toolId: string) => {
    console.log('UI Demo - Launching tool:', toolId);
    alert('UI Demo - Tool launch clicked! (No actual API call)');
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

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
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
        credits={credits}
        onShareAndEarnClick={openShareDialog}
        userId={user?.id || ''}
        userRole={userRole}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar con Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-50">
          <div className="flex items-center justify-center gap-2 p-2 sm:p-3 min-w-0 lg:justify-between">
            {/* Hamburger Button */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
            </button>
            
            {/* Search Bar Component */}
            <SearchBar />
            
            {/* Profile Button with Logout */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 p-2 bg-[#1f2937] hover:bg-[#374151] rounded-lg transition-colors flex-shrink-0" data-testid="user-menu">
                <User className="w-4 h-4 text-[#3ecf8e]" />
                <span className="hidden lg:block text-sm font-medium text-[#ededed]">
                  {user?.fullName || user?.email || 'profile'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-red-400" />
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

            {/* Vendor Dashboard Access - Only for vendors */}
            {userRole === 'vendor' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <div className="bg-gradient-to-r from-[#3ecf8e]/20 to-[#2dd4bf]/20 border border-[#3ecf8e]/30 rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-[#3ecf8e] p-3 rounded-lg">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#ededed]">Vendor Dashboard</h3>
                        <p className="text-[#9ca3af]">Manage your tools, view analytics, and track earnings</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/vendor-dashboard')}
                      className="bg-[#3ecf8e] hover:bg-[#2dd4bf] text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      Go to Dashboard
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

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
        <footer className="bg-[#111111] border-t border-[#374151] mt-16 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Home</Link>
              <Link href="/privacy" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Terms</Link>
              <Link href="/support" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Support</Link>
            </div>
            <p className="text-[#9ca3af] text-xs mt-4">
              © 2025 1sub.io. All rights reserved.
            </p>
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


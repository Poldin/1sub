'use client';

import { useState, useRef, useEffect } from 'react';
import { Users } from 'lucide-react';

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

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Carousel drag and auto-scroll functionality
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter tools based on search term
  const filteredTools = mockTools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            
            
            {/* CTA Button */}
            <a
              href="/waitlist"
              className="btn-secondary text-sm sm:text-base"
            >
              join us
            </a>
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
            href="/waitlist"
            id="join"
            className="btn-secondary text-sm sm:text-base px-2"
          >
            join us today!
          </a>
        </div>
      </section>

      {/* Tools Showcase */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">
            Featured Tools & Services
          </h2>
          
          {/* Search Bar */}
          <div className="mb-8 max-w-md mx-auto md:mx-0 md:max-w-sm">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search tools..."
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
          </div>
          
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
                {filteredTools.map((tool) => (
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
              {filteredTools.map((tool) => (
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
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Tools Section */}
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">All Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredTools.map((tool) => (
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            join our community
          </h2>
          <p className="text-lg text-[#d1d5db] mb-6 leading-relaxed">
            Connect with like-minded professionals, share experiences, and discover 
            new ways to optimize your toolkit. Our community helps you make the most 
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
            <div className="mb-6">
              <div className="text-8xl sm:text-9xl font-black text-white mb-2 leading-none">
                1%
              </div>
              <p className="text-xl sm:text-2xl text-green-50 font-semibold">
                lifetime commission
              </p>
            </div>
            <p className="text-base text-green-200 mb-4 max-w-2xl mx-auto opacity-80">
            Earn 1% for every new member you refer when they use tools with 1sub. Once entered, you get the commission until member leaves.
            </p>
            <p className="text-sm text-green-300 mb-8 max-w-2xl mx-auto opacity-70">
              Looking for deeper partnerships? Reach out to <span className="font-semibold text-white">partner@1sub.io</span>.
            </p>
            <a
              href="/login"
              className="inline-block bg-white text-[#059669] px-8 py-3 rounded-lg font-semibold text-lg hover:bg-green-50 transition-colors shadow-lg"
            >
              join us and share
            </a>
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
            Get a headstart, 1st month is free.
          </p>
          <div className="mb-4">
            <a
              href="/register"
              className="btn-secondary text-sm sm:text-base"
            >
              <span className="font-bold">sign up and submit</span>
            </a>
          </div>
          
          {/* Powered by Stripe */}
          <div className="flex items-center justify-center gap-1 mb-6 text-xs text-[#9ca3af]">
            <span>powered by</span>
            <span className="font-semibold text-[#6772E5]">Stripe</span>
          </div>
          
          <p className="text-sm text-[#9ca3af]">
            For partnerships and inquiries, write to 
            <a
              href="mailto:partner@1sub.io"
              className="text-[#3ecf8e] hover:text-[#2dd4aa] transition-colors ml-1 underline"
            >
              partner@1sub.io
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] border-t border-[#374151]">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-[#3ecf8e] mb-2">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h3>
            <p className="text-[#9ca3af] mb-4">
              1 subscription, countless tools.
            </p>
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
    </div>
  );
}

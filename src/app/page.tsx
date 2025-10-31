'use client';

import { useState, useRef, useEffect } from 'react';
import { Users } from 'lucide-react';
import Footer from './components/Footer';
import ToolCard from './components/ToolCard';
import ToolDialog from './components/ToolDialog';

// Mock database for tools
const mockTools = [
  // 1. Solo Monthly (caso classico)
  { 
    id: 1, 
    name: "AI Content Generator", 
    description: "Generate high-quality content with advanced AI", 
    longDescription: "Transform your content creation process with our state-of-the-art AI-powered content generator. Leveraging cutting-edge language models, this tool helps you create engaging blog posts, social media content, product descriptions, and marketing copy in seconds.\n\nWhether you're a marketer, blogger, or business owner, our AI understands context, tone, and style to deliver content that resonates with your audience. Save hours of writing time while maintaining quality and authenticity.\n\nKey capabilities include: multi-language support, SEO optimization, tone customization, plagiarism-free content, and real-time collaboration features.",
    emoji: "🤖", 
    rating: 4.8, 
    adoptions: 12500, 
    pricing: { monthly: 29 }, 
    gradient: "from-[#3ecf8e] to-[#2dd4bf]", 
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80", 
    discount: 30, 
    developmentStage: 'beta' as const, 
    tags: ['AI', 'Content', 'Writing'] 
  },
  
  // 2. Solo One-Time
  { 
    id: 2, 
    name: "Advanced Analytics", 
    description: "Deep insights into your business metrics", 
    longDescription: "Unlock the power of your data with Advanced Analytics. Our comprehensive analytics platform provides real-time insights into your business performance, customer behavior, and market trends.\n\nMake data-driven decisions with confidence using our intuitive dashboards, customizable reports, and predictive analytics. Track KPIs, identify growth opportunities, and optimize your strategy with actionable insights.\n\nFeatures include: real-time data visualization, custom report builder, predictive modeling, automated alerts, data export in multiple formats, and integration with popular business tools.",
    emoji: "📊", 
    rating: 4.6, 
    adoptions: 8900, 
    pricing: { oneTime: 149 }, 
    gradient: "from-purple-500 to-pink-500", 
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80", 
    developmentStage: null, 
    tags: ['Analytics', 'Business'] 
  },
  
  // 3. Multiple Products - Design Tool with Starter and Pro plans
  { 
    id: 3, 
    name: "Design Studio Pro", 
    description: "Professional design tools for everyone", 
    longDescription: "Design Studio Pro is the ultimate creative suite for designers, marketers, and content creators. Create stunning graphics, logos, social media posts, presentations, and more with our intuitive drag-and-drop interface.\n\nAccess thousands of templates, millions of stock photos, custom fonts, and advanced editing tools. Whether you're a beginner or a professional, our platform adapts to your skill level.\n\nPowerful features include: vector editing, photo enhancement, brand kit management, team collaboration, version history, cloud storage, and seamless export to all major formats. Perfect for creating consistent, professional designs at scale.",
    emoji: "🎨", 
    rating: 4.9, 
    adoptions: 15600, 
    gradient: "from-orange-500 to-red-500", 
    imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80", 
    discount: 20, 
    developmentStage: null,
    tags: ['Design', 'Creative'],
    products: [
      {
        id: 'design-starter',
        name: 'Starter',
        description: 'Perfect for individuals and small projects',
        pricing: { monthly: 19 },
        features: [
          'Up to 10 projects',
          'Basic design tools',
          '5GB cloud storage',
          'Email support'
        ]
      },
      {
        id: 'design-pro',
        name: 'Professional',
        description: 'For professionals who need more power',
        pricing: { monthly: 49, consumption: { price: 0.5, unit: 'per 1000 renders' } },
        features: [
          'Unlimited projects',
          'Advanced design tools',
          '100GB cloud storage',
          'Priority support',
          'Team collaboration',
          'Custom templates'
        ],
        isPreferred: true
      },
      {
        id: 'design-lifetime',
        name: 'Lifetime',
        description: 'Pay once, use forever',
        pricing: { oneTime: 399 },
        features: [
          'All Professional features',
          'Lifetime updates',
          'No recurring fees',
          'Premium support'
        ]
      }
    ]
  },
  
  // 4. Multiple Products - Video Editor with different tiers
  { 
    id: 4, 
    name: "Video Editor Plus", 
    description: "Edit videos like a pro with AI assistance", 
    longDescription: "Video Editor Plus brings professional video editing to everyone with AI-powered tools that simplify complex tasks. Create engaging videos for social media, YouTube, marketing campaigns, or personal projects.\n\nOur intelligent editing assistant automatically removes silences, adds captions, suggests transitions, and optimizes your video for different platforms. Multi-track timeline, advanced color grading, audio mixing, and special effects give you complete creative control.\n\nIncludes: AI-powered scene detection, auto-captions in 40+ languages, stock footage library, music library, green screen removal, motion tracking, 4K export, and direct publishing to social platforms.",
    emoji: "🎬", 
    rating: 4.7, 
    adoptions: 7300, 
    gradient: "from-red-500 to-pink-600", 
    imageUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80", 
    developmentStage: null,
    tags: ['Video', 'Editing', 'AI'],
    products: [
      {
        id: 'video-basic',
        name: 'Basic',
        description: 'Get started with video editing',
        pricing: { monthly: 29 },
        features: [
          'HD exports (1080p)',
          'Basic effects',
          '10 hours of rendering per month',
          'Watermark on exports'
        ]
      },
      {
        id: 'video-pro',
        name: 'Pro',
        description: 'Professional video production',
        pricing: { monthly: 59 },
        features: [
          '4K exports',
          'Advanced effects & transitions',
          'Unlimited rendering',
          'No watermark',
          'AI-powered features',
          'Multi-track editing'
        ],
        isPreferred: true
      },
      {
        id: 'video-enterprise',
        name: 'Enterprise',
        description: 'For teams and agencies',
        pricing: { monthly: 149, consumption: { price: 5, unit: 'per TB of storage' } },
        features: [
          'All Pro features',
          'Team collaboration',
          'Unlimited storage',
          'API access',
          'Custom branding',
          'Dedicated support'
        ]
      }
    ]
  },
  
  // 5. Monthly + Consumption
  { 
    id: 5, 
    name: "Code Assistant", 
    description: "AI-powered coding companion for developers", 
    longDescription: "Supercharge your development workflow with Code Assistant, the AI-powered coding companion that understands your codebase. Get intelligent code suggestions, bug fixes, refactoring recommendations, and documentation generation in real-time.\n\nSupports 30+ programming languages including Python, JavaScript, TypeScript, Java, Go, Rust, and more. Works seamlessly with your favorite IDEs and editors through our extensions.\n\nAdvanced features: context-aware completions, code explanation, test generation, security vulnerability detection, performance optimization suggestions, and natural language to code conversion. Learn best practices as you code with inline explanations.",
    emoji: "💻", 
    rating: 4.5, 
    adoptions: 9800, 
    pricing: { monthly: 19, consumption: { price: 0.01, unit: "per API call" } }, 
    gradient: "from-green-500 to-teal-500", 
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80", 
    discount: 40, 
    developmentStage: 'alpha' as const, 
    tags: ['Code', 'AI', 'Developer'] 
  },
  
  // 6. Multiple Products - Photo Tool with flexible pricing
  { 
    id: 6, 
    name: "Photo Enhancer", 
    description: "Enhance your photos with AI magic", 
    longDescription: "Transform ordinary photos into extraordinary images with Photo Enhancer's AI-powered tools. Automatically improve lighting, colors, sharpness, and remove unwanted objects with a single click.\n\nPerfect for photographers, e-commerce businesses, real estate agents, and anyone who wants professional-looking photos without the learning curve. Our AI has been trained on millions of professional photos to understand what makes an image stand out.\n\nPowerful tools include: one-click enhancement, background removal, object removal, upscaling to 8K, portrait retouching, color correction, noise reduction, HDR effects, batch processing, and format conversion. Process hundreds of photos in minutes.",
    emoji: "📸", 
    rating: 4.8, 
    adoptions: 11200, 
    gradient: "from-cyan-500 to-blue-500", 
    imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80", 
    developmentStage: null,
    tags: ['Photo', 'AI', 'Enhancement'],
    products: [
      {
        id: 'photo-payg',
        name: 'Pay as You Go',
        description: 'Only pay for what you use',
        pricing: { consumption: { price: 2, unit: 'per 100 photos' } },
        features: [
          'No monthly commitment',
          'All enhancement features',
          'Pay per use',
          'Credits never expire'
        ]
      },
      {
        id: 'photo-monthly',
        name: 'Monthly Plan',
        description: 'Best value for regular use',
        pricing: { monthly: 24, consumption: { price: 1.5, unit: 'per 100 photos (over limit)' } },
        features: [
          '500 photos/month included',
          'All enhancement features',
          'Priority processing',
          'Reduced overage rates'
        ],
        isPreferred: true
      },
      {
        id: 'photo-bundle',
        name: 'Lifetime Bundle',
        description: 'One-time payment + pay per use',
        pricing: { oneTime: 99, consumption: { price: 1, unit: 'per 100 photos' } },
        features: [
          'Lifetime access',
          'Best consumption rates',
          'All future features',
          'Premium support'
        ]
      }
    ]
  },
  
  // 7. Solo Monthly con Beta
  { id: 7, name: "Social Media Manager", description: "Automate your social media presence", emoji: "📱", rating: 4.4, adoptions: 6750, pricing: { monthly: 34 }, gradient: "from-purple-500 to-indigo-500", imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80", discount: 10, developmentStage: 'beta' as const, tags: ['Marketing', 'Social Media'] },
  
  // 8. One-Time + Consumption
  { id: 8, name: "Email Marketing Pro", description: "Create stunning email campaigns", emoji: "📧", rating: 4.6, adoptions: 5400, pricing: { oneTime: 199, consumption: { price: 0.1, unit: "per email sent" } }, gradient: "from-yellow-500 to-orange-400", imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80", developmentStage: null, tags: ['Marketing', 'Email'] },
  
  // 9. Solo Consumption con Alpha
  { id: 9, name: "Voice Synthesizer", description: "Convert text to natural-sounding speech", emoji: "🔊", rating: 4.3, adoptions: 3200, pricing: { consumption: { price: 0.05, unit: "per minute" } }, gradient: "from-indigo-500 to-purple-600", imageUrl: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=800&q=80", discount: 15, developmentStage: 'alpha' as const, tags: ['AI', 'Voice', 'Audio'] },
  
  // 10. Legacy price (per retrocompatibilità)
  { id: 10, name: "Data Visualizer", description: "Transform data into beautiful charts", emoji: "📈", rating: 4.7, adoptions: 8100, price: 54, gradient: "from-teal-500 to-green-600", imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80", developmentStage: null, tags: ['Analytics', 'Visualization'] }
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTool, setSelectedTool] = useState<typeof mockTools[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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

  // Handle tool card click to open dialog
  const handleToolClick = (tool: typeof mockTools[0]) => {
    setSelectedTool(tool);
    setIsDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedTool(null), 300); // Delay clearing to allow animation
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
          
          {/* Mobile Carousel */}
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
                    <ToolCard {...tool} onViewClick={() => handleToolClick(tool)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Carousel */}
          <div className="mb-4 mt-4  hidden sm:block">
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
                  <ToolCard {...tool} onViewClick={() => handleToolClick(tool)} />
                </div>
              ))}
            </div>
          </div>

          {/* All Tools Section */}
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">All Tools</h2>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {filteredTools.map((tool) => (
                <div key={tool.id} className="w-80 sm:w-[22rem]">
                  <ToolCard {...tool} onViewClick={() => handleToolClick(tool)} />
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
                <div className="border-2 border-white/80 rounded-lg p-3 sm:p-4 mb-2 w-20 sm:w-24 h-24 sm:h-28 flex flex-col items-center justify-center">
                  <div className="text-3xl sm:text-4xl font-black text-white opacity-50">5%</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-green-100" />
                    <span className="text-xs text-green-100 font-semibold">0-1K</span>
                  </div>
                </div>
              </div>
              
              {/* 2% Tier - Medium */}
              <div className="flex flex-col items-center">
                <div className="border-2 border-white/90 rounded-lg p-4 sm:p-6 mb-2 w-24 sm:w-32 h-32 sm:h-40 flex flex-col items-center justify-center">
                  <div className="text-4xl sm:text-5xl font-black text-white opacity-75">10%</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 text-green-100" />
                    <span className="text-xs sm:text-sm text-green-100 font-semibold">1K+</span>
                  </div>
                </div>
              </div>
              
              {/* 3% Tier - Largest */}
              <div className="flex flex-col items-center">
                <div className="border-3 border-white rounded-lg p-6 sm:p-8 mb-2 w-28 sm:w-40 h-40 sm:h-52 flex flex-col items-center justify-center">
                  <div className="text-5xl sm:text-7xl font-black text-white opacity-100">15%</div>
                  <div className="flex items-center gap-1 mt-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-100" />
                    <span className="text-sm sm:text-base text-green-100 font-semibold">10K+</span>
                  </div>
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
          {...selectedTool}
        />
      )}
    </div>
  );
}

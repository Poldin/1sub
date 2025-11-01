'use client';

import { useState, useRef, useEffect } from 'react';
import { Users } from 'lucide-react';
import Footer from './components/Footer';
import ToolCard from './components/ToolCard';
import ToolDialog from './components/ToolDialog';
import PricingExplainer from './components/PricingExplainer';
import TrustIndicators from './components/TrustIndicators';

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
                {mockTools.length}+ tools available
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
              <span className="text-[#3ecf8e] font-semibold">{mockTools.length}+ tools</span> available now
            </span>
          </div>
          
          <div className="animate-fade-in-up delay-400 opacity-0">
            <a
              href="/login"
              id="join"
              className="group relative inline-flex items-center justify-center px-10 py-5 text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 animate-pulse-glow active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-3">
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

      {/* Trust Indicators & Social Proof */}
      <TrustIndicators />

      {/* Tools Showcase */}
      <section className="section-padding bg-[#0a0a0a]">
        <div className="mx-auto">
          
          {/* Search Bar */}
          <div className="mb-8 max-w-3xl mx-auto">
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
            <div className="flex flex-wrap justify-center gap-2">
              {['AI', 'Design', 'Analytics', 'Video', 'Marketing', 'Code'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSearchTerm(category)}
                  className={`group/cat px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    searchTerm === category
                      ? 'bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-white shadow-lg shadow-[#3ecf8e]/30 scale-105'
                      : 'bg-[#1f2937] border border-[#374151] text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] hover:text-[#3ecf8e] hover:scale-105'
                  }`}
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

      {/* Community & Vendor Section */}
      <section className="section-padding bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Community Card */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">join our community</h2>
              </div>
              
              <p className="text-[#d1d5db] mb-6 leading-relaxed">
                Connect with users, share tips, and discover new tools together.
              </p>
              
              <div className="flex flex-col gap-3">
                <a
                  href="/login"
                  className="group/btn flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-white rounded-xl font-semibold hover:scale-105 transition-transform"
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
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  join Discord
                </a>
              </div>
            </div>

            {/* Vendor Card */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2dd4bf] to-[#3ecf8e] rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                    <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">for vendors</h2>
              </div>
              
              <p className="text-[#d1d5db] mb-2 leading-relaxed">
                Get discovered by thousands of subscribers.
              </p>
              <p className="text-[#3ecf8e] text-sm font-semibold mb-6">
                1st month free of fees
              </p>
              
              <div className="flex flex-col gap-3">
                <a
                  href="/register"
                  className="group/btn flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2dd4bf] to-[#3ecf8e] text-white rounded-xl font-semibold hover:scale-105 transition-transform"
                >
                  submit your tool
                  <svg className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a
                  href="/vendors"
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-[#3ecf8e] text-[#3ecf8e] rounded-xl font-semibold hover:bg-[#3ecf8e]/10 transition-colors"
                >
                  learn more
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="section-padding">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#059669] to-[#047857] rounded-2xl p-8 sm:p-12 border border-white/20 relative overflow-hidden">
            
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-white">
                  earn with referrals
                </h2>
                <p className="text-green-50 text-lg">
                  lifetime commission up to 15%
                </p>
              </div>
              
              {/* Commission Tiers */}
              <div className="flex items-end justify-center gap-3 sm:gap-4 mb-8">
                <div className="flex flex-col items-center">
                  <div className="bg-white/10 backdrop-blur-sm border-2 border-white/40 rounded-xl p-4 w-24 h-28 flex flex-col items-center justify-center">
                    <div className="text-4xl font-black text-white">5%</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="w-3 h-3 text-green-100" />
                      <span className="text-xs text-green-100">0-1K</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="bg-white/20 backdrop-blur-sm border-2 border-white/60 rounded-xl p-6 w-28 h-36 flex flex-col items-center justify-center">
                    <div className="text-5xl font-black text-white">10%</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="w-4 h-4 text-green-100" />
                      <span className="text-sm text-green-100">1K+</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="bg-white/30 backdrop-blur-sm border-2 border-white rounded-xl p-8 w-32 h-44 flex flex-col items-center justify-center">
                    <div className="text-6xl font-black text-white">15%</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="w-5 h-5 text-white" />
                      <span className="text-base text-white font-semibold">10K+</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 bg-white text-[#059669] px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl"
                >
                  start earning
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <p className="text-sm text-green-100 mt-4">
                  <a 
                    href="/tc_referral" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white transition-colors"
                  >
                    Terms & conditions
                  </a>
                </p>
              </div>
            </div>
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

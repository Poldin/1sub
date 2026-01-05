'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Users, Share2, Check, ChevronDown, ChevronUp, Sparkles, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Tool, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts } from '@/lib/tool-types';
import { PricingCard, MainPriceDisplay, PricingBadges } from '@/app/components/PricingDisplay';
import { getToolPhase, getPhaseLabel, getPhaseTailwindClasses } from '@/lib/tool-phase';
import { usePurchasedProducts } from '@/hooks/usePurchasedProducts';
import { useAuth } from '@/contexts/AuthContext';
import CustomPricingModal from '@/components/CustomPricingModal';
import Footer from '@/app/components/Footer';

const formatAdoptions = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export default function ToolShowcasePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const { isLoggedIn } = useAuth();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for description expansion
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // State for share button feedback
  const [isShareCopied, setIsShareCopied] = useState(false);
  // State for custom pricing modal
  const [isCustomPricingModalOpen, setIsCustomPricingModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  // State for Magic Login
  const [magicLoginLoading, setMagicLoginLoading] = useState(false);
  
  // Check subscriptions
  const { getProductSubscription, hasTool } = usePurchasedProducts();
  
  // Fetch tool data by slug
  useEffect(() => {
    async function fetchTool() {
      try {
        const response = await fetch('/api/public/tools');
        if (!response.ok) throw new Error('Failed to fetch tools');
        
        const data = await response.json();
        const foundTool = data.tools?.find((t: Tool) => t.slug === slug);
        
        if (!foundTool) {
          setError('Tool not found');
          return;
        }
        
        setTool(foundTool);
      } catch (err) {
        console.error('Error fetching tool:', err);
        setError('Failed to load tool');
      } finally {
        setLoading(false);
      }
    }
    
    if (slug) {
      fetchTool();
    }
  }, [slug]);
  
  // Check if user has any active subscription to this tool
  const hasActiveSubscription = tool ? hasTool(tool.id) : false;
  
  // Check if Magic Login is configured for this tool
  const hasMagicLogin = tool?.has_magic_login === true;
  
  // Show Magic Login button only if user has subscription AND Magic Login is configured
  const showMagicLogin = hasActiveSubscription && hasMagicLogin;
  
  // Handle Magic Login
  const handleMagicLogin = async () => {
    if (magicLoginLoading || !tool) return;
    
    setMagicLoginLoading(true);
    try {
      const response = await fetch('/api/v1/magiclogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: tool.id,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.magicLoginUrl) {
        window.open(result.magicLoginUrl, '_blank', 'noopener,noreferrer');
      } else {
        console.warn('Magic Login not available:', result.message);
      }
    } catch (error) {
      console.error('Magic Login error:', error);
    } finally {
      setMagicLoginLoading(false);
    }
  };
  
  // Handle checkout
  const handleCheckout = async (productId?: string) => {
    if (!tool) return;
    
    if (!isLoggedIn) {
      // Redirect to register with return URL
      router.push(`/register?redirect=/tool/${tool.slug}`);
      return;
    }
    
    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: tool.id,
          product_id: productId,
        }),
      });
      
      const data = await response.json();
      
      if (data.checkout_id) {
        router.push(`/credit_checkout/${data.checkout_id}`);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };
  
  // Handle share
  const handleShare = async () => {
    if (!tool) return;
    
    const shareUrl = `${window.location.origin}/tool/${tool.slug}`;
    const shareData = {
      title: tool.name,
      text: tool.description || undefined,
      url: shareUrl,
    };
    
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setIsShareCopied(true);
      setTimeout(() => setIsShareCopied(false), 2000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setIsShareCopied(true);
          setTimeout(() => setIsShareCopied(false), 2000);
        } catch (clipboardErr) {
          console.error('Failed to copy:', clipboardErr);
        }
      }
    }
  };
  
  // Extract metadata
  const uiMeta = useMemo(() => ({ ...DEFAULT_UI_METADATA, ...tool?.metadata?.ui }), [tool?.metadata?.ui]);
  const engagement = useMemo(() => ({ ...DEFAULT_ENGAGEMENT_METRICS, ...tool?.metadata?.engagement }), [tool?.metadata?.engagement]);
  const longDescription = useMemo(() => tool?.metadata?.content?.long_description, [tool?.metadata?.content?.long_description]);
  
  // Phase calculation
  const payingUserCount = tool?.metadata?.paying_user_count ?? 0;
  const revenue = tool?.metadata?.revenue ?? 0;
  const calculatedPhase = useMemo(() => getToolPhase(payingUserCount, revenue), [payingUserCount, revenue]);
  const phaseLabel = useMemo(() => getPhaseLabel(calculatedPhase), [calculatedPhase]);
  const phaseClasses = useMemo(() => getPhaseTailwindClasses(calculatedPhase), [calculatedPhase]);
  
  const imageUrl = useMemo(() => uiMeta.hero_image_url || tool?.url, [uiMeta.hero_image_url, tool?.url]);
  const logoUrl = uiMeta.logo_url;
  const emoji = uiMeta.emoji;
  const gradient = uiMeta.gradient;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading tool...</p>
        </div>
      </div>
    );
  }
  
  if (error || !tool) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || 'Tool not found'}</h1>
          <Link href="/" className="text-[#3ecf8e] hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tool Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            {/* Logo */}
            <div className={`flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden shadow-lg relative`}>
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={tool.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="text-5xl">{emoji}</div>
              )}
            </div>
            
            {/* Name and vendor */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold text-[#ededed]">{tool.name}</h1>
                  {tool.vendor && (
                    <p className="text-sm text-[#9ca3af] mt-1">by {tool.vendor.full_name}</p>
                  )}
                </div>
                {uiMeta.verified && (
                  <div className="flex-shrink-0 bg-blue-500/20 text-blue-400 p-1.5 rounded">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats and Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 text-[#3ecf8e] fill-[#3ecf8e]" />
              <span className="text-[#ededed] font-bold text-lg">{(tool.avg_rating ?? engagement.rating ?? 4.5).toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-5 h-5 text-[#9ca3af]" />
              <span className="text-[#9ca3af] font-medium text-lg">
                {formatAdoptions(tool.active_users ?? engagement.adoption_count ?? 0)}
              </span>
            </div>
            {/* Share Button */}
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 transition-colors p-1 rounded hover:bg-[#374151] ${
                isShareCopied ? 'text-[#3ecf8e]' : 'text-[#9ca3af] hover:text-[#3ecf8e]'
              }`}
              title={isShareCopied ? 'Copied!' : 'Share tool'}
            >
              {isShareCopied ? (
                <Check className="w-5 h-5 animate-in fade-in duration-200" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </button>
            {/* Phase Badge */}
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase shadow-lg ${phaseClasses.badge}`}>
              {phaseLabel}
            </span>
            {/* Discount Badge */}
            {(uiMeta.discount_percentage ?? 0) > 0 && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold">
                -{uiMeta.discount_percentage}%
              </span>
            )}
          </div>
          
          {/* Tags */}
          {uiMeta.tags && uiMeta.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uiMeta.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-[#374151] text-[#d1d5db] px-3 py-1 rounded-md text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Magic Login Button - Show if user has active subscription AND Magic Login is configured */}
        {showMagicLogin && (
          <button
            onClick={handleMagicLogin}
            disabled={magicLoginLoading}
            className="mb-6 px-6 py-3 rounded-lg text-base font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white hover:from-[#ea580c] hover:to-[#c2410c] disabled:opacity-50 shadow-lg shadow-orange-500/20"
          >
            {magicLoginLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Sign in with Magic Login
              </>
            )}
          </button>
        )}
        
        {/* Products Section */}
        {hasProducts(tool) && tool.products.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#ededed] mb-4">
              {tool.products.length > 1 ? 'Available Plans' : 'Pricing'}
            </h2>
            
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {tool.products.map((product) => {
                const subscription = getProductSubscription(product.id);
                const hasActiveSub = !!subscription;
                const toolSubs = tool.products
                  .map(p => getProductSubscription(p.id))
                  .filter(Boolean);
                const hasAnySubscription = toolSubs.length > 0;
                const isCurrentPlan = hasActiveSub;
                
                return (
                  <div key={product.id} className="relative">
                    {/* Subscription Badge */}
                    {hasActiveSub && (
                      <div className={`absolute -top-2 -right-2 z-10 px-3 py-1 rounded-full shadow-lg flex items-center gap-1 ${
                        subscription.status === 'cancelled'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse'
                          : 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white shadow-orange-500/30'
                      }`}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">
                          {subscription.status === 'cancelled' ? 'Ending' : 'Active'}
                        </span>
                      </div>
                    )}
                    <PricingCard
                      id={product.id}
                      name={product.name}
                      description={product.description ?? undefined}
                      pricingModel={product.pricing_model}
                      features={product.features}
                      isPreferred={product.is_preferred}
                      isCustomPlan={product.is_custom_plan}
                      contactEmail={product.contact_email}
                      toolMetadata={tool.metadata ?? undefined}
                      ctaText={
                        isCurrentPlan
                          ? 'Current Plan'
                          : hasAnySubscription
                            ? 'Change Plan'
                            : undefined
                      }
                      onSelect={(productId) => {
                        if (isCurrentPlan) return;
                        if (productId && !product.is_custom_plan && !product.pricing_model.custom_plan?.enabled) {
                          handleCheckout(productId);
                        }
                      }}
                      onContactVendor={() => {
                        setSelectedProductId(product.id);
                        setIsCustomPricingModalOpen(true);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Hero Image */}
        <div className="mb-8">
          <div className="w-full h-80 overflow-hidden bg-[#111111] relative rounded-xl">
            {imageUrl && imageUrl !== '/favicon.ico' ? (
              <Image
                src={imageUrl}
                alt={`${tool.name} preview`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-20">
                <div className="text-8xl">{emoji || '🔧'}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Description */}
        <div className="mb-8">
          <div className="markdown-content max-w-4xl">
            <div className="relative">
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  isDescriptionExpanded ? 'max-h-none' : 'max-h-48'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-[#ededed] mt-6 mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-[#ededed] mt-5 mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xl font-bold text-[#ededed] mt-4 mb-2" {...props} />,
                    h4: ({node, ...props}) => <h4 className="text-lg font-bold text-[#ededed] mt-3 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-[#d1d5db] text-base sm:text-lg leading-loose mb-4" {...props} />,
                    a: ({node, ...props}) => <a className="text-[#3ecf8e] no-underline hover:underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-[#ededed] font-bold" {...props} />,
                    em: ({node, ...props}) => <em className="text-[#d1d5db] italic" {...props} />,
                    code: ({node, inline, ...props}: any) => 
                      inline ? (
                        <code className="text-[#3ecf8e] bg-[#374151] px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                      ) : (
                        <code className="text-[#d1d5db] font-mono" {...props} />
                      ),
                    pre: ({node, ...props}) => (
                      <pre className="bg-[#111111] border border-[#374151] rounded-lg p-4 overflow-x-auto mb-4" {...props} />
                    ),
                    ul: ({node, ...props}) => <ul className="list-disc list-inside text-[#d1d5db] mb-4 space-y-2 ml-4" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside text-[#d1d5db] mb-4 space-y-2 ml-4" {...props} />,
                    li: ({node, ...props}) => <li className="text-[#d1d5db]" {...props} />,
                    blockquote: ({node, ...props}) => (
                      <blockquote className="border-l-4 border-[#3ecf8e] pl-4 text-[#9ca3af] italic my-4" {...props} />
                    ),
                    hr: ({node, ...props}) => <hr className="border-[#374151] my-6" {...props} />,
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse" {...props} />
                      </div>
                    ),
                    thead: ({node, ...props}) => <thead className="bg-[#1f2937]" {...props} />,
                    tbody: ({node, ...props}) => <tbody {...props} />,
                    tr: ({node, ...props}) => <tr className="border-b border-[#374151]" {...props} />,
                    th: ({node, ...props}) => <th className="text-[#ededed] font-bold px-4 py-2 text-left border border-[#374151]" {...props} />,
                    td: ({node, ...props}) => <td className="text-[#d1d5db] px-4 py-2 border border-[#374151]" {...props} />,
                    img: ({node, ...props}) => (
                      <img className="rounded-lg border border-[#374151] max-w-full h-auto my-4" {...props} />
                    ),
                  }}
                >
                  {longDescription || tool.description || ''}
                </ReactMarkdown>
              </div>
              {!isDescriptionExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
              )}
            </div>
            {(longDescription || tool.description) && (
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-4 flex items-center gap-2 text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors text-sm font-medium"
              >
                {isDescriptionExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show more
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Legacy Pricing Options Section */}
        {!hasProducts(tool) && tool.metadata?.pricing_options && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#ededed] mb-4">Pricing</h2>
            
            <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <MainPriceDisplay pricingOptions={tool.metadata.pricing_options} />
                  <div className="mt-2">
                    <PricingBadges pricingOptions={tool.metadata.pricing_options} />
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleCheckout()}
                className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Custom Pricing Modal */}
      <CustomPricingModal
        isOpen={isCustomPricingModalOpen}
        onClose={() => {
          setIsCustomPricingModalOpen(false);
          setSelectedProductId(undefined);
        }}
        toolId={tool.id}
        toolName={tool.name}
        productId={selectedProductId}
      />
    </div>
  );
}


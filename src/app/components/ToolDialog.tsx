'use client';

import { memo, useMemo, useState } from 'react';
import { X, Star, Users, ExternalLink, Check, ChevronDown, ChevronUp, Share2, CheckCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Tool, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts } from '@/lib/tool-types';
import { PricingCard, MainPriceDisplay, PricingBadges } from './PricingDisplay';
import { getToolPhase, getPhaseLabel, getPhaseTailwindClasses } from '@/lib/tool-phase';
import { usePurchasedProducts } from '@/hooks/usePurchasedProducts';
import CustomPricingModal from '@/components/CustomPricingModal';

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #3ecf8e;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #2dd4bf;
  }
`;

// Legacy Product format (for backward compatibility)
export interface LegacyProduct {
  id: string;
  name: string;
  description?: string;
  pricing: {
    monthly?: number;
    oneTime?: number;
    consumption?: {
      price: number;
      unit: string;
    };
  };
  features?: string[];
  isPreferred?: boolean;
}

// Legacy props format
export interface LegacyToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  id: number;
  name: string;
  description: string;
  longDescription?: string;
  emoji?: string;
  logoUrl?: string;
  imageUrl?: string;
  rating: number;
  adoptions: number;
  gradient?: string;
  verified?: boolean;
  discount?: number;
  developmentStage?: 'alpha' | 'beta' | null;
  products?: LegacyProduct[];
  pricing?: {
    monthly?: number;
    oneTime?: number;
    consumption?: {
      price: number;
      unit: string;
    };
  };
  price?: number;
  tags?: string[];
  onToolLaunch?: (toolId: string, selectedProductId?: string) => void;
}

// New unified props format
export interface UnifiedToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Tool;
  onToolLaunch?: (toolId: string, selectedProductId?: string) => void;
}

export type ToolDialogProps = LegacyToolDialogProps | UnifiedToolDialogProps;

// Type guard
function isUnifiedProps(props: ToolDialogProps): props is UnifiedToolDialogProps {
  return 'tool' in props;
}

// Helper to check if URL is likely an image
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico'];

const isLikelyImageUrl = (url?: string | null): boolean => {
  if (!url) return false;

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.startsWith('data:image/')) {
    return true;
  }

  if (lowerUrl.startsWith('/')) {
    return IMAGE_EXTENSIONS.some((ext) => lowerUrl.endsWith(ext));
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
};

const formatAdoptions = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

function ToolDialogComponent(props: ToolDialogProps) {
  if (!props.isOpen) return null;

  // Extract tool data based on format
  // Non usiamo useMemo qui perché il memo comparison già gestisce i re-render
  // e useMemo con [props] causerebbe comunque re-render quando props cambia
  let tool: Tool;

  if (isUnifiedProps(props)) {
    tool = props.tool;
  } else {
    // Convert legacy format to Tool
    const {
      id, name, description, longDescription, emoji, logoUrl, imageUrl,
      rating, adoptions, price, pricing, products, gradient, tags,
      verified, discount, developmentStage
    } = props;

    tool = {
      id: String(id),
      name,
      slug: String(id), // Use id as slug for legacy props
      description,
      url: imageUrl || '',
      is_active: true,
      user_profile_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_users: null,
      avg_rating: null,
      metadata: {
        ui: {
          emoji,
          gradient,
          hero_image_url: imageUrl,
          logo_url: logoUrl,
          tags: tags || [],
          verified: verified || false,
          development_stage: developmentStage || null,
          discount_percentage: discount,
        },
        engagement: {
          rating,
          adoption_count: adoptions,
        },
        content: {
          long_description: longDescription,
        },
      },
      products: products?.map(p => ({
        id: p.id,
        tool_id: String(id),
        name: p.name,
        description: p.description || undefined,
        is_active: true,
        created_at: new Date().toISOString(),
        pricing_model: {
          one_time: p.pricing.oneTime ? { enabled: true, type: 'absolute' as const, price: p.pricing.oneTime } : undefined,
          subscription: p.pricing.monthly ? { enabled: true, price: p.pricing.monthly, interval: 'month' as const } : undefined,
          usage_based: p.pricing.consumption ? {
            enabled: true,
            price_per_unit: p.pricing.consumption.price,
            unit_name: p.pricing.consumption.unit
          } : undefined,
        },
        features: p.features,
        is_preferred: p.isPreferred,
      })),
    };
  }

  // Extract metadata with defaults - MEMOIZED
  const uiMeta = useMemo(() => ({ ...DEFAULT_UI_METADATA, ...tool.metadata?.ui }), [tool.metadata?.ui]);
  const engagement = useMemo(() => ({ ...DEFAULT_ENGAGEMENT_METRICS, ...tool.metadata?.engagement }), [tool.metadata?.engagement]);
  const longDescription = useMemo(() => tool.metadata?.content?.long_description, [tool.metadata?.content?.long_description]);

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
  const { hasProduct, getProductSubscription, hasTool } = usePurchasedProducts();
  
  // Check if user has any active subscription to this tool
  const hasActiveSubscription = hasTool(tool.id);
  
  // Check if Magic Login is configured for this tool
  const hasMagicLogin = tool.has_magic_login === true;
  
  // Show Magic Login button only if user has subscription AND Magic Login is configured
  const showMagicLogin = hasActiveSubscription && hasMagicLogin;

  // Handle Magic Login
  const handleMagicLogin = async () => {
    if (magicLoginLoading) return;
    
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
        // Open Magic Login URL in new tab
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

  // Determine which image to show - MEMOIZED
  const imageUrl = useMemo(() => uiMeta.hero_image_url || tool.url, [uiMeta.hero_image_url, tool.url]);
  const logoUrl = uiMeta.logo_url;
  const emoji = uiMeta.emoji;
  const gradient = uiMeta.gradient;

  // Dynamic phase calculation based on paying user count and revenue - MEMOIZED
  const payingUserCount = tool.metadata?.paying_user_count ?? 0;
  const revenue = tool.metadata?.revenue ?? 0;
  const calculatedPhase = useMemo(() => getToolPhase(payingUserCount, revenue), [payingUserCount, revenue]);
  const phaseLabel = useMemo(() => getPhaseLabel(calculatedPhase), [calculatedPhase]);
  const phaseClasses = useMemo(() => getPhaseTailwindClasses(calculatedPhase), [calculatedPhase]);

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div
        className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4"
        onClick={props.onClose}
      >
        <div
          className="relative w-full max-w-full md:max-w-5xl h-screen md:h-[95vh] bg-[#1f2937] rounded-none md:rounded-lg shadow-2xl border-0 md:border border-[#374151] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={props.onClose}
            className="absolute top-2 right-2 md:top-4 md:right-4 z-10 p-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg transition-colors flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6 text-[#ededed]" />
          </button>

          {/* Scrollable Content */}
          <div
            className="overflow-y-auto flex-1 custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#3ecf8e transparent'
            }}
          >
            {/* Tool Header - Logo and Title */}
            <div className="p-2 sm:p-6 md:p-8 pb-4">
              <div className="flex items-start gap-4 mb-4">
                {/* Logo */}
                <div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden shadow-lg relative`}>
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={tool.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, 80px"
                    />
                  ) : (
                    <div className="text-4xl sm:text-5xl">
                      {emoji}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#ededed]">
                        {tool.name}
                      </h2>
                      {tool.vendor_name && (
                        <p className="text-xs text-[#9ca3af] mt-0.5">
                          by {tool.vendor_name}
                        </p>
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

              {/* Short Description */}
              <p className="text-[#9ca3af] text-base leading-relaxed mb-4">
                {tool.description}
              </p>

              {/* Stats and Meta */}
              <div className="mt-4">
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-4 mb-3">
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
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/tool/${tool.slug}`;
                      const shareData = {
                        title: tool.name,
                        text: tool.description || undefined,
                        url: shareUrl,
                      };

                      try {
                        // Check if Web Share API is supported
                        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                          await navigator.share(shareData);
                          setIsShareCopied(true);
                          setTimeout(() => {
                            setIsShareCopied(false);
                          }, 2000);
                        } else {
                          // Fallback to clipboard for desktop browsers
                          await navigator.clipboard.writeText(shareUrl);
                          setIsShareCopied(true);
                          setTimeout(() => {
                            setIsShareCopied(false);
                          }, 2000);
                        }
                      } catch (err: any) {
                        // User cancelled share or error occurred
                        if (err.name !== 'AbortError') {
                          console.error('Error sharing:', err);
                          // Try clipboard as last resort
                          try {
                            await navigator.clipboard.writeText(shareUrl);
                            setIsShareCopied(true);
                            setTimeout(() => {
                              setIsShareCopied(false);
                            }, 2000);
                          } catch (clipboardErr) {
                            console.error('Failed to copy to clipboard:', clipboardErr);
                          }
                        }
                      }
                    }}
                    className={`flex items-center gap-1.5 transition-colors p-1 rounded hover:bg-[#374151] ${
                      isShareCopied ? 'text-[#3ecf8e]' : 'text-[#9ca3af] hover:text-[#3ecf8e]'
                    }`}
                    title={isShareCopied ? 'Shared!' : 'Share tool'}
                  >
                    {isShareCopied ? (
                      <Check className="w-5 h-5 animate-in fade-in duration-200" />
                    ) : (
                      <Share2 className="w-5 h-5" />
                    )}
                  </button>
                  {/* Dynamic Phase Badge */}
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
            </div>

            {/* Products Section - Full Width Above Image */}
            {hasProducts(tool) && tool.products.length > 0 && (
              <div className="px-2 sm:px-6 md:px-8 pb-6">
                {/* Magic Login Button - Show if user has active subscription AND Magic Login is configured */}
                {showMagicLogin && (
                  <button
                    onClick={handleMagicLogin}
                    disabled={magicLoginLoading}
                    className="mb-4 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white hover:from-[#ea580c] hover:to-[#c2410c] disabled:opacity-50 shadow-lg shadow-orange-500/20"
                  >
                    {magicLoginLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Sign in with Magic Login
                      </>
                    )}
                  </button>
                )}

                <h3 className="text-xl sm:text-2xl font-bold text-[#ededed] mb-4">
                  {tool.products.length > 1 ? 'Available Plans' : 'Pricing'}
                </h3>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {tool.products.map((product) => {
                    // Capture tool.id in closure to avoid scope issues
                    const currentToolId = tool.id;
                    const subscription = getProductSubscription(product.id);
                    const hasActiveSub = !!subscription;
                    // Check if user has ANY subscription to this tool (for changing plans)
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
                          // Override CTA text if user already has a subscription
                          ctaText={
                            isCurrentPlan
                              ? 'Current Plan'
                              : hasAnySubscription
                                ? 'Change Plan'
                                : undefined
                          }
                          onSelect={(productId) => {
                            // Don't allow re-purchase of current plan
                            if (isCurrentPlan) {
                              return;
                            }
                            // Initiate checkout with selected product (only for non-custom plans)
                            if (props.onToolLaunch && productId && !product.is_custom_plan && !product.pricing_model.custom_plan?.enabled) {
                              console.log('[ToolDialog] Calling onToolLaunch with:', { currentToolId, productId });
                              props.onToolLaunch(currentToolId, productId);
                              // Navigation happens in parent
                            }
                          }}
                          onContactVendor={(email, productName) => {
                            // Open custom pricing modal instead of mailto
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
            <div className="px-2 sm:px-6 md:px-8 mb-6">
              <div className="w-full h-64 sm:h-80 overflow-hidden bg-[#111111] relative rounded-lg">
                {imageUrl && imageUrl !== '/favicon.ico' ? (
                  <Image
                    src={imageUrl}
                    alt={`${tool.name} preview`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 672px"
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mM8dv16PQAGwgK75n6TaAAAAABJRU5ErkJggg=="
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <div className="text-8xl">{emoji || '🔧'}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Description - Markdown support */}
            <div className="px-2 sm:px-0 md:px-8 pb-6">
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
                      // Headings
                      h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-[#ededed] mt-6 mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-[#ededed] mt-5 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xl font-bold text-[#ededed] mt-4 mb-2" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-lg font-bold text-[#ededed] mt-3 mb-2" {...props} />,
                      // Paragraphs
                      p: ({node, ...props}) => <p className="text-[#d1d5db] text-base sm:text-lg leading-loose mb-4" {...props} />,
                      // Links
                      a: ({node, ...props}) => <a className="text-[#3ecf8e] no-underline hover:underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                      // Strong/Bold
                      strong: ({node, ...props}) => <strong className="text-[#ededed] font-bold" {...props} />,
                      // Emphasis/Italic
                      em: ({node, ...props}) => <em className="text-[#d1d5db] italic" {...props} />,
                      // Code inline
                      code: ({node, inline, ...props}: any) => 
                        inline ? (
                          <code className="text-[#3ecf8e] bg-[#374151] px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                        ) : (
                          <code className="text-[#d1d5db] font-mono" {...props} />
                        ),
                      // Code blocks
                      pre: ({node, ...props}) => (
                        <pre className="bg-[#111111] border border-[#374151] rounded-lg p-4 overflow-x-auto mb-4" {...props} />
                      ),
                      // Lists
                      ul: ({node, ...props}) => <ul className="list-disc list-inside text-[#d1d5db] mb-4 space-y-2 ml-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside text-[#d1d5db] mb-4 space-y-2 ml-4" {...props} />,
                      li: ({node, ...props}) => <li className="text-[#d1d5db]" {...props} />,
                      // Blockquotes
                      blockquote: ({node, ...props}) => (
                        <blockquote className="border-l-4 border-[#3ecf8e] pl-4 text-[#9ca3af] italic my-4" {...props} />
                      ),
                      // Horizontal rule
                      hr: ({node, ...props}) => <hr className="border-[#374151] my-6" {...props} />,
                      // Tables
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
                      // Images
                      img: ({node, ...props}) => (
                        <img className="rounded-lg border border-[#374151] max-w-full h-auto my-4" {...props} />
                      ),
                    }}
                  >
                    {longDescription || tool.description || ''}
                  </ReactMarkdown>
                  </div>
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1f2937] to-transparent pointer-events-none" />
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

            {/* Legacy Pricing Options Section - Show when tool has pricing_options but no products */}
            {!hasProducts(tool) && tool.metadata?.pricing_options && (
              <div className="px-2 sm:px-6 md:px-8 pb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-[#ededed] mb-4">
                  Pricing
                </h3>

                <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <MainPriceDisplay pricingOptions={tool.metadata.pricing_options} />
                      <div className="mt-2">
                        <PricingBadges pricingOptions={tool.metadata.pricing_options} />
                      </div>
                    </div>
                  </div>

                  {props.onToolLaunch && (
                    <button
                      onClick={() => {
                        props.onToolLaunch?.(tool.id);
                        props.onClose();
                      }}
                      className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      Start
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
    </>
  );
}

// Memoize ToolDialog per evitare re-render non necessari
export default memo(ToolDialogComponent, (prevProps, nextProps) => {
  // Se isOpen è false in entrambi, non serve re-render
  if (!prevProps.isOpen && !nextProps.isOpen) return true;
  
  // Se isOpen cambia, serve re-render
  if (prevProps.isOpen !== nextProps.isOpen) return false;
  
  // Se non è aperto, non serve re-render
  if (!nextProps.isOpen) return true;
  
  // Confronta le props rilevanti - confronto più robusto per evitare re-render quando il tool è lo stesso
  if (isUnifiedProps(prevProps) && isUnifiedProps(nextProps)) {
    // Confronta solo l'ID del tool - se è lo stesso, non serve re-render
    // anche se l'oggetto tool è stato ricreato da SWR
    const sameTool = prevProps.tool.id === nextProps.tool.id;
    const sameCallbacks = (
      prevProps.onClose === nextProps.onClose &&
      prevProps.onToolLaunch === nextProps.onToolLaunch
    );
    
    // Se tool e callbacks sono gli stessi, non serve re-render
    // Nota: confrontiamo solo l'ID perché SWR potrebbe ricreare l'oggetto
    // anche se i dati sono identici, ma l'ID rimane stabile
    return sameTool && sameCallbacks;
  }
  
  // Per legacy props, usa confronto completo
  return false;
});


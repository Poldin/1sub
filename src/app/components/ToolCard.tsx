'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import { Star, Users, ExternalLink, Sparkles, Info } from 'lucide-react';
import { Tool, ToolProduct, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts } from '@/lib/tool-types';
import { PricingSection } from './PricingDisplay';
import { getToolPhase, getPhaseLabel, getPhaseTailwindClasses } from '@/lib/tool-phase';
import { usePurchasedProducts } from '@/hooks/usePurchasedProducts';

// Legacy props format (for backward compatibility)
export interface LegacyToolCardProps {
  id: number | string;
  name: string;
  description: string;
  longDescription?: string;
  emoji?: string;
  logoUrl?: string;
  imageUrl?: string;
  rating: number;
  adoptions: number;
  price?: number;
  pricing?: {
    monthly?: number;
    oneTime?: number;
    consumption?: {
      price: number;
      unit: string;
    };
  };
  products?: Array<{
    id: string;
    name: string;
    description?: string;
    pricing: {
      monthly?: number;
      oneTime?: number;
      consumption?: { price: number; unit: string };
    };
    features?: string[];
    isPreferred?: boolean;
  }>;
  gradient?: string;
  tags?: string[];
  verified?: boolean;
  discount?: number;
  developmentStage?: 'alpha' | 'beta' | null;
  ctaLabel?: string;
  onClick?: () => void;
  onViewClick?: () => void;
  priority?: boolean;
}

// New props format (unified)
export interface UnifiedToolCardProps {
  tool: Tool;
  mode?: 'marketing' | 'dashboard';
  onViewClick?: () => void;
  onLaunchClick?: () => void;
  isHighlighted?: boolean;
  priority?: boolean;
}

// Combined props type
export type ToolCardProps = LegacyToolCardProps | UnifiedToolCardProps;

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isUnifiedProps(props: ToolCardProps): props is UnifiedToolCardProps {
  return 'tool' in props;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// Extract the lowest price from a product's pricing model
const extractPriceFromProduct = (pricingModel: import('@/lib/tool-types').ProductPricingModel): number | null => {
  // Skip custom plans
  if (pricingModel.custom_plan?.enabled) {
    return null;
  }

  const prices: number[] = [];

  // Check subscription pricing
  if (pricingModel.subscription?.enabled && pricingModel.subscription.price !== undefined) {
    prices.push(pricingModel.subscription.price);
  }

  // Check one-time pricing
  if (pricingModel.one_time?.enabled) {
    if (pricingModel.one_time.type === 'absolute' && pricingModel.one_time.price !== undefined) {
      prices.push(pricingModel.one_time.price);
    } else if (pricingModel.one_time.type === 'range' && pricingModel.one_time.min_price !== undefined) {
      prices.push(pricingModel.one_time.min_price);
    }
  }

  // Check usage-based pricing
  if (pricingModel.usage_based?.enabled && pricingModel.usage_based.price_per_unit !== undefined) {
    prices.push(pricingModel.usage_based.price_per_unit);
  }

  return prices.length > 0 ? Math.min(...prices) : null;
};

// Get the lowest price from all products
const getLowestProductPrice = (products: import('@/lib/tool-types').ToolProduct[]): number | null => {
  const prices: number[] = [];

  for (const product of products) {
    // Skip inactive products and custom plans
    if (!product.is_active || product.is_custom_plan) {
      continue;
    }

    const price = extractPriceFromProduct(product.pricing_model);
    if (price !== null) {
      prices.push(price);
    }
  }

  return prices.length > 0 ? Math.min(...prices) : null;
};

// Transform legacy props to Tool type
function legacyToTool(props: LegacyToolCardProps): Tool {
  const {
    id, name, description, longDescription, emoji, logoUrl, imageUrl,
    rating, adoptions, price, pricing, products, gradient, tags,
    verified, discount, developmentStage
  } = props;

  return {
    id: String(id),
    name,
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
      pricing_options: pricing ? {
        one_time: pricing.oneTime ? { enabled: true, price: pricing.oneTime } : undefined,
        subscription: pricing.monthly ? { enabled: true, price: pricing.monthly, interval: 'month' as const } : undefined,
        usage_based: pricing.consumption ? {
          enabled: true,
          price_per_unit: pricing.consumption.price,
          unit_name: pricing.consumption.unit
        } : undefined,
      } : price ? {
        subscription: { enabled: true, price, interval: 'month' as const }
      } : undefined,
    },
    products: products?.map(p => ({
      id: p.id,
      tool_id: String(id),
      name: p.name,
      description: p.description || null,
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
    } as ToolProduct)),
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ToolCardComponent(props: ToolCardProps) {
  // Normalize props to unified format
  const { tool, mode, onViewClick, onLaunchClick, isHighlighted, priority } = isUnifiedProps(props)
    ? props
    : {
      tool: legacyToTool(props),
      mode: 'marketing' as const,
      onViewClick: props.onViewClick,
      onLaunchClick: props.onViewClick || props.onClick,
      isHighlighted: false,
      priority: props.priority || false,
    };

  // Extract metadata with defaults - solo questi sono complessi abbastanza da meritare memoization
  const uiMeta = { ...DEFAULT_UI_METADATA, ...tool.metadata?.ui };
  const engagement = { ...DEFAULT_ENGAGEMENT_METRICS, ...tool.metadata?.engagement };
  const pricingOptions = tool.metadata?.pricing_options;

  // If no tool-level pricing, try to get lowest price from products
  const lowestProductPrice = !pricingOptions && hasProducts(tool) && tool.products
    ? getLowestProductPrice(tool.products)
    : null;

  // Create a pricing options object from product price if needed
  const effectivePricingOptions = pricingOptions || (lowestProductPrice !== null ? {
    subscription: {
      enabled: true,
      price: lowestProductPrice,
      interval: 'month' as const
    }
  } : {});

  // Determine which image to show - calcoli semplici, non serve useMemo
  const imageUrl = uiMeta.hero_image_url || tool.url;
  const hasHeroImage = isLikelyImageUrl(imageUrl);
  const logoUrl = uiMeta.logo_url;
  const hasLogoImage = isLikelyImageUrl(logoUrl);
  const emoji = uiMeta.emoji;

  const [heroImageError, setHeroImageError] = useState(false);
  const [logoImageError, setLogoImageError] = useState(false);
  const [magicLoginLoading, setMagicLoginLoading] = useState(false);

  const canShowHeroImage = hasHeroImage && !heroImageError;
  const canShowLogoImage = hasLogoImage && !logoImageError;

  // Check if user has active subscription to this tool
  const { hasTool, getToolSubscriptions } = usePurchasedProducts();
  const hasSubscription = hasTool(tool.id);
  const toolSubs = hasSubscription ? getToolSubscriptions(tool.id) : [];
  
  // Check if Magic Login is configured for this tool
  const hasMagicLogin = tool.has_magic_login === true;
  
  // Show Magic Login button only if user has subscription AND Magic Login is configured
  const showMagicLogin = hasSubscription && hasMagicLogin;

  // Dynamic phase calculation based on paying user count and revenue
  const payingUserCount = tool.metadata?.paying_user_count ?? 0;
  const revenue = tool.metadata?.revenue ?? 0;
  const calculatedPhase = getToolPhase(payingUserCount, revenue);
  const phaseLabel = getPhaseLabel(calculatedPhase);
  const phaseClasses = getPhaseTailwindClasses(calculatedPhase);

  // Border styling based on subscription, highlight, or calculated phase
  let borderClasses = 'border';
  if (isHighlighted) {
    borderClasses += ' border-[#3ecf8e] shadow-lg shadow-[#3ecf8e]/50 animate-pulse';
  } else if (hasSubscription) {
    borderClasses += ' border-[#f97316] shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40';
  } else {
    borderClasses += ' ' + phaseClasses.border + ' ' + phaseClasses.hover;
  }

  const cardClassName = `group bg-[#1a1a1a] ${borderClasses} rounded-lg px-0 py-4 md:p-4 flex flex-col h-full transition-all duration-300 relative cursor-pointer`;

  const handleCardClick = () => {
    if (onViewClick) {
      onViewClick();
    }
  };

  const handleMagicLogin = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        // If Magic Login not configured, fall back to popup
        console.warn('Magic Login not available:', result.message);
        if (onViewClick) {
          onViewClick();
        }
      }
    } catch (error) {
      console.error('Magic Login error:', error);
      // Fall back to popup on error
      if (onViewClick) {
        onViewClick();
      }
    } finally {
      setMagicLoginLoading(false);
    }
  };

  return (
    <div className={cardClassName} onClick={handleCardClick}>
      <div className="flex items-start gap-3 mb-3 px-4 md:px-0">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#2a2a2a] flex items-center justify-center overflow-hidden relative">
          {canShowLogoImage ? (
            <Image
              src={logoUrl as string}
              alt={tool.name}
              fill
              className="object-cover"
              sizes="48px"
              loading="lazy"
              onError={() => setLogoImageError(true)}
            />
          ) : emoji ? (
            <div className="text-2xl">{emoji}</div>
          ) : (
            <div className="text-lg font-semibold text-[#ededed]">
              {tool.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-[#ededed] group-hover:text-[#3ecf8e] transition-colors line-clamp-1">
                {tool.name}
              </h3>
              {tool.vendor && (
                <p className="text-xs text-[#9ca3af] mt-0.5">
                  by {tool.vendor.full_name}
                </p>
              )}
            </div>

            {uiMeta.verified && (
              <div className="flex-shrink-0 bg-blue-500/20 text-blue-400 p-1 rounded">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-10 mb-3 px-4 md:px-0">
        <p className="text-[#9ca3af] text-sm line-clamp-2 leading-relaxed">
          {tool.description}
        </p>
      </div>

      <div className="mb-3 rounded-md overflow-hidden bg-[#111111] md:-mx-4 w-full md:w-[calc(100%+2rem)] relative aspect-video">
        <div className="relative overflow-hidden w-full h-full">
          {canShowHeroImage ? (
            <Image
              src={imageUrl as string}
              alt={`${tool.name} preview`}
              fill
              className="object-cover object-center tool-card-image"
              sizes="(max-width: 640px) 320px, (max-width: 1024px) 352px, 352px"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mM8dv16PQAGwgK75n6TaAAAAABJRU5ErkJggg=="
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
              onError={() => setHeroImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <div className="text-6xl">{emoji || '🔧'}</div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f2937]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        {/* Subscription Badge */}
        {/* Discount Badge */}
        {(uiMeta.discount_percentage ?? 0) > 0 && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg animate-pulse-glow">
            <span className="text-lg font-black">-{uiMeta.discount_percentage}%</span>
          </div>
        )}
      </div>

      <div className="min-h-[1.75rem] mb-3 px-4 md:px-0">
        {uiMeta.tags && uiMeta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {uiMeta.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="bg-[#374151] text-[#d1d5db] px-2 py-0.5 rounded text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {uiMeta.tags.length > 3 && (
              <span className="text-[#9ca3af] text-xs py-0.5">+{uiMeta.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 md:px-0">
        <PricingSection
          pricingOptions={effectivePricingOptions}
          isFromProducts={lowestProductPrice !== null && !pricingOptions}
        />
      </div>

      {onLaunchClick && (
        <div className="mt-auto px-4 md:px-0">
          {/* Stats and Badge - on same line */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-[#3ecf8e] fill-[#3ecf8e]" />
                <span className="text-[#ededed] font-bold text-sm">{(tool.avg_rating ?? engagement.rating ?? 4.5).toFixed(1)}</span>
              </div>

              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-[#9ca3af]" />
                <span className="text-[#9ca3af] font-medium text-sm">
                  {formatAdoptions(tool.active_users ?? engagement.adoption_count ?? 0)}
                </span>
              </div>
            </div>

            <div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase shadow-lg ${phaseClasses.badge}`}>
                {phaseLabel}
              </span>
            </div>
          </div>

          {showMagicLogin ? (
            <div className="flex items-center gap-2">
              {/* Main CTA: Magic Login */}
              <button
                onClick={handleMagicLogin}
                disabled={magicLoginLoading}
                className="flex-1 px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white hover:from-[#ea580c] hover:to-[#c2410c] disabled:opacity-50 shadow-lg shadow-orange-500/20"
              >
                {magicLoginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Magic Login
                  </>
                )}
              </button>
              {/* Info button: opens popup */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewClick) onViewClick();
                }}
                className="p-2 rounded-md bg-[#374151] text-[#9ca3af] hover:bg-[#4b5563] hover:text-[#ededed] transition-all"
                title="View details"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLaunchClick();
              }}
              className="w-full px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 group-hover:gap-3 bg-[#3ecf8e] text-black hover:bg-[#2dd4bf]"
            >
              {mode === 'dashboard' ? 'launch' : 'start'}
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
// Solo ri-renderizza se le props cambiano realmente
export default memo(ToolCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for optimization
  if (isUnifiedProps(prevProps) && isUnifiedProps(nextProps)) {
    return (
      prevProps.tool.id === nextProps.tool.id &&
      prevProps.tool.updated_at === nextProps.tool.updated_at &&
      prevProps.mode === nextProps.mode &&
      prevProps.isHighlighted === nextProps.isHighlighted &&
      prevProps.priority === nextProps.priority &&
      prevProps.onViewClick === nextProps.onViewClick &&
      prevProps.onLaunchClick === nextProps.onLaunchClick
    );
  }
  // For legacy props, use default shallow comparison
  return false;
});
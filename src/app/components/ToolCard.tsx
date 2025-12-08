'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import { Star, Users, ExternalLink } from 'lucide-react';
import { Tool, ToolProduct, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts } from '@/lib/tool-types';
import { PricingSection } from './PricingDisplay';
import { getToolPhase, getPhaseLabel, getPhaseTailwindClasses } from '@/lib/tool-phase';

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

  const canShowHeroImage = hasHeroImage && !heroImageError;
  const canShowLogoImage = hasLogoImage && !logoImageError;

  // Dynamic phase calculation based on paying user count and revenue
  const payingUserCount = tool.metadata?.paying_user_count ?? 0;
  const revenue = tool.metadata?.revenue ?? 0;
  const calculatedPhase = getToolPhase(payingUserCount, revenue);
  const phaseLabel = getPhaseLabel(calculatedPhase);
  const phaseClasses = getPhaseTailwindClasses(calculatedPhase);

  // Border styling based on calculated phase and highlight
  let borderClasses = 'border';
  if (isHighlighted) {
    borderClasses += ' border-[#3ecf8e] shadow-lg shadow-[#3ecf8e]/50 animate-pulse';
  } else {
    borderClasses += ' ' + phaseClasses.border + ' ' + phaseClasses.hover;
  }

  const cardClassName = `group bg-[#1a1a1a] ${borderClasses} rounded-lg p-4 flex flex-col h-full transition-all duration-300 relative cursor-pointer`;

  const handleCardClick = () => {
    if (onViewClick) {
      onViewClick();
    }
  };

  return (
    <div className={cardClassName} onClick={handleCardClick}>
      <div className="flex items-start gap-3 mb-3">
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
            <h3 className="font-bold text-base text-[#ededed] group-hover:text-[#3ecf8e] transition-colors line-clamp-1">
              {tool.name}
            </h3>

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

      <div className="h-10 mb-3">
        <p className="text-[#9ca3af] text-sm line-clamp-2 leading-relaxed">
          {tool.description}
        </p>
      </div>

      <div className="mb-3 rounded-md overflow-hidden bg-[#111111] -mx-4 w-[calc(100%+2rem)] relative aspect-video">
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
        {(uiMeta.discount_percentage ?? 0) > 0 && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg animate-pulse-glow">
            <span className="text-lg font-black">-{uiMeta.discount_percentage}%</span>
          </div>
        )}
      </div>

      <div className="min-h-[1.75rem] mb-3">
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

      <PricingSection
        pricingOptions={effectivePricingOptions}
        isFromProducts={lowestProductPrice !== null && !pricingOptions}
      />

      {hasProducts(tool) && tool.products && tool.products.length > 1 && (
        <div className="mb-3 text-xs text-[#9ca3af] italic">
          {tool.products.length} plans available
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-[#3ecf8e] fill-[#3ecf8e]" />
            <span className="text-[#ededed] font-bold text-sm">{engagement.rating?.toFixed(1) ?? '4.5'}</span>
          </div>

          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-[#9ca3af]" />
            <span className="text-[#9ca3af] font-medium text-sm">
              {formatAdoptions(engagement.adoption_count ?? 0)}
            </span>
          </div>

          {tool.url && !isLikelyImageUrl(tool.url) && (
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
              title="Visit website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Badge - Always shown */}
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg ${phaseClasses.badge}`}>
            {phaseLabel}
          </span>

          {onLaunchClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLaunchClick();
              }}
              className="bg-[#3ecf8e] text-black px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#2dd4bf] transition-all flex items-center gap-1 group-hover:gap-2"
            >
              {mode === 'dashboard' ? 'launch' : 'start'}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
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
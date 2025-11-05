'use client';

/**
 * UNIFIED TOOL CARD COMPONENT
 * Supports both legacy props (flat structure) and new Tool type
 * Automatically detects which format is being used
 */

import { Users, Star, ExternalLink } from 'lucide-react';
import { Tool, ToolProduct, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts, hasPricingOptions } from '@/lib/tool-types';
import { PricingSection } from './PricingDisplay';

// ============================================================================
// TYPES
// ============================================================================

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
}

// New props format (unified)
export interface UnifiedToolCardProps {
  tool: Tool;
  mode?: 'marketing' | 'dashboard';
  onViewClick?: () => void;
  onLaunchClick?: () => void;
  isHighlighted?: boolean;
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

const formatAdoptions = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
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

export default function ToolCard(props: ToolCardProps) {
  // Normalize props to unified format
  const { tool, mode, onViewClick, onLaunchClick, isHighlighted } = isUnifiedProps(props)
    ? props
    : {
        tool: legacyToTool(props),
        mode: 'marketing' as const,
        onViewClick: props.onViewClick,
        onLaunchClick: props.onViewClick || props.onClick,
        isHighlighted: false,
      };

  // Extract metadata with defaults
  const uiMeta = { ...DEFAULT_UI_METADATA, ...tool.metadata?.ui };
  const engagement = { ...DEFAULT_ENGAGEMENT_METRICS, ...tool.metadata?.engagement };
  const pricingOptions = tool.metadata?.pricing_options;

  // Determine which image to show
  const imageUrl = uiMeta.hero_image_url || tool.url;
  const logoUrl = uiMeta.logo_url;
  const emoji = uiMeta.emoji;

  // Handle card click (except for buttons)
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    if (onViewClick) onViewClick();
  };

  // Border styling based on development stage and highlight
  let borderClasses = 'border';
  if (isHighlighted) {
    borderClasses += ' border-[#3ecf8e] shadow-lg shadow-[#3ecf8e]/50 animate-pulse';
  } else if (uiMeta.development_stage === 'alpha') {
    borderClasses += ' border-2 border-purple-500 hover:border-purple-400 hover:shadow-purple-500/30';
  } else if (uiMeta.development_stage === 'beta') {
    borderClasses += ' border-2 border-blue-500 hover:border-blue-400 hover:shadow-blue-500/30';
  } else {
    borderClasses += ' border-[#374151] hover:border-[#3ecf8e]/50 hover:shadow-[#3ecf8e]/20';
  }

  return (
    <div
      className={`group bg-[#1f2937] rounded hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative ${borderClasses}`}
      onClick={handleCardClick}
    >
      {/* Development Stage Badge */}
      {uiMeta.development_stage && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg ${
              uiMeta.development_stage === 'alpha'
                ? 'bg-purple-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {uiMeta.development_stage}
          </span>
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 overflow-hidden">
        {/* Header: Logo + Name */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded bg-gradient-to-br ${uiMeta.gradient} flex items-center justify-center overflow-hidden`}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={tool.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-2xl">{emoji}</div>
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

        {/* Description */}
        <p className="text-[#9ca3af] text-sm mb-3 line-clamp-2 leading-relaxed">
          {tool.description}
        </p>

        {/* Preview Image */}
        <div className="mb-3 rounded overflow-hidden bg-[#111111] -mx-4 w-[calc(100%+2rem)] relative">
          <img
            src={imageUrl}
            alt={`${tool.name} preview`}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/favicon.ico';
              (e.target as HTMLImageElement).className = 'w-full h-48 object-contain p-8 opacity-20';
            }}
          />
          {(uiMeta.discount_percentage ?? 0) > 0 && (
            <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-lg shadow-lg">
              <span className="text-lg font-black">-{uiMeta.discount_percentage}%</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {uiMeta.tags && uiMeta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
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

        {/* Pricing Section */}
        {pricingOptions && hasPricingOptions(tool.metadata) && (
          <PricingSection pricingOptions={pricingOptions} />
        )}

        {/* Products Indicator */}
        {hasProducts(tool) && tool.products.length > 1 && (
          <div className="mb-3 text-xs text-[#9ca3af] italic">
            {tool.products.length} plans available
          </div>
        )}

        {/* Stats Bar with CTA */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#3ecf8e] fill-[#3ecf8e]" />
              <span className="text-[#ededed] font-bold text-sm">{engagement.rating.toFixed(1)}</span>
            </div>

            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-[#9ca3af]" />
              <span className="text-[#9ca3af] font-medium text-sm">
                {formatAdoptions(engagement.adoption_count)}
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            {mode === 'marketing' && onViewClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewClick();
                }}
                className="text-[#9ca3af] hover:text-[#d1d5db] px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1"
              >
                view
              </button>
            )}

            {onLaunchClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunchClick();
                }}
                className="bg-[#3ecf8e] text-black px-3 py-1.5 rounded text-xs font-bold hover:bg-[#2dd4bf] transition-all flex items-center gap-1 group-hover:gap-2"
              >
                {mode === 'dashboard' ? 'launch' : 'start'}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

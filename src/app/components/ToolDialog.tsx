'use client';

/**
 * UNIFIED TOOL DIALOG COMPONENT
 * Supports both legacy props (flat structure) and new Tool type
 * Automatically detects which format is being used
 */

import { X, Star, Users, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Tool, ToolProduct, ProductPricingModel, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts } from '@/lib/tool-types';
import { PricingCard } from './PricingDisplay';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

// Legacy props format
export interface LegacyToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
    consumption?: { price: number; unit: string };
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
}

// New props format
export interface UnifiedToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Tool;
}

// Combined props type
export type ToolDialogProps = LegacyToolDialogProps | UnifiedToolDialogProps;

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isUnifiedProps(props: ToolDialogProps): props is UnifiedToolDialogProps {
  return 'tool' in props;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatAdoptions = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Convert PricingOptions to ProductPricingModel
function pricingOptionsToProductModel(options: import('@/lib/tool-types').PricingOptions): ProductPricingModel {
  const model: ProductPricingModel = {};
  
  if (options.one_time?.enabled) {
    model.one_time = {
      enabled: true,
      type: 'absolute',
      price: options.one_time.price,
    };
  }
  
  if (options.subscription?.enabled) {
    model.subscription = {
      enabled: true,
      price: options.subscription.price,
      interval: options.subscription.interval,
      trial_days: options.subscription.trial_days,
    };
  }
  
  if (options.usage_based?.enabled) {
    model.usage_based = {
      enabled: true,
      price_per_unit: options.usage_based.price_per_unit,
      unit_name: options.usage_based.unit_name,
      minimum_units: options.usage_based.minimum_units,
    };
  }
  
  return model;
}

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #3ecf8e; border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2dd4bf; }
`;

// Transform legacy props to Tool type
function legacyToTool(props: LegacyToolDialogProps): Tool {
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

export default function ToolDialog(props: ToolDialogProps) {
  const { isOpen, onClose, tool } = isUnifiedProps(props)
    ? props
    : { ...props, tool: legacyToTool(props) };

  const router = useRouter();
  const [, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };

    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract metadata with defaults
  const uiMeta = { ...DEFAULT_UI_METADATA, ...tool.metadata?.ui };
  const engagement = { ...DEFAULT_ENGAGEMENT_METRICS, ...tool.metadata?.engagement };
  const content = tool.metadata?.content || {};

  const imageUrl = uiMeta.hero_image_url || tool.url;
  const logoUrl = uiMeta.logo_url;
  const emoji = uiMeta.emoji;
  const longDescription = content.long_description || tool.description || '';

  // Handle start/launch action
  const handleStartClick = async () => {
    setIsChecking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/backoffice&tool=${tool.id}`);
      } else {
        router.push(`/backoffice?highlight=${tool.id}`);
      }
    } catch (error) {
      console.error('Start click error:', error);
      router.push(`/login?redirect=/backoffice&tool=${tool.id}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Prepare products for display
  let displayProducts: Array<{
    id: string;
    name: string;
    description?: string;
    pricing_model: ProductPricingModel;
    features?: string[];
    is_preferred?: boolean;
  }> = [];

  if (hasProducts(tool) && tool.products.length > 0) {
    displayProducts = tool.products
      .filter(p => p.is_active)
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        pricing_model: p.pricing_model,
        features: p.features,
        is_preferred: p.is_preferred,
      }));
  } else if (tool.metadata?.pricing_options) {
    displayProducts = [{
      id: 'default',
      name: 'Standard Plan',
      description: tool.description || undefined,
      pricing_model: pricingOptionsToProductModel(tool.metadata.pricing_options),
      features: content.features,
      is_preferred: true,
    }];
  }

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-5xl h-[95vh] bg-[#1f2937] rounded-lg shadow-2xl border border-[#374151] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6 text-[#ededed]" />
          </button>

          <div
            className="overflow-y-auto flex-1 custom-scrollbar"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#3ecf8e transparent' }}
          >
            {/* Tool Header Info */}
            <div className="p-6 sm:p-8 pb-4">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br ${uiMeta.gradient} flex items-center justify-center overflow-hidden shadow-lg`}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt={tool.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl sm:text-5xl">{emoji}</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#ededed]">{tool.name}</h2>
                    {uiMeta.verified && (
                      <div className="flex-shrink-0 bg-blue-500/20 text-blue-400 p-1.5 rounded">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-5 h-5 text-[#3ecf8e] fill-[#3ecf8e]" />
                      <span className="text-[#ededed] font-bold text-lg">
                        {engagement.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-5 h-5 text-[#9ca3af]" />
                      <span className="text-[#9ca3af] font-medium text-lg">
                        {formatAdoptions(engagement.adoption_count)} users
                      </span>
                    </div>
                    {uiMeta.development_stage && (
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                          uiMeta.development_stage === 'alpha'
                            ? 'bg-purple-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {uiMeta.development_stage}
                      </span>
                    )}
                    {uiMeta.discount_percentage && uiMeta.discount_percentage > 0 && (
                      <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold">
                        -{uiMeta.discount_percentage}%
                      </span>
                    )}
                  </div>

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
            </div>

            {/* Hero Image */}
            <div className="px-6 sm:px-8 mb-6">
              <div className="w-full h-64 sm:h-80 overflow-hidden bg-[#111111] relative rounded-lg">
                <img
                  src={imageUrl}
                  alt={`${tool.name} preview`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/favicon.ico';
                    (e.target as HTMLImageElement).className = 'w-full h-full object-contain p-12 opacity-20';
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="px-6 sm:px-8 pb-6">
              <p className="text-[#d1d5db] text-base sm:text-lg leading-relaxed whitespace-pre-line">
                {longDescription}
              </p>
            </div>

            {/* Products/Pricing Section */}
            {displayProducts.length > 0 && (
              <div className="px-6 sm:px-8 pb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-[#ededed] mb-4">
                  {displayProducts.length > 1 ? 'Available Plans' : 'Pricing'}
                </h3>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayProducts.map((product) => (
                    <PricingCard
                      key={product.id}
                      name={product.name}
                      description={product.description}
                      pricingModel={product.pricing_model}
                      features={product.features}
                      isPreferred={product.is_preferred}
                      onSelect={handleStartClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Fallback CTA if no products */}
            {displayProducts.length === 0 && (
              <div className="px-6 sm:px-8 pb-8">
                <button
                  onClick={handleStartClick}
                  disabled={isChecking}
                  className="w-full bg-[#3ecf8e] text-black px-6 py-4 rounded-lg font-bold text-lg hover:bg-[#2dd4bf] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking ? 'Loading...' : 'Get Started'}
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

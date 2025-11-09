'use client';

import { X, Star, Users, ExternalLink, Check } from 'lucide-react';
import { Tool, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts } from '@/lib/tool-types';
import { PricingCard } from './PricingDisplay';

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
}

// New unified props format
export interface UnifiedToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tool: Tool;
}

export type ToolDialogProps = LegacyToolDialogProps | UnifiedToolDialogProps;

// Type guard
function isUnifiedProps(props: ToolDialogProps): props is UnifiedToolDialogProps {
  return 'tool' in props;
}

const formatAdoptions = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export default function ToolDialog(props: ToolDialogProps) {
  if (!props.isOpen) return null;

  // Extract tool data based on format
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

  // Extract metadata with defaults
  const uiMeta = { ...DEFAULT_UI_METADATA, ...tool.metadata?.ui };
  const engagement = { ...DEFAULT_ENGAGEMENT_METRICS, ...tool.metadata?.engagement };
  const longDescription = tool.metadata?.content?.long_description;
  
  // Determine which image to show
  const imageUrl = uiMeta.hero_image_url || tool.url;
  const logoUrl = uiMeta.logo_url;
  const emoji = uiMeta.emoji;
  const gradient = uiMeta.gradient;

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={props.onClose}
      >
        <div 
          className="relative w-full max-w-5xl h-[95vh] bg-[#1f2937] rounded-lg shadow-2xl border border-[#374151] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close Button */}
        <button
          onClick={props.onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg transition-colors"
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
          {/* Tool Header Info */}
          <div className="p-6 sm:p-8 pb-4">
            <div className="flex items-start gap-4 mb-4">
              {/* Logo */}
              <div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden shadow-lg`}>
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={tool.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl sm:text-5xl">
                    {emoji}
                  </div>
                )}
              </div>
              
              {/* Name and Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#ededed]">
                    {tool.name}
                  </h2>
                  {uiMeta.verified && (
                    <div className="flex-shrink-0 bg-blue-500/20 text-blue-400 p-1.5 rounded">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 text-[#3ecf8e] fill-[#3ecf8e]" />
                    <span className="text-[#ededed] font-bold text-lg">{engagement.rating?.toFixed(1) ?? '4.5'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-[#9ca3af]" />
                    <span className="text-[#9ca3af] font-medium text-lg">
                      {formatAdoptions(engagement.adoption_count ?? 0)} users
                    </span>
                  </div>
                  {/* Development Stage Badge */}
                  {uiMeta.development_stage && (
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                      uiMeta.development_stage === 'alpha' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {uiMeta.development_stage}
                    </span>
                  )}
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
          </div>

          {/* Hero Image */}
          <div className="px-6 sm:px-8 mb-6">
            <div className="w-full h-64 sm:h-80 overflow-hidden bg-[#111111] relative rounded-lg">
              <img 
                src={imageUrl || '/favicon.ico'} 
                alt={`${tool.name} preview`}
                className={`w-full h-full ${imageUrl ? 'object-cover' : 'object-contain p-12 opacity-20'}`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="px-6 sm:px-8 pb-6">
            <p className="text-[#d1d5db] text-base sm:text-lg leading-relaxed whitespace-pre-line">
              {longDescription || tool.description}
            </p>
          </div>

            {/* Products Section */}
            {hasProducts(tool) && tool.products.length > 0 && (
              <div className="px-6 sm:px-8 pb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-[#ededed] mb-4">
                  {tool.products.length > 1 ? 'Available Plans' : 'Pricing'}
                </h3>
            
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tool.products.map((product) => (
                    <PricingCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      description={product.description ?? undefined}
                      pricingModel={product.pricing_model}
                      features={product.features}
                      isPreferred={product.is_preferred}
                      onSelect={(productId) => {
                        console.log('Selected product:', productId);
                        // TODO: Handle product selection
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
        </div>
        </div>
      </div>
    </>
  );
}


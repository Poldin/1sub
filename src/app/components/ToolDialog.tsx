'use client';

import { X, Star, Users, ExternalLink, Check } from 'lucide-react';
import { ToolCardProps } from './ToolCard';

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

export interface Product {
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

export interface ToolDialogProps extends Omit<ToolCardProps, 'pricing' | 'price' | 'onClick' | 'onViewClick' | 'ctaLabel'> {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  // Legacy support
  pricing?: {
    monthly?: number;
    oneTime?: number;
    consumption?: {
      price: number;
      unit: string;
    };
  };
  price?: number;
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

export default function ToolDialog({
  isOpen,
  onClose,
  name,
  description,
  longDescription,
  emoji,
  logoUrl,
  imageUrl,
  rating,
  adoptions,
  gradient = "from-[#3ecf8e] to-[#2dd4bf]",
  verified = false,
  discount,
  developmentStage,
  products,
  pricing,
  price,
  tags = []
}: ToolDialogProps) {
  if (!isOpen) return null;

  // Convert legacy pricing to products if needed
  const finalProducts = products || [{
    id: 'default',
    name: 'Standard',
    pricing: pricing || (price !== undefined ? { monthly: price } : {}),
    isPreferred: true
  }];

  // Helper to get pricing badges for a product
  const getPricingBadges = (productPricing: Product['pricing']) => {
    const badges = [];
    if (productPricing.monthly) {
      badges.push({ label: 'Monthly', value: `${productPricing.monthly} CR/month`, icon: 'M' });
    }
    if (productPricing.oneTime) {
      badges.push({ label: 'One-time', value: `${productPricing.oneTime} CR`, icon: '1' });
    }
    if (productPricing.consumption) {
      badges.push({ 
        label: 'Consumption', 
        value: `${productPricing.consumption.price} CR ${productPricing.consumption.unit}`, 
        icon: 'C' 
      });
    }
    return badges;
  };

  // Helper to get main price display
  const getMainPrice = (productPricing: Product['pricing']) => {
    if (productPricing.monthly) {
      return { price: productPricing.monthly, label: '/month' };
    } else if (productPricing.oneTime) {
      return { price: productPricing.oneTime, label: 'one-time' };
    } else if (productPricing.consumption) {
      return { price: productPricing.consumption.price, label: productPricing.consumption.unit };
    }
    return null;
  };

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
        {/* Close Button */}
        <button
          onClick={onClose}
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
                    alt={name}
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
                    {name}
                  </h2>
                  {verified && (
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
                    <span className="text-[#ededed] font-bold text-lg">{rating}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-[#9ca3af]" />
                    <span className="text-[#9ca3af] font-medium text-lg">
                      {formatAdoptions(adoptions)} users
                    </span>
                  </div>
                  {/* Development Stage Badge */}
                  {developmentStage && (
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                      developmentStage === 'alpha' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {developmentStage}
                    </span>
                  )}
                  {/* Discount Badge */}
                  {discount && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold">
                      -{discount}%
                    </span>
                  )}
                </div>

                {/* Tags */}
                {tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
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
                alt={`${name} preview`}
                className={`w-full h-full ${imageUrl ? 'object-cover' : 'object-contain p-12 opacity-20'}`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="px-6 sm:px-8 pb-6">
            <p className="text-[#d1d5db] text-base sm:text-lg leading-relaxed whitespace-pre-line">
              {longDescription || description}
            </p>
          </div>

            {/* Products Section */}
            <div className="px-6 sm:px-8 pb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-[#ededed] mb-4">
                {finalProducts.length > 1 ? 'Available Plans' : 'Pricing'}
              </h3>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finalProducts.map((product) => {
              const mainPriceInfo = getMainPrice(product.pricing);
              const pricingBadges = getPricingBadges(product.pricing);
              
              return (
                <div 
                  key={product.id}
                  className="relative bg-[#111111] rounded-lg p-6 border-2 border-[#374151] hover:border-[#3ecf8e]/50 transition-all flex flex-col"
                >
                  {/* Preferred Badge */}
                  {product.isPreferred && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#3ecf8e] text-black px-3 py-1 rounded-full text-xs font-bold uppercase">
                        Recommended
                      </span>
                    </div>
                  )}

                  {/* Product Name */}
                  <h4 className="text-lg font-bold text-[#ededed] mb-2">
                    {product.name}
                  </h4>
                  
                  {/* Product Description */}
                  {product.description && (
                    <p className="text-sm text-[#9ca3af] mb-4">
                      {product.description}
                    </p>
                  )}

                  {/* Pricing Information */}
                  <div className="mb-4 pb-4 border-b border-[#374151]">
                    <div className="flex flex-wrap gap-2">
                      {pricingBadges.map((badge, index) => (
                        <div 
                          key={index}
                          className="bg-[#1f2937] border border-[#374151] text-[#d1d5db] px-3 py-1.5 rounded-md text-xs"
                        >
                          <div className="font-bold text-[#ededed]">{badge.label}</div>
                          <div className="text-[#9ca3af] text-xs mt-0.5">{badge.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  {product.features && product.features.length > 0 && (
                    <ul className="space-y-2 mb-auto pb-4">
                      {product.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-[#d1d5db]">
                          <Check className="w-4 h-4 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA Button - Always at bottom */}
                  <div className="mt-auto pt-4 border-t border-[#374151]">
                    <button className="w-full bg-[#3ecf8e] text-black px-4 py-3 rounded-md font-bold hover:bg-[#2dd4bf] transition-all flex items-center justify-center gap-2 group">
                      start
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}


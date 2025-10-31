'use client';

import { Users, Star, ExternalLink } from 'lucide-react';

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

export interface ToolCardProps {
  id: number;
  name: string;
  description: string;
  longDescription?: string; // Full description for dialog
  emoji?: string;
  logoUrl?: string;
  imageUrl?: string;
  rating: number;
  adoptions: number;
  price?: number; // Legacy support - treated as monthly
  pricing?: {
    monthly?: number;
    oneTime?: number;
    consumption?: {
      price: number;
      unit: string; // es: "per call", "per 1000 API calls", "per GB"
    };
  };
  products?: Product[]; // Multiple products/plans
  gradient?: string;
  tags?: string[];
  verified?: boolean;
  discount?: number;
  developmentStage?: 'alpha' | 'beta' | null;
  ctaLabel?: string;
  onClick?: () => void;
  onViewClick?: () => void; // Separate handler for view button
}

// Helper function to format adoption numbers
const formatAdoptions = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export default function ToolCard({
  name,
  description,
  emoji,
  logoUrl,
  imageUrl,
  rating,
  adoptions,
  price,
  pricing,
  products,
  gradient = "from-[#3ecf8e] to-[#2dd4bf]",
  tags = [],
  verified = false,
  discount,
  developmentStage,
  ctaLabel = "start",
  onClick,
  onViewClick
}: ToolCardProps) {
  // Determine pricing to display (products > pricing > price)
  // If products exist, use the preferred one or the first one
  let finalPricing = pricing || (price !== undefined ? { monthly: price } : {});
  if (products && products.length > 0) {
    const preferredProduct = products.find(p => p.isPreferred) || products[0];
    finalPricing = preferredProduct.pricing;
  }
  const hasPricing = finalPricing.monthly || finalPricing.oneTime || finalPricing.consumption;
  
  // Determine main price to display (priority: monthly > oneTime > consumption)
  let mainPrice = '';
  let mainPriceLabel = '';
  if (finalPricing.monthly) {
    mainPrice = finalPricing.monthly.toString();
    mainPriceLabel = '/month';
  } else if (finalPricing.oneTime) {
    mainPrice = finalPricing.oneTime.toString();
    mainPriceLabel = 'one-time';
  } else if (finalPricing.consumption) {
    mainPrice = finalPricing.consumption.price.toString();
    mainPriceLabel = finalPricing.consumption.unit;
  }
  
  // Determine which badges to show
  const pricingBadges = [];
  if (finalPricing.monthly) {
    pricingBadges.push({ 
      label: 'M', 
      tooltip: `${finalPricing.monthly} CR/month`,
      description: 'Monthly subscription'
    });
  }
  if (finalPricing.oneTime) {
    pricingBadges.push({ 
      label: '1', 
      tooltip: `${finalPricing.oneTime} CR one-time`,
      description: 'One-time payment'
    });
  }
  if (finalPricing.consumption) {
    pricingBadges.push({ 
      label: 'C', 
      tooltip: `${finalPricing.consumption.price} CR ${finalPricing.consumption.unit}`,
      description: 'Consumption-based'
    });
  }
  // Handle card click (except for buttons)
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    if (onViewClick) {
      onViewClick();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`group bg-[#1f2937] rounded-lg hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative ${
        developmentStage === 'alpha' 
          ? 'border-2 border-purple-500 hover:border-purple-400 hover:shadow-purple-500/30' 
          : developmentStage === 'beta'
          ? 'border-2 border-blue-500 hover:border-blue-400 hover:shadow-blue-500/30'
          : 'border border-[#374151] hover:border-[#3ecf8e]/50 hover:shadow-[#3ecf8e]/20'
      }`}
      onClick={handleCardClick}
    >
      {/* Development Stage Badge - Top Center */}
      {developmentStage && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg ${
            developmentStage === 'alpha' 
              ? 'bg-purple-500 text-white' 
              : 'bg-blue-500 text-white'
          }`}>
            {developmentStage}
          </span>
        </div>
      )}
      
      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 overflow-hidden">
        {/* Header: Logo + Name */}
        <div className="flex items-start gap-3 mb-3">
          {/* Logo Square */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-2xl">
                {emoji}
              </div>
            )}
          </div>
          
          {/* Name + Verified */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-base text-[#ededed] group-hover:text-[#3ecf8e] transition-colors line-clamp-1">
                {name}
              </h3>
              
              {/* Verified Badge */}
              {verified && (
                <div className="flex-shrink-0 bg-blue-500/20 text-blue-400 p-1 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-[#9ca3af] text-sm mb-3 line-clamp-2 leading-relaxed">
          {description}
        </p>
        
        {/* Preview Image - Large, full width */}
        <div className="mb-3 rounded-md overflow-hidden bg-[#111111] -mx-4 w-[calc(100%+2rem)] relative">
          <img 
            src={imageUrl || '/favicon.ico'} 
            alt={`${name} preview`}
            className={`w-full h-48 transition-transform duration-300 ${imageUrl ? 'object-cover group-hover:scale-105' : 'object-contain p-8 opacity-20'}`}
          />
          {/* Discount Badge */}
          {discount && (
            <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-lg shadow-lg">
              <span className="text-lg font-black">-{discount}%</span>
            </div>
          )}
        </div>
        
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="bg-[#374151] text-[#d1d5db] px-2 py-0.5 rounded text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[#9ca3af] text-xs py-0.5">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Pricing Section */}
        {hasPricing && (
          <div className="mb-3 pb-3 border-b border-[#374151]">
            <div className="flex items-center gap-2">
              {/* Main Price */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl text-[#ededed]">{mainPrice}</span>
                <span className="text-sm text-[#9ca3af]">
                  <span className="text-[#3ecf8e]">CR</span> {mainPriceLabel}
                </span>
              </div>
              
              {/* Pricing Type Badges */}
              <div className="flex items-center gap-1 ml-auto">
                {pricingBadges.map((badge, index) => (
                  <div
                    key={index}
                    className="relative group/badge"
                  >
                    <div className="bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-1 rounded text-xs font-bold cursor-help border border-[#3ecf8e]/30">
                      {badge.label}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-[#1f2937] border border-[#3ecf8e] rounded-lg text-xs whitespace-nowrap opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-opacity duration-200 z-20 shadow-xl">
                      <div className="text-[#ededed] font-semibold mb-0.5">{badge.description}</div>
                      <div className="text-[#9ca3af]">{badge.tooltip}</div>
                      {/* Arrow */}
                      <div className="absolute bottom-full right-4 transform -mb-px">
                        <div className="border-4 border-transparent border-b-[#3ecf8e]"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Bar with CTA */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#3ecf8e] fill-[#3ecf8e]" />
              <span className="text-[#ededed] font-bold text-sm">{rating}</span>
            </div>
            
            {/* Adoptions */}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-[#9ca3af]" />
              <span className="text-[#9ca3af] font-medium text-sm">
                {formatAdoptions(adoptions)}
              </span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            {/* Secondary CTA - View */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onViewClick) {
                  onViewClick();
                } else if (onClick) {
                  onClick();
                }
              }}
              className="text-[#9ca3af] hover:text-[#d1d5db] px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1"
            >
              view
            </button>
            
            {/* Primary CTA - Start */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Here you would handle the "start" action
                console.log('Start tool:', name);
              }}
              className="bg-[#3ecf8e] text-black px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#2dd4bf] transition-all flex items-center gap-1 group-hover:gap-2"
            >
              {ctaLabel}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


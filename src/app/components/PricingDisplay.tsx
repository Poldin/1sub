'use client';

import { PricingOptions, ProductPricingModel } from '@/lib/tool-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================================
// PRICING BADGE COMPONENT
// ============================================================================

interface PricingBadgeProps {
  label: string;
  icon: string;
  tooltip: string;
  description: string;
}

export function PricingBadge({ icon, tooltip, description }: PricingBadgeProps) {
  return (
    <div className="relative group/badge">
      <div className="bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-1 rounded text-xs font-bold cursor-help border border-[#3ecf8e]/30">
        {icon}
      </div>
      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-[#1f2937] border border-[#3ecf8e] rounded-lg text-xs whitespace-nowrap opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-opacity duration-200 z-20 shadow-xl">
        <div className="text-[#ededed] font-semibold mb-0.5">{description}</div>
        <div className="text-[#9ca3af]">{tooltip}</div>
        {/* Arrow */}
        <div className="absolute bottom-full right-4 transform -mb-px">
          <div className="border-4 border-transparent border-b-[#3ecf8e]"></div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRICING BADGES ROW COMPONENT
// ============================================================================

interface PricingBadgesProps {
  pricingOptions: PricingOptions | ProductPricingModel;
}

export function PricingBadges({ pricingOptions }: PricingBadgesProps) {
  const badges: PricingBadgeProps[] = [];

  if (pricingOptions.one_time?.enabled) {
    const price = 'price' in pricingOptions.one_time 
      ? pricingOptions.one_time.price 
      : pricingOptions.one_time.min_price && pricingOptions.one_time.max_price
        ? `${pricingOptions.one_time.min_price}-${pricingOptions.one_time.max_price}`
        : 'Custom';
    
    badges.push({
      label: '1',
      icon: '1',
      tooltip: `${price} CR one-time`,
      description: 'One-time payment',
    });
  }

  if (pricingOptions.subscription?.enabled) {
    const interval = pricingOptions.subscription.interval === 'year' ? 'yr' : 'mo';
    badges.push({
      label: 'M',
      icon: 'M',
      tooltip: `${pricingOptions.subscription.price} CR/${interval}`,
      description: pricingOptions.subscription.interval === 'year' ? 'Yearly subscription' : 'Monthly subscription',
    });
  }

  if (pricingOptions.usage_based?.enabled) {
    badges.push({
      label: 'C',
      icon: 'C',
      tooltip: `${pricingOptions.usage_based.price_per_unit} CR ${pricingOptions.usage_based.unit_name}`,
      description: 'Consumption-based',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {badges.map((badge, index) => (
        <PricingBadge key={index} {...badge} />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PRICE DISPLAY COMPONENT
// ============================================================================

interface MainPriceDisplayProps {
  pricingOptions: PricingOptions | ProductPricingModel;
  isFromProducts?: boolean;
}

export function MainPriceDisplay({ pricingOptions, isFromProducts = false }: MainPriceDisplayProps) {
  // Check if this is a custom plan (only ProductPricingModel has custom_plan)
  if ('custom_plan' in pricingOptions && pricingOptions.custom_plan?.enabled) {
    return <span className="text-lg font-semibold text-[#3ecf8e]">Contact for Custom Pricing</span>;
  }

  // Determine main price to display (priority: subscription > one_time > usage_based)
  let mainPrice = '';
  let mainPriceLabel = '';
  
  if (pricingOptions.subscription?.enabled) {
    mainPrice = pricingOptions.subscription.price.toString();
    mainPriceLabel = pricingOptions.subscription.interval === 'year' ? '/year' : '/month';
  } else if (pricingOptions.one_time?.enabled) {
    if ('price' in pricingOptions.one_time && pricingOptions.one_time.price !== undefined) {
      mainPrice = pricingOptions.one_time.price.toString();
      mainPriceLabel = 'one-time';
    } else if ('min_price' in pricingOptions.one_time && 'max_price' in pricingOptions.one_time) {
      mainPrice = `${pricingOptions.one_time.min_price}-${pricingOptions.one_time.max_price}`;
      mainPriceLabel = 'one-time';
    } else {
      mainPrice = 'Custom';
      mainPriceLabel = 'pricing';
    }
  } else if (pricingOptions.usage_based?.enabled) {
    mainPrice = pricingOptions.usage_based.price_per_unit.toString();
    mainPriceLabel = pricingOptions.usage_based.unit_name;
  }

  if (!mainPrice) {
    return <span className="text-[#9ca3af] text-sm">Contact for pricing</span>;
  }

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-bold text-[#ededed]">{mainPrice}</span>
      <span className="text-sm text-[#9ca3af]">
        <span className="text-[#3ecf8e]">CR</span> {mainPriceLabel}
      </span>
    </div>
  );
}

// ============================================================================
// PRICING SECTION COMPONENT (for Tool Cards)
// ============================================================================

interface PricingSectionProps {
  pricingOptions: PricingOptions | ProductPricingModel | null | undefined;
  isFromProducts?: boolean;
}

export function PricingSection({ pricingOptions, isFromProducts = false }: PricingSectionProps) {
  // Use empty object as fallback if pricingOptions is null/undefined
  const safePricingOptions = pricingOptions || {};
  
  return (
    <div className="mb-3 pb-3 border-b border-[#374151]">
      <div className="flex items-center gap-2">
        <MainPriceDisplay pricingOptions={safePricingOptions} isFromProducts={isFromProducts} />
        <div className="ml-auto">
          <PricingBadges pricingOptions={safePricingOptions} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRICING CARD COMPONENT (for Tool Dialog Products)
// ============================================================================

interface PricingCardProps {
  id?: string;
  name: string;
  description?: string;
  pricingModel: ProductPricingModel;
  features?: string[];
  isPreferred?: boolean;
  isCustomPlan?: boolean;
  contactEmail?: string;
  toolMetadata?: { custom_pricing_email?: string };
  onSelect?: (productId?: string) => void;
  onContactVendor?: (email: string, productName: string) => void;
  ctaText?: string; // Custom CTA text (e.g., "Change Plan", "Current Plan")
}

export function PricingCard({ 
  id,
  name, 
  description, 
  pricingModel, 
  features, 
  isPreferred,
  isCustomPlan,
  contactEmail,
  toolMetadata,
  onSelect,
  onContactVendor,
  ctaText
}: PricingCardProps) {
  const isCustom = isCustomPlan || pricingModel.custom_plan?.enabled;
  const emailToUse = contactEmail || pricingModel.custom_plan?.contact_email || toolMetadata?.custom_pricing_email;

  const handleContactClick = () => {
    if (emailToUse && onContactVendor) {
      onContactVendor(emailToUse, name);
    } else if (emailToUse) {
      // Fallback to mailto link
      const subject = encodeURIComponent(`Inquiry about ${name}`);
      const body = encodeURIComponent(`Hi,\n\nI'm interested in learning more about the "${name}" plan and would like to discuss custom pricing.\n\nThank you!`);
      window.location.href = `mailto:${emailToUse}?subject=${subject}&body=${body}`;
    } else {
      alert('No contact email available. Please contact the vendor directly.');
    }
  };

  return (
    <div 
      className={`relative bg-[#111111] rounded-lg p-6 border-2 transition-all flex flex-col ${
        isPreferred 
          ? 'border-[#3ecf8e] shadow-lg shadow-[#3ecf8e]/20' 
          : 'border-[#374151] hover:border-[#3ecf8e]/50'
      }`}
    >
      {/* Preferred Badge */}
      {isPreferred && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-[#3ecf8e] text-black px-3 py-1 rounded-full text-xs font-bold uppercase">
            Recommended
          </span>
        </div>
      )}

      {/* Plan Name */}
      <h4 className="text-lg font-bold text-[#ededed] mb-2">
        {name}
      </h4>
      
      {/* Description - Markdown support */}
      {description && (
        <div className="text-sm text-[#9ca3af] mb-4 prose-sm prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({children}) => <p className="text-[#9ca3af] my-1">{children}</p>,
              strong: ({children}) => <strong className="text-[#ededed] font-semibold">{children}</strong>,
              em: ({children}) => <em className="text-[#9ca3af]">{children}</em>,
              ul: ({children}) => <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>,
              li: ({children}) => <li className="text-[#9ca3af]">{children}</li>,
              a: ({href, children}) => <a href={href} className="text-[#3ecf8e] hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
              code: ({children}) => <code className="text-[#3ecf8e] bg-[#374151] px-1 rounded text-xs">{children}</code>,
            }}
          >
            {description}
          </ReactMarkdown>
        </div>
      )}

      {/* Pricing Information */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <MainPriceDisplay pricingOptions={pricingModel} />
          {!isCustom && (
            <div className="flex-shrink-0">
              <PricingBadges pricingOptions={pricingModel} />
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      {features && features.length > 0 && (
        <ul className="space-y-2 mb-auto pb-4 flex-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-[#d1d5db]">
              <svg className="w-4 h-4 text-[#3ecf8e] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA Button */}
      {isCustom ? (
        <button 
          onClick={handleContactClick}
          className="w-full bg-[#3ecf8e] text-black px-4 py-2 rounded-md font-bold hover:bg-[#2dd4bf] transition-all flex items-center justify-center gap-2 group mt-4"
        >
          Contact for Quote
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      ) : onSelect && (
        <button 
          onClick={() => onSelect(id)}
          className={`w-full px-4 py-2 rounded-md font-bold transition-all flex items-center justify-center gap-2 group mt-4 ${
            ctaText === 'Current Plan'
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : 'bg-[#3ecf8e] text-black hover:bg-[#2dd4bf]'
          }`}
          disabled={ctaText === 'Current Plan'}
        >
          {ctaText || 'Select Plan'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}


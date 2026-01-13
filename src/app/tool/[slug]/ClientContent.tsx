'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Star, Users, Share2, Check, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Tool, DEFAULT_UI_METADATA, DEFAULT_ENGAGEMENT_METRICS, hasProducts } from '@/lib/tool-types';
import { PricingCard } from '@/app/components/PricingDisplay';
import { getToolPhase, getPhaseLabel, getPhaseTailwindClasses } from '@/lib/tool-phase';

const formatAdoptions = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

interface ClientContentProps {
  tool: Tool;
}

export default function ToolClientContent({ tool }: ClientContentProps) {
  // State for description expansion
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // State for share button feedback
  const [isShareCopied, setIsShareCopied] = useState(false);
  // State for Magic Login
  const [magicLoginLoading, setMagicLoginLoading] = useState(false);
  const [showLoginRequiredDialog, setShowLoginRequiredDialog] = useState(false);
  
  // Check if Magic Login is configured for this tool
  const hasMagicLogin = tool.has_magic_login === true;
  
  // Show Magic Login button if Magic Login is configured (public page, no auth check)
  const showMagicLogin = hasMagicLogin;
  
  // Debug log
  console.log('[ClientContent] Tool data:', {
    id: tool.id,
    name: tool.name,
    has_magic_login: tool.has_magic_login,
    showMagicLogin,
  });
  
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
      
      // Check if user is not authenticated
      if (response.status === 401) {
        setShowLoginRequiredDialog(true);
        return;
      }
      
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
  
  // Handle share
  const handleShare = async () => {
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
  const uiMeta = useMemo(() => ({ ...DEFAULT_UI_METADATA, ...tool.metadata?.ui }), [tool.metadata?.ui]);
  const engagement = useMemo(() => ({ ...DEFAULT_ENGAGEMENT_METRICS, ...tool.metadata?.engagement }), [tool.metadata?.engagement]);
  const longDescription = useMemo(() => tool.metadata?.content?.long_description, [tool.metadata?.content?.long_description]);
  
  // Phase calculation
  const payingUserCount = tool.metadata?.paying_user_count ?? 0;
  const revenue = tool.metadata?.revenue ?? 0;
  const calculatedPhase = useMemo(() => getToolPhase(payingUserCount, revenue), [payingUserCount, revenue]);
  const phaseLabel = useMemo(() => getPhaseLabel(calculatedPhase), [calculatedPhase]);
  const phaseClasses = useMemo(() => getPhaseTailwindClasses(calculatedPhase), [calculatedPhase]);
  
  const imageUrl = useMemo(() => uiMeta.hero_image_url || tool.url, [uiMeta.hero_image_url, tool.url]);
  const logoUrl = uiMeta.logo_url;
  const emoji = uiMeta.emoji;
  const gradient = uiMeta.gradient;
  
  return (
    <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
      {/* Tool Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          {/* Logo */}
          <div className={`flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden shadow-lg relative`}>
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${tool.name} logo`}
                fill
                className="object-cover"
                sizes="80px"
                priority
              />
            ) : (
              <div className="text-5xl" role="img" aria-label={`${tool.name} icon`}>{emoji}</div>
            )}
          </div>
          
          {/* Name and vendor */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ededed]">{tool.name}</h1>
                {tool.vendor_name && (
                  <p className="text-sm text-[#9ca3af]">by {tool.vendor_name}</p>
                )}
              </div>
              {uiMeta.verified && (
                <div className="flex-shrink-0 bg-blue-500/20 text-blue-400 p-1.5 rounded" title="Verified vendor">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Short description */}
        {tool.description && (
          <p className="text-sm sm:text-base text-[#9ca3af] mb-4">
            {tool.description}
          </p>
        )}
        
        {/* Magic Login Button */}
        {showMagicLogin && (
          <button
            onClick={handleMagicLogin}
            disabled={magicLoginLoading}
            className="mb-4 px-6 py-3 rounded-lg text-base font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white hover:from-[#ea580c] hover:to-[#c2410c] disabled:opacity-50"
            aria-label="Sign in with Magic Login"
          >
            {magicLoginLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" aria-hidden="true" />
                Sign in with Magic Login
              </>
            )}
          </button>
        )}
        
        {/* Stats and Meta - 3 KPIs: Reviews (count + average), Unique Magic Login Users, Total Magic Logins */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Review Average and Count */}
          <div className="flex items-center gap-1.5">
            <Star className="w-5 h-5 text-[#3ecf8e] fill-[#3ecf8e]" aria-hidden="true" />
            <span className="text-[#ededed] font-bold text-lg">
              {(tool as any).review_average ? (tool as any).review_average.toFixed(1) : '0.0'}
            </span>
            <span className="text-[#9ca3af] font-medium text-base">
              ({(tool as any).review_count || 0} {(tool as any).review_count === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          {/* Unique Magic Login Users */}
          <div className="flex items-center gap-1.5">
            <Users className="w-5 h-5 text-[#9ca3af]" aria-hidden="true" />
            <span className="text-[#9ca3af] font-medium text-lg" aria-label={`${formatAdoptions((tool as any).magic_login_users || 0)} unique users`}>
              {formatAdoptions((tool as any).magic_login_users || 0)} {(tool as any).magic_login_users === 1 ? 'user' : 'users'}
            </span>
          </div>

          {/* Total Magic Login Count - always shown */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-[#f97316]" aria-hidden="true" />
            <span className="text-[#9ca3af] font-medium text-lg" aria-label={`${formatAdoptions((tool as any).magic_login_count || 0)} magic logins`}>
              {formatAdoptions((tool as any).magic_login_count || 0)} {(tool as any).magic_login_count === 1 ? 'launch' : 'launches'}
            </span>
          </div>
          {/* Share Button */}
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 transition-colors p-1 rounded hover:bg-[#374151] ${
              isShareCopied ? 'text-[#3ecf8e]' : 'text-[#9ca3af] hover:text-[#3ecf8e]'
            }`}
            title={isShareCopied ? 'Copied!' : 'Share tool'}
            aria-label="Share this tool"
          >
            {isShareCopied ? (
              <Check className="w-5 h-5 animate-in fade-in duration-200" aria-hidden="true" />
            ) : (
              <Share2 className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          {/* Phase Badge - Hidden */}
          {/* <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase shadow-lg ${phaseClasses.badge}`}>
            {phaseLabel}
          </span> */}
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
      
      {/* Products Section */}
      {hasProducts(tool) && tool.products.length > 0 && (
        <div className="mb-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#ededed] mb-3">
              Pricing plans
            </h2>
            <p className="text-[#9ca3af] text-sm sm:text-base">
              Choose the plan that fits your needs
            </p>
          </div>
          
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tool.products.map((product) => {
              return (
                <div key={product.id} className="relative">
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
                    hideCta={true}
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
              alt={`${tool.name} - Product screenshot showing key features and interface`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <div className="text-8xl" role="img" aria-label={`${tool.name} placeholder`}>{emoji || '🔧'}</div>
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
              aria-expanded={isDescriptionExpanded}
              aria-label={isDescriptionExpanded ? 'Show less description' : 'Show more description'}
            >
              {isDescriptionExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  Show more
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Login Required Dialog */}
      {showLoginRequiredDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowLoginRequiredDialog(false)}
        >
          <div
            className="relative w-full max-w-md bg-[#1f2937] rounded-lg shadow-2xl border border-[#374151] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowLoginRequiredDialog(false)}
              className="absolute top-4 right-4 p-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-[#ededed]" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-[#ededed] text-center mb-3">
              Login Required
            </h3>

            {/* Message */}
            <p className="text-[#9ca3af] text-center mb-6 leading-relaxed">
              To use Magic Login and access <span className="text-[#ededed] font-semibold">{tool.name}</span>, you need to be signed in to your 1Sub account first.
            </p>

            {/* CTA Button */}
            <a
              href={`/login?redirect=${encodeURIComponent(`/tool/${tool.slug}`)}`}
              className="block w-full bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity text-center"
            >
              Sign in to 1Sub
            </a>

            {/* Optional: Sign up link */}
            <p className="text-center text-sm text-[#9ca3af] mt-4">
              Don't have an account?{' '}
              <a
                href={`/signup?redirect=${encodeURIComponent(`/tool/${tool.slug}`)}`}
                className="text-[#3ecf8e] hover:underline font-medium"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

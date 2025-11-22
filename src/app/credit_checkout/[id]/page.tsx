'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Check, ExternalLink, Wrench, AlertCircle, Loader2 } from 'lucide-react';
import { ProductPricingModel } from '@/lib/tool-types';
import { BuyCreditsDialog } from '../components/BuyCreditsDialog';

interface PricingOption {
  enabled: boolean;
  price: number;
  description?: string;
}

interface CheckoutProduct {
  id: string;
  name: string;
  description?: string;
  pricing_model: ProductPricingModel;
  features?: string[];
  is_preferred?: boolean;
}

interface CheckoutData {
  id: string;
  user_id: string;
  vendor_id: string | null;
  credit_amount: number | null;
  type: string | null;
  created_at: string;
  metadata: {
    tool_id: string;
    tool_name: string;
    tool_url: string;
    status: 'pending' | 'completed' | 'failed';
    completed_at?: string;
    pricing_type?: string;
    subscription_period?: string;
    selected_pricing?: string;
    pricing_options?: {
      one_time?: PricingOption;
      subscription_monthly?: PricingOption;
      subscription_yearly?: PricingOption;
    };
    products?: CheckoutProduct[];
  };
}

interface UserData {
  id: string;
  email: string;
  credits: number;
}

interface VendorData {
  id: string;
  full_name: string;
}

export default function CreditCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const checkoutId = params.id as string;

  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<string | null>(null);
  const [toolImageUrl, setToolImageUrl] = useState<string | null>(null);
  const [toolDescription, setToolDescription] = useState<string | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showBuyCreditsDialog, setShowBuyCreditsDialog] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseData, setPurchaseData] = useState<{
    toolUrl: string;
    toolAccessToken: string | null;
    isSubscription: boolean;
  } | null>(null);

  // Fetch checkout data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all checkout data from API
        const response = await fetch(`/api/checkout/${checkoutId}`);
        
        if (response.status === 401) {
          router.push(`/login?redirect=/credit_checkout/${checkoutId}`);
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Failed to load checkout');
          setLoading(false);
          return;
        }

        const data = await response.json();

        // Set all data from API response
        setCheckout(data.checkout as CheckoutData);
        setUser(data.user);
        setVendor(data.vendor);
        
        if (data.tool) {
          setToolImageUrl(data.tool.logo_url);
          setToolDescription(data.tool.description);
        }

        // Auto-select pricing/product with hierarchy:
        // 1. selected_pricing from metadata (user selected in dialog)
        // 2. Preferred product (is_preferred = true)
        // 3. First available product/option
        const checkoutData = data.checkout;
        
        if (checkoutData.metadata.selected_pricing) {
          // Priority 1: User selected a specific plan
          setSelectedPricing(checkoutData.metadata.selected_pricing as string);
        } else if (checkoutData.metadata.products && Array.isArray(checkoutData.metadata.products)) {
          // For products structure
          const preferredProduct = checkoutData.metadata.products.find((p: CheckoutProduct) => p.is_preferred);
          if (preferredProduct) {
            // Priority 2: Preferred product
            setSelectedPricing(preferredProduct.id);
          } else if (checkoutData.metadata.products.length > 0) {
            // Priority 3: First available product
            setSelectedPricing(checkoutData.metadata.products[0].id);
          }
        } else if (checkoutData.metadata.pricing_options) {
          // For pricing_options structure
          const options = checkoutData.metadata.pricing_options;
          
          // Priority 3: First available option
          if (options.one_time?.enabled) {
            setSelectedPricing('one_time');
          } else if (options.subscription_monthly?.enabled) {
            setSelectedPricing('subscription_monthly');
          } else if (options.subscription_yearly?.enabled) {
            setSelectedPricing('subscription_yearly');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching checkout data:', err);
        setError('Failed to load checkout');
        setLoading(false);
      }
    };

    fetchData();
  }, [checkoutId, router]);

  const handleConfirmPurchase = async () => {
    if (!checkout || !user) return;

    // Check if already completed
    if (checkout.metadata.status === 'completed') {
      // Open tool and redirect
      // FIX: Token no longer stored in metadata (security fix)
      // For repeat access, users need to re-authenticate or purchase again
      const toolUrl = checkout.metadata.tool_url;
      
      if (toolUrl && toolUrl !== 'https://example.com/tool/' && !toolUrl.includes('example.com')) {
        // Note: No token for already-completed purchases
        // This is intentional - tokens are single-use and short-lived
        window.open(toolUrl, '_blank');
      }
      router.push('/backoffice?purchase_success=true');
      return;
    }

    // For flexible pricing or products, ensure option is selected
    const hasProducts = Array.isArray(checkout.metadata.products) && checkout.metadata.products.length > 0;
    const hasPricingOptions = checkout.metadata.pricing_options && 
      Object.values(checkout.metadata.pricing_options).some(opt => opt?.enabled);
    
    if ((hasPricingOptions || hasProducts) && !selectedPricing) {
      setError(hasProducts ? 'Please select a product' : 'Please select a payment method');
      return;
    }

    // Get the selected price
    let selectedPrice = checkout.credit_amount || 0;
    
    if (hasProducts && selectedPricing) {
      const product = checkout.metadata.products!.find((p: CheckoutProduct) => p.id === selectedPricing);
      if (product) {
        const pm = product.pricing_model;
        if (pm.one_time?.enabled && pm.one_time.price) selectedPrice = pm.one_time.price;
        else if (pm.subscription?.enabled && pm.subscription.price) selectedPrice = pm.subscription.price;
        else if (pm.usage_based?.enabled && pm.usage_based.price_per_unit) selectedPrice = pm.usage_based.price_per_unit;
      }
    } else if (hasPricingOptions && selectedPricing) {
      const pricingOption = checkout.metadata.pricing_options?.[selectedPricing as keyof typeof checkout.metadata.pricing_options];
      if (pricingOption) {
        selectedPrice = pricingOption.price;
      }
    }

    // Remove client-side balance check - let backend handle it atomically
    // This prevents race conditions and ensures accurate balance validation

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkout_id: checkout.id,
          selected_pricing: selectedPricing,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Enhanced error handling with balance refresh
        if (data.error === 'Insufficient credits') {
          // Refresh balance to show user the current state
          try {
            const balanceResponse = await fetch(`/api/checkout/${checkoutId}`);
            if (balanceResponse.ok) {
              const balanceData = await balanceResponse.json();
              setUser(balanceData.user);
              
              // Show detailed error with shortfall information
              const shortfall = data.shortfall || (data.required - data.current_balance);
              setError(
                `Insufficient credits. You need ${data.required} credits but have ${balanceData.user.credits.toFixed(2)} credits. ` +
                `You're short by ${shortfall.toFixed(2)} credits.`
              );
            } else {
              setError(data.error || 'Purchase failed due to insufficient credits');
            }
          } catch (refreshError) {
            console.error('Error refreshing balance:', refreshError);
            setError(data.error || 'Purchase failed due to insufficient credits');
          }
        } else {
          setError(data.error || 'Purchase failed');
        }
        setIsProcessing(false);
        return;
      }

      // Success! Refetch user profile to get updated balance
      try {
        const profileResponse = await fetch('/api/user/profile');
        if (profileResponse.ok) {
          const userData = await profileResponse.json();
          setUser(prev => prev ? {
            ...prev,
            credits: userData.credits || 0,
          } : null);
        }
      } catch (err) {
        console.error('Error fetching updated balance:', err);
        // Update balance from API response if available
        if (data.new_balance !== undefined) {
          setUser(prev => prev ? {
            ...prev,
            credits: data.new_balance,
          } : null);
        }
      }

      // Store purchase data and show success state
      const toolUrl = checkout.metadata.tool_url || data.tool_url;
      const toolAccessToken = data.tool_access_token || null;
      
      setPurchaseData({
        toolUrl,
        toolAccessToken,
        isSubscription: data.is_subscription || false,
      });
      setPurchaseSuccess(true);
      setIsProcessing(false);
      
      // Update local state immediately
      setCheckout(prev => prev ? {
        ...prev,
        metadata: { ...prev.metadata, status: 'completed', completed_at: new Date().toISOString() }
      } : null);
      
      // Auto-open tool if URL is valid
      if (toolUrl && toolUrl !== 'https://example.com/tool/' && !toolUrl.includes('example.com')) {
        const redirectUrl = toolAccessToken 
          ? `${toolUrl}${toolUrl.includes('?') ? '&' : '?'}token=${toolAccessToken}`
          : toolUrl;
        window.open(redirectUrl, '_blank');
      }

    } catch (err) {
      console.error('Purchase error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block h-8 w-8 animate-spin text-[#3ecf8e]" />
          <p className="mt-4 text-[#9ca3af]">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Error state - checkout not found
  if (!checkout || error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-6 mb-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Checkout Error</h2>
            <p className="text-[#9ca3af]">{error || 'The requested checkout does not exist.'}</p>
          </div>
          <button
            onClick={() => router.push('/backoffice')}
            className="bg-[#3ecf8e] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#2dd4bf]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Helper functions
  const hasProducts = Array.isArray(checkout.metadata.products) && checkout.metadata.products.length > 0;
  const hasPricingOptions = checkout.metadata.pricing_options && 
    Object.values(checkout.metadata.pricing_options).some(opt => opt?.enabled);
  
  const getSelectedPrice = () => {
    // Handle products (new structure)
    if (hasProducts && selectedPricing) {
      const product = checkout.metadata.products!.find((p: CheckoutProduct) => p.id === selectedPricing);
      if (product) {
        const pm = product.pricing_model;
        if (pm.one_time?.enabled) {
          if (pm.one_time.price) return pm.one_time.price;
          if (pm.one_time.min_price) return pm.one_time.min_price; // Use min price as fallback
        }
        if (pm.subscription?.enabled && pm.subscription.price) return pm.subscription.price;
        if (pm.usage_based?.enabled && pm.usage_based.price_per_unit) return pm.usage_based.price_per_unit;
      }
    }
    
    // Handle pricing_options (old structure)
    if (hasPricingOptions && selectedPricing) {
      const pricingOption = checkout.metadata.pricing_options?.[selectedPricing as keyof typeof checkout.metadata.pricing_options];
      if (pricingOption) {
        return pricingOption.price;
      }
    }
    
    return checkout.credit_amount || 0;
  };

  const selectedPrice = getSelectedPrice();
  const hasEnoughCredits = user && user.credits >= selectedPrice;
  const isCompleted = checkout.metadata.status === 'completed';
  const balanceAfter = user ? user.credits - selectedPrice : 0;
  const isSubscription = selectedPricing?.includes('subscription') || checkout.type === 'tool_subscription';
  const subscriptionPeriod = checkout.metadata.subscription_period || 
    (selectedPricing === 'subscription_monthly' ? 'monthly' : selectedPricing === 'subscription_yearly' ? 'yearly' : null);

  const handleLaunchTool = () => {
    if (!purchaseData) return;
    
    const { toolUrl, toolAccessToken } = purchaseData;
    if (toolUrl && toolUrl !== 'https://example.com/tool/' && !toolUrl.includes('example.com')) {
      const redirectUrl = toolAccessToken 
        ? `${toolUrl}${toolUrl.includes('?') ? '&' : '?'}token=${toolAccessToken}`
        : toolUrl;
      window.open(redirectUrl, '_blank');
    }
  };

  // Success Modal
  if (purchaseSuccess && purchaseData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Success Card */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 shadow-2xl">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-green-400/20 p-4 rounded-full">
                <Check className="w-12 h-12 text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#ededed] mb-2">
                {purchaseData.isSubscription ? 'Subscription Activated!' : 'Purchase Successful!'}
              </h2>
              <p className="text-[#9ca3af]">
                {purchaseData.isSubscription 
                  ? `You now have access to ${checkout.metadata.tool_name}. Your subscription will auto-renew.`
                  : `You now have access to ${checkout.metadata.tool_name}.`
                }
              </p>
            </div>

            {/* Updated Balance */}
            <div className="bg-[#0a0a0a]/50 rounded-lg p-4 mb-6 border border-[#374151]">
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Updated Balance:</span>
                <span className="text-[#3ecf8e] font-semibold text-lg">{user?.credits.toFixed(2) || 0} credits</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {purchaseData.toolUrl && 
               purchaseData.toolUrl !== 'https://example.com/tool/' && 
               !purchaseData.toolUrl.includes('example.com') && (
                <button
                  onClick={handleLaunchTool}
                  className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black px-6 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Launch {checkout.metadata.tool_name}
                </button>
              )}
              <button
                onClick={() => router.push('/backoffice?purchase_success=true')}
                className="w-full bg-[#374151] text-[#ededed] px-6 py-4 rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
              >
                Return to Dashboard
              </button>
            </div>

            {/* Tool opened notification */}
            {purchaseData.toolUrl && 
             purchaseData.toolUrl !== 'https://example.com/tool/' && 
             !purchaseData.toolUrl.includes('example.com') && (
              <p className="text-xs text-[#9ca3af] text-center mt-4">
                The tool has been opened in a new tab. If it didn&apos;t open, click the button above.
              </p>
            )}
          </div>

          {/* Additional Info */}
          {purchaseData.isSubscription && (
            <div className="mt-4 text-center">
              <p className="text-sm text-[#9ca3af]">
                Manage your subscription from{' '}
                <button 
                  onClick={() => router.push('/profile')}
                  className="text-[#3ecf8e] hover:underline"
                >
                  your profile
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/backoffice')}
              className="text-2xl font-bold text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
            >
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </button>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-[#9ca3af]">
                Balance: <span className="text-[#3ecf8e] font-semibold">{user?.credits.toFixed(2) || 0} credits</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-[#9ca3af]">
                <Lock className="w-4 h-4" />
                <span>Secure</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Stripe-like Two Column Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Product Details */}
          <div className="order-2 lg:order-1">
            <div className="space-y-6">
              {/* Tool Header */}
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#1f2937] border border-[#374151]">
                    {toolImageUrl ? (
                      <img 
                        src={toolImageUrl} 
                        alt={checkout.metadata.tool_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] flex items-center justify-center"><svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] flex items-center justify-center">
                        <Wrench className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl lg:text-3xl font-bold text-[#ededed] mb-2">
                      {checkout.metadata.tool_name}
                    </h1>
                    {vendor && (
                      <p className="text-sm text-[#9ca3af] mb-3">by {vendor.full_name}</p>
                    )}
                    {toolDescription && (
                      <p className="text-sm text-[#d1d5db] leading-relaxed">
                        {toolDescription}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              {isCompleted && (
                <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-400/20 p-2 rounded-full">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-green-400 font-medium">Purchase Completed</p>
                      <p className="text-sm text-[#9ca3af] mt-0.5">
                        {new Date(checkout.metadata.completed_at!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isSubscription && !isCompleted && (
                <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-400/20 p-2 rounded-full">
                      <span className="text-blue-400 text-lg">🔄</span>
                    </div>
                    <div>
                      <p className="text-blue-400 font-medium">Recurring Subscription</p>
                      <p className="text-sm text-[#9ca3af] mt-1">
                        Billed {subscriptionPeriod}. Cancel anytime from your profile.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary (Sticky) */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-8">
              <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl border border-[#374151] overflow-hidden">
                <div className="p-6 lg:p-8 space-y-6">
                  <h2 className="text-xl font-bold text-[#ededed]">Order Summary</h2>

                  {/* What You're Buying Section */}
                  {!isCompleted && (
                    <div className="bg-gradient-to-br from-[#0a0a0a]/80 to-[#1f2937]/50 rounded-xl border border-[#3ecf8e]/30 p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-[#3ecf8e] uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        What you&apos;re buying
                      </h3>
                      
                      <div className="space-y-3">
                        {/* Tool Info */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[#1f2937] border border-[#374151]">
                            {toolImageUrl ? (
                              <img 
                                src={toolImageUrl} 
                                alt={checkout.metadata.tool_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] flex items-center justify-center"><svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] flex items-center justify-center">
                                <Wrench className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#ededed] text-base truncate">
                              {checkout.metadata.tool_name}
                            </h4>
                            {vendor && (
                              <p className="text-xs text-[#9ca3af] mt-0.5">by {vendor.full_name}</p>
                            )}
                          </div>
                        </div>

                        {/* Selected Plan Details */}
                        {selectedPricing && (
                          <div className="border-t border-[#374151]/50 pt-3 space-y-2">
                            {/* For Products Structure */}
                            {hasProducts && (() => {
                              const product = checkout.metadata.products!.find((p: CheckoutProduct) => p.id === selectedPricing);
                              if (!product) return null;
                              
                              const pm = product.pricing_model;
                              let planType = '';
                              let billingInfo = '';
                              let priceDisplay = '';
                              
                              if (pm.one_time?.enabled) {
                                planType = 'One-time Purchase';
                                billingInfo = 'Lifetime access';
                                if (pm.one_time.price) {
                                  priceDisplay = `${pm.one_time.price} credits`;
                                } else if (pm.one_time.min_price) {
                                  priceDisplay = `${pm.one_time.min_price} credits`;
                                }
                              } else if (pm.subscription?.enabled) {
                                planType = 'Subscription';
                                const interval = pm.subscription.interval === 'year' ? 'yearly' : 'monthly';
                                billingInfo = `Billed ${interval}${pm.subscription.trial_days ? ` • ${pm.subscription.trial_days} days free trial` : ''}`;
                                priceDisplay = `${pm.subscription.price} credits/${pm.subscription.interval === 'year' ? 'year' : 'month'}`;
                              } else if (pm.usage_based?.enabled) {
                                planType = 'Pay-as-you-go';
                                billingInfo = `Per ${pm.usage_based.unit_name || 'unit'}${pm.usage_based.minimum_units ? ` • Min ${pm.usage_based.minimum_units} units` : ''}`;
                                priceDisplay = `${pm.usage_based.price_per_unit} credits/${pm.usage_based.unit_name || 'unit'}`;
                              }
                              
                              return (
                                <>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-[#ededed]">{product.name}</span>
                                        {product.is_preferred && (
                                          <span className="text-xs bg-[#3ecf8e]/20 text-[#3ecf8e] px-1.5 py-0.5 rounded font-medium">
                                            Recommended
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        {pm.subscription?.enabled && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">
                                            🔄 {planType}
                                          </span>
                                        )}
                                        {pm.one_time?.enabled && !pm.subscription?.enabled && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">
                                            ✓ {planType}
                                          </span>
                                        )}
                                        {pm.usage_based?.enabled && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20">
                                            📊 {planType}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#9ca3af] mt-1">{billingInfo}</p>
                                    </div>
                                    <div className="text-right ml-3">
                                      <div className="text-lg font-bold text-[#3ecf8e]">{priceDisplay.split(' ')[0]}</div>
                                      <div className="text-xs text-[#9ca3af]">{priceDisplay.split(' ').slice(1).join(' ')}</div>
                                    </div>
                                  </div>
                                  
                                  {product.features && product.features.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-[#374151]/50">
                                      <p className="text-xs font-medium text-[#d1d5db] mb-2">Included features:</p>
                                      <ul className="space-y-1.5">
                                        {product.features.slice(0, 4).map((feature: string, idx: number) => (
                                          <li key={idx} className="text-xs text-[#9ca3af] flex items-start gap-2">
                                            <Check className="w-3.5 h-3.5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                          </li>
                                        ))}
                                        {product.features.length > 4 && (
                                          <li className="text-xs text-[#9ca3af] italic pl-5">
                                            +{product.features.length - 4} more features
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            
                            {/* For Pricing Options Structure (old) */}
                            {hasPricingOptions && !hasProducts && (() => {
                              let planName = '';
                              let planType = '';
                              let billingInfo = '';
                              let priceDisplay = '';
                              
                              if (selectedPricing === 'one_time' && checkout.metadata.pricing_options?.one_time?.enabled) {
                                planName = 'One-time Payment';
                                planType = 'One-time Purchase';
                                billingInfo = 'Lifetime access';
                                priceDisplay = `${checkout.metadata.pricing_options.one_time.price} credits`;
                              } else if (selectedPricing === 'subscription_monthly' && checkout.metadata.pricing_options?.subscription_monthly?.enabled) {
                                planName = 'Monthly Subscription';
                                planType = 'Subscription';
                                billingInfo = 'Billed monthly';
                                priceDisplay = `${checkout.metadata.pricing_options.subscription_monthly.price} credits/month`;
                              } else if (selectedPricing === 'subscription_yearly' && checkout.metadata.pricing_options?.subscription_yearly?.enabled) {
                                planName = 'Yearly Subscription';
                                planType = 'Subscription';
                                billingInfo = 'Billed annually';
                                priceDisplay = `${checkout.metadata.pricing_options.subscription_yearly.price} credits/year`;
                              }
                              
                              return (
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-[#ededed]">{planName}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      {selectedPricing?.includes('subscription') ? (
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">
                                          🔄 {planType}
                                        </span>
                                      ) : (
                                        <span className="text-xs px-2 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">
                                          ✓ {planType}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#9ca3af] mt-1">{billingInfo}</p>
                                  </div>
                                  <div className="text-right ml-3">
                                    <div className="text-lg font-bold text-[#3ecf8e]">{priceDisplay.split(' ')[0]}</div>
                                    <div className="text-xs text-[#9ca3af]">{priceDisplay.split(' ').slice(1).join(' ')}</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Products Selection (new structure) */}
                  {hasProducts && !isCompleted && (
                    <div className="space-y-3">
                      {!showAllPlans ? (
                        // Show selected product with option to change
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-[#9ca3af]">Selected Plan</label>
                            {checkout.metadata.products!.length > 1 && (
                              <button
                                onClick={() => setShowAllPlans(true)}
                                className="text-xs text-[#3ecf8e] hover:text-[#2dd4bf] font-medium"
                              >
                                Change Plan →
                              </button>
                            )}
                          </div>
                          {checkout.metadata.products!.filter((p: CheckoutProduct) => p.id === selectedPricing).map((product: CheckoutProduct) => {
                            const pm = product.pricing_model;
                            let priceDisplay = '';
                            let priceLabel = '';
                            
                            if (pm.one_time?.enabled) {
                              if (pm.one_time.price) {
                                priceDisplay = pm.one_time.price.toString();
                                priceLabel = 'credits';
                              } else if (pm.one_time.min_price && pm.one_time.max_price) {
                                priceDisplay = `${pm.one_time.min_price}-${pm.one_time.max_price}`;
                                priceLabel = 'credits';
                              } else {
                                priceDisplay = 'Custom';
                                priceLabel = '';
                              }
                            } else if (pm.subscription?.enabled && pm.subscription.price) {
                              priceDisplay = pm.subscription.price.toString();
                              priceLabel = `/${pm.subscription.interval === 'year' ? 'yr' : 'mo'}`;
                            } else if (pm.usage_based?.enabled && pm.usage_based.price_per_unit) {
                              priceDisplay = pm.usage_based.price_per_unit.toString();
                              priceLabel = `/${pm.usage_based.unit_name || 'unit'}`;
                            }
                            
                            return (
                              <div key={product.id} className="w-full p-4 rounded border-2 border-[#3ecf8e] bg-[#3ecf8e]/5">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-semibold text-[#ededed] mb-1 flex items-center gap-2">
                                      {product.name}
                                      {product.is_preferred && (
                                        <span className="text-xs bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-0.5 rounded-full font-medium">
                                          Recommended
                                        </span>
                                      )}
                                    </div>
                                    {product.description && (
                                      <div className="text-xs text-[#9ca3af] mb-2">
                                        {product.description}
                                      </div>
                                    )}
                                    {product.features && product.features.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {product.features.map((feature: string, idx: number) => (
                                          <div key={idx} className="text-xs text-[#9ca3af] flex items-center gap-1">
                                            <Check className="w-3 h-3 text-[#3ecf8e]" />
                                            {feature}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                                    {priceDisplay}
                                    <span className="text-xs text-[#9ca3af] ml-1">{priceLabel}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        // Show all products to choose from
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-[#9ca3af]">Choose a Plan</label>
                            <button
                              onClick={() => setShowAllPlans(false)}
                              className="text-xs text-[#9ca3af] hover:text-[#ededed] font-medium"
                            >
                              ← Back
                            </button>
                          </div>
                          {checkout.metadata.products!.map((product: CheckoutProduct) => {
                            const pm = product.pricing_model;
                            let priceDisplay = '';
                            let priceLabel = '';
                            
                            if (pm.one_time?.enabled) {
                              if (pm.one_time.price) {
                                priceDisplay = pm.one_time.price.toString();
                                priceLabel = 'credits';
                              } else if (pm.one_time.min_price && pm.one_time.max_price) {
                                priceDisplay = `${pm.one_time.min_price}-${pm.one_time.max_price}`;
                                priceLabel = 'credits';
                              } else {
                                priceDisplay = 'Custom';
                                priceLabel = '';
                              }
                            } else if (pm.subscription?.enabled && pm.subscription.price) {
                              priceDisplay = pm.subscription.price.toString();
                              priceLabel = `/${pm.subscription.interval === 'year' ? 'yr' : 'mo'}`;
                            } else if (pm.usage_based?.enabled && pm.usage_based.price_per_unit) {
                              priceDisplay = pm.usage_based.price_per_unit.toString();
                              priceLabel = `/${pm.usage_based.unit_name || 'unit'}`;
                            }
                            
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPricing(product.id);
                                  setShowAllPlans(false);
                                }}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                  selectedPricing === product.id
                                    ? 'border-[#3ecf8e] bg-[#3ecf8e]/5 shadow-lg shadow-[#3ecf8e]/10'
                                    : 'border-[#374151] hover:border-[#4b5563] bg-[#0a0a0a]/30'
                                }`}
                              >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-[#ededed] mb-1 flex items-center gap-2">
                                  {product.name}
                                  {product.is_preferred && (
                                    <span className="text-xs bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-0.5 rounded-full font-medium">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                {product.description && (
                                  <div className="text-xs text-[#9ca3af]">
                                    {product.description}
                                  </div>
                                )}
                                {product.features && product.features.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {product.features.slice(0, 3).map((feature: string, idx: number) => (
                                      <div key={idx} className="text-xs text-[#9ca3af] flex items-center gap-1">
                                        <Check className="w-3 h-3 text-[#3ecf8e]" />
                                        {feature}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                                {priceDisplay}
                                <span className="text-xs text-[#9ca3af] ml-1">{priceLabel}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                        </>
                      )}
                    </div>
                  )}

                  {/* Pricing Options (old structure) */}
                  {hasPricingOptions && !isCompleted && !hasProducts && (
                    <div className="space-y-3">
                      {!showAllPlans ? (
                        // Show selected plan with option to change
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-[#9ca3af]">Selected Plan</label>
                            {Object.values(checkout.metadata.pricing_options || {}).filter(opt => opt?.enabled).length > 1 && (
                              <button
                                onClick={() => setShowAllPlans(true)}
                                className="text-xs text-[#3ecf8e] hover:text-[#2dd4bf] font-medium"
                              >
                                Change Plan →
                              </button>
                            )}
                          </div>
                          
                          {selectedPricing === 'one_time' && checkout.metadata.pricing_options?.one_time?.enabled && (
                            <div className="w-full p-4 rounded border-2 border-[#3ecf8e] bg-[#3ecf8e]/5">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-[#ededed] mb-1">One-time Payment</div>
                                  <div className="text-xs text-[#9ca3af]">
                                    {checkout.metadata.pricing_options.one_time.description || 'Lifetime access'}
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                                  {checkout.metadata.pricing_options.one_time.price}
                                  <span className="text-xs text-[#9ca3af] ml-1">credits</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {selectedPricing === 'subscription_monthly' && checkout.metadata.pricing_options?.subscription_monthly?.enabled && (
                            <div className="w-full p-4 rounded border-2 border-[#3ecf8e] bg-[#3ecf8e]/5">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-[#ededed] mb-1">Monthly</div>
                                  <div className="text-xs text-[#9ca3af]">
                                    {checkout.metadata.pricing_options.subscription_monthly.description || 'Billed monthly'}
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                                  {checkout.metadata.pricing_options.subscription_monthly.price}
                                  <span className="text-xs text-[#9ca3af] ml-1">/mo</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {selectedPricing === 'subscription_yearly' && checkout.metadata.pricing_options?.subscription_yearly?.enabled && (
                            <div className="w-full p-4 rounded border-2 border-[#3ecf8e] bg-[#3ecf8e]/5">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="font-semibold text-[#ededed]">Yearly</div>
                                    <span className="text-xs bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-0.5 rounded-full font-medium">Best Value</span>
                                  </div>
                                  <div className="text-xs text-[#9ca3af]">
                                    {checkout.metadata.pricing_options.subscription_yearly.description || 'Billed annually'}
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                                  {checkout.metadata.pricing_options.subscription_yearly.price}
                                  <span className="text-xs text-[#9ca3af] ml-1">/yr</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        // Show all plans to choose from
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-[#9ca3af]">Choose a Plan</label>
                            <button
                              onClick={() => setShowAllPlans(false)}
                              className="text-xs text-[#9ca3af] hover:text-[#ededed] font-medium"
                            >
                              ← Back
                            </button>
                          </div>
                          
                          {checkout.metadata.pricing_options?.one_time?.enabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPricing('one_time');
                            setShowAllPlans(false);
                          }}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                            selectedPricing === 'one_time'
                              ? 'border-[#3ecf8e] bg-[#3ecf8e]/5 shadow-lg shadow-[#3ecf8e]/10'
                              : 'border-[#374151] hover:border-[#4b5563] bg-[#0a0a0a]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-[#ededed] mb-1">One-time Payment</div>
                              <div className="text-xs text-[#9ca3af]">
                                {checkout.metadata.pricing_options.one_time.description || 'Lifetime access'}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                              {checkout.metadata.pricing_options.one_time.price}
                              <span className="text-xs text-[#9ca3af] ml-1">credits</span>
                            </div>
                          </div>
                        </button>
                      )}
                      
                      {checkout.metadata.pricing_options?.subscription_monthly?.enabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPricing('subscription_monthly');
                            setShowAllPlans(false);
                          }}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                            selectedPricing === 'subscription_monthly'
                              ? 'border-[#3ecf8e] bg-[#3ecf8e]/5 shadow-lg shadow-[#3ecf8e]/10'
                              : 'border-[#374151] hover:border-[#4b5563] bg-[#0a0a0a]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-[#ededed] mb-1">Monthly</div>
                              <div className="text-xs text-[#9ca3af]">
                                {checkout.metadata.pricing_options.subscription_monthly.description || 'Billed monthly'}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                              {checkout.metadata.pricing_options.subscription_monthly.price}
                              <span className="text-xs text-[#9ca3af] ml-1">/mo</span>
                            </div>
                          </div>
                        </button>
                      )}
                      
                      {checkout.metadata.pricing_options?.subscription_yearly?.enabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPricing('subscription_yearly');
                            setShowAllPlans(false);
                          }}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                            selectedPricing === 'subscription_yearly'
                              ? 'border-[#3ecf8e] bg-[#3ecf8e]/5 shadow-lg shadow-[#3ecf8e]/10'
                              : 'border-[#374151] hover:border-[#4b5563] bg-[#0a0a0a]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-semibold text-[#ededed]">Yearly</div>
                                <span className="text-xs bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-0.5 rounded-full font-medium">Best Value</span>
                              </div>
                              <div className="text-xs text-[#9ca3af]">
                                {checkout.metadata.pricing_options.subscription_yearly.description || 'Billed annually'}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                              {checkout.metadata.pricing_options.subscription_yearly.price}
                              <span className="text-xs text-[#9ca3af] ml-1">/yr</span>
                            </div>
                          </div>
                        </button>
                      )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Order Details */}
                  <div className="border-t border-[#374151] pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium text-[#ededed]">Total</span>
                      <span className="text-2xl font-bold text-[#3ecf8e]">
                        {selectedPrice}
                        <span className="text-sm text-[#9ca3af] ml-1">
                          {isSubscription && subscriptionPeriod ? `/${subscriptionPeriod === 'monthly' ? 'mo' : 'yr'}` : 'credits'}
                        </span>
                      </span>
                    </div>

                    {/* Balance Info */}
                    {!isCompleted && (
                      <div className="bg-[#0a0a0a]/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#9ca3af]">Current Balance</span>
                          <span className="text-[#ededed] font-medium">{user?.credits.toFixed(2)} credits</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#9ca3af]">After Purchase</span>
                          <span className={`font-bold ${hasEnoughCredits ? 'text-[#3ecf8e]' : 'text-red-400'}`}>
                            {balanceAfter.toFixed(2)} credits
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error/Warning Messages */}
                  {!hasEnoughCredits && !isCompleted && (
                    <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-red-400 font-medium text-sm mb-1">Insufficient Credits</p>
                          <p className="text-xs text-[#9ca3af] mb-3">
                            You need {selectedPrice} credits but have {user?.credits.toFixed(2)} credits.
                          </p>
                          <button
                            onClick={() => setShowBuyCreditsDialog(true)}
                            className="bg-[#3ecf8e] text-black px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#2dd4bf] transition-colors w-fit"
                          >
                            Buy More Credits
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && !isCompleted && (
                    <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={handleConfirmPurchase}
                    disabled={(!hasEnoughCredits && !isCompleted) || isProcessing || (hasPricingOptions && !selectedPricing && !isCompleted)}
                    className="w-full bg-[#3ecf8e] text-black font-bold py-4 px-6 rounded-xl hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <ExternalLink className="w-5 h-5" />
                        <span>Open Tool Again</span>
                      </>
                    ) : hasPricingOptions && !selectedPricing ? (
                      <span>Select a Plan</span>
                    ) : (
                      <>
                        <span>confirm and buy</span>
                      </>
                    )}
                  </button>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-2 text-xs text-[#9ca3af] pt-4 border-t border-[#374151]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secure checkout powered by 1sub.io</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Buy Credits Dialog */}
      <BuyCreditsDialog
        isOpen={showBuyCreditsDialog}
        onClose={() => setShowBuyCreditsDialog(false)}
        currentCredits={user?.credits || 0}
        currentPlan={{ id: 'starter', name: 'Starter', creditsPerMonth: 50, price: 50 }} // TODO: Get from user subscription
        maxOverdraft={0} // 0 = locked, >0 = enabled
        onCreditsAdded={async () => {
          // Refetch user data to update balance
          try {
            const response = await fetch(`/api/checkout/${checkoutId}`);
            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
            }
          } catch (err) {
            console.error('Error refreshing balance:', err);
          }
        }}
      />
    </div>
  );
}

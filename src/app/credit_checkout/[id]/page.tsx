'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Check, ExternalLink, Wrench, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ProductPricingModel } from '@/lib/tool-types';

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

  // Fetch checkout data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        // Check authentication
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          router.push(`/login?redirect=/credit_checkout/${checkoutId}`);
          return;
        }

        // Fetch checkout record
        const { data: checkoutData, error: checkoutError } = await supabase
          .from('checkouts')
          .select('*')
          .eq('id', checkoutId)
          .single();

        if (checkoutError || !checkoutData) {
          setError('Checkout not found');
          setLoading(false);
          return;
        }

        // Verify user owns this checkout
        if (checkoutData.user_id !== authUser.id) {
          setError('Unauthorized access to this checkout');
          setLoading(false);
          return;
        }

        setCheckout(checkoutData as CheckoutData);

        // Fetch user profile with credits
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          setUser({
            id: userData.id,
            email: userData.email,
            credits: userData.credits || 0,
          });
        }

        // Fetch vendor information if vendor_id exists
        if (checkoutData.vendor_id) {
          const { data: vendorData } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .eq('id', checkoutData.vendor_id)
            .single();

          if (vendorData) {
            setVendor(vendorData);
          }
        }

        // Auto-select pricing/product if only one option available or if already selected
        if (checkoutData.metadata.selected_pricing) {
          setSelectedPricing(checkoutData.metadata.selected_pricing as string);
        } else if (checkoutData.metadata.products && Array.isArray(checkoutData.metadata.products)) {
          // Auto-select if only one product
          if (checkoutData.metadata.products.length === 1) {
            setSelectedPricing(checkoutData.metadata.products[0].id);
          } else {
            // Auto-select preferred product
            const preferredProduct = checkoutData.metadata.products.find((p: CheckoutProduct) => p.is_preferred);
            if (preferredProduct) {
              setSelectedPricing(preferredProduct.id);
            }
          }
        } else if (checkoutData.metadata.pricing_options) {
          const options = checkoutData.metadata.pricing_options;
          const enabledOptions = [
            options.one_time?.enabled && 'one_time',
            options.subscription_monthly?.enabled && 'subscription_monthly',
            options.subscription_yearly?.enabled && 'subscription_yearly',
          ].filter(Boolean);
          
          // Auto-select if only one option
          if (enabledOptions.length === 1) {
            setSelectedPricing(enabledOptions[0] as string);
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
      window.open(checkout.metadata.tool_url, '_blank');
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

    // Check sufficient credits
    if (user.credits < selectedPrice) {
      setError(`Insufficient credits. You need ${selectedPrice} credits but only have ${user.credits}.`);
      return;
    }

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
        setError(data.error || 'Purchase failed');
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

      // Open tool URL from checkout metadata
      const toolUrl = checkout.metadata.tool_url || data.tool_url;
      
      if (toolUrl && toolUrl !== 'https://example.com/tool/' && !toolUrl.includes('example.com')) {
        window.open(toolUrl, '_blank');
      } else {
        console.warn('Invalid tool URL:', toolUrl);
        alert('Tool purchased successfully, but URL is not configured. Please contact the vendor.');
      }
      
      // Update local state immediately
      setCheckout(prev => prev ? {
        ...prev,
        metadata: { ...prev.metadata, status: 'completed', completed_at: new Date().toISOString() }
      } : null);
      
      // Redirect to backoffice
      setTimeout(() => {
        router.push('/backoffice?purchase_success=true');
      }, 1000);

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
  const pricingType = checkout.metadata.pricing_type || 'one_time';
  const subscriptionPeriod = checkout.metadata.subscription_period || 
    (selectedPricing === 'subscription_monthly' ? 'monthly' : selectedPricing === 'subscription_yearly' ? 'yearly' : null);

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
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] p-3 rounded-lg">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[#ededed]">
                      {checkout.metadata.tool_name}
                    </h1>
                    {vendor && (
                      <p className="text-sm text-[#9ca3af] mt-1">by {vendor.full_name}</p>
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

              {/* What's Included Section */}
              <div className="bg-[#1f2937]/50 border border-[#374151] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-[#ededed] mb-4">What&apos;s included</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Check className="w-5 h-5 text-[#3ecf8e]" />
                    </div>
                    <div>
                      <p className="text-[#ededed] font-medium">Instant Tool Access</p>
                      <p className="text-sm text-[#9ca3af] mt-0.5">
                        Get immediate access to {checkout.metadata.tool_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Check className="w-5 h-5 text-[#3ecf8e]" />
                    </div>
                    <div>
                      <p className="text-[#ededed] font-medium">Secure Connection</p>
                      <p className="text-sm text-[#9ca3af] mt-0.5">
                        All transactions are encrypted and secure
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Check className="w-5 h-5 text-[#3ecf8e]" />
                    </div>
                    <div>
                      <p className="text-[#ededed] font-medium">Transaction History</p>
                      <p className="text-sm text-[#9ca3af] mt-0.5">
                        Full record in your dashboard
                      </p>
                    </div>
                  </div>
                  {vendor && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Check className="w-5 h-5 text-[#3ecf8e]" />
                      </div>
                      <div>
                        <p className="text-[#ededed] font-medium">Vendor Support</p>
                        <p className="text-sm text-[#9ca3af] mt-0.5">
                          Direct support from {vendor.full_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-[#1f2937]/30 border border-[#374151]/50 rounded-xl p-6">
                <h3 className="text-base font-semibold text-[#ededed] mb-3">How it works</h3>
                <ol className="space-y-3 text-sm text-[#9ca3af]">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3ecf8e]/20 text-[#3ecf8e] flex items-center justify-center text-xs font-bold">1</span>
                    <span>Confirm your purchase using your credit balance</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3ecf8e]/20 text-[#3ecf8e] flex items-center justify-center text-xs font-bold">2</span>
                    <span>Credits are deducted from your account</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3ecf8e]/20 text-[#3ecf8e] flex items-center justify-center text-xs font-bold">3</span>
                    <span>Tool opens immediately in a new tab</span>
                  </li>
                </ol>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-sm text-[#9ca3af] pt-4">
                <Lock className="w-4 h-4" />
                <span>Secure checkout powered by 1sub.io</span>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary (Sticky) */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-8">
              <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl border border-[#374151] overflow-hidden">
                <div className="p-6 lg:p-8 space-y-6">
                  <h2 className="text-xl font-bold text-[#ededed]">Order Summary</h2>

                  {/* Products Selection (new structure) */}
                  {hasProducts && !isCompleted && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#9ca3af]">Select Product</label>
                      
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
                            onClick={() => setSelectedPricing(product.id)}
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
                    </div>
                  )}

                  {/* Pricing Options (old structure) */}
                  {hasPricingOptions && !isCompleted && !hasProducts && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#9ca3af]">Select Plan</label>
                      
                      {checkout.metadata.pricing_options?.one_time?.enabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedPricing('one_time')}
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
                          onClick={() => setSelectedPricing('subscription_monthly')}
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
                          onClick={() => setSelectedPricing('subscription_yearly')}
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
                    </div>
                  )}

                  {/* Order Details */}
                  <div className="border-t border-[#374151] pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#9ca3af]">Subtotal</span>
                      <span className="text-base font-semibold text-[#ededed]">
                        {selectedPrice} credits
                      </span>
                    </div>
                    
                    {hasPricingOptions && selectedPricing && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#9ca3af]">Plan Type</span>
                        <span className="text-sm text-[#ededed]">
                          {selectedPricing === 'one_time' ? 'One-time' : 
                           selectedPricing === 'subscription_monthly' ? 'Monthly' : 
                           'Yearly'}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-[#374151] pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-medium text-[#ededed]">Total</span>
                        <span className="text-2xl font-bold text-[#3ecf8e]">
                          {selectedPrice}
                          <span className="text-sm text-[#9ca3af] ml-1">
                            {isSubscription && subscriptionPeriod ? `/${subscriptionPeriod === 'monthly' ? 'mo' : 'yr'}` : 'credits'}
                          </span>
                        </span>
                      </div>
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
                        <div>
                          <p className="text-red-400 font-medium text-sm mb-1">Insufficient Credits</p>
                          <p className="text-xs text-[#9ca3af] mb-3">
                            You need {selectedPrice} credits but have {user?.credits.toFixed(2)} credits.
                          </p>
                          <button
                            onClick={() => router.push('/buy-credits')}
                            className="text-xs text-[#3ecf8e] hover:text-[#2dd4bf] font-medium underline"
                          >
                            Buy More Credits →
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
                    className="w-full bg-[#3ecf8e] text-black font-bold py-4 px-6 rounded-xl hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3ecf8e]/20"
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
                        <span>Confirm Purchase</span>
                      </>
                    )}
                  </button>

                  {/* Cancel Link */}
                  {!isCompleted && (
                    <button
                      onClick={() => router.push('/backoffice')}
                      className="w-full text-center text-sm text-[#9ca3af] hover:text-[#ededed] transition-colors py-2"
                    >
                      Cancel and return to dashboard
                    </button>
                  )}

                  {/* Checkout ID */}
                  <div className="text-center text-xs text-[#9ca3af] pt-4 border-t border-[#374151]">
                    Order ID: {checkout.id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

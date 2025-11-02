'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Check, ExternalLink, Wrench, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DatabaseProduct, transformProducts, getAllEnabledPricingModels, PricingOption } from '@/lib/products';

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
    selected_product_id?: string;
    selected_product_name?: string;
    products?: DatabaseProduct[];
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedPricingModel, setSelectedPricingModel] = useState<'one_time' | 'subscription' | 'usage_based' | null>(null);

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

        // Auto-select product if only one option available or if already selected
        if (checkoutData.metadata.selected_product_id) {
          setSelectedProductId(checkoutData.metadata.selected_product_id);
          
          // Auto-detect pricing model from selected product
          const selectedProduct = checkoutData.metadata.products?.find((p: DatabaseProduct) => p.id === checkoutData.metadata.selected_product_id);
          if (selectedProduct) {
            const pm = selectedProduct.pricing_model?.pricing_model;
            if (pm?.one_time?.enabled) setSelectedPricingModel('one_time');
            else if (pm?.subscription?.enabled) setSelectedPricingModel('subscription');
            else if (pm?.usage_based?.enabled) setSelectedPricingModel('usage_based');
          }
        } else if (checkoutData.metadata.products) {
          const activeProducts = checkoutData.metadata.products.filter((p: DatabaseProduct) => p.is_active);
          
          // Auto-select if only one product
          if (activeProducts.length === 1) {
            setSelectedProductId(activeProducts[0].id);
            
            // Auto-detect pricing model
            const pm = activeProducts[0].pricing_model?.pricing_model;
            if (pm?.one_time?.enabled) setSelectedPricingModel('one_time');
            else if (pm?.subscription?.enabled) setSelectedPricingModel('subscription');
            else if (pm?.usage_based?.enabled) setSelectedPricingModel('usage_based');
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

    // Ensure product is selected
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    // Ensure pricing model is selected
    if (!selectedPricingModel) {
      setError('Please select a pricing model');
      return;
    }

    // Get the selected product to check price
    const selectedProduct = checkout.metadata.products?.find(p => p.id === selectedProductId);
    if (!selectedProduct) {
      setError('Selected product not found');
      return;
    }

    // Get price from product using the selected pricing model
    let selectedPrice = 0;
    const pricingModel = selectedProduct.pricing_model?.pricing_model;
    if (pricingModel) {
      if (selectedPricingModel === 'one_time' && pricingModel.one_time?.enabled && pricingModel.one_time.price) {
        selectedPrice = pricingModel.one_time.price;
      } else if (selectedPricingModel === 'subscription' && pricingModel.subscription?.enabled && pricingModel.subscription.price) {
        selectedPrice = pricingModel.subscription.price;
      } else if (selectedPricingModel === 'usage_based' && pricingModel.usage_based?.enabled && pricingModel.usage_based.price_per_unit) {
        const pricePerUnit = pricingModel.usage_based.price_per_unit;
        const minimumUnits = pricingModel.usage_based.minimum_units || 1;
        selectedPrice = pricePerUnit * minimumUnits; // Calculate minimum purchase amount
      }
    }

    if (selectedPrice === 0) {
      setError('Invalid pricing model selected');
      return;
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
          selected_product_id: selectedProductId,
          selected_pricing_model: selectedPricingModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Purchase failed');
        setIsProcessing(false);
        return;
      }

          // Success! Open tool URL from checkout metadata
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
  const hasProducts = checkout.metadata.products && checkout.metadata.products.length > 0;
  const activeProducts = checkout.metadata.products?.filter(p => p.is_active) || [];
  
  const getSelectedPrice = () => {
    if (!selectedProductId) return checkout.credit_amount || 0;
    
    const selectedProduct = checkout.metadata.products?.find(p => p.id === selectedProductId);
    if (!selectedProduct) return checkout.credit_amount || 0;
    
    const pricingModel = selectedProduct.pricing_model?.pricing_model;
    if (!pricingModel) return 0;
    
    // If a specific pricing model is selected, use that
    if (selectedPricingModel) {
      if (selectedPricingModel === 'one_time' && pricingModel.one_time?.enabled && pricingModel.one_time.price) {
        return pricingModel.one_time.price;
      }
      if (selectedPricingModel === 'subscription' && pricingModel.subscription?.enabled && pricingModel.subscription.price) {
        return pricingModel.subscription.price;
      }
      if (selectedPricingModel === 'usage_based' && pricingModel.usage_based?.enabled && pricingModel.usage_based.price_per_unit) {
        const pricePerUnit = pricingModel.usage_based.price_per_unit;
        const minimumUnits = pricingModel.usage_based.minimum_units || 1;
        return pricePerUnit * minimumUnits; // Calculate minimum purchase amount
      }
    }
    
    // Fallback: Use priority-based selection if no model explicitly selected
    if (pricingModel.one_time?.enabled && pricingModel.one_time.price) {
      return pricingModel.one_time.price;
    }
    if (pricingModel.subscription?.enabled && pricingModel.subscription.price) {
      return pricingModel.subscription.price;
    }
    if (pricingModel.usage_based?.enabled && pricingModel.usage_based.price_per_unit) {
      const pricePerUnit = pricingModel.usage_based.price_per_unit;
      const minimumUnits = pricingModel.usage_based.minimum_units || 1;
      return pricePerUnit * minimumUnits; // Calculate minimum purchase amount
    }
    return 0;
  };

  const selectedPrice = getSelectedPrice();
  const hasEnoughCredits = user && user.credits >= selectedPrice;
  const isCompleted = checkout.metadata.status === 'completed';
  const balanceAfter = user ? user.credits - selectedPrice : 0;
  
  // Check if selected pricing model is subscription
  const selectedProduct = checkout.metadata.products?.find(p => p.id === selectedProductId);
  const isSubscription = selectedPricingModel === 'subscription';
  const subscriptionPeriod = selectedProduct?.pricing_model?.pricing_model?.subscription?.interval || null;
  
  // Get the proper label for the selected pricing model
  const getPricingLabel = () => {
    if (!selectedPricingModel) return 'credits';
    
    if (selectedPricingModel === 'subscription' && subscriptionPeriod) {
      const intervalLabels: Record<string, string> = {
        'day': '/day',
        'week': '/wk',
        'month': '/mo',
        'year': '/yr',
      };
      return intervalLabels[subscriptionPeriod] || `/${subscriptionPeriod}`;
    }
    
    if (selectedPricingModel === 'usage_based') {
      const usageBased = selectedProduct?.pricing_model?.pricing_model?.usage_based;
      const unitName = usageBased?.unit_name || 'unit';
      const minimumUnits = usageBased?.minimum_units || 1;
      const pricePerUnit = usageBased?.price_per_unit || 0;
      
      // Show as "credits" for total (since we calculate minimum purchase)
      // but add details about the breakdown
      if (minimumUnits > 1) {
        return `credits (${minimumUnits} ${unitName}${minimumUnits > 1 ? 's' : ''} min @ ${pricePerUnit} each)`;
      }
      return `per ${unitName}`;
    }
    
    return 'credits'; // one_time
  };

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

                  {/* Product Selection */}
                  {hasProducts && !isCompleted && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#9ca3af]">Select Product</label>
                      
                      {activeProducts.map((product) => {
                        const pricingOptions = getAllEnabledPricingModels(product);
                        const hasMultiplePricing = pricingOptions.length > 1;
                        
                        // If only one pricing option, show as a single card
                        if (!hasMultiplePricing && pricingOptions.length === 1) {
                          const option = pricingOptions[0];
                          const isSelected = selectedProductId === product.id;
                          
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(product.id);
                                setSelectedPricingModel(option.type);
                              }}
                              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                  ? 'border-[#3ecf8e] bg-[#3ecf8e]/5 shadow-lg shadow-[#3ecf8e]/10'
                                  : 'border-[#374151] hover:border-[#4b5563] bg-[#0a0a0a]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-[#ededed] mb-1">{product.name}</div>
                                  <div className="text-xs text-[#9ca3af]">
                                    {product.description || option.description}
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-[#3ecf8e] ml-4">
                                  {option.price}
                                  <span className="text-xs text-[#9ca3af] ml-1">{option.label}</span>
                                </div>
                              </div>
                            </button>
                          );
                        }
                        
                        // Multiple pricing options - show nested selection
                        if (hasMultiplePricing) {
                          const isProductSelected = selectedProductId === product.id;
                          
                          return (
                            <div key={product.id} className="space-y-2">
                              {/* Product Header */}
                              <div className="font-semibold text-[#ededed] text-sm px-1">
                                {product.name}
                                {product.description && (
                                  <div className="text-xs text-[#9ca3af] font-normal mt-0.5">
                                    {product.description}
                                  </div>
                                )}
                              </div>
                              
                              {/* Pricing Options */}
                              <div className="space-y-2 pl-2">
                                {pricingOptions.map((option) => {
                                  const isSelected = isProductSelected && selectedPricingModel === option.type;
                                  
                                  return (
                                    <button
                                      key={`${product.id}-${option.type}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedProductId(product.id);
                                        setSelectedPricingModel(option.type);
                                      }}
                                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                        isSelected
                                          ? 'border-[#3ecf8e] bg-[#3ecf8e]/5'
                                          : 'border-[#374151] hover:border-[#4b5563] bg-[#0a0a0a]/20'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            isSelected ? 'border-[#3ecf8e]' : 'border-[#4b5563]'
                                          }`}>
                                            {isSelected && (
                                              <div className="w-2 h-2 rounded-full bg-[#3ecf8e]"></div>
                                            )}
                                          </div>
                                          <span className="text-sm text-[#ededed]">{option.description}</span>
                                        </div>
                                        <div className="text-base font-bold text-[#3ecf8e]">
                                          {option.price}
                                          <span className="text-xs text-[#9ca3af] ml-1">{option.label}</span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })}
                    </div>
                  )}
                  
                  {/* Legacy: Show message if no products */}
                  {!hasProducts && !isCompleted && (
                    <div className="space-y-3">
                      <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                          <div>
                            <p className="text-yellow-400 font-medium text-sm">No Products Available</p>
                            <p className="text-xs text-[#9ca3af] mt-1">
                              This tool has no products configured. Please contact support.
                            </p>
                          </div>
                        </div>
                      </div>
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
                    
                    {selectedProduct && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#9ca3af]">Product</span>
                        <span className="text-sm text-[#ededed]">
                          {selectedProduct.name}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-[#374151] pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-medium text-[#ededed]">Total</span>
                        <span className="text-2xl font-bold text-[#3ecf8e]">
                          {selectedPrice}
                          <span className="text-sm text-[#9ca3af] ml-1">
                            {getPricingLabel()}
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
                    disabled={(!hasEnoughCredits && !isCompleted) || isProcessing || (hasProducts && !selectedProductId && !isCompleted)}
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
                    ) : hasProducts && !selectedProductId ? (
                      <span>Select a Product</span>
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

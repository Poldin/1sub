'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Check, ExternalLink, Wrench, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PricingOption {
  enabled: boolean;
  price: number;
  description?: string;
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
  const [selectedPricing, setSelectedPricing] = useState<'one_time' | 'subscription_monthly' | 'subscription_yearly' | null>(null);

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

        // Auto-select pricing if only one option available or if already selected
        if (checkoutData.metadata.selected_pricing) {
          setSelectedPricing(checkoutData.metadata.selected_pricing as 'one_time' | 'subscription_monthly' | 'subscription_yearly');
        } else if (checkoutData.metadata.pricing_options) {
          const options = checkoutData.metadata.pricing_options;
          const enabledOptions = [
            options.one_time?.enabled && 'one_time',
            options.subscription_monthly?.enabled && 'subscription_monthly',
            options.subscription_yearly?.enabled && 'subscription_yearly',
          ].filter(Boolean);
          
          // Auto-select if only one option
          if (enabledOptions.length === 1) {
            setSelectedPricing(enabledOptions[0] as 'one_time' | 'subscription_monthly' | 'subscription_yearly');
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

    // For flexible pricing, ensure option is selected
    const hasPricingOptions = checkout.metadata.pricing_options && 
      Object.values(checkout.metadata.pricing_options).some(opt => opt?.enabled);
    
    if (hasPricingOptions && !selectedPricing) {
      setError('Please select a payment method');
      return;
    }

    // Get the selected price
    const selectedPrice = selectedPricing && checkout.metadata.pricing_options?.[selectedPricing]?.price || checkout.credit_amount || 0;

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
  const hasPricingOptions = checkout.metadata.pricing_options && 
    Object.values(checkout.metadata.pricing_options).some(opt => opt?.enabled);
  
  const getSelectedPrice = () => {
    if (hasPricingOptions && selectedPricing && checkout.metadata.pricing_options?.[selectedPricing]) {
      return checkout.metadata.pricing_options[selectedPricing].price;
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

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Subscription Badge */}
        {isSubscription && !isCompleted && (
          <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-400 p-2 rounded-lg">
                <span className="text-white text-lg">🔄</span>
              </div>
              <div>
                <p className="text-blue-400 font-medium">Subscription Tool</p>
                <p className="text-sm text-[#9ca3af] mt-1">
                  You&apos;ll be charged <span className="text-[#ededed] font-semibold">{checkout.credit_amount} credits</span> every {subscriptionPeriod}. You can cancel anytime from your profile.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completed Badge */}
        {isCompleted && (
          <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">Purchase Completed</p>
                <p className="text-sm text-[#9ca3af]">
                  Completed on {new Date(checkout.metadata.completed_at!).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl overflow-hidden border border-[#374151]/70">
          {/* Tool Preview */}
          <div className="bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] p-8 text-center">
            <div className="inline-block bg-white/20 p-4 rounded-full mb-4">
              <Wrench className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{checkout.metadata.tool_name}</h1>
            <p className="text-white/80">Confirm your purchase to access this tool</p>
          </div>

          {/* Purchase Details */}
          <div className="p-8 space-y-6">
            {/* Payment Method Selector - Show if multiple options available */}
            {hasPricingOptions && !isCompleted && (
              <div className="space-y-3">
                <h3 className="font-semibold text-[#ededed] mb-4">Payment Method</h3>
                
                {checkout.metadata.pricing_options?.one_time?.enabled && (
                  <button
                    type="button"
                    onClick={() => setSelectedPricing('one_time')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPricing === 'one_time'
                        ? 'border-[#3ecf8e] bg-[#3ecf8e]/10'
                        : 'border-[#374151] hover:border-[#4b5563]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#ededed]">One-time Payment</div>
                        <div className="text-sm text-[#9ca3af] mt-1">
                          {checkout.metadata.pricing_options.one_time.description || 'Lifetime access'}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#3ecf8e]">
                        {checkout.metadata.pricing_options.one_time.price} credits
                      </div>
                    </div>
                  </button>
                )}
                
                {checkout.metadata.pricing_options?.subscription_monthly?.enabled && (
                  <button
                    type="button"
                    onClick={() => setSelectedPricing('subscription_monthly')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPricing === 'subscription_monthly'
                        ? 'border-[#3ecf8e] bg-[#3ecf8e]/10'
                        : 'border-[#374151] hover:border-[#4b5563]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#ededed]">Monthly Subscription</div>
                        <div className="text-sm text-[#9ca3af] mt-1">
                          {checkout.metadata.pricing_options.subscription_monthly.description || 'Billed every month'}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#3ecf8e]">
                        {checkout.metadata.pricing_options.subscription_monthly.price} credits/mo
                      </div>
                    </div>
                  </button>
                )}
                
                {checkout.metadata.pricing_options?.subscription_yearly?.enabled && (
                  <button
                    type="button"
                    onClick={() => setSelectedPricing('subscription_yearly')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPricing === 'subscription_yearly'
                        ? 'border-[#3ecf8e] bg-[#3ecf8e]/10'
                        : 'border-[#374151] hover:border-[#4b5563]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#ededed]">Yearly Subscription</div>
                        <div className="text-sm text-[#9ca3af] mt-1">
                          {checkout.metadata.pricing_options.subscription_yearly.description || 'Best value - Billed every year'}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#3ecf8e]">
                        {checkout.metadata.pricing_options.subscription_yearly.price} credits/yr
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Purchase Summary */}
            <div className="bg-[#0a0a0a]/50 rounded-lg p-6 border border-[#374151]">
              <h3 className="font-semibold text-[#ededed] mb-4">Purchase Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">Tool Access:</span>
                  <span className="text-[#ededed] font-medium">{checkout.metadata.tool_name}</span>
                </div>
                
                {vendor && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9ca3af]">Vendor:</span>
                    <span className="text-[#ededed] font-medium">{vendor.full_name}</span>
                  </div>
                )}
                
                {hasPricingOptions && selectedPricing && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9ca3af]">Selected:</span>
                    <span className="text-[#ededed] font-medium">
                      {selectedPricing === 'one_time' ? 'One-time Payment' : 
                       selectedPricing === 'subscription_monthly' ? 'Monthly Subscription' : 
                       'Yearly Subscription'}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">Cost:</span>
                  <span className="text-[#3ecf8e] font-bold">
                    {selectedPrice} credits{isSubscription && subscriptionPeriod ? `/${subscriptionPeriod === 'monthly' ? 'mo' : 'yr'}` : ''}
                  </span>
                </div>
                
                <div className="border-t border-[#374151] pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9ca3af]">Your Balance:</span>
                    <span className="text-[#ededed] font-medium">{user?.credits.toFixed(2)} credits</span>
                  </div>
                  
                  {!isCompleted && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-[#9ca3af]">After Purchase:</span>
                      <span className={`font-bold ${hasEnoughCredits ? 'text-[#3ecf8e]' : 'text-red-400'}`}>
                        {balanceAfter.toFixed(2)} credits
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Insufficient Credits Warning */}
            {!hasEnoughCredits && !isCompleted && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium mb-2">Insufficient Credits</p>
                    <p className="text-sm text-[#9ca3af] mb-3">
                      You need {checkout.credit_amount} credits but only have {user?.credits.toFixed(2)} credits.
                    </p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="text-sm text-[#3ecf8e] hover:text-[#2dd4bf] font-medium underline"
                    >
                      Buy More Credits →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !isCompleted && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* What's Included */}
            <div className="space-y-3">
              <h4 className="font-semibold text-[#ededed]">What you get:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Check className="w-4 h-4 text-[#3ecf8e]" />
                  <span>Instant access to {checkout.metadata.tool_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Check className="w-4 h-4 text-[#3ecf8e]" />
                  <span>Secure and private connection</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Check className="w-4 h-4 text-[#3ecf8e]" />
                  <span>Transaction recorded in your history</span>
                </div>
                {vendor && (
                  <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                    <Check className="w-4 h-4 text-[#3ecf8e]" />
                    <span>Support vendor: {vendor.full_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => router.push('/backoffice')}
                className="flex-1 bg-[#374151] text-[#ededed] font-semibold py-4 px-6 rounded-lg hover:bg-[#4b5563] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={(!hasEnoughCredits && !isCompleted) || isProcessing || (hasPricingOptions && !selectedPricing && !isCompleted)}
                className="flex-1 bg-[#3ecf8e] text-black font-semibold py-4 px-6 rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : isCompleted ? (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Open Tool Again
                  </>
                ) : hasPricingOptions && !selectedPricing ? (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Select Payment Method
                  </>
                ) : isSubscription ? (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Subscribe & Launch ({selectedPrice} credits/{subscriptionPeriod === 'monthly' ? 'mo' : 'yr'})
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Confirm & Launch ({selectedPrice} credits)
                  </>
                )}
              </button>
            </div>

            {/* Checkout Info */}
            <div className="text-center text-xs text-[#9ca3af] pt-4 border-t border-[#374151]">
              Checkout ID: {checkout.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

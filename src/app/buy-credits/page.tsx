'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CreditCard, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentBalanceClient } from '@/lib/credits';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Credit packages with prices (in EUR)
const CREDIT_PACKAGES = [
  { key: '100', credits: 100, price: 10.00, name: 'Starter Pack', popular: false },
  { key: '500', credits: 500, price: 45.00, name: 'Pro Pack', popular: true, savings: '10% off' },
  { key: '1000', credits: 1000, price: 80.00, name: 'Enterprise Pack', popular: false, savings: '20% off' },
];

function BuyCreditsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const needed = parseInt(searchParams.get('needed') || '0');
  const toolId = searchParams.get('tool_id');
  const toolName = searchParams.get('tool_name');
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  // Fetch user data and credits on mount
  useEffect(() => {
    setLoading(true);
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();

        setUser({
          id: data.id,
          fullName: data.fullName || null,
          email: data.email || '',
        });

        // Fetch credits using the client-side function
        const userCredits = await getCurrentBalanceClient(data.id);
        if (userCredits !== null) {
          setCredits(userCredits);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router, success]); // Refetch on success

  const handlePurchase = async (packageKey: string) => {
    setProcessingPackage(packageKey);

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error initiating purchase:', error);
      alert(error instanceof Error ? error.message : 'Failed to initiate purchase. Please try again.');
    } finally {
      setProcessingPackage(null);
    }
  };

  // Calculate remaining credits needed (only if user was redirected for a specific tool)
  const remainingCredits = toolName ? Math.max(0, needed - credits) : 0;
  const hasEnoughCredits = toolName ? credits >= needed : true;

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Success Message */}
        {success && (
          <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <Check className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-green-400 mb-2">Purchase Successful!</h2>
                <p className="text-[#9ca3af]">
                  Your credits have been added to your account. Your new balance is{' '}
                  <span className="text-[#ededed] font-semibold">{credits} credits</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Canceled Message */}
        {canceled && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-yellow-400 mb-2">Purchase Canceled</h2>
                <p className="text-[#9ca3af]">
                  Your purchase was canceled. No charges were made to your account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Insufficient Credits Warning */}
        {toolName && loading && (
          <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-1"></div>
              <div>
                <h2 className="text-xl font-bold text-blue-400 mb-2">Loading Credits</h2>
                <p className="text-[#9ca3af]">Please wait while we check your credit balance...</p>
              </div>
            </div>
          </div>
        )}
        {toolName && !loading && !hasEnoughCredits && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-red-400 mb-2">Insufficient Credits</h2>
                <div className="space-y-2">
                  <p className="text-[#9ca3af]">
                    Current balance: <span className="text-[#ededed] font-semibold">{credits} credits</span>
                  </p>
                  <p className="text-[#9ca3af]">
                    You need <span className="text-[#ededed] font-semibold">{needed} credits</span> to access{' '}
                    <span className="text-[#3ecf8e] font-semibold">{decodeURIComponent(toolName)}</span>.
                  </p>
                  <p className="text-red-400 font-semibold">
                    You need to purchase <span className="text-[#ededed]">{remainingCredits} more credits</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl p-8 border border-[#374151]/70">
          <div className="text-center mb-8">
            <CreditCard className="w-16 h-16 text-[#3ecf8e] mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Buy Credits</h1>
            <p className="text-[#9ca3af]">
              Purchase credits to access premium tools and features
            </p>
            {!loading && (
              <p className="text-sm text-[#9ca3af] mt-2">
                Current balance: <span className="text-[#3ecf8e] font-semibold">{credits} credits</span>
              </p>
            )}
          </div>

          {/* Credit Packages */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-[#ededed]">Choose a Package</h3>
            {toolName && !hasEnoughCredits && (
              <p className="text-sm text-[#9ca3af] mb-4">
                You need <span className="text-[#3ecf8e] font-semibold">{remainingCredits} more credits</span> to access{' '}
                <span className="text-[#3ecf8e] font-semibold">{decodeURIComponent(toolName)}</span>. Choose a package
                that covers your needs:
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.key}
                  className={`bg-[#0a0a0a]/50 border ${
                    pkg.popular ? 'border-[#3ecf8e]' : 'border-[#374151]'
                  } rounded-lg p-6 relative`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#3ecf8e] text-black px-3 py-1 rounded-full text-xs font-bold">
                      POPULAR
                    </div>
                  )}
                  <div className="text-2xl font-bold text-[#3ecf8e] mb-2">{pkg.credits} credits</div>
                  <div className="text-sm text-[#9ca3af] mb-3">{pkg.name}</div>
                  {pkg.savings && (
                    <div className="text-xs text-[#3ecf8e] mb-3 font-semibold">{pkg.savings}</div>
                  )}
                  <div className="text-xl font-bold text-[#ededed] mb-4">€{pkg.price.toFixed(2)}</div>
                  <button
                    onClick={() => handlePurchase(pkg.key)}
                    disabled={processingPackage !== null}
                    className={`w-full ${
                      pkg.popular ? 'bg-[#3ecf8e] hover:bg-[#2dd4bf]' : 'bg-[#374151] hover:bg-[#4b5563]'
                    } ${
                      processingPackage === pkg.key ? 'opacity-75 cursor-wait' : ''
                    } text-${
                      pkg.popular ? 'black' : '[#ededed]'
                    } px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2`}
                  >
                    {processingPackage === pkg.key ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Purchase'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="bg-[#0a0a0a]/30 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-[#ededed] mb-4">What you get:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                <span className="text-[#9ca3af]">
                  Access to all premium tools and features
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                <span className="text-[#9ca3af]">Credits never expire</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                <span className="text-[#9ca3af]">Secure payment via Stripe</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                <span className="text-[#9ca3af]">Instant credit delivery</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push('/backoffice')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#374151] text-[#ededed] px-6 py-3 rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BuyCreditsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
            <p className="mt-4 text-[#9ca3af]">Loading...</p>
          </div>
        </div>
      }
    >
      <BuyCreditsContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { Check, Loader2, CheckCircle, XCircle, Settings, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import PricingFAQ from '../components/PricingFAQ';
import Footer from '../components/Footer';
import TopUpCredits from '../components/TopUpCredits';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

// Component that uses searchParams - must be wrapped in Suspense
function SearchParamsHandler({ 
  setShowSuccessMessage, 
  setShowCanceledMessage 
}: { 
  setShowSuccessMessage: (show: boolean) => void;
  setShowCanceledMessage: (show: boolean) => void;
}) {
  const searchParams = useSearchParams();

  // Handle success/canceled messages from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setShowSuccessMessage(true);
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
      // Clean up URL
      window.history.replaceState({}, '', '/pricing');
    }

    if (canceled === 'true') {
      setShowCanceledMessage(true);
      // Hide message after 5 seconds
      setTimeout(() => setShowCanceledMessage(false), 5000);
      // Clean up URL
      window.history.replaceState({}, '', '/pricing');
    }
  }, [searchParams, setShowSuccessMessage, setShowCanceledMessage]);

  return null;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  billing_period: 'monthly' | 'yearly';
  credits_per_period: number;
  stripe_subscription_id: string;
  current_period_end: string;
}

function PricingContent() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCanceledMessage, setShowCanceledMessage] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [showPortalDialog, setShowPortalDialog] = useState(false);
  
  // Get auth state and user info from context
  const { isLoggedIn, userInfo, creditsLoading } = useAuth();

  // Fetch user's current subscription
  useEffect(() => {
    async function fetchSubscription() {
      if (!isLoggedIn) {
        setLoadingSubscription(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('platform_subscriptions')
          .select('*')
          .in('status', ['active', 'trialing', 'past_due', 'paused'])
          .single();

        if (!error && data) {
          setCurrentSubscription(data as UserSubscription);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    }

    fetchSubscription();
  }, [isLoggedIn]);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for trying out our platform',
      monthlyPrice: 9,
      yearlyPrice: 99,
      creditsPerMonth: 8,
      yearlyCredits: 96,
      features: [
        'Access to all tools',
        '8 credits/month (monthly)',
        '96 credits/year (yearly)',
        'Credits never expire',
        'Cancel anytime',
        'Email support'
      ],
      popular: false,
      cta: 'Get Started'
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Most popular for professionals',
      monthlyPrice: 29,
      yearlyPrice: 299,
      creditsPerMonth: 29,
      yearlyCredits: 348,
      features: [
        'Everything in Starter',
        '29 credits/month (monthly)',
        '348 credits/year (yearly)',
        'Priority support',
        'Early access to new tools',
        'Custom integrations',
        'Advanced analytics'
      ],
      popular: true,
      cta: 'Start Pro'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For teams and heavy users',
      monthlyPrice: null,
      yearlyPrice: null,
      creditsPerMonth: null,
      yearlyCredits: null,
      features: [
        'Everything in Pro',
        'Custom credit allocation',
        'Unlimited seats',
        'Dedicated account manager',
        'Team collaboration features',
        'Custom billing',
        'API access',
        '24/7 phone support',
        'SLA guarantee'
      ],
      popular: false,
      cta: 'Contact Sales',
      isEnterprise: true
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (!plan.monthlyPrice || !plan.yearlyPrice) {
      return { amount: 0, percentage: 0 };
    }
    const yearlyMonthly = plan.monthlyPrice * 12;
    const savings = yearlyMonthly - plan.yearlyPrice;
    const percentage = Math.round((savings / yearlyMonthly) * 100);
    return { amount: savings, percentage };
  };

  const handleCreateSubscription = async (planId: string, plan: typeof plans[0]) => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }

    // Enterprise plan: redirect to contact
    if (plan.isEnterprise) {
      window.location.href = 'mailto:sales@1sub.io';
      return;
    }

    if (currentSubscription) {
      alert('You already have an active subscription. Please manage it using the Billing Portal.');
      return;
    }

    setCreatingSubscription(true);

    try {
      const response = await fetch('/api/subscriptions/create-platform-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert(error instanceof Error ? error.message : 'Failed to create subscription');
    } finally {
      setCreatingSubscription(false);
    }
  };

  const handleManageSubscription = () => {
    setShowPortalDialog(true);
  };

  const handleConfirmPortalOpen = async () => {
    setShowPortalDialog(false);
    setLoadingPortal(true);

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      // Open Stripe Billing Portal in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert(error instanceof Error ? error.message : 'Failed to open billing portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <Suspense fallback={null}>
        <SearchParamsHandler 
          setShowSuccessMessage={setShowSuccessMessage}
          setShowCanceledMessage={setShowCanceledMessage}
        />
      </Suspense>

      <Header />

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 backdrop-blur text-white px-6 py-4 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm opacity-90">Your credits have been added to your account</p>
            </div>
          </div>
        </div>
      )}

      {/* Canceled Message */}
      {showCanceledMessage && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-500/90 backdrop-blur text-white px-6 py-4 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Payment Canceled</p>
              <p className="text-sm opacity-90">No charges were made to your account</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            simple, transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf]">pricing</span>
          </h1>
          <p className="text-xl text-[#d1d5db] mb-8">
            One subscription. Countless tools. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-[#1f2937] border border-[#374151] rounded-full p-1.5">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-[#3ecf8e] text-black'
                  : 'text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-[#3ecf8e] text-black'
                  : 'text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-[#3ecf8e] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                SAVE 15%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const price = getPrice(plan);
              const savings = billingPeriod === 'yearly' ? getSavings(plan) : null;

              return (
                <div
                  key={index}
                  className={`relative rounded-2xl p-8 transition-all duration-300 flex flex-col ${
                    plan.popular
                      ? 'bg-gradient-to-br from-[#3ecf8e]/20 to-[#2dd4bf]/10 border-2 border-[#3ecf8e] scale-105 shadow-2xl shadow-[#3ecf8e]/20'
                      : 'bg-[#1f2937] border-2 border-[#374151] hover:border-[#3ecf8e]/50'
                  }`}
                >

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-sm text-[#9ca3af]">{plan.description}</p>
                    {currentSubscription?.plan_id === plan.id && (
                      <span className="inline-block mt-2 bg-[#3ecf8e]/20 text-[#3ecf8e] text-xs font-semibold px-3 py-1 rounded-full">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <div className="text-center mb-6">
                    {plan.isEnterprise ? (
                      <div className="py-3">
                        <span className="text-3xl font-bold text-[#3ecf8e]">Custom</span>
                        <p className="text-sm text-[#d1d5db] mt-2">
                          Tailored to your needs
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-[#3ecf8e]">€{price}</span>
                          <span className="text-[#9ca3af]">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>
                        {billingPeriod === 'yearly' && savings && (
                          <p className="text-xs text-[#3ecf8e] mt-1">
                            Save €{Math.round(savings.amount)}/year ({savings.percentage}%)
                          </p>
                        )}
                        <p className="text-sm text-[#d1d5db] mt-2 font-semibold">
                          {billingPeriod === 'monthly' ? plan.creditsPerMonth : plan.yearlyCredits} credits
                        </p>
                      </>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[#d1d5db]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.isEnterprise ? (
                    <a
                      href="mailto:sales@1sub.io"
                      className="block w-full py-3 rounded-xl font-bold text-center transition-all bg-[#374151] text-[#ededed] hover:bg-[#4B5563]"
                    >
                      {plan.cta}
                    </a>
                  ) : isLoggedIn && currentSubscription ? (
                    // User has an active subscription - hide CTA button
                    null
                  ) : isLoggedIn ? (
                    <button
                      onClick={() => handleCreateSubscription(plan.id, plan)}
                      disabled={creatingSubscription}
                      className={`block w-full py-3 rounded-xl font-bold text-center transition-all disabled:opacity-50 ${
                        plan.popular
                          ? 'bg-[#3ecf8e] text-black hover:bg-[#2dd4bf] shadow-lg shadow-[#3ecf8e]/30'
                          : 'bg-[#374151] text-[#ededed] hover:bg-[#4B5563]'
                      }`}
                    >
                      {creatingSubscription ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        plan.cta
                      )}
                    </button>
                  ) : (
                    <a
                      href="/login"
                      className={`block w-full py-3 rounded-xl font-bold text-center transition-all ${
                        plan.popular
                          ? 'bg-[#3ecf8e] text-black hover:bg-[#2dd4bf] shadow-lg shadow-[#3ecf8e]/30'
                          : 'bg-[#374151] text-[#ededed] hover:bg-[#4B5563]'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* User Info Section - Only show if logged in */}
          {isLoggedIn && userInfo && (
            <div className="mt-16 mb-16 max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-4 items-start">
                {/* User Info - Left Side */}
                <div className="text-left pl-6">
                  <h2 className="text-2xl font-bold text-[#ededed] mb-1">{userInfo.fullName}</h2>
                  <p className="text-[#9ca3af] mb-4">{userInfo.email}</p>
                  
                  {/* Current Subscription Status */}
                  {loadingSubscription ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className="w-4 h-4 text-[#3ecf8e] animate-spin" />
                      <span className="text-sm text-[#9ca3af]">Loading subscription...</span>
                    </div>
                  ) : currentSubscription ? (
                    <div className="mb-4">
                      <p className="text-xs text-[#9ca3af] uppercase tracking-wide mb-1">Your Plan</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xl font-bold text-[#ededed] capitalize">
                          {currentSubscription.plan_id}
                        </p>
                        <span className="text-xs bg-[#3ecf8e]/20 text-[#3ecf8e] px-2 py-1 rounded font-medium uppercase">
                          {currentSubscription.billing_period === 'yearly' ? 'Annual' : 'Monthly'}
                        </span>
                        <button
                          onClick={handleManageSubscription}
                          disabled={loadingPortal}
                          className="inline-flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
                        >
                          {loadingPortal ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Opening portal...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3.5 h-3.5" />
                              Manage Plan
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  
                  <p className="text-xs text-[#9ca3af] uppercase tracking-wide mb-1">Your Credits</p>
                  <div className="flex items-center gap-2">
                    {creditsLoading ? (
                      <Loader2 className="w-5 h-5 text-[#3ecf8e] animate-spin" />
                    ) : (
                      <p className="text-xl font-bold text-[#3ecf8e]">
                        {userInfo.credits !== null ? `${userInfo.credits.toFixed(2)} CR` : 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Top Up Credits Component - Right Side */}
                <div className="pr-6">
                  <TopUpCredits 
                    className="w-full max-w-md" 
                    hasSubscription={!!currentSubscription}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Credit System Explanation */}
          <div className="mt-16 max-w-3xl mx-auto bg-[#1f2937] border border-[#374151] rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">How Credits Work</h3>
            <p className="text-[#d1d5db] mb-4">
              <strong className="text-[#3ecf8e]">1 credit = €1 = 1 CR</strong>
            </p>
            <p className="text-[#9ca3af] text-sm leading-relaxed">
              Use your credits across any tool in our platform. Credits never expire, and you can cancel your subscription anytime. 
              Any unused credits remain in your account even after cancellation.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <PricingFAQ />

      {/* CTA Section - Only show when not logged in */}
      {!isLoggedIn && (
        <section className="py-20 px-4 bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-xl text-[#d1d5db] mb-8">
              Join thousands of users already using 1sub
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold bg-[#3ecf8e] text-black rounded-full hover:bg-[#2dd4bf] transition-all hover:scale-105 shadow-lg shadow-[#3ecf8e]/30"
            >
              Get Started Now
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </section>
      )}

      <Footer />

      {/* Portal Warning Dialog */}
      {showPortalDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#ededed] mb-2">
                  Opening Developer Portal
                </h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed">
                  You're about to be redirected to the Stripe Customer Portal in a new tab where you can manage your subscription, update payment methods, and view billing history.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPortalDialog(false)}
                className="flex-1 px-4 py-3 rounded-lg font-semibold bg-[#374151] text-[#ededed] hover:bg-[#4b5563] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPortalOpen}
                className="flex-1 px-4 py-3 rounded-lg font-semibold bg-[#3ecf8e] text-black hover:bg-[#2dd4bf] transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  return <PricingContent />;
}

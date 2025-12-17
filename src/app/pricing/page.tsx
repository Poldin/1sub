'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import PricingFAQ from '../components/PricingFAQ';
import Footer from '../components/Footer';
import TopUpCredits from '../components/TopUpCredits';
import { useAuth } from '@/contexts/AuthContext';

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCanceledMessage, setShowCanceledMessage] = useState(false);
  const searchParams = useSearchParams();
  
  // Get auth state and user info from context
  const { isLoggedIn, userInfo, creditsLoading } = useAuth();

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
  }, [searchParams]);

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for trying out our platform',
      monthlyPrice: 9,
      yearlyPrice: 99,
      credits: billingPeriod === 'monthly' ? 8 : 96,
      features: [
        'Access to all tools',
        '8 credits/month (monthly)',
        '96 credits/year (yearly)',
        'Credits never expire',
        'Cancel anytime',
        'Email support'
      ],
      highlight: false,
      cta: 'Get Started'
    },
    {
      name: 'Pro',
      description: 'Most popular for professionals',
      monthlyPrice: 29,
      yearlyPrice: 299,
      credits: billingPeriod === 'monthly' ? 29 : 348,
      features: [
        'Everything in Starter',
        '29 credits/month (monthly)',
        '348 credits/year (yearly)',
        'Priority support',
        'Early access to new tools',
        'Custom integrations',
        'Advanced analytics'
      ],
      highlight: true,
      cta: 'Start Pro'
    },
    {
      name: 'Enterprise',
      description: 'For teams and heavy users',
      monthlyPrice: null,
      yearlyPrice: null,
      credits: null,
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
      highlight: false,
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
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
          {/* User Info Section - Only show if logged in */}
          {isLoggedIn && userInfo && (
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#ededed] mb-1">{userInfo.fullName}</h2>
                <p className="text-[#9ca3af] mb-2">{userInfo.email}</p>
                <div className="flex items-center justify-center gap-2">
                  {creditsLoading ? (
                    <Loader2 className="w-5 h-5 text-[#3ecf8e] animate-spin" />
                  ) : (
                    <p className="text-xl font-bold text-[#3ecf8e]">
                      {userInfo.credits !== null ? `${userInfo.credits} CR` : 'N/A'}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Top Up Credits Component */}
              <TopUpCredits className="max-w-2xl mx-auto" />
            </div>
          )}
          
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple, Transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf]">Pricing</span>
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
                    plan.highlight
                      ? 'bg-gradient-to-br from-[#3ecf8e]/20 to-[#2dd4bf]/10 border-2 border-[#3ecf8e] scale-105 shadow-2xl shadow-[#3ecf8e]/20'
                      : 'bg-[#1f2937] border-2 border-[#374151] hover:border-[#3ecf8e]/50'
                  }`}
                >

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-sm text-[#9ca3af]">{plan.description}</p>
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
                          {plan.credits} credits
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

                  <a
                    href={plan.isEnterprise ? 'mailto:sales@1sub.io' : (isLoggedIn ? '/backoffice' : '/login')}
                    className={`block w-full py-3 rounded-xl font-bold text-center transition-all ${
                      plan.highlight
                        ? 'bg-[#3ecf8e] text-black hover:bg-[#2dd4bf] shadow-lg shadow-[#3ecf8e]/30'
                        : 'bg-[#374151] text-[#ededed] hover:bg-[#4B5563]'
                    }`}
                  >
                    {plan.isEnterprise ? plan.cta : (isLoggedIn ? 'Enter!' : plan.cta)}
                  </a>
                </div>
              );
            })}
          </div>

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

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-[#d1d5db] mb-8">
            Join thousands of users already using 1sub
          </p>
          <a
            href={isLoggedIn ? "/backoffice" : "/login"}
            className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold bg-[#3ecf8e] text-black rounded-full hover:bg-[#2dd4bf] transition-all hover:scale-105 shadow-lg shadow-[#3ecf8e]/30"
          >
            {isLoggedIn ? "Enter!" : "Get Started Now"}
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}


'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, ArrowLeft, Zap } from 'lucide-react';
import { PLATFORM_PLANS, PlatformSubscriptionPlan } from '@/lib/subscription-plans';
import { createClient } from '@/lib/supabase/client';

type BillingPeriod = 'monthly' | 'yearly';

function SubscribePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{
    plan_id: string;
    billing_period: BillingPeriod;
  } | null>(null);

  // Get recommended plan from URL params
  const recommendedPlan = searchParams.get('plan');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (error || !authUser) {
          router.push('/login?redirect=/subscribe');
          return;
        }

        setUser({ id: authUser.id, email: authUser.email || '' });

        // Check if user already has a platform subscription
        const { data: subscription } = await supabase
          .from('platform_subscriptions')
          .select('plan_id, billing_period, status')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .single();

        if (subscription) {
          setCurrentSubscription({
            plan_id: subscription.plan_id,
            billing_period: subscription.billing_period as BillingPeriod,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSubscribe = async (plan: PlatformSubscriptionPlan) => {
    if (!user) {
      router.push('/login?redirect=/subscribe');
      return;
    }

    setProcessingPlan(plan.id);
    setLoading(true);

    try {
      // Check if user has an active subscription
      if (currentSubscription) {
        // User has existing subscription - call change-platform-plan API
        const response = await fetch('/api/subscriptions/change-platform-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetPlanId: plan.id,
            billingPeriod,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to change plan');
        }

        const result = await response.json();
        
        // Show success message and reload page to reflect changes
        alert(result.message || 'Plan changed successfully!');
        window.location.reload();
        return;
      }

      // No existing subscription - create new subscription via Stripe Checkout
      const response = await fetch('/api/subscriptions/create-platform-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingPeriod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create subscription');
      }

      const { checkoutUrl } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;

    } catch (error) {
      console.error('Error with subscription:', error);
      alert(error instanceof Error ? error.message : 'Failed to process subscription. Please try again.');
      setProcessingPlan(null);
      setLoading(false);
    }
  };

  const getPriceDisplay = (plan: PlatformSubscriptionPlan) => {
    if (billingPeriod === 'monthly') {
      return {
        price: plan.price,
        period: '/month',
        savings: null,
      };
    } else {
      const monthlyEquivalent = plan.yearlyPrice / 12;
      const savingsPercent = Math.round(((plan.price * 12 - plan.yearlyPrice) / (plan.price * 12)) * 100);
      return {
        price: monthlyEquivalent,
        period: '/month',
        savings: `Save ${savingsPercent}% yearly`,
      };
    }
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
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[#9ca3af] hover:text-[#ededed] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-[#3ecf8e]" />
            <span className="text-sm text-[#3ecf8e] font-semibold">Recurring Credits</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Choose a Plan, Get <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf]">Credits</span> Every Month
          </h1>
          <p className="text-xl text-[#9ca3af] max-w-2xl mx-auto mb-6">
            Subscribe and receive credits automatically each billing cycle. Use them on any tool, anytime.
          </p>
          
          {/* How Credits Work - Quick Explainer */}
          <div className="max-w-3xl mx-auto bg-[#1f2937]/50 border border-[#374151] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#ededed] mb-3">How Credits Work</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center text-center">
                <div className="bg-[#3ecf8e]/10 p-3 rounded-full mb-2">
                  <Check className="w-5 h-5 text-[#3ecf8e]" />
                </div>
                <p className="text-[#d1d5db]">1 credit = 1 unit of usage across all tools</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-[#3ecf8e]/10 p-3 rounded-full mb-2">
                  <Check className="w-5 h-5 text-[#3ecf8e]" />
                </div>
                <p className="text-[#d1d5db]">Credits refresh automatically each month</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-[#3ecf8e]/10 p-3 rounded-full mb-2">
                  <Check className="w-5 h-5 text-[#3ecf8e]" />
                </div>
                <p className="text-[#d1d5db]">Unused credits roll over to next period</p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-1 inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-[#3ecf8e] text-black'
                  : 'text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-[#3ecf8e] text-black'
                  : 'text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        {/* Current Subscription Notice */}
        {currentSubscription && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-4">
              <p className="text-blue-400 text-center">
                You currently have the <span className="font-semibold">{currentSubscription.plan_id}</span> plan (
                {currentSubscription.billing_period}). Select a different plan below to upgrade, downgrade, or change your billing period.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PLATFORM_PLANS.map((plan) => {
            const { price, period, savings } = getPriceDisplay(plan);
            const isRecommended = plan.id === recommendedPlan;
            const isCurrent = currentSubscription?.plan_id === plan.id && currentSubscription?.billing_period === billingPeriod;
            const isProcessing = processingPlan === plan.id;
            
            // Determine change type for UI display
            let changeType: 'none' | 'upgrade' | 'downgrade' | 'interval_change' = 'none';
            if (currentSubscription) {
              if (currentSubscription.plan_id === plan.id && currentSubscription.billing_period !== billingPeriod) {
                changeType = 'interval_change';
              } else {
                const currentPlan = PLATFORM_PLANS.find(p => p.id === currentSubscription.plan_id);
                if (currentPlan) {
                  if (plan.creditsPerMonth > currentPlan.creditsPerMonth) {
                    changeType = 'upgrade';
                  } else if (plan.creditsPerMonth < currentPlan.creditsPerMonth) {
                    changeType = 'downgrade';
                  }
                }
              }
            }

            return (
              <div
                key={plan.id}
                className={`relative bg-[#1f2937] border rounded-2xl p-6 transition-all ${
                  plan.popular || isRecommended
                    ? 'border-[#3ecf8e] shadow-lg shadow-[#3ecf8e]/20 scale-105'
                    : 'border-[#374151] hover:border-[#3ecf8e]/50'
                }`}
              >
                {/* Popular Badge */}
                {(plan.popular || isRecommended) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black text-xs font-bold px-3 py-1 rounded-full">
                      {isRecommended ? 'RECOMMENDED' : 'POPULAR'}
                    </span>
                  </div>
                )}

                {/* Current Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-[#ededed] mb-2">{plan.name}</h3>
                  <p className="text-sm text-[#9ca3af] mb-3">{plan.description}</p>
                  {/* Credits Highlight */}
                  <div className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg px-3 py-2">
                    <p className="text-[#3ecf8e] font-bold text-lg">
                      {plan.creditsPerMonth} credits/{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </p>
                    <p className="text-xs text-[#9ca3af]">≈ €{(billingPeriod === 'monthly' ? plan.price / plan.creditsPerMonth : plan.yearlyPrice / 12 / plan.creditsPerMonth).toFixed(2)} per credit</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#ededed]">€{price.toFixed(0)}</span>
                    <span className="text-[#9ca3af]">{period}</span>
                  </div>
                  {savings && (
                    <p className="text-sm text-[#3ecf8e] font-semibold mt-1">{savings}</p>
                  )}
                  {billingPeriod === 'yearly' && (
                    <p className="text-xs text-[#9ca3af] mt-1">
                      Billed €{plan.yearlyPrice} annually
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[#d1d5db]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Helper text for plan changes */}
                {!isCurrent && changeType !== 'none' && (
                  <div className="mb-3">
                    <p className="text-xs text-[#9ca3af] text-center">
                      {changeType === 'upgrade' && '💡 New price applies from your next billing cycle'}
                      {changeType === 'downgrade' && '💡 Downgrade takes effect at the end of your current period'}
                      {changeType === 'interval_change' && '💡 Billing interval changes from your next cycle'}
                    </p>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading || isCurrent}
                  className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-[#374151] text-[#9ca3af] cursor-not-allowed'
                      : plan.popular || isRecommended
                      ? 'bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black hover:opacity-90'
                      : 'bg-[#374151] text-[#ededed] hover:bg-[#4b5563]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : changeType === 'upgrade' ? (
                    `Upgrade to ${plan.name}`
                  ) : changeType === 'downgrade' ? (
                    `Downgrade to ${plan.name}`
                  ) : changeType === 'interval_change' ? (
                    'Change Billing Period'
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[#ededed] mb-2">How do credits work?</h4>
                <p className="text-[#9ca3af] text-sm">
                  Credits are automatically added to your account each billing cycle. Use them to access any tool on the platform. 
                  Unused credits roll over to the next month!
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#ededed] mb-2">Can I cancel anytime?</h4>
                <p className="text-[#9ca3af] text-sm">
                  Yes! Cancel anytime from your profile. You&apos;ll keep your remaining credits until the end of your billing period.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#ededed] mb-2">What if I need more credits?</h4>
                <p className="text-[#9ca3af] text-sm">
                  You can purchase additional credits anytime, or upgrade your plan for more monthly credits and overdraft protection.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#ededed] mb-2">What&apos;s overdraft protection?</h4>
                <p className="text-[#9ca3af] text-sm">
                  Higher-tier plans allow you to go negative on credits temporarily. You&apos;ll be charged at the next billing cycle to cover the overdraft.
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block h-12 w-12 animate-spin text-[#3ecf8e] mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <SubscribePageContent />
    </Suspense>
  );
}


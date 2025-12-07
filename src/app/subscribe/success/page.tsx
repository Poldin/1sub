'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, ExternalLink } from 'lucide-react';

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{
    planName: string;
    creditsPerMonth: number;
    billingPeriod: string;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    // Poll for subscription activation
    // The webhook might take a few seconds to process
    const checkSubscription = async () => {
      try {
        const response = await fetch(`/api/subscriptions/check-activation?session_id=${sessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.activated) {
            setSubscriptionData({
              planName: data.planName,
              creditsPerMonth: data.creditsPerMonth,
              billingPeriod: data.billingPeriod,
            });
            setLoading(false);
          } else {
            // Still processing, check again in 2 seconds
            setTimeout(checkSubscription, 2000);
          }
        } else {
          // Keep trying for up to 30 seconds
          setTimeout(checkSubscription, 2000);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setTimeout(checkSubscription, 2000);
      }
    };

    // Start checking after 1 second
    setTimeout(checkSubscription, 1000);

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError(null); // Show success anyway, webhook might still be processing
        setSubscriptionData({
          planName: 'Your Plan',
          creditsPerMonth: 0,
          billingPeriod: 'monthly',
        });
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [sessionId, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block h-12 w-12 animate-spin text-[#3ecf8e] mb-4" />
          <h2 className="text-xl font-semibold mb-2">Activating your subscription...</h2>
          <p className="text-[#9ca3af]">This will only take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Subscription Error</h2>
            <p className="text-[#9ca3af]">{error}</p>
          </div>
          <button
            onClick={() => router.push('/subscribe')}
            className="bg-[#3ecf8e] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#2dd4bf]"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

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
              Subscription Activated!
            </h2>
            <p className="text-[#9ca3af]">
              Welcome to the {subscriptionData?.planName || 'platform'}! Your monthly credits are now active.
            </p>
          </div>

          {/* Subscription Details */}
          {subscriptionData && (
            <div className="bg-[#0a0a0a]/50 rounded-lg p-4 mb-6 border border-[#374151] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Plan:</span>
                <span className="text-[#ededed] font-semibold">{subscriptionData.planName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Monthly Credits:</span>
                <span className="text-[#3ecf8e] font-semibold text-lg">{subscriptionData.creditsPerMonth} credits</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Billing:</span>
                <span className="text-[#ededed] font-semibold capitalize">{subscriptionData.billingPeriod}</span>
              </div>
              <div className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded p-3 mt-3">
                <p className="text-xs text-[#d1d5db]">
                  💡 Your credits refresh automatically each {subscriptionData.billingPeriod === 'monthly' ? 'month' : 'year'}. 
                  Unused credits roll over to the next period!
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/backoffice')}
              className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black px-6 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-[#374151] text-[#ededed] px-6 py-4 rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
            >
              Manage Subscription
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-[#9ca3af] text-center mt-6">
            Your subscription will automatically renew. You can cancel anytime from your profile.
          </p>
        </div>

        {/* Help */}
        <div className="mt-4 text-center">
          <p className="text-sm text-[#9ca3af]">
            Need help?{' '}
            <button 
              onClick={() => router.push('/support')}
              className="text-[#3ecf8e] hover:underline"
            >
              Contact support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block h-12 w-12 animate-spin text-[#3ecf8e] mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Calendar, DollarSign, AlertCircle, Check, Loader2, ExternalLink, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getPlanById } from '@/lib/subscription-plans';
import { getCurrentBalanceClient } from '@/lib/credits';

interface PlatformSubscription {
  id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  credits_per_period: number;
  max_overdraft: number;
  current_period_end: string;
  next_billing_date: string;
  created_at: string;
  stripe_subscription_id: string;
}

interface ToolSubscription {
  id: string;
  tool_id: string;
  status: string;
  credit_price: number;
  billing_period: string;
  next_billing_date: string;
  created_at: string;
  metadata: {
    tool_name?: string;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [credits, setCredits] = useState(0);
  const [platformSub, setPlatformSub] = useState<PlatformSubscription | null>(null);
  const [toolSubs, setToolSubs] = useState<ToolSubscription[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          router.push('/login');
          return;
        }

        // Fetch user profile
        const response = await fetch('/api/user/profile');
        if (!response.ok) throw new Error('Failed to fetch user profile');
        const userData = await response.json();

        setUser({
          id: authUser.id,
          email: authUser.email || '',
          fullName: userData.fullName || '',
        });

        // Fetch credits
        const userCredits = await getCurrentBalanceClient(authUser.id);
        if (userCredits !== null) {
          setCredits(userCredits);
        }

        // Fetch platform subscription
        const { data: platformData } = await supabase
          .from('platform_subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .single();

        if (platformData) {
          setPlatformSub(platformData as PlatformSubscription);
        }

        // Fetch tool subscriptions
        const { data: toolData } = await supabase
          .from('tool_subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (toolData) {
          setToolSubs(toolData as ToolSubscription[]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleCancelPlatformSubscription = async () => {
    if (!platformSub || !confirm('Are you sure you want to cancel your platform subscription? You will lose access to recurring credits at the end of this billing period.')) {
      return;
    }

    setCancellingId('platform');
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/manage-platform-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          subscriptionId: platformSub.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Refresh platform subscription
      const supabase = createClient();
      const { data: updatedSub } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .eq('id', platformSub.id)
        .single();

      if (updatedSub) {
        setPlatformSub(updatedSub as PlatformSubscription);
      } else {
        setPlatformSub(null);
      }

      alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelToolSubscription = async (subscription: ToolSubscription) => {
    if (!confirm(`Are you sure you want to cancel your subscription to ${subscription.metadata?.tool_name || 'this tool'}?`)) {
      return;
    }

    setCancellingId(subscription.id);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Remove from list
      setToolSubs(prev => prev.filter(sub => sub.id !== subscription.id));

      alert('Tool subscription cancelled successfully.');
    } catch (err) {
      console.error('Error cancelling tool subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block h-8 w-8 animate-spin text-[#3ecf8e] mb-4" />
          <p className="text-[#9ca3af]">Loading profile...</p>
        </div>
      </div>
    );
  }

  const plan = platformSub ? getPlanById(platformSub.plan_id) : null;

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
      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Error Message */}
        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-[#9ca3af] text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Profile</h1>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#9ca3af]">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            {user?.fullName && (
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Name:</span>
                <span className="font-medium">{user.fullName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[#9ca3af]">Current Balance:</span>
              <span className="text-[#3ecf8e] font-semibold text-lg">{credits.toFixed(2)} credits</span>
            </div>
          </div>
        </div>

        {/* Platform Subscription */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Platform Subscription</h2>
          
          {platformSub ? (
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#ededed] mb-1">
                    {plan?.name || platformSub.plan_id} Plan
                  </h3>
                  <p className="text-sm text-[#9ca3af]">{plan?.description || ''}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  platformSub.status === 'active' ? 'bg-green-400/20 text-green-400' :
                  platformSub.status === 'past_due' ? 'bg-yellow-400/20 text-yellow-400' :
                  'bg-gray-400/20 text-gray-400'
                }`}>
                  {platformSub.status}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#374151]">
                  <div className="flex items-center gap-2 text-[#9ca3af] text-sm mb-2">
                    <CreditCard className="w-4 h-4" />
                    Credits
                  </div>
                  <p className="text-lg font-semibold text-[#ededed]">
                    {platformSub.credits_per_period} / {platformSub.billing_period === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
                <div className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#374151]">
                  <div className="flex items-center gap-2 text-[#9ca3af] text-sm mb-2">
                    <Calendar className="w-4 h-4" />
                    Next Billing
                  </div>
                  <p className="text-lg font-semibold text-[#ededed]">
                    {new Date(platformSub.next_billing_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#374151]">
                  <div className="flex items-center gap-2 text-[#9ca3af] text-sm mb-2">
                    <Shield className="w-4 h-4" />
                    Overdraft
                  </div>
                  <p className="text-lg font-semibold text-[#ededed]">
                    {platformSub.max_overdraft} credits
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelPlatformSubscription}
                  disabled={cancellingId === 'platform'}
                  className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg font-semibold hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {cancellingId === 'platform' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
                <button
                  onClick={() => router.push('/subscribe')}
                  className="px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
                >
                  Change Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6 text-center">
              <p className="text-[#9ca3af] mb-4">You don&apos;t have an active platform subscription.</p>
              <button
                onClick={() => router.push('/subscribe')}
                className="bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Plans
              </button>
            </div>
          )}
        </div>

        {/* Tool Subscriptions */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Tool Subscriptions</h2>
          
          {toolSubs.length > 0 ? (
            <div className="space-y-4">
              {toolSubs.map((sub) => (
                <div key={sub.id} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#ededed] mb-1">
                        {sub.metadata?.tool_name || 'Tool Subscription'}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-[#9ca3af]">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {sub.credit_price} credits / {sub.billing_period}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Next: {new Date(sub.next_billing_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelToolSubscription(sub)}
                      disabled={cancellingId === sub.id}
                      className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg font-semibold hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                      {cancellingId === sub.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6 text-center">
              <p className="text-[#9ca3af] mb-4">You don&apos;t have any active tool subscriptions.</p>
              <button
                onClick={() => router.push('/backoffice')}
                className="bg-[#374151] text-[#ededed] px-6 py-3 rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
              >
                Browse Tools
              </button>
            </div>
          )}
        </div>

        {/* Additional Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/buy-credits')}
            className="bg-[#1f2937] border border-[#374151] rounded-xl p-4 hover:border-[#3ecf8e] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#3ecf8e]/20 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-[#3ecf8e]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#ededed]">Buy More Credits</h3>
                <p className="text-sm text-[#9ca3af]">Purchase additional credits</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => router.push('/support')}
            className="bg-[#1f2937] border border-[#374151] rounded-xl p-4 hover:border-[#3ecf8e] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#3ecf8e]/20 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-[#3ecf8e]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#ededed]">Get Support</h3>
                <p className="text-sm text-[#9ca3af]">Need help? Contact us</p>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}

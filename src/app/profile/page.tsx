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
  credits_per_period: number;
  period: string;
  next_billing_date: string;
  created_at: string;
  metadata: {
    tool_name?: string;
  };
}

interface PurchasedTool {
  id: string;
  tool_id: string;
  tool_name: string;
  tool_url: string;
  purchased_at: string;
  credits_paid: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [credits, setCredits] = useState(0);
  const [platformSub, setPlatformSub] = useState<PlatformSubscription | null>(null);
  const [toolSubs, setToolSubs] = useState<ToolSubscription[]>([]);
  const [purchasedTools, setPurchasedTools] = useState<PurchasedTool[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination states
  const [purchasedToolsToShow, setPurchasedToolsToShow] = useState(5);
  const [subscriptionsToShow, setSubscriptionsToShow] = useState(5);

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
        const { data: toolData, error: toolSubsError } = await supabase
          .from('tool_subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (toolSubsError) {
          // Log detailed error information
          const errorDetails = {
            message: toolSubsError.message || 'Unknown error',
            details: toolSubsError.details || 'No details',
            hint: toolSubsError.hint || 'No hint',
            code: toolSubsError.code || 'No code',
          };
          console.error('[ERROR] Failed to fetch tool subscriptions:', JSON.stringify(errorDetails, null, 2));
          
          // Log full error object with proper serialization
          try {
            const fullError = {
              ...errorDetails,
              // Include any additional properties that might exist
              name: toolSubsError.name,
              stack: toolSubsError.stack,
            };
            console.error('[ERROR] Full error object:', JSON.stringify(fullError, null, 2));
          } catch (serializationError) {
            // If JSON.stringify fails (e.g., circular reference), use console.dir
            console.error('[ERROR] Full error object (using console.dir):');
            console.dir(toolSubsError, { depth: null });
          }
          
          // If it's a permission error, try to fetch from checkouts as fallback
          if (toolSubsError.code === 'PGRST301' || toolSubsError.message?.includes('permission') || toolSubsError.message?.includes('policy')) {
            console.warn('[WARN] Permission error - trying to fetch from checkouts as fallback');
            
            // Try to get subscription info from completed checkouts
            const { data: completedCheckouts } = await supabase
              .from('checkouts')
              .select('metadata, created_at')
              .eq('user_id', authUser.id)
              .eq('type', 'tool_subscription')
              .not('metadata->status', 'eq', 'pending')
              .order('created_at', { ascending: false });
            
            if (completedCheckouts && completedCheckouts.length > 0) {
              console.log('[INFO] Found', completedCheckouts.length, 'completed subscription checkouts');
              // We can't create full subscription objects from this, but we can log it
            }
          }
        }

        if (toolData && Array.isArray(toolData) && toolData.length > 0) {
          console.log('[DEBUG] Found', toolData.length, 'active tool subscriptions');
          // Map database fields to interface
          const mappedSubs = toolData.map((sub: Record<string, unknown>) => ({
            id: sub.id,
            tool_id: sub.tool_id,
            status: sub.status,
            credits_per_period: sub.credits_per_period,
            period: sub.period,
            next_billing_date: sub.next_billing_date,
            created_at: sub.created_at,
            metadata: sub.metadata || {},
          }));
          setToolSubs(mappedSubs as ToolSubscription[]);
        } else {
          console.log('[DEBUG] No active tool subscriptions found');
          setToolSubs([]);
        }

        // Fetch one-time purchased tools (from completed checkouts)
        const { data: checkoutsData, error: checkoutsError } = await supabase
          .from('checkouts')
          .select('id, credit_amount, created_at, metadata')
          .eq('user_id', authUser.id)
          .eq('type', 'tool_purchase')
          .order('created_at', { ascending: false });

        if (checkoutsError) {
          console.error('[ERROR] Failed to fetch purchased tools:', checkoutsError);
        }

        if (checkoutsData && Array.isArray(checkoutsData) && checkoutsData.length > 0) {
          // Filter only completed purchases
          const completedPurchases = checkoutsData.filter((checkout: Record<string, unknown>) => {
            const meta = checkout.metadata as Record<string, unknown>;
            return meta?.status === 'completed';
          });

          console.log('[DEBUG] Found', completedPurchases.length, 'one-time tool purchases');

          const mappedPurchases = completedPurchases.map((checkout: Record<string, unknown>) => {
            const meta = checkout.metadata as Record<string, unknown>;
            return {
              id: checkout.id,
              tool_id: meta?.tool_id || '',
              tool_name: meta?.tool_name || 'Unknown Tool',
              tool_url: meta?.tool_url || '',
              purchased_at: checkout.created_at,
              credits_paid: checkout.credit_amount || 0,
            };
          });

          setPurchasedTools(mappedPurchases as PurchasedTool[]);
        } else {
          console.log('[DEBUG] No one-time tool purchases found');
          setPurchasedTools([]);
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#374151]/50">
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
              className="flex items-center gap-2 text-[#9ca3af] hover:text-[#ededed] transition-colors px-4 py-2 rounded-lg hover:bg-[#1f2937]/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Error Message */}
        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-[#9ca3af] text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section with Profile Info */}
        <div className="relative mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#3ecf8e]/10 via-[#2dd4bf]/5 to-transparent rounded-2xl blur-3xl"></div>
          <div className="relative bg-[#1f2937]/50 backdrop-blur-sm border border-[#374151]/50 rounded-2xl p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#ededed] to-[#9ca3af] bg-clip-text text-transparent">
                  {user?.fullName || 'Welcome'}
                </h1>
                <p className="text-[#9ca3af] mb-4">{user?.email}</p>
                <div className="inline-flex items-center gap-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-full px-4 py-2">
                  <CreditCard className="w-4 h-4 text-[#3ecf8e]" />
                  <span className="text-[#3ecf8e] font-semibold">{credits.toFixed(2)} credits</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/buy-credits')}
                  className="px-6 py-3 bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[#3ecf8e]/20"
                >
                  Add Credits
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions & Purchases Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Platform Subscription */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#3ecf8e]/10 rounded-lg">
                <Shield className="w-5 h-5 text-[#3ecf8e]" />
              </div>
              <h2 className="text-xl font-bold">Platform Subscription</h2>
            </div>
          
            {platformSub ? (
              <div className="bg-[#1f2937]/50 backdrop-blur-sm border border-[#374151]/50 rounded-xl p-6 hover:border-[#3ecf8e]/30 transition-colors">
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
              <div className="bg-[#1f2937]/30 border border-dashed border-[#374151] rounded-xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3ecf8e]/10 rounded-full mb-4">
                  <Shield className="w-8 h-8 text-[#3ecf8e]/50" />
                </div>
                <p className="text-[#9ca3af] mb-4">No active platform subscription</p>
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

          {/* Purchased Tools */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#3ecf8e]/10 rounded-lg">
                <CreditCard className="w-5 h-5 text-[#3ecf8e]" />
              </div>
              <h2 className="text-xl font-bold">Purchased Tools</h2>
            </div>
            
            {purchasedTools.length > 0 ? (
              <>
                <div className="space-y-3">
                  {purchasedTools.slice(0, purchasedToolsToShow).map((purchase) => (
                    <div key={purchase.id} className="group bg-[#1f2937]/50 backdrop-blur-sm border border-[#374151]/50 rounded-xl p-4 hover:border-[#3ecf8e]/30 transition-all">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#ededed] mb-2 truncate">
                            {purchase.tool_name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-[#9ca3af]">
                            <span className="inline-flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5" />
                              {purchase.credits_paid} credits
                            </span>
                            <span className="text-[#374151]">•</span>
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(purchase.purchased_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {purchase.tool_url && purchase.tool_url !== 'https://example.com/tool/' && (
                          <button
                            onClick={() => window.open(purchase.tool_url, '_blank')}
                            className="px-4 py-2 bg-[#3ecf8e]/10 text-[#3ecf8e] rounded-lg font-medium hover:bg-[#3ecf8e]/20 transition-colors text-sm inline-flex items-center gap-2 shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">Open</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Load More Button for Purchased Tools */}
                {purchasedTools.length > purchasedToolsToShow && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setPurchasedToolsToShow(prev => prev + 5)}
                      className="px-6 py-2.5 bg-[#1f2937]/50 border border-[#374151]/50 text-[#ededed] rounded-lg font-medium hover:border-[#3ecf8e]/50 hover:bg-[#1f2937]/70 transition-all inline-flex items-center gap-2"
                    >
                      Load More
                      <span className="text-xs text-[#9ca3af]">
                        ({purchasedTools.length - purchasedToolsToShow} more)
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[#1f2937]/30 border border-dashed border-[#374151] rounded-xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3ecf8e]/10 rounded-full mb-4">
                  <CreditCard className="w-8 h-8 text-[#3ecf8e]/50" />
                </div>
                <p className="text-[#9ca3af] mb-4">No purchased tools yet</p>
                <button
                  onClick={() => router.push('/backoffice')}
                  className="text-[#3ecf8e] hover:text-[#2dd4bf] font-medium transition-colors inline-flex items-center gap-2"
                >
                  Browse Tools
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Tool Subscriptions */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#3ecf8e]/10 rounded-lg">
                <Calendar className="w-5 h-5 text-[#3ecf8e]" />
              </div>
              <h2 className="text-xl font-bold">Recurring Subscriptions</h2>
            </div>
            
            {toolSubs.length > 0 ? (
              <>
                <div className="space-y-3">
                  {toolSubs.slice(0, subscriptionsToShow).map((sub) => (
                    <div key={sub.id} className="group bg-[#1f2937]/50 backdrop-blur-sm border border-[#374151]/50 rounded-xl p-4 hover:border-[#3ecf8e]/30 transition-all">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#ededed] mb-2 truncate">
                            {sub.metadata?.tool_name || 'Tool Subscription'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-[#9ca3af]">
                            <span className="inline-flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5" />
                              {sub.credits_per_period} / {sub.period}
                            </span>
                            <span className="text-[#374151]">•</span>
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Next: {new Date(sub.next_billing_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelToolSubscription(sub)}
                          disabled={cancellingId === sub.id}
                          className="px-4 py-2 bg-red-600/10 text-red-400 rounded-lg font-medium hover:bg-red-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm inline-flex items-center gap-2 shrink-0"
                        >
                          {cancellingId === sub.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="hidden sm:inline">Cancelling...</span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline">Cancel</span>
                              <span className="sm:hidden">✕</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Load More Button for Subscriptions */}
                {toolSubs.length > subscriptionsToShow && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setSubscriptionsToShow(prev => prev + 5)}
                      className="px-6 py-2.5 bg-[#1f2937]/50 border border-[#374151]/50 text-[#ededed] rounded-lg font-medium hover:border-[#3ecf8e]/50 hover:bg-[#1f2937]/70 transition-all inline-flex items-center gap-2"
                    >
                      Load More
                      <span className="text-xs text-[#9ca3af]">
                        ({toolSubs.length - subscriptionsToShow} more)
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[#1f2937]/30 border border-dashed border-[#374151] rounded-xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3ecf8e]/10 rounded-full mb-4">
                  <Calendar className="w-8 h-8 text-[#3ecf8e]/50" />
                </div>
                <p className="text-[#9ca3af] mb-4">No active subscriptions</p>
                <button
                  onClick={() => router.push('/backoffice')}
                  className="text-[#3ecf8e] hover:text-[#2dd4bf] font-medium transition-colors inline-flex items-center gap-2"
                >
                  Browse Tools
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => router.push('/support')}
            className="px-6 py-3 bg-[#1f2937]/50 border border-[#374151]/50 text-[#ededed] rounded-lg font-medium hover:border-[#3ecf8e]/50 hover:bg-[#1f2937]/70 transition-all inline-flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Get Support
          </button>
        </div>
      </main>
    </div>
  );
}

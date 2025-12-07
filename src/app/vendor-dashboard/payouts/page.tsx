'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Menu, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Info,
  CreditCard
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import ToolSelector from '../components/ToolSelector';

interface StripeAccountStatus {
  connected: boolean;
  accountStatus: 'active' | 'pending' | 'restricted' | 'disabled' | null;
  onboardingCompleted: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requirementsNeeded?: string[];
}

interface BalanceInfo {
  availableBalance: number;
  pendingPayouts: number;
  nextPayoutDate: string;
  minimumThreshold: number;
  eligibleForPayout: boolean;
  conversionRate: number;
  currency: string;
}

interface Payout {
  id: string;
  credits_amount: number;
  euro_amount: number;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed';
  scheduled_date: string | null;
  processed_at: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function OnboardingHandler({ fetchAccountStatus }: { fetchAccountStatus: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const onboardingStatus = searchParams.get('onboarding');
    if (onboardingStatus === 'success') {
      // Refresh account status
      fetchAccountStatus();
    }
  }, [searchParams, fetchAccountStatus]);

  return null;
}

function VendorPayoutsPageContent() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // User states
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  const [isVendor, setIsVendor] = useState(false);

  // Stripe Connect states
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Balance states
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Payout history states
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktop = window.innerWidth >= 1024;
      const savedState = localStorage.getItem('sidebarOpen');
      
      if (isDesktop) {
        setIsMenuOpen(savedState !== null ? savedState === 'true' : true);
      } else {
        setIsMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // UI states
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    localStorage.setItem('sidebarOpen', String(newState));
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }
        
        setUserId(user.id);
        
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role, is_vendor')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setUserRole(profileData.role || 'user');
          setIsVendor(profileData.is_vendor || false);
        }
        
        // Check if user has tools
        const { data: toolsData } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', user.id);
        
        setHasTools((toolsData?.length || 0) > 0);
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, [router]);

  // Fetch Stripe Connect account status
  const fetchAccountStatus = async () => {
    if (!userId) return;
    
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/vendor/payouts/connect/status');
      
      if (response.ok) {
        const data = await response.json();
        setAccountStatus(data);
      } else {
        console.error('Failed to fetch account status');
      }
    } catch (err) {
      console.error('Error fetching account status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch balance information
  const fetchBalance = async () => {
    if (!userId) return;
    
    setLoadingBalance(true);
    try {
      const response = await fetch('/api/vendor/payouts/balance');
      
      if (response.ok) {
        const data = await response.json();
        setBalanceInfo(data);
      } else {
        console.error('Failed to fetch balance');
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  // Fetch payout history
  const fetchPayouts = async () => {
    if (!userId) return;
    
    setLoadingPayouts(true);
    try {
      const response = await fetch('/api/vendor/payouts/history?limit=10');
      
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.payouts || []);
      } else {
        console.error('Failed to fetch payouts');
      }
    } catch (err) {
      console.error('Error fetching payouts:', err);
    } finally {
      setLoadingPayouts(false);
    }
  };

  // Load data when userId is available
  useEffect(() => {
    if (userId) {
      fetchAccountStatus();
      fetchBalance();
      fetchPayouts();
    }
  }, [userId]);

  // Handle Stripe Connect onboarding
  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vendor/payouts/connect/onboard', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.onboardingUrl) {
          // Redirect to Stripe onboarding
          window.location.href = data.onboardingUrl;
        } else {
          setError('Failed to create onboarding link');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start onboarding');
      }
    } catch (err) {
      console.error('Error connecting Stripe:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setConnectingStripe(false);
    }
  };

  // Refresh all data
  const handleRefresh = () => {
    fetchAccountStatus();
    fetchBalance();
    fetchPayouts();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      completed: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
      processing: { color: 'bg-blue-500/20 text-blue-400', icon: Clock },
      scheduled: { color: 'bg-yellow-500/20 text-yellow-400', icon: Calendar },
      pending: { color: 'bg-gray-500/20 text-gray-400', icon: Clock },
      failed: { color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
    };
    
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Handle onboarding redirect with Suspense */}
      <Suspense fallback={null}>
        <OnboardingHandler fetchAccountStatus={fetchAccountStatus} />
      </Suspense>

      {/* Sidebar */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        userId={userId}
        userRole={userRole}
        hasTools={hasTools}
        isVendor={isVendor}
        forceDesktopOpen={true}
      />

      {/* Main Content */}
      <main className={`flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden lg:ml-80`}>
        {/* Header */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 border-b border-[#374151]">
          <div className="flex items-center justify-between p-2 sm:p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {hasTools && userId && <ToolSelector userId={userId} />}
              
              <h1 className="text-xl sm:text-2xl font-bold">Payouts</h1>
            </div>
            
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-400">Error</div>
                <div className="text-sm text-red-300">{error}</div>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-400 mb-1">How Payouts Work</div>
                <div className="text-sm text-blue-300 space-y-1">
                  <p>• You earn 1 credit for every euro users spend on your tools</p>
                  <p>• Payouts are processed monthly on the 1st of each month</p>
                  <p>• Minimum payout: {balanceInfo?.minimumThreshold || 50} credits (€{balanceInfo?.minimumThreshold || 50})</p>
                  <p>• Connect your Stripe account to receive payouts directly to your bank</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe Connect Status */}
          {loadingStatus ? (
            <div className="mb-6 bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-[#3ecf8e]" />
              </div>
            </div>
          ) : !accountStatus?.connected ? (
            <div className="mb-6 bg-gradient-to-r from-[#3ecf8e]/20 to-[#2dd4bf]/20 border border-[#3ecf8e]/30 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#3ecf8e] rounded-lg">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#ededed] mb-1">Connect Stripe Account</h3>
                    <p className="text-[#9ca3af]">Set up your Stripe account to receive payouts</p>
                  </div>
                </div>
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="flex items-center gap-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectingStripe ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Connect Stripe
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : accountStatus.accountStatus === 'active' ? (
            <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <div className="font-semibold text-green-400">Stripe Connected</div>
                  <div className="text-sm text-green-300">Your account is active and ready to receive payouts</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="font-semibold text-yellow-400">Action Required</div>
                  <div className="text-sm text-yellow-300">
                    {!accountStatus.onboardingCompleted 
                      ? 'Please complete your Stripe onboarding'
                      : 'Your Stripe account needs additional verification'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-[#3ecf8e]" />
                <h3 className="text-sm font-medium text-[#9ca3af]">Available Balance</h3>
              </div>
              {loadingBalance ? (
                <div className="h-8 bg-[#374151] animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-[#3ecf8e]">
                    {balanceInfo?.availableBalance || 0} credits
                  </p>
                  <p className="text-sm text-[#9ca3af] mt-1">
                    ≈ {formatCurrency(balanceInfo?.availableBalance || 0)}
                  </p>
                </>
              )}
            </div>

            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-medium text-[#9ca3af]">Pending Payouts</h3>
              </div>
              {loadingBalance ? (
                <div className="h-8 bg-[#374151] animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-[#ededed]">
                    {balanceInfo?.pendingPayouts || 0} credits
                  </p>
                  <p className="text-sm text-[#9ca3af] mt-1">
                    ≈ {formatCurrency(balanceInfo?.pendingPayouts || 0)}
                  </p>
                </>
              )}
            </div>

            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-medium text-[#9ca3af]">Next Payout</h3>
              </div>
              {loadingBalance ? (
                <div className="h-8 bg-[#374151] animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-[#ededed]">
                    {balanceInfo?.nextPayoutDate ? formatDate(balanceInfo.nextPayoutDate) : 'N/A'}
                  </p>
                  <p className="text-sm text-[#9ca3af] mt-1">
                    {balanceInfo?.eligibleForPayout ? (
                      <span className="text-green-400">Eligible for payout</span>
                    ) : (
                      <span className="text-yellow-400">Below minimum threshold</span>
                    )}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Payout History */}
          <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
            <div className="p-6 border-b border-[#374151]">
              <h2 className="text-lg font-semibold">Payout History</h2>
              <p className="text-sm text-[#9ca3af] mt-1">Recent payout transactions</p>
            </div>
            
            {loadingPayouts ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-[#3ecf8e] mx-auto mb-4" />
                <p className="text-[#9ca3af]">Loading payouts...</p>
              </div>
            ) : payouts.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
                <p className="text-[#9ca3af]">No payouts yet</p>
                <p className="text-sm text-[#6b7280] mt-2">
                  Payouts will appear here once you earn credits from tool sales
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#374151]">
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase">Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-[#374151] hover:bg-[#374151]/50 transition-colors">
                        <td className="px-6 py-4 text-[#ededed]">
                          {formatDate(payout.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[#ededed] font-medium">
                            {payout.credits_amount} credits
                          </div>
                          <div className="text-sm text-[#9ca3af]">
                            {formatCurrency(payout.euro_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payout.status)}
                        </td>
                        <td className="px-6 py-4 text-[#9ca3af]">
                          {payout.processed_at ? formatDate(payout.processed_at) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Main exported component - wrap content in Suspense
export default function VendorPayoutsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#3ecf8e]" />
      </div>
    }>
      <VendorPayoutsPageContent />
    </Suspense>
  );
}


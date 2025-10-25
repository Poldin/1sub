'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft, User, CreditCard, History, Download, RefreshCw } from 'lucide-react';
import Sidebar from '../backoffice/components/Sidebar';
import Footer from '../components/Footer';
import { createClient } from '@/lib/supabase/client';
import { getUserCreditsClient } from '@/lib/credits';

interface CreditHistory {
  id: string;
  type: 'grant' | 'consume';
  amount: number;
  reason: string;
  date: string;
  balanceAfter: number;
  metadata: Record<string, unknown>;
  toolId?: string;
  checkoutId?: string;
}

interface UsageSummary {
  toolName: string;
  creditsSpent: number;
  lastUsed: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // User data states
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);

  // Transaction data states
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };

  // Fetch transaction data
  const fetchTransactionData = async () => {
    if (!user?.id) return;
    
    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const response = await fetch(`/api/user/transactions?limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setCreditHistory(data.transactions || []);

      // Generate usage summary from transaction data
      const usageMap = new Map<string, { creditsSpent: number; lastUsed: string }>();
      
      data.transactions?.forEach((transaction: CreditHistory) => {
        if (transaction.type === 'consume' && transaction.metadata?.tool_name) {
          const toolName = transaction.metadata.tool_name as string;
          const existing = usageMap.get(toolName) || { creditsSpent: 0, lastUsed: '' };
          
          usageMap.set(toolName, {
            creditsSpent: existing.creditsSpent + Math.abs(transaction.amount),
            lastUsed: transaction.date
          });
        }
      });

      const summary = Array.from(usageMap.entries()).map(([toolName, data]) => ({
        toolName,
        creditsSpent: data.creditsSpent,
        lastUsed: formatTimeAgo(data.lastUsed)
      }));

      setUsageSummary(summary);

      // Refresh credits after fetching transactions
      await refreshCredits();
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      setTransactionsError(error instanceof Error ? error.message : 'Failed to fetch transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Refresh credits from API
  const refreshCredits = async () => {
    if (!user?.id) {
      console.log('Refresh credits - No user ID available');
      return;
    }

    try {
      console.log('Refresh credits - Fetching from API...');
      const response = await fetch('/api/user/profile');
      console.log('Refresh credits - API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Refresh credits - API response data:', data);
        
        if (data.credits !== undefined) {
          setCredits(data.credits);
          console.log('Credits refreshed:', data.credits);
        } else {
          console.log('Refresh credits - No credits in response');
        }
      } else {
        const errorData = await response.json();
        console.error('Refresh credits - API error:', errorData);
      }
    } catch (error) {
      console.error('Error refreshing credits:', error);
    }
  };


  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };

  // Fetch user data
  useEffect(() => {
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

        if (data.role) {
          setUserRole(data.role);
        }

        // Set credits from API response
        if (data.credits !== undefined) {
          setCredits(data.credits);
          console.log('Profile page - Credits set from API:', data.credits);
        } else {
          console.log('Profile page - No credits in API response');
        }

        // Check if user has created any tools
        const supabase = createClient();
        const { data: userTools, error: toolsError } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', data.id);

        if (!toolsError && userTools && userTools.length > 0) {
          setHasTools(true);
        }

        // Fetch transaction data after user data is loaded
        await fetchTransactionData();
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Fetch transaction data when user changes
  useEffect(() => {
    if (user?.id) {
      fetchTransactionData();
    }
  }, [user?.id]);


  const handleExportHistory = () => {
    if (creditHistory.length === 0) {
      alert('No transaction data to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Type', 'Amount', 'Reason', 'Balance After'];
    const csvContent = [
      headers.join(','),
      ...creditHistory.map(transaction => [
        new Date(transaction.date).toLocaleDateString(),
        transaction.type,
        transaction.amount,
        `"${transaction.reason.replace(/"/g, '""')}"`, // Escape quotes in reason
        transaction.balanceAfter
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `credit-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Unified Sidebar */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={user?.id || ''}
        userRole={userRole}
        hasTools={hasTools}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar with Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden">
          <div className="flex items-center justify-between p-2 sm:p-3 min-w-0">
            {/* Hamburger Button */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
            </button>
            
            {/* Page Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Profile</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Information */}
          <div className="lg:col-span-1">
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-6">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Account Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#d1d5db] mb-1">Email</label>
                  <p className="text-[#ededed]">{user?.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#d1d5db] mb-1">Full Name</label>
                  <p className="text-[#ededed]">{user?.fullName || '-'}</p>
                </div>
                <button className="w-full px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors">
                  Reset Password
                </button>
              </div>
            </div>

            {/* Credits Overview */}
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Credits Overview
              </h2>
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-[#3ecf8e] mb-2">{credits.toFixed(2)}</p>
                <p className="text-[#9ca3af]">Available Credits</p>
              </div>
              <button
                onClick={() => router.push('/buy-credits')}
                className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
              >
                Top Up Credits
              </button>
            </div>
          </div>

          {/* Credit History & Usage Summary */}
          <div className="lg:col-span-2 space-y-8">
            {/* Credit History */}
            <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
              <div className="p-6 border-b border-[#374151]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#ededed] flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Credit History
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await fetchTransactionData();
                        await refreshCredits();
                      }}
                      disabled={transactionsLoading}
                      className="flex items-center px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors text-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <button
                      onClick={handleExportHistory}
                      disabled={creditHistory.length === 0}
                      className="flex items-center px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors text-sm disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
                    <span className="ml-2 text-[#9ca3af]">Loading transactions...</span>
                  </div>
                ) : transactionsError ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <p className="text-red-400 mb-2">Error loading transactions</p>
                      <p className="text-[#9ca3af] text-sm">{transactionsError}</p>
                      <button 
                        onClick={fetchTransactionData}
                        className="mt-2 px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : creditHistory.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-[#9ca3af]">No transactions found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#374151]">
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditHistory.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-[#374151]">
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              transaction.type === 'grant' 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-medium ${
                            transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </td>
                          <td className="px-6 py-4 text-[#9ca3af]">
                            {transaction.reason}
                          </td>
                          <td className="px-6 py-4 text-[#9ca3af]">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Usage Summary */}
            <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
              <div className="p-6 border-b border-[#374151]">
                <h2 className="text-lg font-semibold text-[#ededed]">Usage Summary</h2>
                <p className="text-sm text-[#9ca3af] mt-1">Tools you&apos;ve used and credits spent</p>
              </div>
              <div className="p-6">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
                    <span className="ml-2 text-[#9ca3af]">Loading usage data...</span>
                  </div>
                ) : usageSummary.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-[#9ca3af]">No usage data available</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {usageSummary.map((usage, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                          <div>
                            <p className="font-medium text-[#ededed]">{usage.toolName}</p>
                            <p className="text-sm text-[#9ca3af]">Last used: {usage.lastUsed}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#3ecf8e] font-medium">{usage.creditsSpent} credits</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <button className="text-[#3ecf8e] text-sm hover:underline">
                        View full history
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
      </main>
    </div>
  );
}


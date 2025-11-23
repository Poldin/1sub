'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Download, RefreshCw, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import ToolSelector from '../components/ToolSelector';

interface TransactionMetadata {
  buyer_id?: string;
  [key: string]: unknown;
}

interface Transaction {
  id: string;
  created_at: string;
  credits_amount: number;
  reason: string;
  tool_id: string | null;
  checkout_id: string | null;
  metadata: TransactionMetadata;
  tool_name: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
}

export default function VendorTransactionsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for unified Sidebar
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  const [isVendor, setIsVendor] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          return;
        }
        
        setUserId(user.id);
        
        // Fetch user profile data
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
  }, []);

  // Fetch vendor transactions (where vendor earned credits from tool sales)
  const fetchTransactions = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // Get date filter
      let dateFilter = new Date();
      if (filter === 'today') {
        dateFilter.setHours(0, 0, 0, 0);
      } else if (filter === 'week') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (filter === 'month') {
        dateFilter.setMonth(dateFilter.getMonth() - 1);
      } else {
        dateFilter = new Date(0); // All time
      }
      
      // Fetch vendor's earnings transactions (type = 'add' and reason contains "Tool sale")
      console.log('[Vendor Transactions] Fetching transactions:', {
        vendor_id: userId,
        filter: filter,
        date_filter: dateFilter.toISOString(),
      });
      
      const { data: transactionData, error: transactionError } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          credits_amount,
          reason,
          created_at,
          tool_id,
          checkout_id,
          metadata
        `)
        .eq('user_id', userId) // Vendor is the user earning credits
        .eq('type', 'add') // Only 'add' transactions (earnings)
        .ilike('reason', 'Tool sale:%') // Filter by tool sales
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (transactionError) {
        console.error('[Vendor Transactions] Query error:', transactionError);
        throw new Error('Failed to fetch transactions');
      }
      
      console.log('[Vendor Transactions] Found transactions:', {
        count: transactionData?.length || 0,
        has_data: !!(transactionData && transactionData.length > 0),
      });
      
          // Enrich transactions with tool and buyer information
      const enrichedTransactions = await Promise.all(
        (transactionData || []).map(async (tx: { id: string; created_at: string; credits_amount: number | null; reason: string | null; tool_id: string | null; checkout_id: string | null; metadata: unknown | null }) => {
          let toolName = null;
          const buyerEmail = null;
          let buyerName = null;
          
          // Get tool name
          if (tx.tool_id) {
            const { data: tool } = await supabase
              .from('tools')
              .select('name')
              .eq('id', tx.tool_id)
              .single();
            
            toolName = tool?.name || null;
          }
          
          // Extract tool name from reason if not found
          if (!toolName && tx.reason) {
            const match = tx.reason.match(/Tool sale: (.+)/);
            toolName = match ? match[1] : null;
          }
          
          // Get buyer information from metadata or checkout
          const metadata = (tx.metadata as Record<string, unknown> | null) || {};
          let buyerId = (metadata as Record<string, unknown>).buyer_id as string | undefined;
          
          // If no buyer_id in metadata, try to get from checkout
          if (!buyerId && tx.checkout_id) {
            const { data: checkout } = await supabase
              .from('checkouts')
              .select('user_id')
              .eq('id', tx.checkout_id)
              .single();
            
            buyerId = checkout?.user_id || null;
          }
          
          // Get buyer information from user_profiles
          if (buyerId) {
            const { data: buyerProfile } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('id', buyerId)
              .single();
            
            if (buyerProfile) {
              buyerName = buyerProfile.full_name || null;
            }
            
            // Try to get email from auth.users via API (if we have an API endpoint)
            // For now, we'll just use the profile name and show buyer ID if needed
            // In a production system, you'd want an API endpoint to get email safely
          }
          
          return {
            id: tx.id,
            created_at: tx.created_at,
            credits_amount: tx.credits_amount || 0,
            reason: tx.reason,
            tool_id: tx.tool_id,
            checkout_id: tx.checkout_id,
            metadata: metadata,
            tool_name: toolName,
            buyer_email: buyerEmail,
            buyer_name: buyerName,
          };
        })
      );
      
      setTransactions(enrichedTransactions);
      
      // Log if no transactions found for debugging
      if (!enrichedTransactions || enrichedTransactions.length === 0) {
        console.log('[Vendor Transactions] No transactions found. Possible reasons:', {
          vendor_id: userId,
          has_checkouts: 'Check if checkouts have vendor_id set',
          transaction_created: 'Check if vendor transactions were created during checkout',
          reason_filter: 'Transactions must have reason starting with "Tool sale:"',
          type_filter: 'Transactions must have type = "add"',
        });
        
        // Optional: Check for checkouts with vendor_id but no transactions
        const { data: checkoutsData } = await supabase
          .from('checkouts')
          .select('id, vendor_id, metadata')
          .eq('vendor_id', userId)
          .limit(10);
        
        console.log('[Vendor Transactions] Recent checkouts with vendor_id:', {
          count: checkoutsData?.length || 0,
          checkouts: checkoutsData?.map((c: { id: string; vendor_id: string; metadata: unknown | null }) => ({
            id: c.id,
            vendor_id: c.vendor_id,
            tool_name: (c.metadata as { tool_name?: string })?.tool_name,
          })) || [],
        });
      }
    } catch (err) {
      console.error('[Vendor Transactions] Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId, filter]);

  const filteredTransactions = transactions;

  const totalCredits = transactions.reduce((sum, t) => sum + t.credits_amount, 0);
  const totalTransactions = transactions.length;
  const successRate = totalTransactions > 0 ? 100 : 0; // All vendor transactions are "completed" since they're earnings

  const handleExport = () => {
    // Convert transactions to CSV
    const csvHeaders = ['Date', 'Buyer', 'Tool', 'Credits', 'Reason'];
    const csvRows = transactions.map(tx => [
      new Date(tx.created_at).toLocaleString(),
      tx.buyer_email || tx.buyer_name || 'Unknown',
      tx.tool_name || 'Unknown',
      tx.credits_amount.toString(),
      tx.reason
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Unified Sidebar */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={userId}
        userRole={userRole}
        hasTools={hasTools}
        isVendor={isVendor}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar with Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden border-b border-[#374151]">
          <div className="flex items-center justify-between p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-3">
              {/* Hamburger Button */}
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
              >
                <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
              </button>
              
              {/* Tool Selector */}
              {hasTools && userId && (
                <ToolSelector userId={userId} />
              )}
              
              {/* Page Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Transactions</h1>
            </div>
            
            {/* Filter and Export */}
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="flex items-center px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors text-sm disabled:opacity-50"
                title="Refresh transactions"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                disabled={transactions.length === 0}
                className="flex items-center px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </button>
            </div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Credits Earned</h3>
            <p className="text-2xl font-bold text-[#3ecf8e]">{totalCredits.toFixed(2)}</p>
            <p className="text-xs text-[#9ca3af] mt-1">From all tool sales</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Transactions</h3>
            <p className="text-2xl font-bold text-[#ededed]">{totalTransactions}</p>
            <p className="text-xs text-[#9ca3af] mt-1">Sales recorded</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Average per Sale</h3>
            <p className="text-2xl font-bold text-[#3ecf8e]">
              {totalTransactions > 0 ? (totalCredits / totalTransactions).toFixed(2) : '0.00'}
            </p>
            <p className="text-xs text-[#9ca3af] mt-1">Credits per transaction</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Transaction History</h2>
            <p className="text-sm text-[#9ca3af] mt-1">All earnings from your published tools</p>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#3ecf8e] mx-auto mb-4" />
              <p className="text-[#9ca3af]">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchTransactions}
                className="px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#374151]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Tool</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Credits Earned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#9ca3af]">
                        No transactions found
                        {filter !== 'all' && <span className="block mt-2 text-xs">Try changing the time filter</span>}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => {
                      // Determine transaction type from reason
                      const isSubscription = transaction.reason?.includes('Subscription');
                      const transactionType = isSubscription ? 'Subscription' : 'One-time';
                      
                      return (
                        <tr key={transaction.id} className="border-b border-[#374151] hover:bg-[#374151]/50 transition-colors">
                          <td className="px-6 py-4 text-[#9ca3af]">
                            <div>
                              <div>{new Date(transaction.created_at).toLocaleDateString()}</div>
                              <div className="text-xs text-[#6b7280] mt-0.5">
                                {new Date(transaction.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[#ededed]">
                              {transaction.buyer_name || 'Unknown User'}
                            </div>
                            {transaction.buyer_email && (
                              <div className="text-xs text-[#9ca3af] mt-0.5">
                                {transaction.buyer_email}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-[#ededed]">
                            {transaction.tool_name || 'Unknown Tool'}
                          </td>
                          <td className="px-6 py-4 text-[#3ecf8e] font-medium">
                            +{transaction.credits_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              isSubscription
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-[#3ecf8e]/20 text-[#3ecf8e]'
                            }`}>
                              {transactionType}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-[#374151] mt-16 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Home</Link>
              <Link href="/privacy" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Terms</Link>
              <Link href="/support" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Support</Link>
            </div>
            <p className="text-[#9ca3af] text-xs mt-4">
              © 2025 1sub.io. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      </main>
    </div>
  );
}


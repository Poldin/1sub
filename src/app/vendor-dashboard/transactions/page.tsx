'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import ToolSelector from '../components/ToolSelector';

interface Transaction {
  id: string;
  date: string;
  user: string;
  tool: string;
  credits: number;
  status: 'completed' | 'pending' | 'failed';
}

export default function VendorTransactionsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // States for unified Sidebar
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  
  // Transaction data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };
  
  // Fetch transactions data
  const fetchTransactions = async (vendorId: string) => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // 1. Get vendor's tools
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('id, name')
        .eq('user_profile_id', vendorId);

      if (toolsError) {
        throw new Error('Failed to fetch tools');
      }

      if (!tools || tools.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const toolIds = tools.map(tool => tool.id);
      const toolMap = new Map(tools.map(tool => [tool.id, tool.name]));

      // 2. Get vendor's earnings transactions (type='add' means vendor earns credits)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          credits_amount,
          created_at,
          tool_id,
          metadata
        `)
        .eq('user_id', vendorId)
        .eq('type', 'add')
        .in('tool_id', toolIds)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw new Error('Failed to fetch transactions');
      }

      if (!transactionsData || transactionsData.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // 3. Get unique buyer IDs from metadata
      const buyerIds = new Set<string>();
      transactionsData.forEach(transaction => {
        const metadata = transaction.metadata as Record<string, unknown> | null;
        if (metadata?.buyer_id && typeof metadata.buyer_id === 'string') {
          buyerIds.add(metadata.buyer_id);
        }
      });

      // 4. Fetch buyer profiles to get emails
      const buyerProfiles = new Map<string, string>();
      if (buyerIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, email')
          .in('id', Array.from(buyerIds));

        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            buyerProfiles.set(profile.id, profile.email || 'Unknown');
          });
        }
      }

      // 5. Transform transactions to match interface
      const transformedTransactions: Transaction[] = transactionsData.map(transaction => {
        const metadata = transaction.metadata as Record<string, unknown> | null;
        const buyerId = metadata?.buyer_id as string | undefined;
        const buyerEmail = buyerId ? buyerProfiles.get(buyerId) || 'Unknown User' : 'Unknown User';
        const toolName = transaction.tool_id ? toolMap.get(transaction.tool_id) || 'Unknown Tool' : 'Unknown Tool';

        return {
          id: transaction.id,
          date: transaction.created_at || new Date().toISOString(),
          user: buyerEmail,
          tool: toolName,
          credits: transaction.credits_amount || 0,
          status: 'completed' as const // All recorded transactions are completed
        };
      });

      setTransactions(transformedTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
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
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setUserRole(profileData.role || 'user');
        }
        
        // Check if user has tools
        const { data: toolsData } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', user.id);
        
        setHasTools((toolsData?.length || 0) > 0);
        
        // Fetch transactions after user data is loaded
        fetchTransactions(user.id);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    };
    
    fetchUserData();
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  const totalCredits = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.credits, 0);

  const handleExport = () => {
    try {
      // Create CSV header
      const headers = ['Date', 'User', 'Tool', 'Credits', 'Status'];
      const csvRows = [headers.join(',')];

      // Add transaction rows
      filteredTransactions.forEach(transaction => {
        const row = [
          transaction.date,
          `"${transaction.user}"`,
          `"${transaction.tool}"`,
          transaction.credits.toString(),
          transaction.status
        ];
        csvRows.push(row.join(','));
      });

      // Create blob and download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting transactions:', err);
      alert('Failed to export transactions');
    }
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
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={handleExport}
                className="flex items-center px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Credits Earned</h3>
            <p className="text-2xl font-bold text-[#3ecf8e]">{totalCredits}</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Transactions</h3>
            <p className="text-2xl font-bold text-[#ededed]">{transactions.length}</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Success Rate</h3>
            <p className="text-2xl font-bold text-[#3ecf8e]">
              {transactions.length > 0 
                ? Math.round((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Transaction History</h2>
            <p className="text-sm text-[#9ca3af] mt-1">All transactions from your published tools</p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-6 py-12 text-center text-[#9ca3af]">
                Loading transactions...
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-red-400 mb-2">Error: {error}</p>
                <button
                  onClick={() => userId && fetchTransactions(userId)}
                  className="px-4 py-2 bg-[#3ecf8e] text-white rounded-lg hover:bg-[#2dd4bf] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#374151]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Tool</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#9ca3af]">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-[#374151] hover:bg-[#374151]/50">
                        <td className="px-6 py-4 text-[#9ca3af]">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-[#ededed]">
                          {transaction.user}
                        </td>
                        <td className="px-6 py-4 text-[#ededed]">
                          {transaction.tool}
                        </td>
                        <td className="px-6 py-4 text-[#3ecf8e] font-medium">
                          +{transaction.credits}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
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


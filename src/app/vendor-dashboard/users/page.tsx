'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Users, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import ToolSelector from '../components/ToolSelector';

interface VendorUser {
  id: string;
  email: string;
  fullName: string | null;
  toolsUsed: {
    toolId: string;
    toolName: string;
    usageCount: number;
  }[];
  creditsSpent: number;
  totalUsages: number;
  lastActive: string;
  firstUsed: string;
  isSubscribed: boolean;
}

export default function VendorUsersPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for unified Sidebar
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  
  // States for real data
  const [users, setUsers] = useState<VendorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string>('');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };
  
  // Fetch vendor users data
  const fetchVendorUsers = async (vendorId: string) => {
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
        setUsers([]);
        setLoading(false);
        return;
      }
      const toolIds = tools.map((tool: { id: string; name: string }) => tool.id);

      // 2. Get credit transactions for these tools
      const { data: transactions, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('user_id, tool_id, credits_amount, created_at')
        .in('tool_id', toolIds)
        .eq('type', 'subtract');

      if (transactionsError) {
        throw new Error('Failed to fetch transactions');
      }

      // 3. Get active subscriptions (optional - table might not exist yet)
      let subscriptions: { user_id: string; tool_id: string }[] = [];
      try {
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from('tool_subscriptions')
          .select('user_id, tool_id')
          .in('tool_id', toolIds)
          .eq('status', 'active');
        
        if (!subscriptionsError) {
          subscriptions = subscriptionsData || [];
        } else {
          console.warn('Subscriptions table not available or error:', subscriptionsError);
        }
      } catch (err) {
        console.warn('Could not fetch subscriptions:', err);
        subscriptions = [];
      }

      // 4. Get unique user IDs
      const userIds = [...new Set(transactions?.map((t: { user_id: string; tool_id: string; credits_amount: number | null; created_at: string }) => t.user_id).filter((id: string | undefined) => id) || [])];
      
      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // 5. Get user profiles (handle case where some users might not have profiles)
      // Note: user_profiles doesn't have email - that's in auth.users which we can't query directly
      let profiles: { id: string; full_name: string | null }[] = [];
      
      try {
        if (userIds.length > 0) {
          // Fetch profiles - only selecting fields that exist in user_profiles table
          const { data: profilesData, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', userIds);

          if (profilesError) {
            console.error('[Vendor Users] Error fetching user profiles:', profilesError);
            console.error('[Vendor Users] Error details:', JSON.stringify(profilesError, null, 2));
            console.error('[Vendor Users] User IDs attempted:', userIds);
            // Don't throw - continue with empty profiles and use transaction data
            profiles = [];
          } else {
            profiles = profilesData || [];
            console.log('[Vendor Users] Fetched profiles:', profiles.length, 'out of', userIds.length);
          }
        }
      } catch (err) {
        console.error('[Vendor Users] Exception fetching profiles:', err);
        // Continue with empty profiles - we can still show users from transaction data
        profiles = [];
      }

      // Create a map of user IDs that have profiles
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      
      // 5b. Try to get emails from checkouts metadata (fallback method)
      const checkoutUserEmails = new Map<string, string>();
      try {
        const { data: checkoutsData } = await supabase
          .from('checkouts')
          .select('user_id, metadata')
          .in('tool_id', toolIds);
        
        checkoutsData?.forEach((checkout: { user_id: string; metadata: unknown | null }) => {
          const metadata = checkout.metadata as { user_email?: string };
          if (checkout.user_id && metadata?.user_email) {
            checkoutUserEmails.set(checkout.user_id, metadata.user_email);
          }
        });
      } catch (err) {
        console.warn('[Vendor Users] Could not fetch emails from checkouts:', err);
      }

      // 6. Aggregate data per user
      const userMap = new Map<string, VendorUser>();

      // Process transactions and create user entries
      transactions?.forEach((transaction: { user_id: string; tool_id: string; credits_amount: number | null; created_at: string }) => {
        // Get or create user entry
        let user = userMap.get(transaction.user_id);
        
        if (!user) {
          // Try to get profile data, or use defaults
          const profile = profileMap.get(transaction.user_id);
          // Try to get email from checkouts metadata (fallback)
          const email = checkoutUserEmails.get(transaction.user_id);
          
          user = {
            id: transaction.user_id,
            email: email || `User ${transaction.user_id.substring(0, 8)}`,
            fullName: profile?.full_name || null,
            toolsUsed: [],
            creditsSpent: 0,
            totalUsages: 0,
            lastActive: '',
            firstUsed: '',
            isSubscribed: false
          };
          
          userMap.set(transaction.user_id, user);
        }

        const tool = tools.find((t: { id: string; name: string }) => t.id === transaction.tool_id);
        if (!tool) return;

        // Add credits spent
        user.creditsSpent += transaction.credits_amount || 0;
        user.totalUsages += 1;

        // Update tool usage
        const existingTool = user.toolsUsed.find(t => t.toolId === transaction.tool_id);
        if (existingTool) {
          existingTool.usageCount += 1;
        } else {
          user.toolsUsed.push({
            toolId: transaction.tool_id,
            toolName: tool.name,
            usageCount: 1
          });
        }

        // Update timestamps
        const transactionDate = new Date(transaction.created_at || '');
        if (!user.lastActive || transactionDate > new Date(user.lastActive)) {
          user.lastActive = transaction.created_at || '';
        }
        if (!user.firstUsed || transactionDate < new Date(user.firstUsed)) {
          user.firstUsed = transaction.created_at || '';
        }
      });

      // Process subscriptions
      subscriptions.forEach(subscription => {
        const user = userMap.get(subscription.user_id);
        if (user) {
          user.isSubscribed = true;
        }
      });

      setUsers(Array.from(userMap.values()));
    } catch (err) {
      console.error('Error fetching vendor users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
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
          setLoading(false);
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
        
        const hasTools = (toolsData?.length || 0) > 0;
        setHasTools(hasTools);
        
        // Fetch vendor users if user has tools
        if (hasTools) {
          await fetchVendorUsers(user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Filter users based on search term and selected tool
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.toolsUsed.some(tool => tool.toolName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSelectedTool = !selectedToolId || 
      user.toolsUsed.some(tool => tool.toolId === selectedToolId);
    
    return matchesSearch && matchesSelectedTool;
  });

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
                <ToolSelector 
                  userId={userId} 
                  onToolChange={(toolId) => {
                    setSelectedToolId(toolId);
                  }}
                />
              )}
              
              {/* Page Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Users</h1>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] w-4 h-4" />
              <input
                type="text"
                placeholder="Search users or tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
              />
            </div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-[#1f2937] rounded-lg border border-[#374151] p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3ecf8e] mx-auto mb-4"></div>
            <p className="text-[#9ca3af]">Loading users...</p>
          </div>
        )}

        {/* Users Table */}
        {!loading && (
          <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
            <div className="p-6 border-b border-[#374151]">
              <h2 className="text-lg font-semibold text-[#ededed]">Users Who Used Your Tools</h2>
              <p className="text-sm text-[#9ca3af] mt-1">Users who have interacted with your published tools</p>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Tools Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Credits Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Total Uses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#9ca3af]">
                      {searchTerm || selectedToolId ? 'No users found matching your search' : 'No users have used your tools yet'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-[#374151] hover:bg-[#374151]/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-[#3ecf8e]/20 rounded-lg mr-3">
                            <Users className="w-4 h-4 text-[#3ecf8e]" />
                          </div>
                          <div>
                            <span className="font-medium text-[#ededed] block">
                              {user.fullName || 'Anonymous User'}
                            </span>
                            <span className="text-sm text-[#9ca3af]">{user.email}</span>
                            {user.isSubscribed && (
                              <span className="ml-2 px-2 py-0.5 bg-[#3ecf8e]/20 text-[#3ecf8e] text-xs rounded">
                                Subscribed
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.toolsUsed.map((tool, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-[#374151] text-[#9ca3af] text-xs rounded"
                            >
                              {tool.toolName} ({tool.usageCount})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#3ecf8e] font-medium">
                        {user.creditsSpent.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[#ededed]">
                        {user.totalUsages.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[#9ca3af]">
                        {new Date(user.lastActive).toLocaleDateString()} {new Date(user.lastActive).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Summary Stats */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Users</h3>
              <p className="text-2xl font-bold text-[#ededed]">{users.length}</p>
            </div>
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Credits Earned</h3>
              <p className="text-2xl font-bold text-[#3ecf8e]">
                {users.reduce((sum, user) => sum + user.creditsSpent, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Active Subscribers</h3>
              <p className="text-2xl font-bold text-[#ededed]">
                {users.filter(user => user.isSubscribed).length}
              </p>
            </div>
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Uses</h3>
              <p className="text-2xl font-bold text-[#ededed]">
                {users.reduce((sum, user) => sum + user.totalUsages, 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

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


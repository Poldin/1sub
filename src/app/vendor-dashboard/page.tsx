'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Settings, Plus, BarChart3, TrendingUp, DollarSign, Users, Rocket, ArrowRight } from 'lucide-react';
import Sidebar from '../backoffice/components/Sidebar';
import Footer from '../components/Footer';
import { createClient } from '@/lib/supabase/client';
import ToolSelector from './components/ToolSelector';

type ToolSummary = {
  id: string;
  name: string;
};

export default function VendorDashboard() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // User data states
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  const [toolsCount, setToolsCount] = useState(0);

  // Tool selection states
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [selectedToolName, setSelectedToolName] = useState<string>('');

  // Tool list state
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [toolRefreshToken, setToolRefreshToken] = useState(0);

  // Delete flow state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toolPendingDeletion, setToolPendingDeletion] = useState<ToolSummary | null>(null);
  const [isDeletingTool, setIsDeletingTool] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Vendor-wide stats (always shown)
  const [vendorStats, setVendorStats] = useState({
    totalTools: 0,
    activeTools: 0,
    totalUsers: 0,
    totalRevenue: 0
  });

  // Selected tool stats
  const [toolStats, setToolStats] = useState({
    usageCount: 0,
    activeSubscribers: 0,
    revenue: 0,
    revenueGrowth: 0
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };

  const handleToolChange = (toolId: string, toolName: string) => {
    if (!toolId) {
      setSelectedToolId('');
      setSelectedToolName('');
      setToolStats({
        usageCount: 0,
        activeSubscribers: 0,
        revenue: 0,
        revenueGrowth: 0,
      });
      return;
    }

    setSelectedToolId(toolId);
    setSelectedToolName(toolName);
    // Fetch tool-specific analytics
    fetchToolAnalytics(toolId);
  };

  const handleToolsFetched = (fetchedTools: ToolSummary[]) => {
    setTools(fetchedTools);
  };

  const handleDeleteToolRequest = (tool: ToolSummary) => {
    setToolPendingDeletion(tool);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const resetToolSelection = (updatedTools: ToolSummary[]) => {
    if (updatedTools.length === 0) {
      setSelectedToolId('');
      setSelectedToolName('');
      setToolStats({
        usageCount: 0,
        activeSubscribers: 0,
        revenue: 0,
        revenueGrowth: 0,
      });
      localStorage.removeItem('selectedToolId');
      setHasTools(false);
      setToolsCount(0);
      return;
    }

    const nextTool = updatedTools[0];
    setSelectedToolId(nextTool.id);
    setSelectedToolName(nextTool.name);
    localStorage.setItem('selectedToolId', nextTool.id);
    fetchToolAnalytics(nextTool.id);
    setHasTools(true);
    setToolsCount(updatedTools.length);
  };

  const handleConfirmDeleteTool = async () => {
    if (!toolPendingDeletion || !user) return;

    setIsDeletingTool(true);
    setDeleteError(null);

    try {
      const supabase = createClient();
      const toolId = toolPendingDeletion.id;

      // Delete related data first to avoid foreign key issues
      await supabase.from('tool_products').delete().eq('tool_id', toolId);
      await supabase.from('tool_subscriptions').delete().eq('tool_id', toolId);
      await supabase.from('credit_transactions').delete().eq('tool_id', toolId);

      const { error: toolDeleteError } = await supabase.from('tools').delete().eq('id', toolId);

      if (toolDeleteError) {
        throw toolDeleteError;
      }

      const updatedTools = tools.filter((tool) => tool.id !== toolId);
      setTools(updatedTools);
      resetToolSelection(updatedTools);

      // Refresh vendor analytics
      await fetchVendorAnalytics(user.id);

      setToolPendingDeletion(null);
      setIsDeleteDialogOpen(false);
      setToolRefreshToken((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting tool:', error);
      setDeleteError('Failed to delete tool. Please try again.');
    } finally {
      setIsDeletingTool(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setToolPendingDeletion(null);
    setDeleteError(null);
  };

  // Fetch vendor-wide analytics
  const fetchVendorAnalytics = async (vendorId: string) => {
    try {
      const supabase = createClient();
      
      // Get all tools for vendor
      const { data: toolsData } = await supabase
        .from('tools')
        .select('id, is_active')
        .eq('user_profile_id', vendorId);

      if (!toolsData) return;

      const totalTools = toolsData.length;
      const activeTools = toolsData.filter(tool => tool.is_active).length;

      // Get total users across all tool subscriptions
      const { data: subscriptionsData } = await supabase
        .from('tool_subscriptions')
        .select('user_id')
        .in('tool_id', toolsData.map(tool => tool.id));

      const uniqueUsers = new Set(subscriptionsData?.map(sub => sub.user_id) || []).size;

      // Get total revenue from credit transactions
      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('credits_amount')
        .in('tool_id', toolsData.map(tool => tool.id))
        .eq('type', 'tool_usage');

      const totalRevenue = transactionsData?.reduce((sum, transaction) => 
        sum + (transaction.credits_amount || 0), 0) || 0;

      setVendorStats({
        totalTools,
        activeTools,
        totalUsers: uniqueUsers,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
    }
  };

  // Fetch tool-specific analytics
  const fetchToolAnalytics = async (toolId: string) => {
    try {
      const supabase = createClient();
      
      // Get usage count (credit transactions for this tool)
      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('credits_amount')
        .eq('tool_id', toolId)
        .eq('type', 'tool_usage');

      const usageCount = transactionsData?.length || 0;
      const revenue = transactionsData?.reduce((sum, transaction) => 
        sum + (transaction.credits_amount || 0), 0) || 0;

      // Get active subscribers
      const { data: subscriptionsData } = await supabase
        .from('tool_subscriptions')
        .select('id')
        .eq('tool_id', toolId)
        .eq('status', 'active');

      const activeSubscribers = subscriptionsData?.length || 0;

      // Calculate revenue growth (month-over-month)
      // For now, using mock data - will be replaced with real calculation
      const currentMonthRevenue = revenue;
      const previousMonthRevenue = revenue * 0.85; // Mock: assume 15% growth
      const revenueGrowth = previousMonthRevenue > 0 
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0;

      setToolStats({
        usageCount,
        activeSubscribers,
        revenue,
        revenueGrowth
      });
    } catch (error) {
      console.error('Error fetching tool analytics:', error);
    }
  };

  // Fetch user data and tools
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

        // Fetch user's tools
        const supabase = createClient();
        const { data: toolsData, error } = await supabase
          .from('tools')
          .select('*')
          .eq('user_profile_id', data.id);

        if (!error && toolsData) {
          setToolsCount(toolsData.length);
          setHasTools(toolsData.length > 0);
          const mappedTools = toolsData.map(tool => ({
            id: tool.id,
            name: tool.name,
          }));
          setTools(mappedTools);
          
          // Set initial tool selection
          if (toolsData.length > 0) {
            const savedToolId = localStorage.getItem('selectedToolId');
            const toolExists = savedToolId && toolsData.some(tool => tool.id === savedToolId);
            const initialToolId = toolExists ? savedToolId : toolsData[0].id;
            const initialTool = toolsData.find(tool => tool.id === initialToolId);
            
            setSelectedToolId(initialToolId);
            setSelectedToolName(initialTool?.name || '');
            
            // Fetch analytics
            fetchVendorAnalytics(data.id);
            fetchToolAnalytics(initialToolId);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

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
      <Sidebar
        isOpen={isMenuOpen}
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={user?.id || ''}
        userRole={userRole}
        hasTools={hasTools}
      />

      <main
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden ${
          isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'
        }`}
      >
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden border-b border-[#374151]">
          <div className="flex items-center justify-between flex-wrap gap-3 p-2 sm:p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
              </button>

              {hasTools && user?.id && (
                <ToolSelector
                  userId={user.id}
                  currentToolId={selectedToolId}
                  onToolChange={handleToolChange}
                  onToolsFetched={handleToolsFetched}
                  onDeleteTool={handleDeleteToolRequest}
                  refreshToken={toolRefreshToken}
                />
              )}

              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">
                {hasTools ? 'Vendor Dashboard' : 'Become a Vendor'}
              </h1>
            </div>

            {hasTools && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/vendor-dashboard/publish')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Create New Tool
                </button>

                <button
                  onClick={() => {
                    if (selectedToolId) {
                      const currentTool = tools.find((tool) => tool.id === selectedToolId);
                      if (currentTool) {
                        handleDeleteToolRequest(currentTool);
                      }
                    }
                  }}
                  disabled={!selectedToolId || isDeletingTool}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-500/60 text-red-200 rounded-lg hover:bg-red-500/10 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Tool
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!hasTools ? (
            <>
              <div className="max-w-3xl mx-auto text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#3ecf8e]/20 rounded-full mb-6">
                  <Rocket className="w-10 h-10 text-[#3ecf8e]" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#ededed] mb-4">
                  Ready to publish your first tool?
                </h2>
                <p className="text-lg text-[#9ca3af] mb-8">
                  Share your tools with thousands of 1sub users and reach a wider audience. It only takes a few minutes to get started.
                </p>
                <button
                  onClick={() => router.push('/vendor-dashboard/publish')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors text-lg font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Publish Your First Tool
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <div className="w-12 h-12 bg-[#3ecf8e]/20 rounded-lg flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-[#3ecf8e]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#ededed] mb-2">Set Your Pricing</h3>
                  <p className="text-sm text-[#9ca3af]">
                    Choose your own pricing model for your tools. Flexible options for one-time purchases or subscriptions.
                  </p>
                </div>

                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <div className="w-12 h-12 bg-[#3ecf8e]/20 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-[#3ecf8e]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#ededed] mb-2">Reach Users</h3>
                  <p className="text-sm text-[#9ca3af]">
                    Get discovered by thousands of users actively looking for tools like yours.
                  </p>
                </div>

                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <div className="w-12 h-12 bg-[#3ecf8e]/20 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-[#3ecf8e]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#ededed] mb-2">Track Analytics</h3>
                  <p className="text-sm text-[#9ca3af]">
                    Monitor your tool&apos;s performance with detailed analytics and user insights.
                  </p>
                </div>
              </div>

              <div className="bg-[#1f2937] rounded-lg p-8 border border-[#374151]">
                <h3 className="text-2xl font-bold text-[#ededed] mb-6 text-center">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                      1
                    </div>
                    <h4 className="font-semibold text-[#ededed] mb-2">Publish Your Tool</h4>
                    <p className="text-sm text-[#9ca3af]">
                      Add your tool details, set pricing, and configure your API endpoint.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                      2
                    </div>
                    <h4 className="font-semibold text-[#ededed] mb-2">Users Discover</h4>
                    <p className="text-sm text-[#9ca3af]">
                      Your tool appears in our marketplace for users to find and use.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                      3
                    </div>
                    <h4 className="font-semibold text-[#ededed] mb-2">Get Usage</h4>
                    <p className="text-sm text-[#9ca3af]">
                      Users can access and use your tool directly from the marketplace.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#3ecf8e]" />
                  <p className="text-xs text-[#9ca3af]">
                    Total Tools <span className="font-bold text-[#ededed]">{vendorStats.totalTools}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#3ecf8e]" />
                  <p className="text-xs text-[#9ca3af]">
                    Active Tools <span className="font-bold text-[#ededed]">{vendorStats.activeTools}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3ecf8e]" />
                  <p className="text-xs text-[#9ca3af]">
                    Total Users <span className="font-bold text-[#ededed]">{vendorStats.totalUsers.toLocaleString()}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#3ecf8e]" />
                  <p className="text-xs text-[#9ca3af]">
                    Total Revenue <span className="font-bold text-[#ededed]">{vendorStats.totalRevenue.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {selectedToolName && (
                <>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-8 bg-[#3ecf8e] rounded-full"></div>
                      <h2 className="text-3xl font-bold text-[#ededed]">
                        Currently Viewing: {selectedToolName}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <div className="flex items-center">
                        <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                          <BarChart3 className="w-6 h-6 text-[#3ecf8e]" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-[#9ca3af]">Usage Count</p>
                          <p className="text-2xl font-bold text-[#ededed]">{toolStats.usageCount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <div className="flex items-center">
                        <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                          <Users className="w-6 h-6 text-[#3ecf8e]" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-[#9ca3af]">Active Subscribers</p>
                          <p className="text-2xl font-bold text-[#ededed]">{toolStats.activeSubscribers.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <div className="flex items-center">
                        <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                          <DollarSign className="w-6 h-6 text-[#3ecf8e]" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-[#9ca3af]">Revenue</p>
                          <p className="text-2xl font-bold text-[#ededed]">{toolStats.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <div className="flex items-center">
                        <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-[#3ecf8e]" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-[#9ca3af]">Revenue Growth</p>
                          <p
                            className={`text-2xl font-bold ${
                              toolStats.revenueGrowth > 0
                                ? 'text-green-400'
                                : toolStats.revenueGrowth < 0
                                ? 'text-red-400'
                                : 'text-[#ededed]'
                            }`}
                          >
                            {toolStats.revenueGrowth > 0 ? '+' : ''}
                            {toolStats.revenueGrowth.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {[
                      'Usage Over Time',
                      'Revenue Over Time',
                      'Active Users Trend',
                      'Performance Metrics',
                    ].map((title) => (
                      <div key={title} className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                        <h3 className="text-lg font-semibold text-[#ededed] mb-4">{title}</h3>
                        <div className="h-64 border border-[#374151] rounded-lg flex items-center justify-center">
                          <p className="text-[#9ca3af]">
                            Chart placeholder - {title.toLowerCase()} for {selectedToolName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <Footer />
        </div>
      </main>

      {isDeleteDialogOpen && toolPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg bg-[#151515] border border-[#374151] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#ededed] mb-2">Delete tool</h2>
            <p className="text-sm text-[#9ca3af] mb-4">
              Are you sure you want to delete <span className="text-[#ededed] font-semibold">{toolPendingDeletion.name}</span>? This action will permanently remove the tool and all associated products, subscriptions, and usage history.
            </p>
            {deleteError && <p className="mb-4 text-sm text-red-400">{deleteError}</p>}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeletingTool}
                className="px-4 py-2 text-sm font-semibold text-[#ededed] border border-[#374151] rounded-lg hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTool}
                disabled={isDeletingTool}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingTool ? 'Deleting…' : 'Delete tool'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

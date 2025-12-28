'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Settings, Plus, BarChart3, TrendingUp, DollarSign, Users, Rocket, ArrowRight, Edit, Check, Trash2 } from 'lucide-react';
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
  const [isVendor, setIsVendor] = useState(false);

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
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

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
  const [chartData, setChartData] = useState<{
    usage: Array<{ date: string; count: number }>;
    revenue: Array<{ date: string; amount: number }>;
    activeUsers: Array<{ date: string; count: number }>;
  }>({
    usage: [],
    revenue: [],
    activeUsers: [],
  });
  const [onboardingChecklist, setOnboardingChecklist] = useState({
    hasPublishedTool: false,
    hasCreatedProduct: false,
    hasConfiguredApi: false,
    hasFirstSale: false,
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
    setDeleteConfirmationText('');
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
      return;
    }

    const nextTool = updatedTools[0];
    setSelectedToolId(nextTool.id);
    setSelectedToolName(nextTool.name);
    localStorage.setItem('selectedToolId', nextTool.id);
    fetchToolAnalytics(nextTool.id);
    setHasTools(true);
  };

  const handleConfirmDeleteTool = async () => {
    if (!toolPendingDeletion || !user) return;

    setIsDeletingTool(true);
    setDeleteError(null);

    try {
      const toolId = toolPendingDeletion.id;

      // Use the API endpoint which properly handles deletion with service role
      const response = await fetch(`/api/vendor/tools/${toolId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Failed to delete tool');
      }

      const updatedTools = tools.filter((tool) => tool.id !== toolId);
      setTools(updatedTools);
      resetToolSelection(updatedTools);

      // Refresh vendor analytics
      await fetchVendorAnalytics(user.id);

      setToolPendingDeletion(null);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationText('');
      setToolRefreshToken((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting tool:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete tool. Please try again.');
    } finally {
      setIsDeletingTool(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setToolPendingDeletion(null);
    setDeleteError(null);
    setDeleteConfirmationText('');
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
      const activeTools = toolsData.filter((tool: { id: string; is_active: boolean }) => tool.is_active).length;
      
      // Update onboarding checklist - has published tool
      setOnboardingChecklist(prev => ({
        ...prev,
        hasPublishedTool: totalTools > 0,
      }));

      // Get total users across all tool subscriptions
      const { data: subscriptionsData } = await supabase
        .from('tool_subscriptions')
        .select('user_id')
        .in('tool_id', toolsData.map((tool: { id: string; is_active: boolean }) => tool.id));

      const uniqueUsers = new Set(subscriptionsData?.map((sub: { user_id: string }) => sub.user_id) || []).size;

      // Get total revenue from vendor earnings (type='add' with reason containing 'Tool sale:')
      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('credits_amount')
        .eq('user_id', vendorId)
        .in('tool_id', toolsData.map((tool: { id: string; is_active: boolean }) => tool.id))
        .eq('type', 'add')
        .ilike('reason', 'Tool sale:%');

      const totalRevenue = transactionsData?.reduce((sum: number, transaction: { credits_amount: number | null }) =>
        sum + (transaction.credits_amount || 0), 0) || 0;

      setVendorStats({
        totalTools,
        activeTools,
        totalUsers: uniqueUsers,
        totalRevenue
      });
      
      // Update onboarding checklist - has first sale
      setOnboardingChecklist(prev => ({
        ...prev,
        hasFirstSale: (transactionsData?.length || 0) > 0,
      }));
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
    }
  };

  // Fetch tool-specific analytics
  const fetchToolAnalytics = async (toolId: string) => {
    try {
      const supabase = createClient();

      // Get vendor earnings for this tool (type='add' with reason containing 'Tool sale:')
      // Also get the tool's vendor ID
      const { data: toolData } = await supabase
        .from('tools')
        .select('user_profile_id')
        .eq('id', toolId)
        .single();
        
      if (!toolData) return;
      
      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('credits_amount, created_at')
        .eq('user_id', toolData.user_profile_id)
        .eq('tool_id', toolId)
        .eq('type', 'add')
        .ilike('reason', 'Tool sale:%')
        .order('created_at', { ascending: true });

      const usageCount = transactionsData?.length || 0;
      const revenue = transactionsData?.reduce((sum: number, transaction: { credits_amount: number | null; created_at: string }) =>
        sum + (transaction.credits_amount || 0), 0) || 0;

      // Get active subscribers
      const { data: subscriptionsData } = await supabase
        .from('tool_subscriptions')
        .select('id, created_at')
        .eq('tool_id', toolId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      const activeSubscribers = subscriptionsData?.length || 0;

      // Calculate revenue growth (month-over-month) using real data
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);
      
      // Get previous month revenue
      const { data: previousMonthData } = await supabase
        .from('credit_transactions')
        .select('credits_amount')
        .eq('user_id', toolData.user_profile_id)
        .eq('tool_id', toolId)
        .eq('type', 'add')
        .ilike('reason', 'Tool sale:%')
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());
      
      const previousMonthRevenue = previousMonthData?.reduce((sum: number, tx: { credits_amount: number | null }) => 
        sum + (tx.credits_amount || 0), 0) || 0;
      
      const revenueGrowth = previousMonthRevenue > 0
        ? ((revenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : revenue > 0 ? 100 : 0;

      setToolStats({
        usageCount,
        activeSubscribers,
        revenue,
        revenueGrowth
      });

      // Build chart data from transaction history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentTransactions = transactionsData?.filter(
        (tx: { created_at: string }) => new Date(tx.created_at) >= thirtyDaysAgo
      ) || [];
      
      // Group transactions by day
      const usageByDay = new Map<string, number>();
      const revenueByDay = new Map<string, number>();
      
      recentTransactions.forEach((tx: { created_at: string; credits_amount: number | null }) => {
        const date = new Date(tx.created_at).toISOString().split('T')[0];
        usageByDay.set(date, (usageByDay.get(date) || 0) + 1);
        revenueByDay.set(date, (revenueByDay.get(date) || 0) + (tx.credits_amount || 0));
      });
      
      // Group active users by day of subscription
      const activeUsersByDay = new Map<string, Set<string>>();
      subscriptionsData?.forEach((sub: { created_at: string; id: string }) => {
        const date = new Date(sub.created_at).toISOString().split('T')[0];
        if (!activeUsersByDay.has(date)) {
          activeUsersByDay.set(date, new Set());
        }
        activeUsersByDay.get(date)!.add(sub.id);
      });
      
      // Convert maps to arrays and sort
      const usage = Array.from(usageByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const revenueChart = Array.from(revenueByDay.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const activeUsersChart = Array.from(activeUsersByDay.entries())
        .map(([date, users]) => ({ date, count: users.size }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      setChartData({
        usage,
        revenue: revenueChart,
        activeUsers: activeUsersChart,
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

        // Check if user is a vendor - redirect if not
        if (!data.isVendor) {
          alert('You must be an approved vendor to access the vendor dashboard. Please apply to become a vendor first.');
          router.push('/vendors/apply');
          return;
        }

        setUser({
          id: data.id,
          fullName: data.fullName || null,
          email: data.email || '',
        });

        if (data.role) {
          setUserRole(data.role);
        }

        if (data.isVendor !== undefined) {
          setIsVendor(data.isVendor);
        }

        // Fetch user's tools via the server-side API endpoint
        const toolsResponse = await fetch('/api/vendor/tools');
        
        if (toolsResponse.ok) {
          const toolsResult = await toolsResponse.json();
          const toolsData = toolsResult.tools;

          if (toolsData) {
            setHasTools(toolsData.length > 0);
            const mappedTools = toolsData.map((tool: { id: string; name: string }) => ({
              id: tool.id,
              name: tool.name,
            }));
            setTools(mappedTools);

            // Set initial tool selection
            if (toolsData.length > 0) {
              const savedToolId = localStorage.getItem('selectedToolId');
              const toolExists = savedToolId && toolsData.some((tool: { id: string; name: string }) => tool.id === savedToolId);
              const initialToolId = toolExists ? savedToolId : toolsData[0].id;
              const initialTool = toolsData.find((tool: { id: string; name: string }) => tool.id === initialToolId);

              setSelectedToolId(initialToolId);
              setSelectedToolName(initialTool?.name || '');

              // Fetch analytics
              fetchVendorAnalytics(data.id);
              fetchToolAnalytics(initialToolId);
              
              // Check onboarding progress
              checkOnboardingProgress(data.id, toolsData);
            }
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
  
  // Check onboarding progress
  const checkOnboardingProgress = async (vendorId: string, tools: Array<{ id: string; name: string }>) => {
    try {
      const supabase = createClient();
      
      // Check if any tool has products
      if (tools.length > 0) {
        const { data: productsData } = await supabase
          .from('tool_products')
          .select('id')
          .in('tool_id', tools.map(t => t.id))
          .limit(1);
        
        setOnboardingChecklist(prev => ({
          ...prev,
          hasCreatedProduct: (productsData?.length || 0) > 0,
        }));
      }
      
      // Check if API keys are configured
      const { data: apiKeysData } = await supabase
        .from('api_keys')
        .select('id')
        .in('tool_id', tools.map(t => t.id))
        .limit(1);
      
      setOnboardingChecklist(prev => ({
        ...prev,
        hasConfiguredApi: (apiKeysData?.length || 0) > 0,
      }));
    } catch (error) {
      console.error('Error checking onboarding progress:', error);
    }
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
      <Sidebar
        isOpen={isMenuOpen}
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={user?.id || ''}
        userRole={userRole}
        hasTools={hasTools}
        isVendor={isVendor}
      />

      <main
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}`}
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  add new tool
                </button>

                <button
                  onClick={() => {
                    if (selectedToolId) {
                      router.push(`/vendor-dashboard/tools/${selectedToolId}/edit`);
                    }
                  }}
                  disabled={!selectedToolId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#374151] text-white rounded-lg hover:bg-[#4b5563] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="w-3.5 h-3.5" />
                  edit
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
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete Tool"
                >
                  <Trash2 className="w-4 h-4" />
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

              {/* Onboarding Checklist */}
              {(!onboardingChecklist.hasPublishedTool || !onboardingChecklist.hasCreatedProduct || !onboardingChecklist.hasConfiguredApi || !onboardingChecklist.hasFirstSale) && (
                <div className="mb-8 bg-gradient-to-r from-[#3ecf8e]/10 to-[#2dd4bf]/10 border border-[#3ecf8e]/30 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-[#3ecf8e]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#ededed] mb-1">Getting Started</h3>
                      <p className="text-sm text-[#d1d5db]">
                        Complete these steps to start monetizing your tools
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${onboardingChecklist.hasPublishedTool ? 'bg-[#3ecf8e]' : 'border-2 border-[#4b5563]'}`}>
                        {onboardingChecklist.hasPublishedTool && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <span className={`text-sm ${onboardingChecklist.hasPublishedTool ? 'text-[#d1d5db]' : 'text-[#9ca3af]'}`}>
                        Publish your first tool
                      </span>
                      {!onboardingChecklist.hasPublishedTool && (
                        <button
                          onClick={() => router.push('/vendor-dashboard/publish')}
                          className="ml-auto text-xs px-3 py-1 bg-[#3ecf8e] text-black rounded hover:bg-[#2dd4bf] transition-colors font-medium"
                        >
                          Publish Tool
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${onboardingChecklist.hasCreatedProduct ? 'bg-[#3ecf8e]' : 'border-2 border-[#4b5563]'}`}>
                        {onboardingChecklist.hasCreatedProduct && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <span className={`text-sm ${onboardingChecklist.hasCreatedProduct ? 'text-[#d1d5db]' : 'text-[#9ca3af]'}`}>
                        Create pricing for your tool
                      </span>
                      {!onboardingChecklist.hasCreatedProduct && onboardingChecklist.hasPublishedTool && (
                        <button
                          onClick={() => router.push('/vendor-dashboard/products')}
                          className="ml-auto text-xs px-3 py-1 bg-[#3ecf8e] text-black rounded hover:bg-[#2dd4bf] transition-colors font-medium"
                        >
                          Set Pricing
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${onboardingChecklist.hasConfiguredApi ? 'bg-[#3ecf8e]' : 'border-2 border-[#4b5563]'}`}>
                        {onboardingChecklist.hasConfiguredApi && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <span className={`text-sm ${onboardingChecklist.hasConfiguredApi ? 'text-[#d1d5db]' : 'text-[#9ca3af]'}`}>
                        Configure API and integration
                      </span>
                      {!onboardingChecklist.hasConfiguredApi && onboardingChecklist.hasPublishedTool && (
                        <button
                          onClick={() => router.push('/vendor-dashboard/integration')}
                          className="ml-auto text-xs px-3 py-1 bg-[#3ecf8e] text-black rounded hover:bg-[#2dd4bf] transition-colors font-medium"
                        >
                          View Guide
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${onboardingChecklist.hasFirstSale ? 'bg-[#3ecf8e]' : 'border-2 border-[#4b5563]'}`}>
                        {onboardingChecklist.hasFirstSale && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <span className={`text-sm ${onboardingChecklist.hasFirstSale ? 'text-[#d1d5db]' : 'text-[#9ca3af]'}`}>
                        Make your first sale
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#3ecf8e]/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#9ca3af]">Progress</span>
                      <span className="text-[#3ecf8e] font-medium">
                        {[onboardingChecklist.hasPublishedTool, onboardingChecklist.hasCreatedProduct, onboardingChecklist.hasConfiguredApi, onboardingChecklist.hasFirstSale].filter(Boolean).length} / 4
                      </span>
                    </div>
                  </div>
                </div>
              )}

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

              {(selectedToolName || selectedToolId) && (
                <>
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
                            className={`text-2xl font-bold ${toolStats.revenueGrowth > 0
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
                    {/* Usage Over Time */}
                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <h3 className="text-lg font-semibold text-[#ededed] mb-4">Usage Over Time</h3>
                      <div className="h-64 border border-[#374151] rounded-lg p-4">
                        {chartData.usage.length > 0 ? (
                          <div className="h-full flex flex-col">
                            <div className="flex-1 flex items-end justify-between gap-1">
                              {chartData.usage.map((point, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                                  <div 
                                    className="w-full bg-[#3ecf8e] rounded-t transition-all hover:bg-[#2dd4bf]"
                                    style={{ height: `${chartData.usage.length > 0 ? (point.count / Math.max(...chartData.usage.map(p => p.count))) * 100 : 0}%` }}
                                    title={`${point.date}: ${point.count} sales`}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-[#9ca3af] text-center">Last 30 days</div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-[#9ca3af]">No usage data yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Revenue Over Time */}
                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <h3 className="text-lg font-semibold text-[#ededed] mb-4">Revenue Over Time</h3>
                      <div className="h-64 border border-[#374151] rounded-lg p-4">
                        {chartData.revenue.length > 0 ? (
                          <div className="h-full flex flex-col">
                            <div className="flex-1 flex items-end justify-between gap-1">
                              {chartData.revenue.map((point, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                                  <div 
                                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-400"
                                    style={{ height: `${chartData.revenue.length > 0 ? (point.amount / Math.max(...chartData.revenue.map(p => p.amount))) * 100 : 0}%` }}
                                    title={`${point.date}: ${point.amount.toFixed(2)} credits`}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-[#9ca3af] text-center">Last 30 days</div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-[#9ca3af]">No revenue data yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Users Trend */}
                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <h3 className="text-lg font-semibold text-[#ededed] mb-4">Active Users Trend</h3>
                      <div className="h-64 border border-[#374151] rounded-lg p-4">
                        {chartData.activeUsers.length > 0 ? (
                          <div className="h-full flex flex-col">
                            <div className="flex-1 flex items-end justify-between gap-1">
                              {chartData.activeUsers.map((point, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                                  <div 
                                    className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-400"
                                    style={{ height: `${chartData.activeUsers.length > 0 ? (point.count / Math.max(...chartData.activeUsers.map(p => p.count))) * 100 : 0}%` }}
                                    title={`${point.date}: ${point.count} active users`}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-[#9ca3af] text-center">New subscriptions over time</div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-[#9ca3af]">No active user data yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Performance Metrics Summary */}
                    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                      <h3 className="text-lg font-semibold text-[#ededed] mb-4">Performance Metrics</h3>
                      <div className="h-64 flex flex-col justify-center space-y-4">
                        <div className="flex justify-between items-center p-3 bg-[#374151] rounded-lg">
                          <span className="text-[#9ca3af]">Avg Revenue per Sale</span>
                          <span className="text-[#3ecf8e] font-semibold">
                            {toolStats.usageCount > 0 
                              ? (toolStats.revenue / toolStats.usageCount).toFixed(2) 
                              : '0.00'} credits
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#374151] rounded-lg">
                          <span className="text-[#9ca3af]">Total Sales</span>
                          <span className="text-[#ededed] font-semibold">{toolStats.usageCount}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#374151] rounded-lg">
                          <span className="text-[#9ca3af]">Total Revenue</span>
                          <span className="text-[#ededed] font-semibold">{toolStats.revenue.toFixed(2)} credits</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#374151] rounded-lg">
                          <span className="text-[#9ca3af]">Growth Rate</span>
                          <span className={`font-semibold ${toolStats.revenueGrowth > 0 ? 'text-green-400' : toolStats.revenueGrowth < 0 ? 'text-red-400' : 'text-[#ededed]'}`}>
                            {toolStats.revenueGrowth > 0 ? '+' : ''}{toolStats.revenueGrowth.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
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
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Type <span className="font-mono bg-[#374151] px-2 py-0.5 rounded text-[#3ecf8e]">{toolPendingDeletion.name}</span> to confirm deletion:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Enter tool name"
                className="w-full px-4 py-2 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={isDeletingTool}
              />
            </div>
            
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
                disabled={isDeletingTool || deleteConfirmationText !== toolPendingDeletion.name}
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

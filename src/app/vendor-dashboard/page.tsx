'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Settings, Plus, BarChart3, TrendingUp, DollarSign, Users, Rocket, ArrowRight } from 'lucide-react';
import Sidebar from '../backoffice/components/Sidebar';
import Footer from '../components/Footer';
import { createClient } from '@/lib/supabase/client';

export default function VendorDashboard() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // User data states
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  const [toolsCount, setToolsCount] = useState(0);

  // Mock stats - Replace with real data
  const [stats, setStats] = useState({
    totalTools: 0,
    activeTools: 0,
    totalUsers: 0,
    creditsEarned: 0
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
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

        if (data.credits !== undefined) {
          setCredits(data.credits);
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
          
          // Update stats
          const activeCount = toolsData.filter(tool => tool.is_active).length;
          setStats({
            totalTools: toolsData.length,
            activeTools: activeCount,
            totalUsers: 0, // TODO: Fetch from usage logs
            creditsEarned: 0 // Total revenue - TODO: Fetch from transactions
          });
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
      {/* Unified Sidebar */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        credits={credits}
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">
              {hasTools ? 'Vendor Dashboard' : 'Become a Vendor'}
            </h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!hasTools ? (
            // First-time vendor experience - Focus on creating first tool
            <>
              <div className="max-w-3xl mx-auto text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#3ecf8e]/20 rounded-full mb-6">
                  <Rocket className="w-10 h-10 text-[#3ecf8e]" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#ededed] mb-4">
                  Ready to publish your first tool?
                </h2>
                <p className="text-lg text-[#9ca3af] mb-8">
                  Share your tools with thousands of 1sub users and reach a wider audience. 
                  It only takes a few minutes to get started.
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

              {/* Benefits Grid */}
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

              {/* How It Works */}
              <div className="bg-[#1f2937] rounded-lg p-8 border border-[#374151]">
                <h3 className="text-2xl font-bold text-[#ededed] mb-6 text-center">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                      1
                    </div>
                    <h4 className="font-semibold text-[#ededed] mb-2">Publish Your Tool</h4>
                    <p className="text-sm text-[#9ca3af]">
                      Add your tool details, set pricing, and configure your API endpoint
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                      2
                    </div>
                    <h4 className="font-semibold text-[#ededed] mb-2">Users Discover</h4>
                    <p className="text-sm text-[#9ca3af]">
                      Your tool appears in our marketplace for users to find and use
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                      3
                    </div>
                    <h4 className="font-semibold text-[#ededed] mb-2">Get Usage</h4>
                    <p className="text-sm text-[#9ca3af]">
                      Users can access and use your tool directly from the marketplace
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Existing vendor dashboard - Show stats and management
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <div className="flex items-center">
                    <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                      <Settings className="w-6 h-6 text-[#3ecf8e]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-[#9ca3af]">Total Tools</p>
                      <p className="text-2xl font-bold text-[#ededed]">{stats.totalTools}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <div className="flex items-center">
                    <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-[#3ecf8e]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-[#9ca3af]">Active Tools</p>
                      <p className="text-2xl font-bold text-[#ededed]">{stats.activeTools}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <div className="flex items-center">
                    <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                      <Users className="w-6 h-6 text-[#3ecf8e]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-[#9ca3af]">Total Users</p>
                      <p className="text-2xl font-bold text-[#ededed]">{stats.totalUsers.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <div className="flex items-center">
                    <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                      <DollarSign className="w-6 h-6 text-[#3ecf8e]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-[#9ca3af]">Total Revenue</p>
                      <p className="text-2xl font-bold text-[#ededed]">{stats.creditsEarned.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <h3 className="text-lg font-semibold text-[#ededed] mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/vendor-dashboard/publish')}
                      className="w-full flex items-center justify-center px-4 py-3 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Publish New Tool
                    </button>
                    <button
                      onClick={() => router.push('/vendor-dashboard/analytics')}
                      className="w-full flex items-center justify-center px-4 py-3 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </button>
                  </div>
                </div>

                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <h3 className="text-lg font-semibold text-[#ededed] mb-4">Resources</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/vendor-dashboard/api')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors"
                    >
                      <span>API Documentation</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push('/vendor-dashboard/users')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors"
                    >
                      <span>View Users</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push('/vendor-dashboard/transactions')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors"
                    >
                      <span>Transaction History</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <Footer />
        </div>
      </main>
    </div>
  );
}

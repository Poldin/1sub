'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Settings, Users, Plus, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import VendorSidebar from './components/VendorSidebar';

export default function VendorDashboard() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Mock data
  const stats = {
    totalTools: 8,
    activeTools: 6,
    totalUsers: 1247,
    creditsEarned: 15420
  };

  const recentActivity = [
    { id: '1', action: 'New tool published', tool: 'AI Content Generator', time: '2 hours ago' },
    { id: '2', action: 'User used tool', tool: 'Data Analyzer', credits: 10, time: '4 hours ago' },
    { id: '3', action: 'Tool updated', tool: 'Image Editor', time: '1 day ago' },
    { id: '4', action: 'New user registered', tool: 'Video Creator', time: '2 days ago' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <VendorSidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Vendor Dashboard</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <p className="text-xs text-green-400">+2 this month</p>
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
                <p className="text-xs text-green-400">75% active</p>
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
                <p className="text-xs text-green-400">+12.5%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Credits Earned</p>
                <p className="text-2xl font-bold text-[#ededed]">{stats.creditsEarned.toLocaleString()}</p>
                <p className="text-xs text-green-400">+8.2%</p>
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
              <button
                onClick={() => router.push('/vendor-dashboard/tools')}
                className="w-full flex items-center justify-center px-4 py-3 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Tools
              </button>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-[#374151] rounded-lg">
                  <div>
                    <p className="text-sm text-[#ededed]">{activity.action}</p>
                    <p className="text-xs text-[#9ca3af]">{activity.tool}</p>
                    {activity.credits && (
                      <p className="text-xs text-[#3ecf8e]">+{activity.credits} credits</p>
                    )}
                  </div>
                  <span className="text-xs text-[#9ca3af]">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
          <h3 className="text-lg font-semibold text-[#ededed] mb-4">Getting Started</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#374151] rounded-lg">
              <h4 className="font-medium text-[#ededed] mb-2">1. Publish Your First Tool</h4>
              <p className="text-sm text-[#9ca3af] mb-3">Create and publish your first tool to start earning credits</p>
              <button
                onClick={() => router.push('/vendor-dashboard/publish')}
                className="text-[#3ecf8e] text-sm hover:underline"
              >
                Get Started →
              </button>
            </div>
            <div className="p-4 bg-[#374151] rounded-lg">
              <h4 className="font-medium text-[#ededed] mb-2">2. Set Up API Access</h4>
              <p className="text-sm text-[#9ca3af] mb-3">Configure your API key for tool integration</p>
              <button
                onClick={() => router.push('/vendor-dashboard/api')}
                className="text-[#3ecf8e] text-sm hover:underline"
              >
                Configure API →
              </button>
            </div>
            <div className="p-4 bg-[#374151] rounded-lg">
              <h4 className="font-medium text-[#ededed] mb-2">3. Monitor Performance</h4>
              <p className="text-sm text-[#9ca3af] mb-3">Track your tools&apos; usage and earnings</p>
              <button
                onClick={() => router.push('/vendor-dashboard/analytics')}
                className="text-[#3ecf8e] text-sm hover:underline"
              >
                View Analytics →
              </button>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}


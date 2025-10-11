'use client';

import { useState } from 'react';
import { Menu, TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import VendorSidebar from '../components/VendorSidebar';

export default function VendorAnalyticsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Mock analytics data
  const analyticsData = {
    totalUses: 1247,
    creditsEarned: 15420,
    activeUsers: 892,
    topTool: 'AI Content Generator'
  };

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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Analytics</h1>
            
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
                <TrendingUp className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Total Tool Uses</p>
                <p className="text-2xl font-bold text-[#ededed]">{analyticsData.totalUses.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-[#ededed]">{analyticsData.creditsEarned.toLocaleString()}</p>
                <p className="text-xs text-green-400">+8.2%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <Users className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Active Users</p>
                <p className="text-2xl font-bold text-[#ededed]">{analyticsData.activeUsers.toLocaleString()}</p>
                <p className="text-xs text-green-400">+15.3%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <Award className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Top Tool</p>
                <p className="text-lg font-bold text-[#ededed]">{analyticsData.topTool}</p>
                <p className="text-xs text-green-400">Most popular</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">Tool Usage Over Time</h3>
            <div className="h-64 border border-[#374151] rounded-lg flex items-center justify-center">
              <p className="text-[#9ca3af]">Chart placeholder - Usage trends</p>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">Credits Earned Over Time</h3>
            <div className="h-64 border border-[#374151] rounded-lg flex items-center justify-center">
              <p className="text-[#9ca3af]">Chart placeholder - Revenue trends</p>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}


'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Users, CreditCard, Activity, Settings } from 'lucide-react';
import AdminSidebar from './components/AdminSidebar';

interface DashboardStats {
  totalBalance: number;
  userCount: number;
  averageBalance: number;
}

interface RecentTransaction {
  id: string;
  delta: number;
  transaction_type: string;
  reason: string;
  created_at: string;
  users: {
    email: string;
    full_name: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Mock data for UI only
  const stats: DashboardStats = {
    totalBalance: 15000,
    userCount: 150,
    averageBalance: 100
  };
  
  const recentTransactions: RecentTransaction[] = [
    {
      id: '1',
      delta: 100,
      transaction_type: 'grant',
      reason: 'Welcome bonus',
      created_at: new Date().toISOString(),
      users: { email: 'user1@example.com', full_name: 'John Doe' }
    },
    {
      id: '2',
      delta: -20,
      transaction_type: 'consume',
      reason: 'Tool usage',
      created_at: new Date().toISOString(),
      users: { email: 'user2@example.com', full_name: 'Jane Smith' }
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <AdminSidebar 
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Admin Dashboard</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="admin-dashboard">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <Users className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Total Users</p>
                <p className="text-2xl font-bold text-[#ededed]" data-testid="total-users">{stats?.userCount || 0}</p>
                <p className="text-xs text-green-400">+12.5%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <CreditCard className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Total Credits</p>
                <p className="text-2xl font-bold text-[#ededed]" data-testid="total-credits">
                  {stats?.totalBalance?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-green-400">+8.2%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <Activity className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Active Vendors</p>
                <p className="text-2xl font-bold text-[#ededed]">24</p>
                <p className="text-xs text-green-400">+3</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <Settings className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Tools Published</p>
                <p className="text-2xl font-bold text-[#ededed]">156</p>
                <p className="text-xs text-green-400">+7</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <CreditCard className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Active Subscriptions</p>
                <p className="text-2xl font-bold text-[#ededed]">89</p>
                <p className="text-xs text-green-400">+15.3%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Placeholders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">Platform Activity</h3>
            <div className="h-48 border border-[#374151] rounded-lg flex items-center justify-center">
              <p className="text-[#9ca3af]">Chart placeholder - Activity over time</p>
            </div>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">Revenue Trends</h3>
            <div className="h-48 border border-[#374151] rounded-lg flex items-center justify-center">
              <p className="text-[#9ca3af]">Chart placeholder - Revenue trends</p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Recent Credit Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#9ca3af]">
                      No recent transactions
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[#374151]">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{transaction.users.full_name || 'N/A'}</p>
                          <p className="text-sm text-[#9ca3af]">{transaction.users.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.transaction_type === 'grant' 
                            ? 'bg-green-500/20 text-green-400'
                            : transaction.transaction_type === 'consume'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-medium ${
                        transaction.delta > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.delta > 0 ? '+' : ''}{transaction.delta}
                      </td>
                      <td className="px-6 py-4 text-[#9ca3af]">
                        {transaction.reason}
                      </td>
                      <td className="px-6 py-4 text-[#9ca3af]">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/users')}
                className="w-full flex items-center justify-center px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </button>
              <button
                onClick={() => router.push('/admin/usage-logs')}
                className="w-full flex items-center justify-center px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors"
              >
                <Activity className="w-4 h-4 mr-2" />
                View Usage Logs
              </button>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#9ca3af]">Database</span>
                <span className="text-green-400">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9ca3af]">API</span>
                <span className="text-green-400">Healthy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9ca3af]">Auth</span>
                <span className="text-green-400">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}

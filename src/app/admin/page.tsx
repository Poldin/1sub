'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CreditCard, Activity, Settings } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useUser } from '@/hooks/useUser';

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
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Check admin access
  useEffect(() => {
    console.log('Admin page: userLoading:', userLoading);
    console.log('Admin page: user:', user);
    
    if (!userLoading) {
      if (!user) {
        console.log('Admin page: No user, redirecting to login');
        router.push('/login');
        return;
      }
      
      console.log('Admin page: User role:', user.role);
      
      // Check if user is admin
      if (user.role !== 'admin') {
        console.log('Admin page: User is not admin, redirecting to backoffice');
        router.push('/backoffice');
        return;
      }
      
      console.log('Admin page: User is admin, allowing access');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/v1/admin/credits?userId=${user.id}`);
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/backoffice');
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setStats(data.summary);
      setRecentTransactions(data.recentTransactions);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3ecf8e]"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-[#ededed]">Admin Dashboard</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/admin/tools')}
                className="flex items-center px-3 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Tools
              </button>
              <button
                onClick={() => router.push('/backoffice')}
                className="px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors"
              >
                Back to App
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="admin-dashboard">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <Users className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Total Users</p>
                <p className="text-2xl font-bold text-[#ededed]" data-testid="total-users">{stats?.userCount || 0}</p>
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
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <div className="flex items-center">
              <div className="p-2 bg-[#3ecf8e]/20 rounded-lg">
                <Activity className="w-6 h-6 text-[#3ecf8e]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#9ca3af]">Average Balance</p>
                <p className="text-2xl font-bold text-[#ededed]" data-testid="average-balance">
                  {stats?.averageBalance?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Recent Credit Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[#9ca3af] py-8">
                      No recent transactions
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.users.full_name || 'N/A'}</p>
                          <p className="text-sm text-[#9ca3af]">{transaction.users.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.transaction_type === 'grant' 
                            ? 'bg-green-500/20 text-green-400'
                            : transaction.transaction_type === 'consume'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {transaction.transaction_type}
                        </span>
                      </TableCell>
                      <TableCell className={`font-medium ${
                        transaction.delta > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.delta > 0 ? '+' : ''}{transaction.delta}
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">
                        {transaction.reason}
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
    </div>
  );
}

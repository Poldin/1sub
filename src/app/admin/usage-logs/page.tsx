'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { shouldForceDesktopOpen } from '@/lib/layoutConfig';

interface UsageLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string | null;
  toolName: string;
  creditsUsed: number;
  status: string;
  duration: string | null;
}

interface UsageStats {
  usesToday: number;
  creditsConsumed: number;
  activeUsers: number;
}

export default function UsageLogs() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const forceDesktopOpen = shouldForceDesktopOpen(pathname);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [stats, setStats] = useState<UsageStats>({ usesToday: 0, creditsConsumed: 0, activeUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    fetchLogs();
  }, [dateFilter, statusFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('dateFilter', dateFilter);
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/usage-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setStats(data.stats || { usesToday: 0, creditsConsumed: 0, activeUsers: 0 });
      } else {
        throw new Error('Failed to fetch usage logs');
      }
    } catch (err) {
      console.error('Error fetching usage logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage logs');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getColorFromString = (str: string) => {
    const colors = ['bg-[#3ecf8e]', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-green-500', 'bg-blue-500'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <AdminSidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        forceDesktopOpen={forceDesktopOpen}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${forceDesktopOpen ? 'lg:ml-80' : isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Usage Logs</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
            <p className="mt-4 text-[#9ca3af]">Loading usage logs...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-8">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h3 className="text-sm font-medium text-[#9ca3af]">Uses Today</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.usesToday.toLocaleString()}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">Total tool uses</p>
              </div>
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h3 className="text-sm font-medium text-[#9ca3af]">Credits Consumed</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.creditsConsumed.toLocaleString()}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">Today</p>
              </div>
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h3 className="text-sm font-medium text-[#9ca3af]">Active Users</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.activeUsers}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">Unique today</p>
              </div>
            </div>

        {/* Usage Logs Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Recent Usage Logs</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Timestamp</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Tool</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Credits Used</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#374151]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#9ca3af]">
                      No usage logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 text-[#9ca3af] text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 ${getColorFromString(log.userEmail)} rounded-full flex items-center justify-center mr-2`}>
                            <span className={`font-bold text-xs ${getColorFromString(log.userEmail) === 'bg-[#3ecf8e]' ? 'text-black' : 'text-white'}`}>
                              {getInitials(log.userName, log.userEmail)}
                            </span>
                          </div>
                          <span className="text-[#ededed] text-sm">{log.userEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#ededed]">{log.toolName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#3ecf8e] font-medium">{log.creditsUsed}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : log.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {log.status === 'completed' ? 'Success' : log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#9ca3af] text-sm">{log.duration || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  creditsBalance: number;
  toolsUsed: number;
  registrationDate: string | null;
  lastActive: string;
  role: string;
  isVendor: boolean;
}

interface UsersStats {
  totalUsers: number;
  activeToday: number;
  totalCredits: number;
}

export default function UsersManagement() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UsersStats>({ totalUsers: 0, activeToday: 0, totalCredits: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      if (filter !== 'all') {
        params.append('filter', filter);
      }
      params.append('limit', '50');
      params.append('offset', '0');

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.stats || { totalUsers: 0, activeToday: 0, totalCredits: 0 });
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => {
      fetchUsers();
    }, 300);
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">User Management</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
            <p className="mt-4 text-[#9ca3af]">Loading users...</p>
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
                <h3 className="text-sm font-medium text-[#9ca3af]">Total Users</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.totalUsers}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">All registered users</p>
              </div>
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h3 className="text-sm font-medium text-[#9ca3af]">Active Today</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.activeToday}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">
                  {stats.totalUsers > 0 ? Math.round((stats.activeToday / stats.totalUsers) * 100) : 0}% active rate
                </p>
              </div>
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h3 className="text-sm font-medium text-[#9ca3af]">Total Credits</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.totalCredits.toFixed(0)}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">In circulation</p>
              </div>
            </div>

        {/* Users Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">All Users</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                />
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="new">New This Week</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Credits Balance</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Tools Used</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Registration</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Last Active</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#374151]">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#9ca3af]">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 ${getColorFromString(user.email)} rounded-full flex items-center justify-center mr-3`}>
                            <span className={`font-bold text-sm ${getColorFromString(user.email) === 'bg-[#3ecf8e]' ? 'text-black' : 'text-white'}`}>
                              {getInitials(user.full_name, user.email)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-[#ededed]">{user.full_name || 'N/A'}</div>
                            <div className="text-sm text-[#9ca3af]">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={user.creditsBalance > 0 ? 'text-[#3ecf8e] font-medium' : 'text-red-400 font-medium'}>
                          {user.creditsBalance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {user.toolsUsed} {user.toolsUsed === 1 ? 'tool' : 'tools'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#9ca3af]">
                        {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-[#9ca3af]">{user.lastActive}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">View</button>
                          <button className="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                        </div>
                      </td>
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

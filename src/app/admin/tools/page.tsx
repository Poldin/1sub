'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface Tool {
  id: string;
  name: string;
  description: string | null;
  vendorEmail: string;
  vendorName: string | null;
  category: string;
  status: string;
  creditsPerUse: number;
  totalUses: number;
  totalCreditsConsumed: number;
  created_at: string | null;
  updated_at: string | null;
}

interface ToolsStats {
  totalTools: number;
  activeTools: number;
  pendingTools: number;
}

export default function ToolsManagement() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [stats, setStats] = useState<ToolsStats>({ totalTools: 0, activeTools: 0, pendingTools: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    fetchTools();
  }, [statusFilter]);

  const fetchTools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/tools?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTools(data.tools || []);
        setStats(data.stats || { totalTools: 0, activeTools: 0, pendingTools: 0 });
      } else {
        throw new Error('Failed to fetch tools');
      }
    } catch (err) {
      console.error('Error fetching tools:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    // Debounce search - you can improve this with useDebounce hook if needed
    setTimeout(() => {
      fetchTools();
    }, 300);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'AI': 'bg-blue-500/20 text-blue-400',
      'Analytics': 'bg-purple-500/20 text-purple-400',
      'Design': 'bg-orange-500/20 text-orange-400',
      'Media': 'bg-red-500/20 text-red-400',
      'Development': 'bg-green-500/20 text-green-400',
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Tools Management</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
            <p className="mt-4 text-[#9ca3af]">Loading tools...</p>
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
                <h3 className="text-sm font-medium text-[#9ca3af]">Total Tools</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.totalTools}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">All registered tools</p>
              </div>
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h3 className="text-sm font-medium text-[#9ca3af]">Active Tools</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.activeTools}</p>
                <p className="text-sm text-[#3ecf8e] mt-1">
                  {stats.totalTools > 0 ? Math.round((stats.activeTools / stats.totalTools) * 100) : 0}% active rate
                </p>
              </div>
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h3 className="text-sm font-medium text-[#9ca3af]">Pending Review</h3>
                <p className="text-3xl font-bold text-[#ededed] mt-2">{stats.pendingTools}</p>
                <p className="text-sm text-yellow-400 mt-1">Awaiting approval</p>
              </div>
            </div>

        {/* Tools Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">All Tools</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                />
                <select 
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Tool Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Vendor</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Credits/Use</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Total Uses</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#9ca3af]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#374151]">
                {tools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-[#9ca3af]">
                      No tools found
                    </td>
                  </tr>
                ) : (
                  tools.map((tool) => (
                    <tr key={tool.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-[#3ecf8e] rounded-lg flex items-center justify-center mr-3">
                            <span className="text-black font-bold text-xs">{getInitials(tool.name)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-[#ededed]">{tool.name}</div>
                            <div className="text-sm text-[#9ca3af]">{tool.description || 'No description'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#ededed]">{tool.vendorEmail}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(tool.category)}`}>
                          {tool.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          tool.status === 'active' 
                            ? 'bg-green-500/20 text-green-400'
                            : tool.status === 'inactive'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {tool.status.charAt(0).toUpperCase() + tool.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#3ecf8e] font-medium">
                        {tool.creditsPerUse > 0 ? tool.creditsPerUse : '-'}
                      </td>
                      <td className="px-6 py-4 text-[#ededed]">
                        {tool.totalUses.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">Edit</button>
                          {tool.status === 'active' ? (
                            <button className="text-red-400 hover:text-red-300 text-sm">Disable</button>
                          ) : (
                            <button className="text-green-400 hover:text-green-300 text-sm">Enable</button>
                          )}
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

'use client';

import { useState } from 'react';
import { Menu, Users, Search } from 'lucide-react';
import VendorSidebar from '../components/VendorSidebar';

interface User {
  id: string;
  email: string;
  toolsUsed: string[];
  creditsSpent: number;
  lastActive: string;
}

export default function VendorUsersPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Mock users data
  const users: User[] = [
    {
      id: '1',
      email: 'user1@example.com',
      toolsUsed: ['AI Content Generator', 'Data Analyzer'],
      creditsSpent: 150,
      lastActive: '2 hours ago'
    },
    {
      id: '2',
      email: 'user2@example.com',
      toolsUsed: ['Image Editor', 'Video Creator'],
      creditsSpent: 89,
      lastActive: '1 day ago'
    },
    {
      id: '3',
      email: 'user3@example.com',
      toolsUsed: ['SEO Optimizer', 'AI Content Generator'],
      creditsSpent: 234,
      lastActive: '3 hours ago'
    },
    {
      id: '4',
      email: 'user4@example.com',
      toolsUsed: ['Data Analyzer'],
      creditsSpent: 45,
      lastActive: '1 week ago'
    },
    {
      id: '5',
      email: 'user5@example.com',
      toolsUsed: ['Video Creator', 'Image Editor', 'SEO Optimizer'],
      creditsSpent: 312,
      lastActive: '5 hours ago'
    }
  ];

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.toolsUsed.some(tool => tool.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Users</h1>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] w-4 h-4" />
              <input
                type="text"
                placeholder="Search users or tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
              />
            </div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Users Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Users Who Used Your Tools</h2>
            <p className="text-sm text-[#9ca3af] mt-1">Users who have interacted with your published tools</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">User Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Tools Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Credits Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[#9ca3af]">
                      {searchTerm ? 'No users found matching your search' : 'No users have used your tools yet'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-[#374151] hover:bg-[#374151]/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-[#3ecf8e]/20 rounded-lg mr-3">
                            <Users className="w-4 h-4 text-[#3ecf8e]" />
                          </div>
                          <span className="font-medium text-[#ededed]">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.toolsUsed.map((tool, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-[#374151] text-[#9ca3af] text-xs rounded"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#3ecf8e] font-medium">
                        {user.creditsSpent}
                      </td>
                      <td className="px-6 py-4 text-[#9ca3af]">
                        {user.lastActive}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Users</h3>
            <p className="text-2xl font-bold text-[#ededed]">{users.length}</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Credits Earned</h3>
            <p className="text-2xl font-bold text-[#3ecf8e]">
              {users.reduce((sum, user) => sum + user.creditsSpent, 0)}
            </p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Active Today</h3>
            <p className="text-2xl font-bold text-[#ededed]">
              {users.filter(user => user.lastActive.includes('hour') || user.lastActive.includes('day')).length}
            </p>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}


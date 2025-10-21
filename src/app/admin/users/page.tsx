'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

export default function UsersManagement() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Total Users</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">2,847</p>
            <p className="text-sm text-[#3ecf8e] mt-1">+127 this week</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Active Today</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">892</p>
            <p className="text-sm text-[#3ecf8e] mt-1">31% active rate</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Total Credits</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">45,230</p>
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
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                />
                <select className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm">
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
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center mr-3">
                        <span className="text-black font-bold text-sm">JD</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">John Doe</div>
                        <div className="text-sm text-[#9ca3af]">john.doe@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">245.50</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">12 tools</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af]">Dec 15, 2024</td>
                  <td className="px-6 py-4 text-[#9ca3af]">2 hours ago</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">View</button>
                      <button className="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">AS</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">Alice Smith</div>
                        <div className="text-sm text-[#9ca3af]">alice.smith@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">89.25</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">8 tools</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af]">Jan 3, 2025</td>
                  <td className="px-6 py-4 text-[#9ca3af]">1 day ago</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">View</button>
                      <button className="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">BJ</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">Bob Johnson</div>
                        <div className="text-sm text-[#9ca3af]">bob.johnson@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-red-400 font-medium">0.00</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">3 tools</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af]">Nov 28, 2024</td>
                  <td className="px-6 py-4 text-[#9ca3af]">1 week ago</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">View</button>
                      <button className="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">CW</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">Carol Wilson</div>
                        <div className="text-sm text-[#9ca3af]">carol.wilson@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">156.75</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">15 tools</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af]">Dec 22, 2024</td>
                  <td className="px-6 py-4 text-[#9ca3af]">3 hours ago</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">View</button>
                      <button className="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">DM</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">David Miller</div>
                        <div className="text-sm text-[#9ca3af]">david.miller@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">312.00</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">6 tools</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af]">Jan 8, 2025</td>
                  <td className="px-6 py-4 text-[#9ca3af]">30 minutes ago</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">View</button>
                      <button className="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

export default function UsageLogs() {
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Usage Logs</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Uses Today</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">1,247</p>
            <p className="text-sm text-[#3ecf8e] mt-1">+23% from yesterday</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Credits Consumed</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">8,945</p>
            <p className="text-sm text-[#3ecf8e] mt-1">Today</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Active Users</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">892</p>
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
                <select className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm">
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
                <select className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm">
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
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:32:15</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center mr-2">
                        <span className="text-black font-bold text-xs">JD</span>
                      </div>
                      <span className="text-[#ededed] text-sm">john.doe@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">AI Content Generator</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">5</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Success</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">1.2s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:28:42</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-xs">AS</span>
                      </div>
                      <span className="text-[#ededed] text-sm">alice.smith@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">Data Analyzer Pro</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">10</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Success</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2.1s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:25:18</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-xs">BJ</span>
                      </div>
                      <span className="text-[#ededed] text-sm">bob.johnson@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">Video Editor Plus</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">15</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Failed</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">0.8s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:22:55</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-xs">CW</span>
                      </div>
                      <span className="text-[#ededed] text-sm">carol.wilson@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">Design Studio Pro</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">8</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Pending</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">-</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:20:33</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-xs">DM</span>
                      </div>
                      <span className="text-[#ededed] text-sm">david.miller@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">Code Assistant</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">12</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Success</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">1.8s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:18:07</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-xs">EM</span>
                      </div>
                      <span className="text-[#ededed] text-sm">emma.davis@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">Photo Enhancer</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">6</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Success</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">1.5s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:15:29</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-xs">FG</span>
                      </div>
                      <span className="text-[#ededed] text-sm">frank.garcia@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">Social Media Manager</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">7</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Success</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2.3s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">2025-01-10 14:12:44</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-xs">HL</span>
                      </div>
                      <span className="text-[#ededed] text-sm">helen.lee@example.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#ededed]">Email Marketing Pro</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#3ecf8e] font-medium">9</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Failed</span>
                  </td>
                  <td className="px-6 py-4 text-[#9ca3af] text-sm">0.5s</td>
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

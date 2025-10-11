'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

export default function ToolsManagement() {
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Tools Management</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Total Tools</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">47</p>
            <p className="text-sm text-[#3ecf8e] mt-1">+3 this week</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Active Tools</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">42</p>
            <p className="text-sm text-[#3ecf8e] mt-1">89% active rate</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af]">Pending Review</h3>
            <p className="text-3xl font-bold text-[#ededed] mt-2">5</p>
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
                  className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
                />
                <select className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm">
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
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#3ecf8e] rounded-lg flex items-center justify-center mr-3">
                        <span className="text-black font-bold">AI</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">AI Content Generator</div>
                        <div className="text-sm text-[#9ca3af]">Generate high-quality content</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#ededed]">techcorp@example.com</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">AI</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                  </td>
                  <td className="px-6 py-4 text-[#3ecf8e] font-medium">5</td>
                  <td className="px-6 py-4 text-[#ededed]">12,847</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">Edit</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Disable</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white font-bold">DA</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">Data Analyzer Pro</div>
                        <div className="text-sm text-[#9ca3af]">Advanced data insights</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#ededed]">analytics@example.com</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Analytics</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                  </td>
                  <td className="px-6 py-4 text-[#3ecf8e] font-medium">10</td>
                  <td className="px-6 py-4 text-[#ededed]">8,923</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">Edit</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Disable</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white font-bold">DE</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">Design Studio Pro</div>
                        <div className="text-sm text-[#9ca3af]">Professional design tools</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#ededed]">design@example.com</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">Design</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Pending</span>
                  </td>
                  <td className="px-6 py-4 text-[#3ecf8e] font-medium">8</td>
                  <td className="px-6 py-4 text-[#ededed]">0</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-green-400 hover:text-green-300 text-sm">Approve</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Reject</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white font-bold">VE</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">Video Editor Plus</div>
                        <div className="text-sm text-[#9ca3af]">AI-powered video editing</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#ededed]">media@example.com</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Media</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                  </td>
                  <td className="px-6 py-4 text-[#3ecf8e] font-medium">15</td>
                  <td className="px-6 py-4 text-[#ededed]">5,234</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">Edit</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Disable</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white font-bold">CA</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#ededed]">Code Assistant</div>
                        <div className="text-sm text-[#9ca3af]">AI coding companion</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#ededed]">devtools@example.com</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Development</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Inactive</span>
                  </td>
                  <td className="px-6 py-4 text-[#3ecf8e] font-medium">12</td>
                  <td className="px-6 py-4 text-[#ededed]">2,156</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-green-400 hover:text-green-300 text-sm">Enable</button>
                      <button className="text-[#3ecf8e] hover:text-[#2dd4bf] text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}

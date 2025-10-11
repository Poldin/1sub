'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Plus, Edit, Trash2, Eye } from 'lucide-react';
import VendorSidebar from '../components/VendorSidebar';

interface Tool {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  creditsPerUse: number;
  launches: number;
  lastUsed: string;
}

export default function VendorToolsPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tools] = useState<Tool[]>([
    {
      id: '1',
      name: 'AI Content Generator',
      status: 'active',
      creditsPerUse: 5,
      launches: 1247,
      lastUsed: '2 hours ago'
    },
    {
      id: '2',
      name: 'Data Analyzer Pro',
      status: 'active',
      creditsPerUse: 10,
      launches: 892,
      lastUsed: '1 day ago'
    },
    {
      id: '3',
      name: 'Image Editor',
      status: 'inactive',
      creditsPerUse: 8,
      launches: 456,
      lastUsed: '1 week ago'
    },
    {
      id: '4',
      name: 'Video Creator',
      status: 'active',
      creditsPerUse: 15,
      launches: 234,
      lastUsed: '3 hours ago'
    },
    {
      id: '5',
      name: 'SEO Optimizer',
      status: 'active',
      creditsPerUse: 7,
      launches: 678,
      lastUsed: '5 hours ago'
    }
  ]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">My Tools</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-[#ededed]">My Tools</h2>
            <button
              onClick={() => router.push('/vendor-dashboard/publish')}
              className="flex items-center px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Publish New Tool
            </button>
          </div>

          <div className="bg-[#1f2937] rounded-lg border border-[#374151] mt-8">
            <div className="p-6 border-b border-[#374151]">
              <h3 className="text-xl font-semibold text-[#ededed]">Published Tools</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#374151]">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Credits/Use</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Launches</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Last Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {tools.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#9ca3af]">
                        No tools published yet.
                      </td>
                    </tr>
                  ) : (
                    tools.map((tool) => (
                      <tr key={tool.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-[#ededed]">{tool.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tool.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {tool.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#ededed]">{tool.creditsPerUse}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#ededed]">{tool.launches}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#9ca3af]">{tool.lastUsed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => console.log('View tool:', tool.id)}
                            className="text-[#3ecf8e] hover:text-[#2dd4bf] mr-4"
                            title="View Tool"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => console.log('Edit tool:', tool.id)}
                            className="text-[#3ecf8e] hover:text-[#2dd4bf] mr-4"
                            title="Edit Tool"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => console.log('Delete tool:', tool.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete Tool"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


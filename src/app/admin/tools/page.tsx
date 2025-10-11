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
        <div className="bg-[#1f2937] rounded-lg p-8 border border-[#374151] text-center">
          <h2 className="text-xl font-semibold mb-4">UI Demo - Tools Management</h2>
          <p className="text-[#9ca3af]">This is a UI-only demo. Tools management functionality is not implemented.</p>
        </div>
      </div>
      </main>
    </div>
  );
}

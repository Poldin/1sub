'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Menu } from 'lucide-react';

interface SidebarLayoutProps {
  children: ReactNode;
  sidebar: ReactNode | ((props: { isOpen: boolean; onClose: () => void }) => ReactNode);
  topBarContent?: ReactNode;
  sidebarProps?: Record<string, unknown>;
}

export default function SidebarLayout({
  children,
  sidebar,
  topBarContent,
}: SidebarLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize sidebar state based on screen size and localStorage
  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktop = window.innerWidth >= 1024; // lg breakpoint
      const savedState = localStorage.getItem('sidebarOpen');
      
      if (isDesktop) {
        // On desktop, default to open (or use saved state)
        setIsSidebarOpen(savedState !== null ? savedState === 'true' : true);
      } else {
        // On mobile, always start closed
        setIsSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', String(newState));
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('sidebarOpen', 'false');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Render sidebar with isOpen and onClose props */}
      {typeof sidebar === 'function' 
        ? sidebar({ isOpen: isSidebarOpen, onClose: closeSidebar })
        : sidebar
      }

      {/* Main Content Area */}
      <main
        className={`
          flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
          ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}
        `}
      >
        {/* Top Bar with Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-50">
          <div className="flex items-center justify-center gap-2 p-2 sm:p-3 min-w-0 lg:justify-between">
            {/* Hamburger Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
            </button>

            {/* Top bar content passed from parent */}
            {topBarContent}
          </div>
        </header>

        {/* Page Content */}
        <div className="overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}


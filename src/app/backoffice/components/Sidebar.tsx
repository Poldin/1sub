'use client';

import { 
  X, 
  Home, 
  Wrench,
  User,
  LogOut
} from 'lucide-react';
import { ShareAndEarnButton } from './ShareAndEarn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onShareAndEarnClick: () => void;
}

export default function Sidebar({ isOpen, onClose, credits, onShareAndEarnClick }: SidebarProps) {
  const handleLogout = () => {
    // Implementare logout logic
    console.log('Logout clicked');
  };

  return (
    <>
      {/* Overlay per mobile quando menu è aperto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Menu */}
      <aside className={`
        fixed top-0 left-0 h-full w-full lg:w-80 bg-[#111111] border-r border-[#374151] z-50 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header del menu con hamburger */}
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <h1 className="text-xl font-bold text-[#3ecf8e]">
            1sub<span className="text-[#9ca3af] font-normal">.io</span>
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items - Top Section */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <a
              href="/backoffice"
              className="flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#ededed] group"
            >
              <Home className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Home</span>
            </a>
            
            <a
              href="/backoffice/tools"
              className="flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#ededed] group"
            >
              <Wrench className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">My tools</span>
            </a>
          </div>
        </nav>

        {/* Bottom Section - Fixed */}
        <div className="p-2 border-t border-[#374151] space-y-1">
          {/* Share and Earn Button */}
          <ShareAndEarnButton onClick={onShareAndEarnClick} />
            
          {/* Credits Display - no currency symbol and no label */}
           <div className="text-center p-1 rounded">
             <div className="text-2xl font-bold text-[#3ecf8e]">
               <span className="font-thin text-[#9ca3af]">credits </span>{credits.toFixed(2)}
             </div>
           </div>


          {/* Profile & Logout */}
          <div className="flex gap-1">
            <button className="flex-1 flex items-center justify-center gap-2 p-1 bg-[#1f2937] hover:bg-[#374151] rounded transition-colors text-lg">
              <User className="w-5 h-5" />
              <span>profile</span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

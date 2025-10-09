'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Home, 
  Wrench,
  User,
  LogOut,
  Plus,
  History
} from 'lucide-react';
import { ShareAndEarnButton } from './ShareAndEarn';
import TopUpDialog from './TopUpDialog';
import TransactionHistory from './TransactionHistory';
import { supabaseClient } from '@/lib/supabaseClient';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  credits?: number;
  onShareAndEarnClick: () => void;
  userId: string;
  onCreditsUpdated: () => void;
}

export default function Sidebar({ isOpen, onClose, credits, onShareAndEarnClick, userId, onCreditsUpdated }: SidebarProps) {
  const router = useRouter();
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if logout fails
      router.push('/');
    }
  };

  const handleTopUpClick = () => {
    setIsTopUpDialogOpen(true);
  };

  const handleTopUpClose = () => {
    setIsTopUpDialogOpen(false);
  };

  const handleTransactionHistoryClick = () => {
    setIsTransactionHistoryOpen(true);
  };

  const handleTransactionHistoryClose = () => {
    setIsTransactionHistoryOpen(false);
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
            
          {/* Credits Display and Actions */}
          <div className="text-center p-1 rounded space-y-2">
            <div className="font-bold text-[#3ecf8e]" data-testid="credit-balance">
              <span className="font-thin text-[#9ca3af]">credits </span>{credits?.toFixed(2) || '0.00'}
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleTopUpClick}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] rounded-lg text-black font-medium transition-colors text-sm"
              >
                <Plus className="w-3 h-3" />
                Top Up
              </button>
              <button
                onClick={handleTransactionHistoryClick}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg text-[#ededed] font-medium transition-colors text-sm"
              >
                <History className="w-3 h-3" />
                History
              </button>
            </div>
          </div>


          {/* Profile & Logout */}
          <div className="flex gap-1">
            <button className="flex-1 flex items-center justify-center gap-2 p-1 bg-[#1f2937] hover:bg-[#374151] rounded transition-colors">
              <User className="w-4 h-4" />
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

      {/* Top-Up Dialog */}
      <TopUpDialog
        isOpen={isTopUpDialogOpen}
        onClose={handleTopUpClose}
        onCreditsUpdated={onCreditsUpdated}
        userId={userId}
      />

      {/* Transaction History Dialog */}
      <TransactionHistory
        isOpen={isTransactionHistoryOpen}
        onClose={handleTransactionHistoryClose}
        userId={userId}
      />
    </>
  );
}

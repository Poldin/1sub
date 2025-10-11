'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Home, 
  Wrench,
  User,
  History,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import TransactionHistory from './TransactionHistory';
import { ShareAndEarnButton } from './ShareAndEarn';
import ShareAndEarnDialog from './ShareAndEarn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  credits?: number;
  onShareAndEarnClick: () => void;
  userId: string;
  userRole?: string;
}

export default function Sidebar({ isOpen, onClose, credits, onShareAndEarnClick, userId, userRole = 'user' }: SidebarProps) {
  const router = useRouter();
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleTransactionHistoryClick = () => {
    setIsTransactionHistoryOpen(true);
  };

  const handleTransactionHistoryClose = () => {
    setIsTransactionHistoryOpen(false);
  };

  const handleShareAndEarnClick = () => {
    setIsShareDialogOpen(true);
  };

  const handleShareDialogClose = () => {
    setIsShareDialogOpen(false);
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

            <button
              onClick={handleTransactionHistoryClick}
              className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#ededed] group"
            >
              <History className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">History</span>
            </button>

            <button 
              onClick={() => router.push('/profile')}
              className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#ededed] group"
            >
              <User className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Profile</span>
            </button>
            
            <button 
              onClick={() => router.push('/support')}
              className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#ededed] group"
            >
              <HelpCircle className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Support</span>
            </button>

            {/* Vendor Dashboard Link - Only show if user is vendor */}
            {userRole === 'vendor' && (
              <>
                <div className="border-t border-[#374151] my-2"></div>
                <button
                  onClick={() => {
                    router.push('/vendor-dashboard');
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#ededed] group"
                >
                  <Briefcase className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
                  <span className="font-medium">Vendor Dashboard</span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Credits Display and Share & Earn */}
        <div className="p-4 border-t border-[#374151] space-y-3">
          <div className="text-center">
            <div className="font-bold text-[#3ecf8e]" data-testid="credit-balance">
              <span className="font-thin text-[#9ca3af]">credits </span>{credits?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          {/* Share and Earn Button */}
          <ShareAndEarnButton onClick={handleShareAndEarnClick} />
        </div>
      </aside>

      {/* Transaction History Dialog */}
      <TransactionHistory
        isOpen={isTransactionHistoryOpen}
        onClose={handleTransactionHistoryClose}
        userId={userId}
      />

      {/* Share and Earn Dialog */}
      <ShareAndEarnDialog
        isOpen={isShareDialogOpen}
        onClose={handleShareDialogClose}
      />
    </>
  );
}

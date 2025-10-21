'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Search,
  User,
  HelpCircle,
  Briefcase,
  Gift,
  Plus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Users,
  Key,
  DollarSign,
  LayoutDashboard
} from 'lucide-react';
import { ShareAndEarnButton } from './ShareAndEarn';
import ShareAndEarnDialog from './ShareAndEarn';
import { getUserCreditsClient } from '@/lib/credits';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onShareAndEarnClick: () => void;
  userId: string;
  userRole?: string;
  hasTools?: boolean; // If user has created at least one tool
}

export default function Sidebar({ isOpen, onClose, onShareAndEarnClick, userId, userRole = 'user', hasTools = false }: SidebarProps) {
  const router = useRouter();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isVendorMenuOpen, setIsVendorMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number>(0);

  // Load vendor menu state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('vendorMenuOpen');
    if (savedState !== null) {
      setIsVendorMenuOpen(savedState === 'true');
    }
  }, []);

  // Fetch credits independently - Calculate from credit_transactions (source of truth)
  useEffect(() => {
    const fetchCredits = async () => {
      if (!userId) return;

      const totalCredits = await getUserCreditsClient(userId);
      if (totalCredits !== null) {
        setCredits(totalCredits);
      }
    };

    fetchCredits();

    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  // Save vendor menu state to localStorage whenever it changes
  const toggleVendorMenu = () => {
    const newState = !isVendorMenuOpen;
    setIsVendorMenuOpen(newState);
    localStorage.setItem('vendorMenuOpen', String(newState));
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
              className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-[#374151] transition-colors text-[#ededed] group text-sm"
            >
              <Search className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Search</span>
            </a>

            <button 
              onClick={() => router.push('/profile')}
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded hover:bg-[#374151] transition-colors text-[#ededed] group text-sm"
            >
              <User className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Profile</span>
            </button>
            
            <button 
              onClick={() => router.push('/support')}
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded hover:bg-[#374151] transition-colors text-[#ededed] group text-sm"
            >
              <HelpCircle className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Support</span>
            </button>

            {/* Vendor Menu - Only show if user has tools */}
            {hasTools && (
              <>
                <div className="border-t border-[#374151] my-2"></div>
                <div>
                  <button
                    onClick={toggleVendorMenu}
                    className="w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded hover:bg-[#374151] transition-colors text-[#ededed] group text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
                      <span className="font-medium">Vendor</span>
                    </div>
                    {isVendorMenuOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#9ca3af]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
                    )}
                  </button>
                  
                  {/* Vendor Submenu */}
                  {isVendorMenuOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      <button
                        onClick={() => {
                          router.push('/vendor-dashboard');
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Overview</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/vendor-dashboard/users');
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <Users className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Users</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/vendor-dashboard/analytics');
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <BarChart3 className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Analytics</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/vendor-dashboard/transactions');
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <DollarSign className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Transactions</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/vendor-dashboard/api');
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <Key className="w-4 h-4 text-[#3ecf8e]" />
                        <span>API</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Share and Earn Button */}
        <div className="mx-4 mb-4">
          <button
            onClick={handleShareAndEarnClick}
            className="w-full flex items-center gap-2 p-2 bg-[#1f2937] hover:bg-[#374151] rounded-lg transition-colors text-[#ededed] font-medium"
          >
            <Gift className="w-4 h-4 text-[#3ecf8e]" />
            <span className="text-sm">Share & Earn</span>
          </button>
        </div>

        {/* Become a Vendor CTA - Only for users without tools */}
        {!hasTools && (
          <div className="mx-4 mb-4">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-bold text-[#ededed]">Have you developed a tool?</h3>
              </div>
              <p className="text-xs text-[#9ca3af] mb-3">Publish your tool and engage with users!</p>
              <button
                onClick={() => {
                  router.push('/vendor-dashboard');
                  onClose();
                }}
                className="w-full bg-[#374151] hover:bg-[#4b5563] text-[#ededed] px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
              >
                Become a Vendor
              </button>
            </div>
          </div>
        )}

        {/* Credits Display */}
        <div className="p-4 border-t border-[#374151]">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            <div className="font-bold text-[#3ecf8e]" data-testid="credit-balance">
              <span className="font-thin text-[#9ca3af]">credits </span>{credits?.toFixed(2) || '0.00'}
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => {
                  // TODO: Add credits functionality
                  console.log('Add credits clicked');
                }}
                className="flex items-center justify-center p-1.5 bg-[#1f2937] hover:bg-[#374151] rounded-lg transition-colors"
                title="Add credits"
              >
                <Plus className="w-4 h-4 text-[#3ecf8e]" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Share and Earn Dialog */}
      <ShareAndEarnDialog
        isOpen={isShareDialogOpen}
        onClose={handleShareDialogClose}
      />
    </>
  );
}

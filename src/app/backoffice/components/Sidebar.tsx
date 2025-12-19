'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Search,
  User,
  HelpCircle,
  Briefcase,
  Plus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Users,
  Key,
  DollarSign,
  LayoutDashboard,
  Package,
  BookOpen,
  CreditCard,
  LogOut
} from 'lucide-react';
import { getCurrentBalanceClient } from '@/lib/credits';
import TopUpCredits from '@/app/components/TopUpCredits';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole?: string;
  hasTools?: boolean;
  isVendor?: boolean;
  onShareAndEarnClick?: () => void;
  forceDesktopOpen?: boolean;
}

export default function Sidebar({ isOpen, onClose, userId, userRole = 'user', hasTools = false, isVendor = false, onShareAndEarnClick, forceDesktopOpen = false }: SidebarProps) {
  const router = useRouter();
  const [isVendorMenuOpen, setIsVendorMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [showTopUpCredits, setShowTopUpCredits] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Load vendor menu state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('vendorMenuOpen');
    if (savedState !== null) {
      setIsVendorMenuOpen(savedState === 'true');
    }
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Check if we're on mobile
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close sidebar on ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Fetch credits independently using unified balance method
  // Uses user_balances table for fast and reliable balance lookups
  useEffect(() => {
    const fetchCredits = async () => {
      if (!userId) return;

      try {
        const totalCredits = await getCurrentBalanceClient(userId);
        if (totalCredits !== null) {
          setCredits(totalCredits);
        }
      } catch (error) {
        // Silently handle errors - default to 0 credits
        // Errors are already logged in getCurrentBalanceClient
      }
    };

    fetchCredits();

    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  // Check if user has an active subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!userId) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('platform_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .in('status', ['active', 'trialing', 'past_due', 'paused'])
          .maybeSingle();

        if (!error && data) {
          setHasSubscription(true);
        } else {
          setHasSubscription(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
      }
    };

    checkSubscription();
  }, [userId]);

  // Save vendor menu state to localStorage whenever it changes
  const toggleVendorMenu = () => {
    const newState = !isVendorMenuOpen;
    setIsVendorMenuOpen(newState);
    localStorage.setItem('vendorMenuOpen', String(newState));
  };

  // Helper function to handle navigation and sidebar close with delay
  const handleNavigation = (path: string) => {
    router.push(path);
    // Delay closing sidebar slightly to ensure navigation starts
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Overlay for mobile when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Menu */}
      <aside className={`
        fixed top-0 left-0 h-full w-80 sm:w-80 bg-[#111111] border-r border-[#374151] z-[70] 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${forceDesktopOpen ? 'lg:translate-x-0' : ''}
      `}>
        {/* Header with close button - always visible */}
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <h1 className="text-xl font-bold text-[#3ecf8e]">
            1sub<span className="text-[#9ca3af] font-normal">.io</span>
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items - Top Section */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            <button
              onClick={() => handleNavigation('/backoffice')}
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded hover:bg-[#374151] transition-colors text-[#ededed] group text-sm"
            >
              <Search className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Tools</span>
            </button>

            <div className="w-full flex items-center gap-2">
              <button
                onClick={() => handleNavigation('/profile')}
                className="flex-1 flex items-center gap-3 px-3 py-1.5 rounded hover:bg-[#374151] transition-colors text-[#ededed] group text-sm"
              >
                <User className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
                <span className="font-medium">Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-1.5 rounded hover:bg-red-600/20 transition-colors group"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300" />
              </button>
            </div>

            <button
              onClick={() => handleNavigation('/support')}
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded hover:bg-[#374151] transition-colors text-[#ededed] group text-sm"
            >
              <HelpCircle className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
              <span className="font-medium">Support</span>
            </button>

            {/* Vendor Menu - Show if user is an approved vendor OR has created tools */}
            {(isVendor || hasTools) && (
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
                        onClick={() => handleNavigation('/vendor-dashboard')}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Overview</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/vendor-dashboard/users')}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <Users className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Users</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/vendor-dashboard/products')}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <Package className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Products</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/vendor-dashboard/transactions')}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <DollarSign className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Transactions</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/vendor-dashboard/payouts')}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <CreditCard className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Payouts</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/vendor-dashboard/api')}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <Key className="w-4 h-4 text-[#3ecf8e]" />
                        <span>API</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/vendor-dashboard/integration')}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#374151] transition-colors text-[#d1d5db] text-sm"
                      >
                        <BookOpen className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Integration Guide</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Become a Vendor CTA - Only for users who are not approved vendors and don't have tools */}
        {!isVendor && !hasTools && (
          <div className="mx-4 mb-4">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-bold text-[#ededed]">Have you developed a tool?</h3>
              </div>
              <p className="text-xs text-[#9ca3af] mb-3">Publish your tool and engage with users!</p>
              <button
                onClick={() => handleNavigation('/vendors')}
                className="w-full bg-[#374151] hover:bg-[#4b5563] text-[#ededed] px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
              >
                Become a Vendor
              </button>
            </div>
          </div>
        )}

        {/* Credits Display */}
        <div className="p-4 border-t border-[#374151]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1"></div>
            <div className="font-bold text-[#3ecf8e]" data-testid="credit-balance">
              <span className="font-thin text-[#9ca3af]">credits </span>{credits?.toFixed(2) || '0.00'}
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setShowTopUpCredits(!showTopUpCredits)}
                className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
                  showTopUpCredits 
                    ? 'bg-red-500/20 hover:bg-red-500/30' 
                    : 'bg-[#1f2937] hover:bg-[#374151]'
                }`}
                title={showTopUpCredits ? "Chiudi top up" : "Top up credits"}
              >
                {showTopUpCredits ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : (
                  <Plus className="w-4 h-4 text-[#3ecf8e]" />
                )}
              </button>
            </div>
          </div>

          {/* TopUpCredits Component - Show when active */}
          {showTopUpCredits && (
            <div className="mb-3">
              <TopUpCredits hasSubscription={hasSubscription} />
            </div>
          )}

          {/* Plans & Credits Button */}
          <button
            onClick={() => window.open('/pricing', '_blank')}
            className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black px-4 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
          >
            plans and credits
          </button>
        </div>
      </aside>
    </>
  );
}

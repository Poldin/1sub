'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Share2, Copy, Check, Gift } from 'lucide-react';
import Sidebar from '../backoffice/components/Sidebar';
import Footer from '../components/Footer';
import { createClient } from '@/lib/supabase/client';

export default function ShareAndEarnPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // User data states
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);

  const referralCode = 'DEMO123';
  const referralLink = `https://1sub.io/ref/${referralCode}`;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();

        setUser({
          id: data.id,
          fullName: data.fullName || null,
          email: data.email || '',
        });

        if (data.role) {
          setUserRole(data.role);
        }

        // Check if user has created any tools
        const supabase = createClient();
        const { data: userTools, error: toolsError } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', data.id);

        if (!toolsError && userTools && userTools.length > 0) {
          setHasTools(true);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={user?.id || ''}
        userRole={userRole}
        hasTools={hasTools}
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
            <div className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-[#3ecf8e]" />
              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Share & Earn</h1>
            </div>

            {/* Spacer for centering */}
            <div className="w-10 sm:w-12"></div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3 sm:p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Subtitle */}
            <p className="text-center text-[#9ca3af] text-sm sm:text-base">
              Invite friends and earn credits together
            </p>

            {/* Hero Section */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#ededed] mb-4">
                Earn Credits by Sharing
              </h2>
              <p className="text-[#d1d5db] text-base sm:text-lg mb-6">
                Share your referral link and earn credits when friends sign up and make their first purchase!
              </p>
              
              {/* Referral Link Box */}
              <div className="bg-[#0a0a0a] border border-[#374151] rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 w-full min-w-0">
                    <p className="text-[#9ca3af] text-sm mb-2">Your Referral Link</p>
                    <p className="text-[#ededed] text-base sm:text-lg font-mono break-all">{referralLink}</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* How it Works */}
            <div className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <Share2 className="w-6 sm:w-7 h-6 sm:h-7 text-[#3ecf8e] mr-3" />
                <h3 className="text-xl sm:text-2xl font-semibold text-[#3ecf8e]">How it works</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-[#1f2937]/50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#ededed] mb-2">Share your link</h4>
                      <p className="text-[#d1d5db] text-sm">
                        Share your unique referral link with friends, family, or on social media
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#1f2937]/50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#ededed] mb-2">They get a bonus</h4>
                      <p className="text-[#d1d5db] text-sm">
                        Your friends receive 10% bonus credits when they sign up using your link
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#1f2937]/50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#ededed] mb-2">You earn rewards</h4>
                      <p className="text-[#d1d5db] text-sm">
                        Earn 10% of their first purchase as credits in your account
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#1f2937]/50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#3ecf8e] text-black rounded-full flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#ededed] mb-2">Instant credits</h4>
                      <p className="text-[#d1d5db] text-sm">
                        Credits appear in your account instantly after their purchase
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-[#ededed] mb-6">Your Referral Stats</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-[#9ca3af] text-sm mb-1">Total Referrals</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#3ecf8e]">0</p>
                </div>
                <div className="text-center p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-[#9ca3af] text-sm mb-1">Credits Earned</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#3ecf8e]">0.00</p>
                </div>
                <div className="text-center p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-[#9ca3af] text-sm mb-1">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#3ecf8e]">0.00</p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <h3 className="text-base sm:text-lg font-semibold text-[#ededed] mb-3">Terms & Conditions</h3>
              <ul className="text-[#9ca3af] text-sm space-y-2">
                <li>• Referral bonus is credited after the referred user&apos;s first purchase</li>
                <li>• Bonus credits cannot be withdrawn as cash</li>
                <li>• 1sub.io reserves the right to modify or cancel the program at any time</li>
                <li>• Fraudulent referrals may result in account suspension</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}

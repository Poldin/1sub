'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, ArrowLeft, User, CreditCard, History, Download } from 'lucide-react';
import ProfileSidebar from './components/ProfileSidebar';

interface CreditHistory {
  id: string;
  type: 'grant' | 'consume';
  amount: number;
  reason: string;
  date: string;
}

interface UsageSummary {
  toolName: string;
  creditsSpent: number;
  lastUsed: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Mock user data
  const user = {
    email: 'demo@1sub.io',
    fullName: 'Demo User',
    credits: 100
  };

  // Mock credit history
  const creditHistory: CreditHistory[] = [
    {
      id: '1',
      type: 'grant',
      amount: 50,
      reason: 'Welcome bonus',
      date: '2024-01-01'
    },
    {
      id: '2',
      type: 'consume',
      amount: -5,
      reason: 'AI Content Generator',
      date: '2024-01-15'
    },
    {
      id: '3',
      type: 'consume',
      amount: -10,
      reason: 'Data Analyzer Pro',
      date: '2024-01-14'
    },
    {
      id: '4',
      type: 'grant',
      amount: 25,
      reason: 'Referral bonus',
      date: '2024-01-10'
    },
    {
      id: '5',
      type: 'consume',
      amount: -8,
      reason: 'Image Editor',
      date: '2024-01-12'
    }
  ];

  // Mock usage summary
  const usageSummary: UsageSummary[] = [
    {
      toolName: 'AI Content Generator',
      creditsSpent: 15,
      lastUsed: '2 hours ago'
    },
    {
      toolName: 'Data Analyzer Pro',
      creditsSpent: 30,
      lastUsed: '1 day ago'
    },
    {
      toolName: 'Image Editor',
      creditsSpent: 24,
      lastUsed: '3 days ago'
    }
  ];

  const handleExportHistory = () => {
    console.log('Exporting credit history...');
    alert('Credit history exported to CSV!');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <ProfileSidebar 
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Profile</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Information */}
          <div className="lg:col-span-1">
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-6">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Account Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#d1d5db] mb-1">Email</label>
                  <p className="text-[#ededed]">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#d1d5db] mb-1">Full Name</label>
                  <p className="text-[#ededed]">{user.fullName}</p>
                </div>
                <button className="w-full px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors">
                  Reset Password
                </button>
              </div>
            </div>

            {/* Credits Overview */}
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Credits Overview
              </h2>
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-[#3ecf8e] mb-2">{user.credits}</p>
                <p className="text-[#9ca3af]">Available Credits</p>
              </div>
              <button
                onClick={() => setIsTopUpOpen(true)}
                className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
              >
                Top Up Credits
              </button>
            </div>
          </div>

          {/* Credit History & Usage Summary */}
          <div className="lg:col-span-2 space-y-8">
            {/* Credit History */}
            <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
              <div className="p-6 border-b border-[#374151]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#ededed] flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Credit History
                  </h2>
                  <button
                    onClick={handleExportHistory}
                    className="flex items-center px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#374151]">
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditHistory.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-[#374151]">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'grant' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-medium ${
                          transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </td>
                        <td className="px-6 py-4 text-[#9ca3af]">
                          {transaction.reason}
                        </td>
                        <td className="px-6 py-4 text-[#9ca3af]">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Usage Summary */}
            <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
              <div className="p-6 border-b border-[#374151]">
                <h2 className="text-lg font-semibold text-[#ededed]">Usage Summary</h2>
                <p className="text-sm text-[#9ca3af] mt-1">Tools you&apos;ve used and credits spent</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {usageSummary.map((usage, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                      <div>
                        <p className="font-medium text-[#ededed]">{usage.toolName}</p>
                        <p className="text-sm text-[#9ca3af]">Last used: {usage.lastUsed}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#3ecf8e] font-medium">{usage.creditsSpent} credits</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <button className="text-[#3ecf8e] text-sm hover:underline">
                    View full history
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#374151] mt-16 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Home</Link>
              <Link href="/privacy" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Terms</Link>
              <Link href="/support" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Support</Link>
            </div>
            <p className="text-[#9ca3af] text-xs mt-4">
              © 2025 1sub.io. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      </main>
    </div>
  );
}


'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, DollarSign } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface RefundAdjustment {
  id: string;
  userEmail: string;
  amount: number;
  reason: string;
  createdAt: string;
  adminName: string;
}

export default function RefundPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    amount: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Mock data for recent adjustments
  const recentAdjustments: RefundAdjustment[] = [
    {
      id: '1',
      userEmail: 'user1@example.com',
      amount: 100,
      reason: 'Welcome bonus',
      createdAt: new Date().toISOString(),
      adminName: 'Admin User'
    },
    {
      id: '2',
      userEmail: 'user2@example.com',
      amount: -50,
      reason: 'Refund for unused credits',
      createdAt: new Date().toISOString(),
      adminName: 'Admin User'
    },
    {
      id: '3',
      userEmail: 'user3@example.com',
      amount: 25,
      reason: 'Customer service compensation',
      createdAt: new Date().toISOString(),
      adminName: 'Admin User'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Refund adjustment:', formData);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setFormData({ email: '', amount: '', reason: '' });
      alert('Credit adjustment processed successfully!');
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Refund / Manual Credit Adjust</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Adjustment Form */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Adjust User Credits</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#d1d5db] mb-2">
                User Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-[#d1d5db] mb-2">
                Amount (+/-)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="100 or -50"
                required
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-[#d1d5db] mb-2">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="Reason for adjustment..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Adjustment'}
            </button>
          </form>
        </div>

        {/* Recent Adjustments */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Recent Adjustments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">User Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Admin</th>
                </tr>
              </thead>
              <tbody>
                {recentAdjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="border-b border-[#374151]">
                    <td className="px-6 py-4 text-[#ededed]">
                      {adjustment.userEmail}
                    </td>
                    <td className={`px-6 py-4 font-medium ${
                      adjustment.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {adjustment.amount > 0 ? '+' : ''}{adjustment.amount}
                    </td>
                    <td className="px-6 py-4 text-[#9ca3af]">
                      {adjustment.reason}
                    </td>
                    <td className="px-6 py-4 text-[#9ca3af]">
                      {new Date(adjustment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-[#9ca3af]">
                      {adjustment.adminName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}

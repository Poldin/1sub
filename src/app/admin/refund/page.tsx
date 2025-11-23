'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, DollarSign } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface RefundAdjustment {
  id: string;
  userEmail: string;
  userName: string | null;
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
  const [recentAdjustments, setRecentAdjustments] = useState<RefundAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/credits/adjustments?limit=50');
      if (response.ok) {
        const data = await response.json();
        setRecentAdjustments(data.adjustments || []);
      } else {
        throw new Error('Failed to fetch adjustments');
      }
    } catch (err) {
      console.error('Error fetching adjustments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount === 0) {
        throw new Error('Amount must be a non-zero number');
      }

      // Trim and normalize email
      const normalizedEmail = formData.email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Email is required');
      }

      const response = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          amount,
          reason: formData.reason.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`Credits ${amount > 0 ? 'added' : 'subtracted'} successfully. New balance: ${data.balanceAfter.toFixed(2)}`);
        setFormData({ email: '', amount: '', reason: '' });
        fetchAdjustments(); // Refresh adjustments list
      } else {
        let errorMessage = 'Failed to process adjustment';
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error processing adjustment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process adjustment');
    } finally {
      setIsSubmitting(false);
    }
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
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-8">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-8">
            <p className="text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Adjustment Form */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Adjust User Credits</h2>
          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
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
                suppressHydrationWarning
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
                suppressHydrationWarning
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
                suppressHydrationWarning
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              suppressHydrationWarning
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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#9ca3af]">
                      Loading adjustments...
                    </td>
                  </tr>
                ) : recentAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#9ca3af]">
                      No adjustments found
                    </td>
                  </tr>
                ) : (
                  recentAdjustments.map((adjustment) => (
                    <tr key={adjustment.id} className="border-b border-[#374151]">
                      <td className="px-6 py-4 text-[#ededed]">
                        {adjustment.userEmail}
                        {adjustment.userName && (
                          <div className="text-sm text-[#9ca3af]">{adjustment.userName}</div>
                        )}
                      </td>
                      <td className={`px-6 py-4 font-medium ${
                        adjustment.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {adjustment.amount > 0 ? '+' : ''}{adjustment.amount.toFixed(2)}
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
                  ))
                )}
              </tbody>
            </table>
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Settings, CheckCircle } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

export default function SettingsPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    creditMultiplier: '1.0',
    referralBonus: '10',
    supportEmail: 'support@1sub.io'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setFormData({
            creditMultiplier: data.settings.creditMultiplier?.toString() || '1.0',
            referralBonus: data.settings.referralBonus?.toString() || '10',
            supportEmail: data.settings.supportEmail || 'support@1sub.io',
          });
        }
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditMultiplier: parseFloat(formData.creditMultiplier),
          referralBonus: parseInt(formData.referralBonus, 10),
          supportEmail: formData.supportEmail,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage('Settings saved successfully!');
        // Update form with returned settings
        if (data.settings) {
          setFormData({
            creditMultiplier: data.settings.creditMultiplier?.toString() || formData.creditMultiplier,
            referralBonus: data.settings.referralBonus?.toString() || formData.referralBonus,
            supportEmail: data.settings.supportEmail || formData.supportEmail,
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Platform Settings</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
            <p className="mt-4 text-[#9ca3af]">Loading settings...</p>
          </div>
        )}

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

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings Form */}
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6">General Configuration</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="creditMultiplier" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Credit Top-Up Multiplier
                </label>
                <input
                  type="number"
                  id="creditMultiplier"
                  name="creditMultiplier"
                  value={formData.creditMultiplier}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0.1"
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="1.0"
                  required
                />
                <p className="text-xs text-[#9ca3af] mt-1">Multiplier for credit purchases (e.g., 1.0 = 1:1 ratio)</p>
              </div>

              <div>
                <label htmlFor="referralBonus" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Referral Bonus Percentage
                </label>
                <input
                  type="number"
                  id="referralBonus"
                  name="referralBonus"
                  value={formData.referralBonus}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="10"
                  required
                />
                <p className="text-xs text-[#9ca3af] mt-1">Percentage of credits earned from referrals</p>
              </div>

              <div>
                <label htmlFor="supportEmail" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Support Contact Email
                </label>
                <input
                  type="email"
                  id="supportEmail"
                  name="supportEmail"
                  value={formData.supportEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="support@1sub.io"
                  required
                />
                <p className="text-xs text-[#9ca3af] mt-1">Email address for user support inquiries</p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Platform Status */}
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed] mb-6">Platform Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-[#ededed]">API Status</span>
                </div>
                <span className="text-green-400 font-medium">Online</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-[#ededed]">Database</span>
                </div>
                <span className="text-green-400 font-medium">Healthy</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-[#ededed]">Authentication</span>
                </div>
                <span className="text-green-400 font-medium">Active</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-[#ededed]">Last Backup</span>
                </div>
                <span className="text-[#9ca3af] text-sm">2 hours ago</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#374151] rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-[#ededed]">System Load</span>
                </div>
                <span className="text-green-400 font-medium">Normal</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#374151] rounded-lg">
              <h3 className="text-sm font-medium text-[#ededed] mb-2">System Information</h3>
              <div className="text-xs text-[#9ca3af] space-y-1">
                <p>Version: 1.0.0</p>
                <p>Uptime: 7 days, 12 hours</p>
                <p>Last Update: 2 days ago</p>
              </div>
            </div>
          </div>
          </div>
        )}

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

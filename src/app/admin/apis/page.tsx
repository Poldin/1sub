'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Key, Copy, RefreshCw } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminAPIPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState('sk-admin-••••••••••••••••••••••••••••••••••••••••');
  const [isVisible, setIsVisible] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API key copied to clipboard!');
  };

  const handleRegenerateKey = () => {
    setIsRegenerating(true);
    // Simulate API call
    setTimeout(() => {
      setApiKey('sk-admin-' + Math.random().toString(36).substring(2, 38));
      setIsRegenerating(false);
      alert('API key regenerated successfully!');
    }, 1000);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Admin API Management</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Key Section */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Platform API Key</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                Admin API Key
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type={isVisible ? 'text' : 'password'}
                  value={apiKey}
                  readOnly
                  className="flex-1 px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] font-mono text-sm"
                />
                <button
                  onClick={toggleVisibility}
                  className="p-3 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyKey}
                  className="p-3 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRegenerateKey}
                  disabled={isRegenerating}
                  className="p-3 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-[#374151] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#ededed] mb-2">Usage Instructions</h3>
              <p className="text-sm text-[#9ca3af] mb-3">
                Use this API key to access platform-wide administrative functions. Include it in the Authorization header:
              </p>
              <code className="block bg-[#0a0a0a] text-[#3ecf8e] p-3 rounded text-sm font-mono">
                Authorization: Bearer {apiKey.substring(0, 20)}...
              </code>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Available Endpoints</h2>
          
          <div className="space-y-4">
            <div className="border border-[#374151] rounded-lg p-4">
              <div className="flex items-center mb-2">
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded mr-3">GET</span>
                <code className="text-[#3ecf8e] font-mono">/api/v1/admin/users</code>
              </div>
              <p className="text-sm text-[#9ca3af]">Retrieve all platform users</p>
            </div>

            <div className="border border-[#374151] rounded-lg p-4">
              <div className="flex items-center mb-2">
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded mr-3">POST</span>
                <code className="text-[#3ecf8e] font-mono">/api/v1/admin/credits/adjust</code>
              </div>
              <p className="text-sm text-[#9ca3af]">Adjust user credits manually</p>
            </div>

            <div className="border border-[#374151] rounded-lg p-4">
              <div className="flex items-center mb-2">
                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded mr-3">PUT</span>
                <code className="text-[#3ecf8e] font-mono">/api/v1/admin/settings</code>
              </div>
              <p className="text-sm text-[#9ca3af]">Update platform settings</p>
            </div>

            <div className="border border-[#374151] rounded-lg p-4">
              <div className="flex items-center mb-2">
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded mr-3">DELETE</span>
                <code className="text-[#3ecf8e] font-mono">/api/v1/admin/tools/&#123;id&#125;</code>
              </div>
              <p className="text-sm text-[#9ca3af]">Remove a tool from the platform</p>
            </div>
          </div>
        </div>

        {/* Security Notes */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
          <h2 className="text-lg font-semibold text-[#ededed] mb-4">Security Best Practices</h2>
          <ul className="space-y-2 text-sm text-[#9ca3af]">
            <li className="flex items-start">
              <span className="text-[#3ecf8e] mr-2">•</span>
              Keep your API key secure and never expose it in client-side code
            </li>
            <li className="flex items-start">
              <span className="text-[#3ecf8e] mr-2">•</span>
              Regenerate the key immediately if you suspect it has been compromised
            </li>
            <li className="flex items-start">
              <span className="text-[#3ecf8e] mr-2">•</span>
              Use HTTPS for all API requests
            </li>
            <li className="flex items-start">
              <span className="text-[#3ecf8e] mr-2">•</span>
              Monitor API usage and set up alerts for unusual activity
            </li>
            <li className="flex items-start">
              <span className="text-[#3ecf8e] mr-2">•</span>
              Only share the key with trusted team members who need admin access
            </li>
          </ul>
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

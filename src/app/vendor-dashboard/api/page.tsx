'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Key, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import ToolSelector from '../components/ToolSelector';

export default function VendorAPIPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState('sk-vendor-••••••••••••••••••••••••••••••••••••••••');
  const [isVisible, setIsVisible] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // States for unified Sidebar
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);

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
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          return;
        }
        
        setUserId(user.id);
        
        // Fetch user profile data
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setUserRole(profileData.role || 'user');
        }
        
        // Check if user has tools
        const { data: toolsData } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', user.id);
        
        setHasTools((toolsData?.length || 0) > 0);
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, []);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API key copied to clipboard!');
  };

  const handleRegenerateKey = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setApiKey('sk-vendor-' + Math.random().toString(36).substring(2, 38));
      setIsRegenerating(false);
      alert('API key regenerated successfully!');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Unified Sidebar */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={userId}
        userRole={userRole}
        hasTools={hasTools}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar with Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden border-b border-[#374151]">
          <div className="flex items-center justify-between p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-3">
              {/* Hamburger Button */}
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
              >
                <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
              </button>
              
              {/* Tool Selector */}
              {hasTools && userId && (
                <ToolSelector userId={userId} />
              )}
              
              {/* Page Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">API Access</h1>
            </div>
            
            {/* Spacer */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Key Section */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Your API Key</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                Vendor API Key
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type={isVisible ? 'text' : 'password'}
                  value={apiKey}
                  readOnly
                  className="flex-1 px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] font-mono text-sm"
                />
                <button
                  onClick={() => setIsVisible(!isVisible)}
                  className="p-3 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors"
                >
                  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              <h3 className="text-sm font-medium text-[#ededed] mb-2">Usage Example</h3>
              <p className="text-sm text-[#9ca3af] mb-3">
                Use this API key to verify user emails and consume credits:
              </p>
              <code className="block bg-[#0a0a0a] text-[#3ecf8e] p-3 rounded text-sm font-mono">
                POST /api/v1/is_email_1sub<br/>
                Authorization: Bearer {apiKey.substring(0, 20)}...<br/>
                Content-Type: application/json<br/><br/>
                {`{`}<br/>
                &nbsp;&nbsp;&quot;email&quot;: &quot;user@example.com&quot;<br/>
                {`}`}
              </code>
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


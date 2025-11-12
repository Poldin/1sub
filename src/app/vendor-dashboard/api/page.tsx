'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Key, Copy, RefreshCw, AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import ToolSelector from '../components/ToolSelector';

interface ToolApiKey {
  toolId: string;
  toolName: string;
  apiKeyHash: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

interface ToolWithMetadata {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
}

export default function VendorAPIPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toolApiKeys, setToolApiKeys] = useState<ToolApiKey[]>([]);
  const [regeneratingToolId, setRegeneratingToolId] = useState<string | null>(null);
  
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

        // Fetch tools with API key info
        const { data: tools, error: toolsError } = await supabase
          .from('tools')
          .select('id, name, metadata')
          .eq('user_profile_id', user.id);

        if (!toolsError && tools) {
          const apiKeys: ToolApiKey[] = tools
            .filter((tool: ToolWithMetadata) => {
              const metadata = (tool.metadata as Record<string, unknown>) || {};
              return !!metadata.api_key_hash; // Only show tools with API keys
            })
            .map((tool: ToolWithMetadata) => {
              const metadata = (tool.metadata as Record<string, unknown>) || {};
              return {
                toolId: tool.id,
                toolName: tool.name,
                apiKeyHash: (metadata.api_key_hash as string) || '',
                createdAt: (metadata.api_key_created_at as string) || null,
                lastUsedAt: (metadata.api_key_last_used_at as string) || null,
                isActive: (metadata.api_key_active as boolean | undefined) !== false
              };
            });

          setToolApiKeys(apiKeys);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, []);

  const handleCopyKey = (toolId: string, apiKeyHash: string) => {
    // Show masked key (last 4 chars)
    const maskedKey = `sk-tool-••••${apiKeyHash.slice(-4)}`;
    navigator.clipboard.writeText(maskedKey);
    
    // Create a better notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-[#3ecf8e] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
    notification.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>Key reference copied!</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const handleRegenerateKey = async (toolId: string) => {
    if (!confirm('Regenerating will invalidate the current API key. Are you sure?')) {
      return;
    }

    setRegeneratingToolId(toolId);
    
    try {
      const supabase = createClient();
      const { generateApiKey, hashApiKey } = await import('@/lib/api-keys-client');
      
      // Generate new API key
      const newApiKey = generateApiKey();
      const newApiKeyHash = await hashApiKey(newApiKey);
      const createdAt = new Date().toISOString();

      // Get current tool metadata
      const { data: tool, error: fetchError } = await supabase
        .from('tools')
        .select('metadata')
        .eq('id', toolId)
        .single();

      if (fetchError || !tool) {
        throw new Error('Failed to fetch tool');
      }

      const metadata = (tool.metadata as Record<string, unknown>) || {};
      (metadata as Record<string, unknown>).api_key_hash = newApiKeyHash;
      (metadata as Record<string, unknown>).api_key_created_at = createdAt;
      (metadata as Record<string, unknown>).api_key_active = true;
      // Keep last_used_at for history

      // Update tool metadata
      const { error: updateError } = await supabase
        .from('tools')
        .update({ metadata })
        .eq('id', toolId);

      if (updateError) {
        throw new Error('Failed to update API key');
      }

      // Update local state
      setToolApiKeys(prev => prev.map(key => 
        key.toolId === toolId 
          ? { ...key, apiKeyHash: newApiKeyHash, createdAt, isActive: true }
          : key
      ));

      // Show new API key to user (only once) - Using a custom modal would be better, but alert works for now
      const shouldCopy = confirm(`API key regenerated successfully!\n\nYour new API key is:\n\n${newApiKey}\n\n⚠️ IMPORTANT: Save this key now! It will not be shown again.\n\nClick OK to copy to clipboard, or Cancel to close.`);
      
      if (shouldCopy) {
        navigator.clipboard.writeText(newApiKey);
        alert('API key copied to clipboard! Make sure to save it in a secure location.');
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
      alert('Failed to regenerate API key. Please try again.');
    } finally {
      setRegeneratingToolId(null);
    }
  };

  const maskApiKey = (hash: string) => {
    // Show last 4 characters of hash
    return `sk-tool-••••${hash.slice(-4)}`;
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
        {/* Important Notice */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-500 mb-1">Important: API Key Security</h3>
              <p className="text-sm text-[#d1d5db] mb-2">
                Your API key is shown only once when generated. If you lose it, you&apos;ll need to regenerate a new one. 
                Store it securely in your environment variables and never expose it in client-side code.
              </p>
            </div>
          </div>
        </div>

        {/* Integration Guide Link */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-[#3ecf8e]" />
              <div>
                <h3 className="font-semibold text-[#ededed]">Need Help Integrating?</h3>
                <p className="text-sm text-[#9ca3af]">View our comprehensive integration guide with code examples</p>
              </div>
            </div>
            <Link
              href="/vendor-dashboard/integration"
              className="flex items-center gap-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-white px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              View Guide
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Your Tool API Keys</h2>
          
          {toolApiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
              <p className="text-[#9ca3af] mb-2">No API keys found</p>
              <p className="text-sm text-[#9ca3af]">
                API keys are automatically generated when you publish a tool.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {toolApiKeys.map((toolKey) => (
                <div key={toolKey.toolId} className="bg-[#374151] rounded-lg p-4 border border-[#4b5563]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-[#ededed] mb-1">
                        {toolKey.toolName}
                      </h3>
                      
                      {/* Tool ID Display */}
                      <div className="mb-2 p-2 bg-[#0a0a0a] rounded border border-[#4b5563]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9ca3af]">Tool ID:</span>
                          <code className="text-xs text-[#3ecf8e] font-mono">{toolKey.toolId}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(toolKey.toolId);
                              alert('Tool ID copied to clipboard!');
                            }}
                            className="ml-auto p-1 hover:bg-[#374151] rounded transition-colors"
                            title="Copy Tool ID"
                          >
                            <Copy className="w-3 h-3 text-[#9ca3af]" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-[#9ca3af]">
                        {toolKey.createdAt && (
                          <span>Created: {new Date(toolKey.createdAt).toLocaleDateString()}</span>
                        )}
                        {toolKey.lastUsedAt && (
                          <span>Last used: {new Date(toolKey.lastUsedAt).toLocaleDateString()}</span>
                        )}
                        {!toolKey.lastUsedAt && (
                          <span className="text-yellow-400">Never used</span>
                        )}
                      </div>
                    </div>
                    {!toolKey.isActive && (
                      <span className="text-xs bg-red-400/20 text-red-400 px-2 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="text"
                      value={maskApiKey(toolKey.apiKeyHash)}
                      readOnly
                      className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#4b5563] rounded-lg text-[#ededed] font-mono text-sm"
                    />
                    <button
                      onClick={() => handleCopyKey(toolKey.toolId, toolKey.apiKeyHash)}
                      className="p-2 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors"
                      title="Copy key reference"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRegenerateKey(toolKey.toolId)}
                      disabled={regeneratingToolId === toolKey.toolId}
                      className="p-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 transition-colors"
                      title="Regenerate API key"
                    >
                      <RefreshCw className={`w-4 h-4 ${regeneratingToolId === toolKey.toolId ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="bg-[#111111] border border-[#4b5563] rounded p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[#9ca3af]">
                        The original API key cannot be retrieved. Only the reference (last 4 characters) is shown. 
                        Use &quot;Regenerate&quot; to create a new key if you lost the original. 
                        <strong className="text-yellow-500"> This will invalidate the old key.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#374151] rounded-lg p-4 mt-6">
            <h3 className="text-sm font-medium text-[#ededed] mb-2">Usage Example</h3>
            <p className="text-sm text-[#9ca3af] mb-3">
              Use your API key to consume credits for tool usage:
            </p>
            <code className="block bg-[#0a0a0a] text-[#3ecf8e] p-3 rounded text-sm font-mono overflow-x-auto">
              POST /api/v1/credits/consume<br/>
              Authorization: Bearer sk-tool-••••••••<br/>
              Content-Type: application/json<br/><br/>
              {`{`}<br/>
              &nbsp;&nbsp;&quot;user_id&quot;: &quot;uuid&quot;,<br/>
              &nbsp;&nbsp;&quot;amount&quot;: 10,<br/>
              &nbsp;&nbsp;&quot;reason&quot;: &quot;Tool usage&quot;,<br/>
              &nbsp;&nbsp;&quot;idempotency_key&quot;: &quot;unique-key&quot;<br/>
              {`}`}
            </code>
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


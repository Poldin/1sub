'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Key, Copy, RefreshCw, AlertCircle, Webhook, Eye, EyeOff, Save, Check, Send, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import ToolSelector from '../components/ToolSelector';
import Footer from '@/app/components/Footer';

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
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  
  // Webhook configuration states
  const [selectedToolForConfig, setSelectedToolForConfig] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  
  // Magic Login configuration states
  const [magicLoginUrl, setMagicLoginUrl] = useState('');
  const [magicLoginSecret, setMagicLoginSecret] = useState('');
  const [showMagicLoginSecret, setShowMagicLoginSecret] = useState(false);
  
  // Registration token for co-branded registration
  const [registrationToken, setRegistrationToken] = useState('');
  const [registrationUrlCopied, setRegistrationUrlCopied] = useState(false);
  
  // Original values for comparison
  const [originalWebhookUrl, setOriginalWebhookUrl] = useState('');
  const [originalWebhookSecret, setOriginalWebhookSecret] = useState('');
  const [originalMagicLoginUrl, setOriginalMagicLoginUrl] = useState('');
  const [originalMagicLoginSecret, setOriginalMagicLoginSecret] = useState('');
  const [originalRegistrationToken, setOriginalRegistrationToken] = useState('');

  // Webhook test states
  const [testEventType, setTestEventType] = useState('subscription.activated');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    details?: {
      responseStatus?: number;
      responseTime?: string;
      responseBody?: string;
      webhookUrl?: string;
      payloadSent?: Record<string, unknown>;
    };
  } | null>(null);

  // Magic Login test states
  const [testingMagicLogin, setTestingMagicLogin] = useState(false);
  const [magicLoginTestResult, setMagicLoginTestResult] = useState<{
    success: boolean;
    message?: string;
    magicLoginUrl?: string;
    error?: string;
  } | null>(null);

  // Generate preview payload based on selected event type
  const generatePreviewPayload = (eventType: string) => {
    const testUserId = userId || 'test-user-123';
    const testUserEmail = userEmail || 'test@example.com';
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const cancelEffectiveDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const basePayload = {
      id: 'evt_preview_123',
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      data: {} as Record<string, unknown>
    };

    switch (eventType) {
      case 'subscription.activated':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          planId: 'test-plan-monthly',
          status: 'active',
          currentPeriodEnd: periodEnd,
          quantity: 1,
          creditsRemaining: 100,
        };
        break;
      case 'subscription.canceled':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          planId: 'test-plan-monthly',
          status: 'canceled',
          currentPeriodEnd: periodEnd,
          effectiveDate: cancelEffectiveDate,
          cancellationReason: 'user_requested',
          quantity: 1,
        };
        break;
      case 'subscription.updated':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          planId: 'test-plan-yearly',
          status: 'active',
          currentPeriodEnd: periodEnd,
          quantity: 1,
          creditsRemaining: 200,
        };
        break;
      case 'purchase.completed':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          checkoutId: 'test_checkout_123',
          amount: 50,
          creditsRemaining: 150,
          purchaseType: 'credits',
        };
        break;
      case 'entitlement.granted':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          grantId: 'test_grant_123',
          planId: 'test-plan-pro',
          status: 'active',
          creditsRemaining: 100,
        };
        break;
      case 'entitlement.revoked':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          reason: 'subscription_canceled',
          revokedAt: new Date().toISOString(),
          status: 'canceled',
        };
        break;
      case 'entitlement.changed':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          previousState: {
            planId: 'test-plan-basic',
            features: ['feature1', 'feature2'],
          },
          newState: {
            planId: 'test-plan-pro',
            features: ['feature1', 'feature2', 'feature3'],
          },
          planId: 'test-plan-pro',
          creditsRemaining: 200,
        };
        break;
      case 'credits.consumed':
        basePayload.data = {
          oneSubUserId: testUserId,
          amount: 5,
          balanceRemaining: 45,
          transactionId: 'test_txn_123',
        };
        break;
      case 'user.credit_low':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          creditBalance: 8,
          threshold: 10,
        };
        break;
      case 'user.credit_depleted':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          creditBalance: 0,
        };
        break;
      case 'tool.status_changed':
        basePayload.data = {
          oneSubUserId: 'system',
          toolId: selectedToolForConfig || 'tool-123',
          toolStatus: true,
        };
        break;
      case 'verify.required':
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
          reason: 'security_check',
        };
        break;
      default:
        basePayload.data = {
          oneSubUserId: testUserId,
          userEmail: testUserEmail,
        };
    }

    return basePayload;
  };

  // Auto-hide webhook secret after 5 seconds
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (showWebhookSecret) {
      timeoutId = setTimeout(() => {
        setShowWebhookSecret(false);
      }, 5000); // 5 seconds
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showWebhookSecret]);

  // Auto-hide magic login secret after 5 seconds
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (showMagicLoginSecret) {
      timeoutId = setTimeout(() => {
        setShowMagicLoginSecret(false);
      }, 5000); // 5 seconds
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showMagicLoginSecret]);

  // UI notification states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [newApiKeyModal, setNewApiKeyModal] = useState<{ apiKey: string } | null>(null);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktop = window.innerWidth >= 1024;
      const savedState = localStorage.getItem('sidebarOpen');
      
      if (isDesktop) {
        setIsMenuOpen(savedState !== null ? savedState === 'true' : true);
      } else {
        setIsMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    localStorage.setItem('sidebarOpen', String(newState));
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
        setUserEmail(user.email || '');
        
        // Fetch user profile data
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role, is_vendor')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setUserRole(profileData.role || 'user');
          setIsVendor(profileData.is_vendor || false);
        }
        
        // Check if user has tools
        const { data: toolsData } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', user.id);
        
        setHasTools((toolsData?.length || 0) > 0);

        // Fetch API keys from api_keys table (joined with tools)
        const { data: apiKeys, error: apiKeysError } = await supabase
          .from('api_keys')
          .select(`
            tool_id,
            key_hash,
            key_prefix,
            created_at,
            last_used_at,
            is_active,
            tools!inner (
              id,
              name,
              user_profile_id
            )
          `)
          .eq('tools.user_profile_id', user.id);

        if (apiKeysError) {
          console.error('Error fetching API keys:', apiKeysError);
        }

        if (!apiKeysError && apiKeys) {
          const formattedKeys: ToolApiKey[] = apiKeys.map((key: {
            tool_id: string;
            key_hash: string;
            key_prefix: string;
            created_at: string;
            last_used_at: string | null;
            is_active: boolean;
            tools: { id: string; name: string; user_profile_id: string };
          }) => ({
            toolId: key.tool_id,
            toolName: key.tools.name,
            apiKeyHash: key.key_hash,
            createdAt: key.created_at,
            lastUsedAt: key.last_used_at,
            isActive: key.is_active
          }));

          setToolApiKeys(formattedKeys);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyKey = (toolId: string, apiKeyHash: string) => {
    // Show masked key (last 4 chars)
    const maskedKey = `sk-tool-••••${apiKeyHash.slice(-4)}`;
    navigator.clipboard.writeText(maskedKey);
    showToast('Key reference copied to clipboard!');
  };

  const handleRegenerateKey = (toolId: string) => {
    setConfirmDialog({
      message: 'Regenerating will invalidate the current API key. Are you sure?',
      onConfirm: () => executeRegenerateKey(toolId),
    });
  };

  const executeRegenerateKey = async (toolId: string) => {
    setRegeneratingToolId(toolId);
    
    try {
      // Call server route to regenerate API key
      const response = await fetch('/api/vendor/api-keys/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tool_id: toolId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorDetails = result.error || 'Failed to regenerate API key';
        console.error('API key regeneration failed:', { status: response.status, error: errorDetails });
        throw new Error(errorDetails);
      }

      const newApiKey = result.api_key;

      // Refresh the API keys list from the server
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        throw new Error('Not authenticated');
      }
      
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select(`
          tool_id,
          key_hash,
          key_prefix,
          created_at,
          last_used_at,
          is_active,
          tools!inner (
            id,
            name,
            user_profile_id
          )
        `)
        .eq('tools.user_profile_id', authUser.id);

      if (apiKeys) {
        const formattedKeys: ToolApiKey[] = apiKeys.map((key: {
          tool_id: string;
          key_hash: string;
          key_prefix: string;
          created_at: string;
          last_used_at: string | null;
          is_active: boolean;
          tools: { id: string; name: string; user_profile_id: string };
        }) => ({
          toolId: key.tool_id,
          toolName: key.tools.name,
          apiKeyHash: key.key_hash,
          createdAt: key.created_at,
          lastUsedAt: key.last_used_at,
          isActive: key.is_active
        }));

        setToolApiKeys(formattedKeys);
      }

      // Show new API key to user (only once)
      setNewApiKeyModal({ apiKey: newApiKey });
    } catch (error) {
      console.error('Error regenerating API key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to regenerate API key: ${errorMessage}`, 'error');
    } finally {
      setRegeneratingToolId(null);
    }
  };

  const maskApiKey = (hash: string) => {
    // Show last 4 characters of hash
    return `sk-tool-••••${hash.slice(-4)}`;
  };

  const generateWebhookSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'whsec_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const generateMagicLoginSecretValue = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'mlsec_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleGenerateWebhookSecret = () => {
    const newSecret = generateWebhookSecret();
    setWebhookSecret(newSecret);
  };

  const handleGenerateMagicLoginSecret = () => {
    const newSecret = generateMagicLoginSecretValue();
    setMagicLoginSecret(newSecret);
  };

  const handleSelectToolForConfig = async (toolId: string) => {
    setSelectedToolForConfig(toolId);
    setConfigSaved(false);
    
    // Load existing configuration
    try {
      const supabase = createClient();
      const { data: apiKeyData, error } = await supabase
        .from('api_keys')
        .select('metadata')
        .eq('tool_id', toolId)
        .single();
      
      if (!error && apiKeyData && apiKeyData.metadata) {
        const metadata = apiKeyData.metadata as Record<string, unknown>;
        const webhook = (metadata.webhook_url as string) || '';
        const secret = (metadata.webhook_secret as string) || '';
        const mlUrl = (metadata.magic_login_url as string) || '';
        const mlSecret = (metadata.magic_login_secret as string) || '';
        const regToken = (metadata.registration_token as string) || '';
        
        setWebhookUrl(webhook);
        setWebhookSecret(secret);
        setMagicLoginUrl(mlUrl);
        setMagicLoginSecret(mlSecret);
        setRegistrationToken(regToken);
        
        // Store original values for comparison
        setOriginalWebhookUrl(webhook);
        setOriginalWebhookSecret(secret);
        setOriginalMagicLoginUrl(mlUrl);
        setOriginalMagicLoginSecret(mlSecret);
        setOriginalRegistrationToken(regToken);
      } else {
        // Clear form
        setWebhookUrl('');
        setWebhookSecret('');
        setMagicLoginUrl('');
        setMagicLoginSecret('');
        setRegistrationToken('');
        
        // Clear original values
        setOriginalWebhookUrl('');
        setOriginalWebhookSecret('');
        setOriginalMagicLoginUrl('');
        setOriginalMagicLoginSecret('');
        setOriginalRegistrationToken('');
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!selectedToolForConfig) return;
    
    setSavingConfig(true);
    setConfigSaved(false);
    
    try {
      const supabase = createClient();
      
      // Get current metadata
      const { data: apiKeyData, error: fetchError } = await supabase
        .from('api_keys')
        .select('metadata')
        .eq('tool_id', selectedToolForConfig)
        .single();
      
      if (fetchError) {
        throw new Error('Failed to fetch API key metadata');
      }
      
      const metadata = (apiKeyData?.metadata as Record<string, unknown>) || {};
      metadata.webhook_url = webhookUrl || null;
      metadata.webhook_secret = webhookSecret || null;
      metadata.magic_login_url = magicLoginUrl || null;
      metadata.magic_login_secret = magicLoginSecret || null;
      metadata.registration_token = registrationToken || null;
      
      // Update metadata
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({ metadata })
        .eq('tool_id', selectedToolForConfig);
      
      if (updateError) {
        throw new Error('Failed to save configuration');
      }
      
      // Update original values after successful save
      setOriginalWebhookUrl(webhookUrl);
      setOriginalWebhookSecret(webhookSecret);
      setOriginalMagicLoginUrl(magicLoginUrl);
      setOriginalMagicLoginSecret(magicLoginSecret);
      setOriginalRegistrationToken(registrationToken);
      
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      showToast('Failed to save configuration. Please try again.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!selectedToolForConfig) return;
    
    // Validate configuration
    if (!webhookUrl) {
      showToast('Please configure a webhook URL first', 'error');
      return;
    }
    
    if (!webhookSecret) {
      showToast('Please generate a webhook secret first', 'error');
      return;
    }
    
    setTestingWebhook(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/vendor/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_id: selectedToolForConfig,
          event_type: testEventType,
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        showToast('Test webhook sent successfully!', 'success');
      } else {
        showToast(result.error || 'Test webhook failed', 'error');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setTestResult({
        success: false,
        message: 'Failed to send test webhook',
      });
      showToast('Failed to send test webhook', 'error');
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleTestMagicLogin = async () => {
    if (!selectedToolForConfig) return;
    
    // Validate configuration
    if (!magicLoginUrl) {
      showToast('Please configure a Magic Login URL first', 'error');
      return;
    }
    
    if (!magicLoginSecret) {
      showToast('Please generate a Magic Login Secret first', 'error');
      return;
    }
    
    setTestingMagicLogin(true);
    setMagicLoginTestResult(null);
    
    try {
      const response = await fetch('/api/v1/magiclogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: selectedToolForConfig,
          test: true, // Skip subscription check for vendor testing
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.magicLoginUrl) {
        // Open directly in new tab
        window.open(result.magicLoginUrl, '_blank');
        showToast('Magic Login opened in new tab!', 'success');
      } else {
        setMagicLoginTestResult({
          success: false,
          message: result.message || 'Failed to generate Magic Login URL',
          error: result.error,
        });
        showToast(result.message || 'Test failed', 'error');
      }
    } catch (error) {
      console.error('Error testing Magic Login:', error);
      setMagicLoginTestResult({
        success: false,
        message: 'Failed to generate Magic Login URL',
        error: 'Network error',
      });
      showToast('Failed to test Magic Login', 'error');
    } finally {
      setTestingMagicLogin(false);
    }
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
        isVendor={isVendor}
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
                <ToolSelector 
                  userId={userId}
                  currentToolId={selectedToolForConfig}
                  onToolChange={(toolId, toolName) => handleSelectToolForConfig(toolId)}
                />
              )}
              
              {/* Page Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">API Key & Webhook</h1>
            </div>
            
            {/* Spacer */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 1. Webhook Section */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-[#3ecf8e]" />
              <h2 className="text-lg font-semibold text-[#ededed]">Webhook</h2>
            </div>
            <a
              href="/docs/webhooks/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
            >
              <span>View docs</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {selectedToolForConfig ? (
            <div className="space-y-4">
              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-[#3ecf8e]" />
                    Webhook URL
                  </div>
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://yourtool.com/webhooks/1sub"
                  className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                />
                <p className="text-xs text-[#9ca3af] mt-1">
                  Endpoint to receive subscription lifecycle events (activated, canceled, updated)
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#3ecf8e]" />
                    Webhook Secret
                  </div>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="whsec_••••••••"
                      className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#ededed]"
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateWebhookSecret}
                    className="px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors text-sm whitespace-nowrap"
                  >
                    Generate
                  </button>
                  {webhookSecret && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookSecret);
                        showToast('Webhook secret copied to clipboard!');
                      }}
                      className="p-2 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors"
                      title="Copy secret"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Used to verify webhook signatures (HMAC-SHA256). Store this securely in your tool.
                </p>
              </div>

              {/* Save Button for Webhook */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveConfiguration}
                  disabled={
                    savingConfig || 
                    (webhookUrl === originalWebhookUrl && 
                     webhookSecret === originalWebhookSecret && 
                     magicLoginUrl === originalMagicLoginUrl &&
                     magicLoginSecret === originalMagicLoginSecret)
                  }
                  className="flex items-center gap-1.5 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-[#0a0a0a] px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingConfig ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : configSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </>
                  )}
                </button>
                
              {configSaved && (
                <span className="text-xs text-[#3ecf8e]">Configuration saved successfully!</span>
              )}
              </div>

              {/* Test Webhook */}
              {webhookUrl && webhookSecret && (
                <div className="pt-6 mt-6 border-t border-[#374151]">
                  <div className="flex items-center gap-2 mb-4">
                    <Send className="w-4 h-4 text-[#3ecf8e]" />
                    <h3 className="text-sm font-medium text-[#ededed]">Test Webhook</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={testEventType}
                        onChange={(e) => {
                          setTestEventType(e.target.value);
                          setTestResult(null);
                        }}
                        className="w-fit px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] text-sm focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                      >
                        <optgroup label="Subscription Lifecycle">
                          <option value="subscription.activated">subscription.activated</option>
                          <option value="subscription.updated">subscription.updated</option>
                          <option value="subscription.canceled">subscription.canceled</option>
                        </optgroup>
                        <optgroup label="Purchases">
                          <option value="purchase.completed">purchase.completed</option>
                        </optgroup>
                        <optgroup label="Entitlements">
                          <option value="entitlement.granted">entitlement.granted</option>
                          <option value="entitlement.revoked">entitlement.revoked</option>
                          <option value="entitlement.changed">entitlement.changed</option>
                        </optgroup>
                        <optgroup label="Credits">
                          <option value="credits.consumed">credits.consumed</option>
                          <option value="user.credit_low">user.credit_low</option>
                          <option value="user.credit_depleted">user.credit_depleted</option>
                        </optgroup>
                        <optgroup label="System">
                          <option value="tool.status_changed">tool.status_changed</option>
                          <option value="verify.required">verify.required</option>
                        </optgroup>
                      </select>

                      <button
                        onClick={handleTestWebhook}
                        disabled={testingWebhook}
                        className="flex items-center gap-1.5 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-[#0a0a0a] px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testingWebhook ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Send Test
                          </>
                        )}
                      </button>
                    </div>

                    {/* Payload Preview */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[#9ca3af]">Payload preview:</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(generatePreviewPayload(testEventType), null, 2));
                            showToast('Payload copied to clipboard!');
                          }}
                          className="p-1 text-[#9ca3af] hover:text-[#ededed] transition-colors"
                          title="Copy payload"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <pre className="text-xs bg-[#0a0a0a] p-2 rounded overflow-x-auto border border-[#4b5563] max-h-40">
                        {JSON.stringify(generatePreviewPayload(testEventType), null, 2)}
                      </pre>
                    </div>

                    {/* Test Results */}
                    {testResult && (
                      <div className={`p-3 rounded-lg border ${
                        testResult.success 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-start gap-2">
                          {testResult.success ? (
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              testResult.success ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {testResult.message || (testResult.success ? 'Test successful' : 'Test failed')}
                            </p>
                            
                            {testResult.details && (
                              <div className="mt-2 space-y-1 text-xs text-[#d1d5db]">
                                {testResult.details.responseStatus && (
                                  <p>Status: <span className="font-mono">{testResult.details.responseStatus}</span></p>
                                )}
                                {testResult.details.responseTime && (
                                  <p>Response time: <span className="font-mono">{testResult.details.responseTime}</span></p>
                                )}
                                {testResult.details.payloadSent && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs text-[#9ca3af]">Payload sent:</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(JSON.stringify(testResult.details!.payloadSent, null, 2));
                                          showToast('Payload copied to clipboard!');
                                        }}
                                        className="p-1 text-[#9ca3af] hover:text-[#ededed] transition-colors"
                                        title="Copy payload"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <pre className="text-xs bg-[#0a0a0a] p-2 rounded overflow-x-auto">
                                      {JSON.stringify(testResult.details.payloadSent, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {testResult.details.responseBody && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs text-[#9ca3af]">Response:</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(testResult.details!.responseBody || '');
                                          showToast('Response copied to clipboard!');
                                        }}
                                        className="p-1 text-[#9ca3af] hover:text-[#ededed] transition-colors"
                                        title="Copy response"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <pre className="text-xs bg-[#0a0a0a] p-2 rounded overflow-x-auto">
                                      {testResult.details.responseBody}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#9ca3af] text-sm">Select a tool to configure webhooks</p>
          )}
        </div>

        {/* 2. Magic Login Section */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#3ecf8e]" />
              <h2 className="text-lg font-semibold text-[#ededed]">Magic Login</h2>
            </div>
            <a
              href="/docs/api/magic-login"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
            >
              <span>View docs</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          
          <p className="text-sm text-[#9ca3af] mb-4">
            Enable passwordless authentication. Users click &quot;launch Magic login&quot; on 1Sub and arrive at your app already signed in.
          </p>

          {selectedToolForConfig ? (
            <div className="space-y-4">
              {/* Magic Login URL */}
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#3ecf8e]" />
                    Magic Login URL
                  </div>
                </label>
                <input
                  type="url"
                  value={magicLoginUrl}
                  onChange={(e) => setMagicLoginUrl(e.target.value)}
                  placeholder="https://yourtool.com/auth/magic"
                  className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                />
                <p className="text-xs text-[#9ca3af] mt-1">
                  Where users are redirected with a signed login URL (e.g., /auth/magic or /1sub/login)
                </p>
              </div>

              {/* Magic Login Secret */}
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#3ecf8e]" />
                    Magic Login Secret
                  </div>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showMagicLoginSecret ? 'text' : 'password'}
                      value={magicLoginSecret}
                      onChange={(e) => setMagicLoginSecret(e.target.value)}
                      placeholder="mlsec_••••••••"
                      className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMagicLoginSecret(!showMagicLoginSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#ededed]"
                    >
                      {showMagicLoginSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateMagicLoginSecret}
                    className="px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors text-sm whitespace-nowrap"
                  >
                    Generate
                  </button>
                  {magicLoginSecret && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(magicLoginSecret);
                        showToast('Magic Login secret copied to clipboard!');
                      }}
                      className="p-2 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors"
                      title="Copy secret"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Used to verify Magic Login signatures (HMAC-SHA256). Store this securely in your tool.
                </p>
              </div>

              {/* Save Button for Magic Login */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveConfiguration}
                  disabled={
                    savingConfig || 
                    (webhookUrl === originalWebhookUrl && 
                     webhookSecret === originalWebhookSecret && 
                     magicLoginUrl === originalMagicLoginUrl &&
                     magicLoginSecret === originalMagicLoginSecret)
                  }
                  className="flex items-center gap-1.5 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-[#0a0a0a] px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingConfig ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : configSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </>
                  )}
                </button>
                
                {configSaved && (
                  <span className="text-xs text-[#3ecf8e]">Configuration saved successfully!</span>
                )}
              </div>

              {/* Test Magic Login */}
              {magicLoginUrl && magicLoginSecret && (
                <div className="pt-6 mt-6 border-t border-[#374151]">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#3ecf8e]" />
                    <h3 className="text-sm font-medium text-[#ededed]">Test Magic Login</h3>
                  </div>

                  <p className="text-xs text-[#9ca3af] mb-3">
                    Test your Magic Login integration. This will open a new tab with a signed URL using your current user ({userEmail || 'you'}).
                  </p>

                  <button
                    onClick={handleTestMagicLogin}
                    disabled={testingMagicLogin}
                    className="flex items-center gap-1.5 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-[#0a0a0a] px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingMagicLogin ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        launch Magic login
                      </>
                    )}
                  </button>

                  {/* Error Result */}
                  {magicLoginTestResult && !magicLoginTestResult.success && (
                    <div className="mt-4 p-3 rounded-lg border bg-red-500/10 border-red-500/30">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-400">
                            {magicLoginTestResult.message}
                          </p>
                          {magicLoginTestResult.error && (
                            <p className="text-xs text-red-400 mt-1">
                              Error: {magicLoginTestResult.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#9ca3af] text-sm">Select a tool to configure Magic Login</p>
          )}
        </div>

        {/* 3. Co-branded Registration Section */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#3ecf8e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <h2 className="text-lg font-semibold text-[#ededed]">Co-branded Registration</h2>
            </div>
          </div>

          <p className="text-sm text-[#9ca3af] mb-4">
            Let users register through a branded 1Sub page. When they sign up, you&apos;ll receive a <code className="text-[#3ecf8e] bg-[#0a0a0a] px-1 py-0.5 rounded">user.registered</code> webhook with their details.
          </p>

          {selectedToolForConfig ? (
            <div className="space-y-4">
              {/* Registration Token */}
              <div>
                <label className="block text-sm font-medium text-[#ededed] mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#3ecf8e]" />
                    Registration Token
                  </div>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={registrationToken}
                    readOnly
                    placeholder="Click 'Generate' to create a token"
                    className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#6b7280] font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      const newToken = crypto.randomUUID();
                      setRegistrationToken(newToken);
                    }}
                    className="px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors text-sm text-[#ededed]"
                  >
                    {registrationToken ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                <p className="text-xs text-[#9ca3af] mt-1">
                  This token identifies your tool in the registration URL. Regenerating will invalidate existing registration links.
                </p>
              </div>

              {/* Registration URL - Show only if webhook is configured and token exists */}
              {webhookSecret && registrationToken && (
                <div className="bg-[#0a0a0a] border border-[#374151] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[#ededed]">Registration URL</label>
                    <button
                      onClick={() => {
                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?token=${registrationToken}`;
                        navigator.clipboard.writeText(url);
                        setRegistrationUrlCopied(true);
                        setTimeout(() => setRegistrationUrlCopied(false), 2000);
                        showToast('Registration URL copied!');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#374151] hover:bg-[#4b5563] text-[#ededed] rounded text-sm transition-colors"
                    >
                      {registrationUrlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {registrationUrlCopied ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>
                  <code className="block text-sm text-[#3ecf8e] break-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://1sub.io'}/register?token={registrationToken}
                  </code>
                  <p className="text-xs text-[#9ca3af] mt-2">
                    Share this URL with your users. They&apos;ll see your branding and register through 1Sub.
                  </p>
                </div>
              )}

              {/* Warning if webhook not configured */}
              {!webhookSecret && registrationToken && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">Webhook not configured</p>
                    <p className="text-xs text-[#9ca3af] mt-1">
                      You need to configure a Webhook URL and Secret above to receive <code className="text-[#3ecf8e]">user.registered</code> events.
                    </p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              {registrationToken !== originalRegistrationToken && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveConfiguration}
                    disabled={savingConfig}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 transition-colors font-medium"
                  >
                    {savingConfig ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Token
                      </>
                    )}
                  </button>
                  {configSaved && (
                    <span className="text-sm text-[#3ecf8e] flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Saved!
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#9ca3af] text-sm">Select a tool to configure co-branded registration</p>
          )}
        </div>

        {/* 4. API Key Section */}
        <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151] mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#ededed]">API Key</h2>
            {toolApiKeys.length > 0 && selectedToolForConfig && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#9ca3af]">
                  {toolApiKeys.find(t => t.toolId === selectedToolForConfig)?.toolName}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedToolForConfig);
                    showToast('Tool ID copied to clipboard!');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#374151] hover:bg-[#4b5563] text-[#ededed] rounded text-sm transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Tool ID
                </button>
              </div>
            )}
          </div>
          
          {toolApiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
              <p className="text-[#9ca3af] mb-2">No API keys found</p>
              <p className="text-sm text-[#9ca3af]">
                API keys are automatically generated when you publish a tool.
              </p>
            </div>
          ) : (
            selectedToolForConfig && toolApiKeys.find(t => t.toolId === selectedToolForConfig) && (() => {
              const toolKey = toolApiKeys.find(t => t.toolId === selectedToolForConfig)!;
              return (
                <div>
                  <div className="flex items-center gap-4 text-sm text-[#9ca3af] mb-4">
                    {toolKey.createdAt && (
                      <span>Created: {new Date(toolKey.createdAt).toLocaleDateString()}</span>
                    )}
                    {toolKey.lastUsedAt && (
                      <span>Last used: {new Date(toolKey.lastUsedAt).toLocaleDateString()}</span>
                    )}
                    {!toolKey.lastUsedAt && (
                      <span className="text-yellow-400">Never used</span>
                    )}
                    {!toolKey.isActive && (
                      <span className="text-xs bg-red-400/20 text-red-400 px-2 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
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
                </div>
              );
            })()
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all ${
          toast.type === 'success' 
            ? 'bg-[#3ecf8e] text-[#0a0a0a]' 
            : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#ededed] mb-2">Confirm Action</h3>
                <p className="text-sm text-[#d1d5db]">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-[#374151] hover:bg-[#4b5563] text-[#ededed] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-[#0a0a0a] font-semibold rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New API Key Modal */}
      {newApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#ededed] mb-2">API Key Regenerated Successfully!</h3>
                <p className="text-sm text-yellow-400 mb-3">
                  ⚠️ IMPORTANT: Save this key now! It will not be shown again.
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#ededed] mb-2">Your New API Key:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newApiKeyModal.apiKey}
                  readOnly
                  className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#4b5563] rounded-lg text-[#3ecf8e] font-mono text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newApiKeyModal.apiKey);
                    showToast('API key copied to clipboard!');
                  }}
                  className="p-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-[#0a0a0a] rounded-lg transition-colors"
                  title="Copy API key"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setNewApiKeyModal(null)}
                className="px-4 py-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-[#0a0a0a] font-semibold rounded-lg transition-colors"
              >
                I&apos;ve Saved It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


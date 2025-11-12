'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle,
  Code,
  Zap,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Key,
  Link as LinkIcon,
  CreditCard,
  Users,
  FileText,
  HelpCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
}

function CodeBlock({ code, language, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1f2937] rounded-lg border border-[#374151] overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-[#111111] border-b border-[#374151] flex items-center justify-between">
          <span className="text-sm font-medium text-[#9ca3af]">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1 bg-[#374151] hover:bg-[#4b5563] rounded text-xs text-[#d1d5db] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm">
          <code className={`language-${language} text-[#d1d5db]`}>{code}</code>
        </pre>
        {!title && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 bg-[#374151] hover:bg-[#4b5563] rounded text-[#d1d5db] transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#374151] transition-colors"
      >
        <h3 className="text-lg font-semibold text-[#ededed]">{title}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[#9ca3af]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#9ca3af]" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-[#374151]">
          {children}
        </div>
      )}
    </div>
  );
}

export default function IntegrationGuidePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser({ id: user.id });
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-[#9ca3af]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#ededed]">
      {/* Header */}
      <div className="bg-[#1f2937] border-b border-[#374151]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/vendor-dashboard')}
            className="flex items-center gap-2 text-[#9ca3af] hover:text-[#3ecf8e] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#3ecf8e]/10 rounded-lg">
              <Code className="w-8 h-8 text-[#3ecf8e]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#ededed]">Integration Guide</h1>
              <p className="text-[#9ca3af] mt-1">Connect your external tool to 1SUB in minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Overview Section */}
        <div className="bg-gradient-to-r from-[#3ecf8e]/10 to-[#2dd4bf]/10 border border-[#3ecf8e]/30 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">🚀 Welcome to 1SUB Integration</h2>
          <p className="text-[#d1d5db] mb-4">
            Integrating with 1SUB allows you to monetize your tool through our credit system. 
            Users purchase credits on our platform and use them on your tool, while you earn revenue for each transaction.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-[#3ecf8e] mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#ededed]">Quick Setup</h3>
                <p className="text-sm text-[#9ca3af]">Get integrated in under 30 minutes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#3ecf8e] mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#ededed]">Secure API</h3>
                <p className="text-sm text-[#9ca3af]">JWT-based authentication & API keys</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-[#3ecf8e] mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#ededed]">Start Earning</h3>
                <p className="text-sm text-[#9ca3af]">Get paid for every credit used</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#3ecf8e]" />
            Quick Start (3 Steps)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Publish Your Tool</h3>
              <p className="text-sm text-[#9ca3af]">Create your tool listing on 1SUB and get your unique API key</p>
            </div>
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Verify Users</h3>
              <p className="text-sm text-[#9ca3af]">Accept JWT tokens from 1SUB and verify them via our API</p>
            </div>
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Consume Credits</h3>
              <p className="text-sm text-[#9ca3af]">Deduct credits when users use features of your tool</p>
            </div>
          </div>
        </section>

        {/* Integration Flow Diagram */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">🔄 How It Works</h2>
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-semibold">User purchases your tool on 1SUB</div>
                  <div className="text-sm text-[#9ca3af]">They buy credits and click &quot;Access Tool&quot;</div>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-[#3ecf8e] h-6"></div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-semibold">User redirected to your tool with JWT token</div>
                  <div className="text-sm text-[#9ca3af]">https://your-tool.com?token=eyJhbGci...</div>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-[#3ecf8e] h-6"></div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Your tool verifies the token via 1SUB API</div>
                  <div className="text-sm text-[#9ca3af]">POST /api/v1/verify-user</div>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-[#3ecf8e] h-6"></div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <div className="font-semibold">User uses your tool&apos;s features</div>
                  <div className="text-sm text-[#9ca3af]">Generate images, process data, etc.</div>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-[#3ecf8e] h-6"></div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  5
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Your tool consumes credits via API</div>
                  <div className="text-sm text-[#9ca3af]">POST /api/v1/credits/consume with your API key</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Guide */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📚 Step-by-Step Implementation</h2>
          
          {/* Step 1 */}
          <div className="mb-6">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Publish Your Tool</h3>
                  <p className="text-[#9ca3af] mb-4">
                    First, create your tool listing on the 1SUB platform. This generates your unique API key.
                  </p>
                  <button
                    onClick={() => router.push('/vendor-dashboard/publish')}
                    className="flex items-center gap-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Go to Publish Tool
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#374151] rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-yellow-500">Important</div>
                    <p className="text-sm text-[#9ca3af]">
                      Your API key is shown only once during tool creation. Save it immediately in a secure location (e.g., environment variables).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-6">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Get Your API Key</h3>
                  <p className="text-[#9ca3af] mb-4">
                    Store your API key securely in your server&apos;s environment variables. Never expose it in client-side code.
                  </p>
                </div>
              </div>
              <CodeBlock
                language="bash"
                title=".env"
                code={`# Add this to your .env file
ONESUB_API_KEY=sk-tool-xxxxxxxxxxxx`}
              />
              <div className="mt-4">
                <button
                  onClick={() => router.push('/vendor-dashboard/api')}
                  className="flex items-center gap-2 text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
                >
                  <Key className="w-4 h-4" />
                  View Your API Keys
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-6">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Configure Your External URL</h3>
                  <p className="text-[#9ca3af] mb-4">
                    Specify the URL where users will be redirected after purchasing. This should be a landing page or authentication endpoint on your tool.
                  </p>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#374151] rounded-lg p-4">
                <div className="text-sm text-[#9ca3af] mb-2">Example URLs:</div>
                <ul className="space-y-1 text-sm text-[#d1d5db]">
                  <li>• https://your-tool.com/auth/callback</li>
                  <li>• https://your-tool.com/login</li>
                  <li>• https://your-tool.com/access</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="mb-6">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Set Up Pricing (Products)</h3>
                  <p className="text-[#9ca3af] mb-4">
                    Create pricing tiers (products) for your tool. Each product defines how many credits users receive for a specific price.
                  </p>
                  <button
                    onClick={() => router.push('/vendor-dashboard/products')}
                    className="flex items-center gap-2 text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Manage Products
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="mb-6">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Handle User Redirects</h3>
                  <p className="text-[#9ca3af] mb-4">
                    When users purchase your tool, they&apos;ll be redirected to your external URL with a JWT token in the query parameter.
                  </p>
                </div>
              </div>
              <CodeBlock
                language="javascript"
                title="Extract Token (JavaScript)"
                code={`// Get token from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
  // No token provided, show error or redirect to purchase
  console.error('No token provided');
}`}
              />
              <div className="mt-4">
                <CodeBlock
                  language="python"
                  title="Extract Token (Python/Flask)"
                  code={`from flask import request

# Get token from URL query parameter
token = request.args.get('token')

if not token:
    return 'No token provided', 400`}
                />
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="mb-6">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  6
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Verify User Tokens</h3>
                  <p className="text-[#9ca3af] mb-4">
                    Call the <code className="px-2 py-1 bg-[#111111] rounded text-[#3ecf8e]">/api/v1/verify-user</code> endpoint to validate the token and get user information.
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Endpoint</div>
                <div className="bg-[#111111] border border-[#374151] rounded-lg p-3">
                  <code className="text-[#3ecf8e]">POST https://1sub.vercel.app/api/v1/verify-user</code>
                </div>
              </div>

              <CodeBlock
                language="javascript"
                title="Node.js Example"
                code={`const axios = require('axios');

async function verifyUserToken(token) {
  try {
    const response = await axios.post(
      'https://1sub.vercel.app/api/v1/verify-user',
      { token },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Token is valid
    const { user_id, tool_id, checkout_id, expires_at } = response.data;
    
    // Store in session
    req.session.userId = user_id;
    req.session.toolId = tool_id;
    
    return { valid: true, userId: user_id };
    
  } catch (error) {
    console.error('Token verification failed:', error.response?.data);
    return { valid: false, error: error.response?.data };
  }
}`}
              />

              <div className="mt-4">
                <CodeBlock
                  language="python"
                  title="Python Example"
                  code={`import requests

def verify_user_token(token):
    try:
        response = requests.post(
            'https://1sub.vercel.app/api/v1/verify-user',
            json={'token': token},
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Token is valid
        user_id = data['user_id']
        tool_id = data['tool_id']
        
        # Store in session
        session['user_id'] = user_id
        session['tool_id'] = tool_id
        
        return {'valid': True, 'user_id': user_id}
        
    except requests.exceptions.HTTPError as e:
        print(f'Token verification failed: {e.response.text}')
        return {'valid': False, 'error': e.response.json()}`}
                />
              </div>

              <div className="mt-4 bg-[#111111] border border-[#374151] rounded-lg p-4">
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Response Example (Success)</div>
                <CodeBlock
                  language="json"
                  code={`{
  "valid": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "tool_id": "660e8400-e29b-41d4-a716-446655440000",
  "checkout_id": "770e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2025-11-12T15:30:00.000Z"
}`}
                />
              </div>
            </div>
          </div>

          {/* Step 7 */}
          <div className="mb-6">
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  7
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Consume Credits</h3>
                  <p className="text-[#9ca3af] mb-4">
                    When a user uses a feature of your tool, deduct credits using your API key.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Endpoint</div>
                <div className="bg-[#111111] border border-[#374151] rounded-lg p-3">
                  <code className="text-[#3ecf8e]">POST https://1sub.vercel.app/api/v1/credits/consume</code>
                </div>
              </div>

              <CodeBlock
                language="javascript"
                title="Node.js Example"
                code={`const axios = require('axios');

async function consumeCredits(userId, amount, reason) {
  try {
    const response = await axios.post(
      'https://1sub.vercel.app/api/v1/credits/consume',
      {
        user_id: userId,
        amount: amount,
        reason: reason,
        idempotency_key: \`\${userId}-\${Date.now()}\` // Unique per request
      },
      {
        headers: {
          'Authorization': \`Bearer \${process.env.ONESUB_API_KEY}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { success, new_balance, transaction_id } = response.data;
    console.log(\`Credits consumed. New balance: \${new_balance}\`);
    
    return { success: true, newBalance: new_balance };
    
  } catch (error) {
    if (error.response?.status === 400) {
      // Insufficient credits
      console.error('User has insufficient credits');
      return { 
        success: false, 
        error: 'insufficient_credits',
        current_balance: error.response.data.current_balance
      };
    }
    throw error;
  }
}`}
              />

              <div className="mt-4">
                <CodeBlock
                  language="python"
                  title="Python Example"
                  code={`import os
import requests
from datetime import datetime

def consume_credits(user_id, amount, reason):
    try:
        response = requests.post(
            'https://1sub.vercel.app/api/v1/credits/consume',
            json={
                'user_id': user_id,
                'amount': amount,
                'reason': reason,
                'idempotency_key': f'{user_id}-{int(datetime.now().timestamp())}'
            },
            headers={
                'Authorization': f'Bearer {os.environ["ONESUB_API_KEY"]}',
                'Content-Type': 'application/json'
            }
        )
        response.raise_for_status()
        
        data = response.json()
        new_balance = data['new_balance']
        print(f'Credits consumed. New balance: {new_balance}')
        
        return {'success': True, 'new_balance': new_balance}
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            # Insufficient credits
            error_data = e.response.json()
            return {
                'success': False,
                'error': 'insufficient_credits',
                'current_balance': error_data.get('current_balance')
            }
        raise`}
                />
              </div>

              <div className="mt-4 bg-[#111111] border border-[#374151] rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-400">Idempotency Keys</div>
                    <p className="text-sm text-[#9ca3af]">
                      Always use unique idempotency keys to prevent duplicate charges. Include user ID, operation ID, and timestamp.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Examples Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">💻 Complete Integration Examples</h2>
          <div className="space-y-4">
            
            <CollapsibleSection title="Node.js / Express - Full Example" defaultOpen={false}>
              <CodeBlock
                language="javascript"
                code={`const express = require('express');
const axios = require('axios');
const session = require('express-session');

const app = express();
const ONESUB_API_KEY = process.env.ONESUB_API_KEY;
const BASE_URL = 'https://1sub.vercel.app';

app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Step 1: Handle redirect from 1SUB
app.get('/auth/callback', async (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    return res.status(400).send('Missing token');
  }

  try {
    // Step 2: Verify token
    const verifyResponse = await axios.post(
      \`\${BASE_URL}/api/v1/verify-user\`,
      { token },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { user_id, tool_id, checkout_id } = verifyResponse.data;

    // Step 3: Store user session
    req.session.userId = user_id;
    req.session.toolId = tool_id;
    req.session.checkoutId = checkout_id;

    // Redirect to your app
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Token verification failed:', error.response?.data);
    res.status(401).send('Authentication failed');
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Step 4: Consume credits when user uses a feature
app.post('/api/generate', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { prompt } = req.body;
  
  try {
    // Consume 10 credits for image generation
    const consumeResponse = await axios.post(
      \`\${BASE_URL}/api/v1/credits/consume\`,
      {
        user_id: userId,
        amount: 10,
        reason: 'Generated 1 image',
        idempotency_key: \`\${userId}-gen-\${Date.now()}\`
      },
      {
        headers: {
          'Authorization': \`Bearer \${ONESUB_API_KEY}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { new_balance } = consumeResponse.data;

    // Perform your tool's action
    const result = await generateImage(prompt);

    res.json({
      success: true,
      result: result,
      credits_remaining: new_balance
    });

  } catch (error) {
    if (error.response?.status === 400) {
      // Insufficient credits
      return res.status(400).json({
        error: 'insufficient_credits',
        message: 'You don\\'t have enough credits. Purchase more on 1sub.io',
        current_balance: error.response.data.current_balance
      });
    }
    
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user&apos;s credit balance (optional)
app.get('/api/credits/balance', requireAuth, async (req, res) => {
  // You can track this on your side or redirect to 1SUB
  res.json({ message: 'Check balance on 1sub.io' });
});

// Your tool's actual functionality
async function generateImage(prompt) {
  // Your image generation logic here
  return { imageUrl: 'https://example.com/image.png' };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Python / Flask - Full Example" defaultOpen={false}>
              <CodeBlock
                language="python"
                code={`import os
import requests
from flask import Flask, request, session, jsonify, redirect
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key')
ONESUB_API_KEY = os.environ['ONESUB_API_KEY']
BASE_URL = 'https://1sub.vercel.app'

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Step 1: Handle redirect from 1SUB
@app.route('/auth/callback')
def auth_callback():
    token = request.args.get('token')
    
    if not token:
        return 'Missing token', 400
    
    try:
        # Step 2: Verify token
        response = requests.post(
            f'{BASE_URL}/api/v1/verify-user',
            json={'token': token},
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Step 3: Store user session
        session['user_id'] = data['user_id']
        session['tool_id'] = data['tool_id']
        session['checkout_id'] = data['checkout_id']
        
        # Redirect to your app
        return redirect('/dashboard')
        
    except requests.exceptions.HTTPError as e:
        print(f'Token verification failed: {e.response.text}')
        return 'Authentication failed', 401

# Step 4: Consume credits when user uses a feature
@app.route('/api/generate', methods=['POST'])
@require_auth
def generate():
    user_id = session.get('user_id')
    prompt = request.json.get('prompt')
    
    try:
        # Consume 10 credits for image generation
        response = requests.post(
            f'{BASE_URL}/api/v1/credits/consume',
            json={
                'user_id': user_id,
                'amount': 10,
                'reason': 'Generated 1 image',
                'idempotency_key': f'{user_id}-gen-{int(datetime.now().timestamp() * 1000)}'
            },
            headers={
                'Authorization': f'Bearer {ONESUB_API_KEY}',
                'Content-Type': 'application/json'
            }
        )
        response.raise_for_status()
        
        data = response.json()
        new_balance = data['new_balance']
        
        # Perform your tool's action
        result = generate_image(prompt)
        
        return jsonify({
            'success': True,
            'result': result,
            'credits_remaining': new_balance
        })
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            # Insufficient credits
            error_data = e.response.json()
            return jsonify({
                'error': 'insufficient_credits',
                &apos;message&apos;: &quot;You don&apos;t have enough credits. Purchase more on 1sub.io&quot;,
                'current_balance': error_data.get('current_balance')
            }), 400
        
        print(f'Error: {e.response.text}')
        return jsonify({'error': 'Internal server error'}), 500

# Your tool's actual functionality
def generate_image(prompt):
    # Your image generation logic here
    return {'image_url': 'https://example.com/image.png'}

if __name__ == '__main__':
    app.run(port=3000, debug=True)`}
              />
            </CollapsibleSection>

            <CollapsibleSection title="PHP - Full Example" defaultOpen={false}>
              <CodeBlock
                language="php"
                code={`<?php
session_start();

define('ONESUB_API_KEY', getenv('ONESUB_API_KEY'));
define('BASE_URL', 'https://1sub.vercel.app');

// Step 1 & 2: Handle redirect and verify token
if ($_SERVER['REQUEST_URI'] === '/auth/callback') {
    $token = $_GET['token'] ?? null;
    
    if (!$token) {
        http_response_code(400);
        die('Missing token');
    }
    
    // Verify token
    $ch = curl_init(BASE_URL . '/api/v1/verify-user');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['token' => $token]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        
        // Store in session
        $_SESSION['user_id'] = $data['user_id'];
        $_SESSION['tool_id'] = $data['tool_id'];
        $_SESSION['checkout_id'] = $data['checkout_id'];
        
        header('Location: /dashboard');
        exit;
    } else {
        http_response_code(401);
        die('Authentication failed');
    }
}

// Step 3: Consume credits endpoint
if ($_SERVER['REQUEST_URI'] === '/api/generate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }
    
    $userId = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);
    $prompt = $input['prompt'] ?? '';
    
    // Consume credits
    $ch = curl_init(BASE_URL . '/api/v1/credits/consume');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'user_id' => $userId,
        'amount' => 10,
        'reason' => 'Generated 1 image',
        'idempotency_key' => $userId . '-gen-' . (microtime(true) * 1000)
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . ONESUB_API_KEY,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        $newBalance = $data['new_balance'];
        
        // Perform your tool's action
        $result = generateImage($prompt);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'result' => $result,
            'credits_remaining' => $newBalance
        ]);
    } else if ($httpCode === 400) {
        // Insufficient credits
        $errorData = json_decode($response, true);
        http_response_code(400);
        echo json_encode([
            'error' => 'insufficient_credits',
            &apos;message&apos; => &quot;You don&apos;t have enough credits. Purchase more on 1sub.io&quot;,
            'current_balance' => $errorData['current_balance'] ?? 0
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error']);
    }
    exit;
}

function generateImage($prompt) {
    // Your image generation logic here
    return ['image_url' => 'https://example.com/image.png'];
}
?>`}
              />
            </CollapsibleSection>
          </div>
        </section>

        {/* API Reference */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📖 API Reference</h2>
          
          {/* Verify User Endpoint */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded font-mono text-sm font-semibold">
                POST
              </span>
              <code className="text-[#3ecf8e]">/api/v1/verify-user</code>
            </div>
            <p className="text-[#9ca3af] mb-4">Verify a JWT token and retrieve user information.</p>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Request Body</div>
                <CodeBlock
                  language="json"
                  code={`{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}`}
                />
              </div>
              
              <div>
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Success Response (200)</div>
                <CodeBlock
                  language="json"
                  code={`{
  "valid": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "tool_id": "660e8400-e29b-41d4-a716-446655440000",
  "checkout_id": "770e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2025-11-12T15:30:00.000Z"
}`}
                />
              </div>
              
              <div>
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Error Response (401)</div>
                <CodeBlock
                  language="json"
                  code={`{
  "error": "Token expired",
  "message": "The provided token has expired"
}`}
                />
              </div>
              
              <div className="bg-[#111111] border border-[#374151] rounded p-3">
                <div className="text-sm text-[#9ca3af]">
                  <strong>Rate Limit:</strong> 60 requests per minute per IP
                </div>
              </div>
            </div>
          </div>

          {/* Consume Credits Endpoint */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded font-mono text-sm font-semibold">
                POST
              </span>
              <code className="text-[#3ecf8e]">/api/v1/credits/consume</code>
            </div>
            <p className="text-[#9ca3af] mb-4">Deduct credits from a user&apos;s balance.</p>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Headers</div>
                <CodeBlock
                  language="plaintext"
                  code={`Authorization: Bearer sk-tool-xxxxxxxxxxxx
Content-Type: application/json`}
                />
              </div>
              
              <div>
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Request Body</div>
                <CodeBlock
                  language="json"
                  code={`{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 10,
  "reason": "Generated 1 image",
  "idempotency_key": "unique-request-id-12345"
}`}
                />
              </div>
              
              <div>
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Success Response (200)</div>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "new_balance": 90,
  "transaction_id": "880e8400-e29b-41d4-a716-446655440000"
}`}
                />
              </div>
              
              <div>
                <div className="text-sm font-semibold text-[#d1d5db] mb-2">Error Response (400 - Insufficient Credits)</div>
                <CodeBlock
                  language="json"
                  code={`{
  "error": "Insufficient credits",
  "message": "User does not have sufficient credits",
  "current_balance": 5,
  "required": 10,
  "shortfall": 5
}`}
                />
              </div>
              
              <div className="bg-[#111111] border border-[#374151] rounded p-3">
                <div className="text-sm text-[#9ca3af]">
                  <strong>Rate Limit:</strong> 100 requests per minute per API key
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testing Guide */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">🧪 Testing Your Integration</h2>
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">1. Test with cURL</h3>
                <p className="text-[#9ca3af] mb-3">Quick test of the API endpoints from your terminal:</p>
                <CodeBlock
                  language="bash"
                  title="Test Token Verification"
                  code={`# Test token verification (use a real token from a test purchase)
curl -X POST https://1sub.vercel.app/api/v1/verify-user \\
  -H "Content-Type: application/json" \\
  -d '{"token":"YOUR_TEST_TOKEN"}'`}
                />
                <div className="mt-3">
                  <CodeBlock
                    language="bash"
                    title="Test Credit Consumption"
                    code={`# Test credit consumption (use your API key and a test user ID)
curl -X POST https://1sub.vercel.app/api/v1/credits/consume \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id":"550e8400-e29b-41d4-a716-446655440000",
    "amount":1,
    "reason":"Test transaction",
    "idempotency_key":"test-'$(date +%s)'"
  }'`}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">2. Test the Full User Flow</h3>
                <ol className="space-y-2 text-[#d1d5db]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#3ecf8e] font-bold">1.</span>
                    <span>Make sure your tool is published and has at least one product</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#3ecf8e] font-bold">2.</span>
                    <span>Create a test account on 1SUB (or use your own)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#3ecf8e] font-bold">3.</span>
                    <span>Purchase credits for your tool</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#3ecf8e] font-bold">4.</span>
                    <span>Click &quot;Access Tool&quot; and verify you&apos;re redirected with a token</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#3ecf8e] font-bold">5.</span>
                    <span>Verify your tool extracts and validates the token</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#3ecf8e] font-bold">6.</span>
                    <span>Use a feature and verify credits are consumed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#3ecf8e] font-bold">7.</span>
                    <span>Check your vendor dashboard to see the transaction</span>
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">3. Monitor Logs</h3>
                <p className="text-[#9ca3af] mb-3">Add comprehensive logging to track integration issues:</p>
                <CodeBlock
                  language="javascript"
                  code={`// Log token verification
console.log('[AUTH] Verifying token for user...', { timestamp: new Date() });

// Log credit consumption
console.log('[CREDITS] Consuming credits', { 
  userId, 
  amount, 
  reason,
  timestamp: new Date() 
});

// Log errors
console.error('[ERROR] API call failed', { 
  endpoint, 
  error: error.message,
  response: error.response?.data 
});`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">🔧 Troubleshooting</h2>
          <div className="space-y-4">
            
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-400">Token Verification Fails</h3>
                  <p className="text-sm text-[#9ca3af] mt-1">Error: &quot;Invalid token&quot; or &quot;Token expired&quot;</p>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#374151] rounded p-4">
                <div className="text-sm text-[#d1d5db] space-y-2">
                  <div><strong>Possible Causes:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>Token is more than 1 hour old (expired)</li>
                    <li>Token was already used or invalidated</li>
                    <li>Token is malformed or corrupted</li>
                  </ul>
                  <div className="mt-3"><strong>Solutions:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>Ask user to purchase again to get a new token</li>
                    <li>Ensure you&apos;re extracting the token correctly from URL</li>
                    <li>Check for whitespace or encoding issues</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-400">Credit Consumption Fails</h3>
                  <p className="text-sm text-[#9ca3af] mt-1">Error: &quot;Invalid API key&quot; or &quot;Unauthorized&quot;</p>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#374151] rounded p-4">
                <div className="text-sm text-[#d1d5db] space-y-2">
                  <div><strong>Possible Causes:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>API key is incorrect or not set</li>
                    <li>API key is not being sent in Authorization header</li>
                    <li>Tool is inactive or deleted</li>
                  </ul>
                  <div className="mt-3"><strong>Solutions:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>Verify your API key is correct in your .env file</li>
                    <li>Ensure you&apos;re using &quot;Bearer&quot; prefix: <code className="px-1 bg-[#374151] rounded">Bearer sk-tool-xxx</code></li>
                    <li>Check your tool is active in vendor dashboard</li>
                    <li>Regenerate API key if lost</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-500">Insufficient Credits Error</h3>
                  <p className="text-sm text-[#9ca3af] mt-1">Error: &quot;User does not have sufficient credits&quot;</p>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#374151] rounded p-4">
                <div className="text-sm text-[#d1d5db] space-y-2">
                  <div><strong>This is expected behavior:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>User ran out of credits</li>
                    <li>Trying to consume more than available balance</li>
                  </ul>
                  <div className="mt-3"><strong>Solutions:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                        <li>Show user-friendly message: &quot;You&apos;re out of credits&quot;</li>
                    <li>Provide link back to 1SUB to purchase more</li>
                    <li>Display current balance in your UI</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-400">Rate Limit Exceeded</h3>
                  <p className="text-sm text-[#9ca3af] mt-1">Error: &quot;Too many requests&quot;</p>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#374151] rounded p-4">
                <div className="text-sm text-[#d1d5db] space-y-2">
                  <div><strong>Rate Limits:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>Verify User: 60 requests/minute per IP</li>
                    <li>Consume Credits: 100 requests/minute per API key</li>
                  </ul>
                  <div className="mt-3"><strong>Solutions:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>Implement exponential backoff retry logic</li>
                    <li>Cache token verification results (for the session)</li>
                    <li>Batch operations where possible</li>
                    <li>Check <code className="px-1 bg-[#374151] rounded">Retry-After</code> header</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-500">User Not Redirected to My Tool</h3>
                  <p className="text-sm text-[#9ca3af] mt-1">Users click &quot;Access Tool&quot; but nothing happens</p>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#374151] rounded p-4">
                <div className="text-sm text-[#d1d5db] space-y-2">
                  <div><strong>Possible Causes:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>External URL not set or incorrect</li>
                    <li>URL doesn&apos;t use HTTPS protocol</li>
                    <li>Your site is down or unreachable</li>
                  </ul>
                  <div className="mt-3"><strong>Solutions:</strong></div>
                  <ul className="list-disc list-inside text-[#9ca3af] space-y-1">
                    <li>Verify External URL in your tool settings</li>
                    <li>Ensure your site is using HTTPS (required)</li>
                    <li>Test the URL manually in a browser</li>
                    <li>Check server logs for incoming requests</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">✅ Best Practices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-[#3ecf8e]" />
                <h3 className="font-semibold">Security</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#d1d5db]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Store API keys in environment variables</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Always use HTTPS for your external URL</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Validate user_id matches your session</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Never expose API keys in client-side code</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Key className="w-6 h-6 text-[#3ecf8e]" />
                <h3 className="font-semibold">Idempotency</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#d1d5db]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Always use unique idempotency keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Include user ID, operation ID, and timestamp</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Prevents duplicate charges on retry</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Example: <code className="px-1 bg-[#111111] rounded text-xs">{`\${userId}-\${opId}-\${ts}`}</code></span>
                </li>
              </ul>
            </div>

            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-6 h-6 text-[#3ecf8e]" />
                <h3 className="font-semibold">User Experience</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#d1d5db]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Show credit balance in your UI</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Display friendly error messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Provide link to purchase more credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Warn before expensive operations</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-6 h-6 text-[#3ecf8e]" />
                <h3 className="font-semibold">Logging & Monitoring</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#d1d5db]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Log all API requests and responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Track credit consumption patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Monitor error rates and types</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
                  <span>Set up alerts for critical issues</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-[#3ecf8e]/10 to-[#2dd4bf]/10 border border-[#3ecf8e]/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">🎉 Ready to Get Started?</h2>
            <p className="text-[#d1d5db] mb-6">
              You now have everything you need to integrate your tool with 1SUB. Follow these next steps:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/vendor-dashboard/publish')}
                className="flex flex-col items-center gap-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-white p-4 rounded-lg font-semibold transition-colors"
              >
                <Code className="w-6 h-6" />
                <span>Publish Tool</span>
              </button>
              <button
                onClick={() => router.push('/vendor-dashboard/api')}
                className="flex flex-col items-center gap-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] text-[#ededed] p-4 rounded-lg font-semibold transition-colors"
              >
                <Key className="w-6 h-6" />
                <span>Get API Key</span>
              </button>
              <button
                onClick={() => router.push('/vendor-dashboard/products')}
                className="flex flex-col items-center gap-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] text-[#ededed] p-4 rounded-lg font-semibold transition-colors"
              >
                <CreditCard className="w-6 h-6" />
                <span>Set Pricing</span>
              </button>
              <button
                onClick={() => router.push('/vendor-dashboard')}
                className="flex flex-col items-center gap-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] text-[#ededed] p-4 rounded-lg font-semibold transition-colors"
              >
                <TrendingUp className="w-6 h-6" />
                <span>View Dashboard</span>
              </button>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="mb-8">
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">💬 Need Help?</h2>
            <p className="text-[#9ca3af] mb-4">
              If you have questions or run into issues, we&apos;re here to help:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/support"
                className="flex items-center gap-3 p-4 bg-[#111111] hover:bg-[#374151] rounded-lg transition-colors"
              >
                <div className="p-2 bg-[#3ecf8e]/10 rounded">
                  <HelpCircle className="w-5 h-5 text-[#3ecf8e]" />
                </div>
                <div>
                  <div className="font-semibold">Support</div>
                  <div className="text-sm text-[#9ca3af]">Get help</div>
                </div>
              </a>
              <a
                href="mailto:support@1sub.io"
                className="flex items-center gap-3 p-4 bg-[#111111] hover:bg-[#374151] rounded-lg transition-colors"
              >
                <div className="p-2 bg-[#3ecf8e]/10 rounded">
                  <LinkIcon className="w-5 h-5 text-[#3ecf8e]" />
                </div>
                <div>
                  <div className="font-semibold">Email</div>
                  <div className="text-sm text-[#9ca3af]">support@1sub.io</div>
                </div>
              </a>
              <a
                href="/vendor-dashboard/users"
                className="flex items-center gap-3 p-4 bg-[#111111] hover:bg-[#374151] rounded-lg transition-colors"
              >
                <div className="p-2 bg-[#3ecf8e]/10 rounded">
                  <Users className="w-5 h-5 text-[#3ecf8e]" />
                </div>
                <div>
                  <div className="font-semibold">Community</div>
                  <div className="text-sm text-[#9ca3af]">Join vendors</div>
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


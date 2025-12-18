'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Code,
  Zap,
  Shield,
  TrendingUp,
  Key,
  CreditCard,
  FileText,
  BookOpen,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function IntegrationGuidePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

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
        <div className="max-w-4xl mx-auto px-4 py-6">
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
              <p className="text-[#9ca3af] mt-1">Connect your external tool to 1SUB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Overview */}
        <div className="bg-gradient-to-r from-[#3ecf8e]/10 to-[#2dd4bf]/10 border border-[#3ecf8e]/30 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-3">How 1SUB Integration Works</h2>
          <p className="text-[#d1d5db] mb-4">
            Integrating with 1SUB allows you to monetize your tool through our credit system.
            Users subscribe or purchase credits on our platform, link their account to your tool,
            and you verify subscriptions and consume credits via our API.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#ededed]">Quick Setup</h3>
                <p className="text-sm text-[#9ca3af]">Simple REST API</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#ededed]">Secure</h3>
                <p className="text-sm text-[#9ca3af]">API key authentication</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#ededed]">Earn Revenue</h3>
                <p className="text-sm text-[#9ca3af]">Per credit used</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation CTA */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#3ecf8e]/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-[#3ecf8e]" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Full Documentation</h2>
              <p className="text-[#9ca3af] mb-4">
                Our comprehensive documentation covers everything you need: API reference,
                code examples in multiple languages, authentication, webhooks, and troubleshooting.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/docs"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#3ecf8e] text-[#111111] rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  View Documentation
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="/docs/quickstart"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Quickstart
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="/docs/api/reference"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
                >
                  <Code className="w-4 h-4" />
                  API Reference
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Setup Steps */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Setup Checklist</h2>
          <div className="space-y-3">

            <button
              onClick={() => router.push('/vendor-dashboard/publish')}
              className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#ededed]">Publish Your Tool</h3>
                  <p className="text-sm text-[#9ca3af]">Create your tool listing and get your API key</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#9ca3af] group-hover:text-[#3ecf8e] transition-colors" />
              </div>
            </button>

            <button
              onClick={() => router.push('/vendor-dashboard/products')}
              className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#ededed]">Configure Pricing</h3>
                  <p className="text-sm text-[#9ca3af]">Set up credit packages for your tool</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#9ca3af] group-hover:text-[#3ecf8e] transition-colors" />
              </div>
            </button>

            <button
              onClick={() => router.push('/vendor-dashboard/api')}
              className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#ededed]">Get Your API Key</h3>
                  <p className="text-sm text-[#9ca3af]">View and manage your API credentials</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#9ca3af] group-hover:text-[#3ecf8e] transition-colors" />
              </div>
            </button>

            <a
              href="/docs/quickstart"
              target="_blank"
              className="block w-full bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#3ecf8e] rounded-full flex items-center justify-center font-bold text-[#111111] flex-shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#ededed]">Implement the Integration</h3>
                  <p className="text-sm text-[#9ca3af]">Follow our quickstart guide with code examples</p>
                </div>
                <ExternalLink className="w-5 h-5 text-[#9ca3af] group-hover:text-[#3ecf8e] transition-colors" />
              </div>
            </a>

          </div>
        </div>

        {/* Documentation Links */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Documentation Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <a
              href="/docs/api/authentication"
              target="_blank"
              className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-[#3ecf8e]" />
                <h3 className="font-semibold">Authentication</h3>
                <ExternalLink className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-[#3ecf8e]" />
              </div>
              <p className="text-sm text-[#9ca3af]">API keys and user verification</p>
            </a>

            <a
              href="/docs/examples/node"
              target="_blank"
              className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Code className="w-5 h-5 text-[#3ecf8e]" />
                <h3 className="font-semibold">Code Examples</h3>
                <ExternalLink className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-[#3ecf8e]" />
              </div>
              <p className="text-sm text-[#9ca3af]">Node.js, Python, cURL examples</p>
            </a>

            <a
              href="/docs/concepts/credits-and-subscriptions"
              target="_blank"
              className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-5 h-5 text-[#3ecf8e]" />
                <h3 className="font-semibold">Credits System</h3>
                <ExternalLink className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-[#3ecf8e]" />
              </div>
              <p className="text-sm text-[#9ca3af]">How credits and billing work</p>
            </a>

            <a
              href="/docs/troubleshooting/common-errors"
              target="_blank"
              className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-[#3ecf8e]" />
                <h3 className="font-semibold">Troubleshooting</h3>
                <ExternalLink className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-[#3ecf8e]" />
              </div>
              <p className="text-sm text-[#9ca3af]">Common errors and solutions</p>
            </a>

          </div>
        </div>

        {/* Test Your Integration */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Test Your Integration</h2>

          {/* Test Account Linking */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-5 mb-4">
            <h3 className="font-semibold text-[#ededed] mb-4">Test Account Linking</h3>

            {/* Email-Based */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[#3ecf8e] mb-2">Email-Based:</h4>
              <ol className="text-sm text-[#d1d5db] space-y-2 list-decimal list-inside ml-2">
                <li>Log into your tool with a verified email</li>
                <li>Verify the email hash lookup returns the correct subscription</li>
                <li>Check that oneSubUserId is cached in your database</li>
              </ol>
              <div className="mt-3 p-3 bg-[#0a0a0a] rounded border border-[#374151]">
                <p className="text-xs text-[#9ca3af] mb-2">Test with curl:</p>
                <code className="text-xs text-[#3ecf8e] font-mono block overflow-x-auto">
                  curl -X POST &apos;https://1sub.io/api/v1/tools/subscriptions/verify&apos; \<br/>
                  &nbsp;&nbsp;-H &apos;Authorization: Bearer YOUR_API_KEY&apos; \<br/>
                  &nbsp;&nbsp;-H &apos;Content-Type: application/json&apos; \<br/>
                  &nbsp;&nbsp;-d &apos;{`{"emailSha256": "SHA256_HASH_OF_EMAIL"}`}&apos;
                </code>
              </div>
            </div>

            {/* Link Codes */}
            <div>
              <h4 className="text-sm font-medium text-[#3ecf8e] mb-2">Link Codes:</h4>
              <ol className="text-sm text-[#d1d5db] space-y-2 list-decimal list-inside ml-2">
                <li>Subscribe to your tool on 1Sub (use test mode)</li>
                <li>Note the link code provided</li>
                <li>Enter code in your tool</li>
                <li>Verify the link is created in your database</li>
              </ol>
              <div className="mt-3 p-3 bg-[#0a0a0a] rounded border border-[#374151]">
                <p className="text-xs text-[#9ca3af] mb-2">Exchange code with curl:</p>
                <code className="text-xs text-[#3ecf8e] font-mono block overflow-x-auto">
                  curl -X POST &apos;https://1sub.io/api/v1/tools/link/exchange-code&apos; \<br/>
                  &nbsp;&nbsp;-H &apos;Authorization: Bearer YOUR_API_KEY&apos; \<br/>
                  &nbsp;&nbsp;-H &apos;Content-Type: application/json&apos; \<br/>
                  &nbsp;&nbsp;-d &apos;{`{"code": "ABC123", "toolUserId": "your-user-id"}`}&apos;
                </code>
              </div>
            </div>
          </div>

          {/* Test Subscription Verification */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-5 mb-4">
            <h3 className="font-semibold text-[#ededed] mb-4">Test Subscription Verification</h3>
            <ol className="text-sm text-[#d1d5db] space-y-2 list-decimal list-inside ml-2">
              <li>Call your protected endpoint</li>
              <li>Verify it returns 403 for users without subscriptions</li>
              <li>Subscribe and verify it grants access</li>
              <li>Cancel subscription and verify access is revoked</li>
            </ol>
            <div className="mt-3 p-3 bg-[#0a0a0a] rounded border border-[#374151]">
              <p className="text-xs text-[#9ca3af] mb-2">Verify subscription with curl:</p>
              <code className="text-xs text-[#3ecf8e] font-mono block overflow-x-auto">
                curl -X POST &apos;https://1sub.io/api/v1/tools/subscriptions/verify&apos; \<br/>
                &nbsp;&nbsp;-H &apos;Authorization: Bearer YOUR_API_KEY&apos; \<br/>
                &nbsp;&nbsp;-H &apos;Content-Type: application/json&apos; \<br/>
                &nbsp;&nbsp;-d &apos;{`{"oneSubUserId": "USER_UUID"}`}&apos;
              </code>
            </div>
            <div className="mt-3 p-3 bg-[#111111] rounded border border-[#374151]">
              <p className="text-xs text-[#9ca3af]">
                <strong className="text-[#ededed]">Expected response (active):</strong>
              </p>
              <code className="text-xs text-[#d1d5db] font-mono block mt-1">
                {`{"active": true, "status": "active", "creditsRemaining": 100}`}
              </code>
              <p className="text-xs text-[#9ca3af] mt-2">
                <strong className="text-[#ededed]">Expected response (no subscription):</strong>
              </p>
              <code className="text-xs text-[#d1d5db] font-mono block mt-1">
                {`{"active": false, "status": null}`}
              </code>
            </div>
          </div>

          {/* Test Webhooks */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-5">
            <h3 className="font-semibold text-[#ededed] mb-4">Test Webhooks</h3>
            <ol className="text-sm text-[#d1d5db] space-y-2 list-decimal list-inside ml-2">
              <li>Use a tool like RequestBin or ngrok for local testing</li>
              <li>Trigger events by creating/canceling subscriptions</li>
              <li>Verify signature validation works</li>
              <li>Check that events are processed correctly</li>
              <li>Test with invalid signatures (should return 401)</li>
            </ol>
            <div className="mt-4 p-3 bg-gradient-to-r from-[#3ecf8e]/10 to-[#2dd4bf]/10 border border-[#3ecf8e]/30 rounded">
              <p className="text-xs text-[#ededed] mb-2 font-medium">
                Quick Test: Use the &quot;Send Test Webhook&quot; button in your{' '}
                <a href="/vendor-dashboard/api" className="text-[#3ecf8e] hover:underline">API Settings</a>
              </p>
              <p className="text-xs text-[#9ca3af]">
                Configure your webhook URL and secret, then send test events directly from the dashboard.
              </p>
            </div>
            <div className="mt-3 p-3 bg-[#0a0a0a] rounded border border-[#374151]">
              <p className="text-xs text-[#9ca3af] mb-2">Webhook payload example:</p>
              <pre className="text-xs text-[#3ecf8e] font-mono overflow-x-auto">
{`{
  "id": "evt_abc123",
  "type": "subscription.activated",
  "created": 1702900000,
  "data": {
    "oneSubUserId": "uuid",
    "planId": "pro",
    "status": "active",
    "creditsRemaining": 100
  }
}`}
              </pre>
            </div>
            <div className="mt-3 p-3 bg-[#111111] rounded border border-[#374151]">
              <p className="text-xs text-[#9ca3af] mb-2">
                <strong className="text-[#ededed]">Signature header format:</strong>
              </p>
              <code className="text-xs text-[#d1d5db] font-mono block">
                1sub-signature: t=1702900000,v1=hmac_sha256_hex
              </code>
              <p className="text-xs text-[#9ca3af] mt-2">
                Verify using HMAC-SHA256 with your webhook secret. Reject if timestamp is older than 5 minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6">
          <h2 className="text-lg font-bold mb-3">Need Help?</h2>
          <p className="text-[#9ca3af] mb-4">
            Check the documentation or contact support if you have questions.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/docs"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg font-medium hover:bg-[#4b5563] transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Documentation
            </a>
            <a
              href="mailto:support@1sub.io"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg font-medium hover:bg-[#4b5563] transition-colors"
            >
              Email Support
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

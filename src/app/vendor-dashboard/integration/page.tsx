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
  ArrowRight,
  FlaskConical,
  Webhook
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

        {/* Testing */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Testing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <a
              href="/docs/guides/testing-sandbox"
              target="_blank"
              className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <FlaskConical className="w-5 h-5 text-[#3ecf8e]" />
                <h3 className="font-semibold">Testing Guide</h3>
                <ExternalLink className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-[#3ecf8e]" />
              </div>
              <p className="text-sm text-[#9ca3af]">Test account linking, subscriptions, and API calls</p>
            </a>

            <a
              href="/docs/webhooks/testing"
              target="_blank"
              className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 hover:border-[#3ecf8e]/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Webhook className="w-5 h-5 text-[#3ecf8e]" />
                <h3 className="font-semibold">Webhook Testing</h3>
                <ExternalLink className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-[#3ecf8e]" />
              </div>
              <p className="text-sm text-[#9ca3af]">Test webhook delivery and signature verification</p>
            </a>

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

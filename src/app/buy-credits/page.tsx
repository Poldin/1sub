'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

function BuyCreditsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const needed = searchParams.get('needed') || '0';
  const toolId = searchParams.get('tool_id');
  const toolName = searchParams.get('tool_name');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/backoffice')}
              className="text-2xl font-bold text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
            >
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Insufficient Credits Warning */}
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Insufficient Credits</h2>
              {toolName ? (
                <p className="text-[#9ca3af]">
                  You need <span className="text-[#ededed] font-semibold">{needed} credits</span> to access <span className="text-[#3ecf8e] font-semibold">{decodeURIComponent(toolName)}</span>.
                </p>
              ) : (
                <p className="text-[#9ca3af]">
                  You need at least <span className="text-[#ededed] font-semibold">{needed} credits</span> to continue.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl p-8 border border-[#374151]/70">
          <div className="text-center mb-8">
            <CreditCard className="w-16 h-16 text-[#3ecf8e] mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Buy Credits</h1>
            <p className="text-[#9ca3af]">
              Purchase credits to access premium tools and features
            </p>
          </div>

          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-6 mb-8">
            <p className="text-yellow-400 font-medium mb-2">🚧 Coming Soon</p>
            <p className="text-sm text-[#9ca3af] mb-3">
              Credit purchase with Stripe payment integration will be available soon. 
              In the meantime, please contact support to add credits to your account.
            </p>
          </div>

          {/* Credit Packages Preview */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-[#ededed]">Available Packages (Preview)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0a0a0a]/50 border border-[#374151] rounded-lg p-4 opacity-50">
                <div className="text-2xl font-bold text-[#3ecf8e] mb-2">100 credits</div>
                <div className="text-sm text-[#9ca3af] mb-3">Starter Pack</div>
                <div className="text-xl font-bold text-[#ededed]">$29.99</div>
              </div>
              <div className="bg-[#0a0a0a]/50 border border-[#374151] rounded-lg p-4 opacity-50">
                <div className="text-2xl font-bold text-[#3ecf8e] mb-2">500 credits</div>
                <div className="text-sm text-[#9ca3af] mb-3">Pro Pack</div>
                <div className="text-xl font-bold text-[#ededed]">$99.99</div>
              </div>
              <div className="bg-[#0a0a0a]/50 border border-[#374151] rounded-lg p-4 opacity-50">
                <div className="text-2xl font-bold text-[#3ecf8e] mb-2">1000 credits</div>
                <div className="text-sm text-[#9ca3af] mb-3">Enterprise Pack</div>
                <div className="text-xl font-bold text-[#ededed]">$179.99</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push('/backoffice')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#374151] text-[#ededed] px-6 py-3 rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push('/support')}
              className="flex-1 bg-[#3ecf8e] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BuyCreditsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    }>
      <BuyCreditsContent />
    </Suspense>
  );
}


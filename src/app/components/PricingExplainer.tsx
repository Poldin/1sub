'use client';

import { Calculator, Zap } from 'lucide-react';

export default function PricingExplainer() {
  return (
    <div className="max-w-6xl mx-auto mb-12">
      {/* How Credits Work */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          simple, transparent pricing
        </h2>
        <p className="text-[#d1d5db] text-lg">
          1 credit = €1. Use credits for any tool, any time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Card 1: How it Works */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 hover:border-[#3ecf8e] transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#3ecf8e]/10 rounded-lg">
              <Zap className="w-6 h-6 text-[#3ecf8e]" />
            </div>
            <h3 className="text-xl font-bold">how it works</h3>
          </div>
          <p className="text-[#d1d5db] leading-relaxed">
            Buy credits once, use them across all tools. €29/month = 29 credits = access multiple tools of your choice.
          </p>
          <div className="mt-4 pt-4 border-t border-[#374151]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9ca3af]">Example:</span>
              <span className="text-[#3ecf8e] font-semibold">AI Tool + Design Tool</span>
            </div>
          </div>
        </div>

        {/* Card 2: Single Platform Advantage */}
        <div className="bg-gradient-to-br from-[#3ecf8e]/20 to-[#2dd4bf]/10 border-2 border-[#3ecf8e] rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-[#3ecf8e] text-[#0a0a0a] text-xs font-bold px-3 py-1 rounded-full">
            BEST VALUE
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#3ecf8e]/20 rounded-lg">
              <Zap className="w-6 h-6 text-[#3ecf8e]" />
            </div>
            <h3 className="text-xl font-bold">one platform</h3>
          </div>
          <p className="text-[#d1d5db] leading-relaxed mb-4">
            Manage all your tools in one place. No more juggling multiple subscriptions, billing dates, or passwords.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></div>
              <span className="text-[#d1d5db]">Single dashboard for everything</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></div>
              <span className="text-[#d1d5db]">One billing cycle to track</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></div>
              <span className="text-[#d1d5db]">Unified credit system</span>
            </div>
          </div>
        </div>

        {/* Card 3: Flexible Usage */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 hover:border-[#3ecf8e] transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#3ecf8e]/10 rounded-lg">
              <Calculator className="w-6 h-6 text-[#3ecf8e]" />
            </div>
            <h3 className="text-xl font-bold">pay your way</h3>
          </div>
          <p className="text-[#d1d5db] leading-relaxed">
            Choose monthly subscriptions, one-time purchases, or pay-per-use. Complete flexibility for your workflow.
          </p>
          <div className="mt-4 pt-4 border-t border-[#374151] space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></div>
              <span className="text-[#d1d5db]">No long-term contracts</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></div>
              <span className="text-[#d1d5db]">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></div>
              <span className="text-[#d1d5db]">Credits never expire</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


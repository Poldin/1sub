'use client';

import Link from 'next/link';

export default function VendorsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#374151] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-2xl font-bold text-[#3ecf8e]">
                  1sub<span className="text-[#9ca3af] font-normal">.io</span>
                </h1>
              </Link>
            </div>

            {/* CTA Button */}
            <Link
              href="/vendors/apply"
              className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#3ecf8e]/30"
            >
              <span className="relative z-10 flex items-center gap-2">
                become a vendor
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative section-padding text-center overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3ecf8e]/10 via-[#0a0a0a] to-[#2dd4bf]/10 animate-gradient opacity-50"></div>

        {/* Floating Particles Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#3ecf8e] rounded-full opacity-60 animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-[#2dd4bf] rounded-full opacity-40 animate-float delay-200"></div>
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-[#3ecf8e] rounded-full opacity-50 animate-float delay-400"></div>
          <div className="absolute top-2/3 right-1/3 w-3 h-3 bg-[#2dd4bf] rounded-full opacity-30 animate-float delay-300"></div>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in-up opacity-0">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] animate-gradient">
              1 subscription, countless tools
            </span>
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl text-[#d1d5db] max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200 opacity-0">
            Imagine a platform with users ready to try out your SaaS. That&apos;s 1sub.
          </p>

          <div className="animate-fade-in-up delay-400 opacity-0">
            <Link
              href="/vendors/apply"
              className="group relative inline-flex items-center justify-center px-10 py-5 text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 animate-pulse-glow active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-3">
                apply to become a vendor
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#2dd4bf] to-[#3ecf8e] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works - Technical Section */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
            How does it work?
          </h2>

          {/* Flow Diagram */}
          <div className="mb-12 py-8">
            <div className="flex items-center justify-center gap-4 sm:gap-8">
              {/* Users - Left Side (Circles) */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 justify-end">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#9ca3af]"></div>
                </div>
                <p className="text-xs text-[#9ca3af] text-right mt-2">thousands of users</p>
              </div>

              {/* Arrow pointing to 1sub */}
              <div className="text-[#3ecf8e] text-2xl sm:text-4xl animate-pulse">→</div>

              {/* 1sub Central Box */}
              <div className="relative">
                {/* Animated border glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#3ecf8e] to-[#059669] rounded-lg blur-md animate-pulse opacity-75"></div>
                <div className="relative bg-gradient-to-br from-[#3ecf8e] to-[#059669] rounded-lg p-4 sm:p-8 shadow-2xl border-4 border-white/40 animate-border-glow">
                  <div className="text-2xl sm:text-4xl font-black text-white text-center">1sub</div>
                  <p className="text-xs sm:text-sm text-white/90 text-center mt-1">central hub</p>
                </div>
              </div>

              {/* Arrow pointing to tools */}
              <div className="text-[#3ecf8e] text-2xl sm:text-4xl animate-pulse">→</div>

              {/* Tools - Right Side (Squares) */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#3ecf8e] rounded"></div>
                </div>
                <p className="text-xs text-[#3ecf8e] text-left mt-2">your tools</p>
              </div>
            </div>
          </div>

          <p className="text-lg sm:text-xl text-[#d1d5db] mb-8 text-center leading-relaxed max-w-4xl mx-auto">
            Our mission is to build a large community of subscribers and convert them into active users of your digital tool.
          </p>
          <p className="text-base text-[#9ca3af] mb-12 text-center leading-relaxed max-w-3xl mx-auto">
            We handle user acquisition and management. You integrate with two simple API endpoints, and we&apos;ll bring thousands of potential subscribers directly to your product.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Endpoint 1 */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3ecf8e]/10 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] text-black rounded-xl px-4 py-2 font-black text-lg shadow-lg shadow-[#3ecf8e]/20">1</div>
                <div>
                  <h3 className="text-xl font-bold text-[#3ecf8e] mb-2 group-hover:text-[#2dd4bf] transition-colors">Secure Verification</h3>
                  <p className="text-sm text-[#9ca3af] font-mono mb-3 bg-[#111827] px-2 py-1 rounded inline-block">JWT & Redirect Flow</p>
                </div>
              </div>
              <p className="text-[#d1d5db] text-base leading-relaxed">
                We redirect users to your tool with a signed JWT token. Simply verify the signature to instantly confirm their subscription status and entitlements. No complex API calls needed for initial access.
              </p>
            </div>

            {/* Endpoint 2 */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3ecf8e]/10 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] text-black rounded-xl px-4 py-2 font-black text-lg shadow-lg shadow-[#3ecf8e]/20">2</div>
                <div>
                  <h3 className="text-xl font-bold text-[#3ecf8e] mb-2 group-hover:text-[#2dd4bf] transition-colors">Real-time Events</h3>
                  <p className="text-sm text-[#9ca3af] font-mono mb-3 bg-[#111827] px-2 py-1 rounded inline-block">Webhooks</p>
                </div>
              </div>
              <p className="text-[#d1d5db] text-base leading-relaxed">
                Stay in sync with subscription changes. We send real-time webhook events when users subscribe, cancel, or upgrade, so you can automatically provision or revoke access without polling.
              </p>
            </div>
          </div>

          {/* Business Model Flexibility */}
          <div className="py-16 text-center">
            <h3 className="text-3xl sm:text-4xl font-bold mb-6 text-white">Your business, your rules</h3>
            <p className="text-lg text-[#d1d5db] leading-relaxed mb-10 max-w-3xl mx-auto">
              We don&apos;t limit your creativity. We simply want to be the primary access channel for users to discover and use your tool. Choose any business model that works best for you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="px-6 py-3 bg-[#1f2937] border border-[#374151] rounded-full text-[#ededed] font-medium hover:border-[#3ecf8e] transition-colors cursor-default">
                Pay-as-you-go
              </span>
              <span className="px-6 py-3 bg-[#1f2937] border border-[#374151] rounded-full text-[#ededed] font-medium hover:border-[#3ecf8e] transition-colors cursor-default">
                Fixed monthly
              </span>
              <span className="px-6 py-3 bg-[#1f2937] border border-[#374151] rounded-full text-[#ededed] font-medium hover:border-[#3ecf8e] transition-colors cursor-default">
                Tiered pricing
              </span>
              <span className="px-6 py-3 bg-[#1f2937] border border-[#374151] rounded-full text-[#ededed] font-medium hover:border-[#3ecf8e] transition-colors cursor-default">
                Usage-based
              </span>
              <span className="px-6 py-3 bg-[#1f2937] border border-[#374151] rounded-full text-[#ededed] font-medium hover:border-[#3ecf8e] transition-colors cursor-default">
                Hybrid model
              </span>
            </div>
          </div>

          {/* Why Users Love 1sub */}
          <div className="py-12">
            <h3 className="text-3xl font-bold mb-6 text-center text-white">Why users choose 1sub</h3>
            <p className="text-lg text-[#d1d5db] text-center leading-relaxed mb-12 max-w-3xl mx-auto">
              Users want clarity, simplicity, and value. 1sub consolidates multiple tools into a single subscription.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="bg-[#1f2937]/50 border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#3ecf8e]/20 transition-colors">
                    <span className="text-2xl">💎</span>
                  </div>
                  <h4 className="font-bold text-white text-xl mb-3">Clear costs</h4>
                  <p className="text-[#9ca3af] leading-relaxed">No hidden fees. One subscription, predictable pricing for everything.</p>
                </div>
              </div>
              <div className="text-center group">
                <div className="bg-[#1f2937]/50 border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#3ecf8e]/20 transition-colors">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h4 className="font-bold text-white text-xl mb-3">Centralized</h4>
                  <p className="text-[#9ca3af] leading-relaxed">All tools in one place. Easy to manage, control spending, and discover.</p>
                </div>
              </div>
              <div className="text-center group">
                <div className="bg-[#1f2937]/50 border border-[#374151] rounded-2xl p-8 hover:border-[#3ecf8e] transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#3ecf8e]/20 transition-colors">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h4 className="font-bold text-white text-xl mb-3">Max Value</h4>
                  <p className="text-[#9ca3af] leading-relaxed">Get more from every euro. Access multiple premium tools for one price.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Benefits */}
          <div className="py-12 border-t border-[#374151]/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-[#3ecf8e] mb-3">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h4 className="font-bold text-white mb-2">Real-time verification</h4>
                <p className="text-sm text-[#9ca3af]">Instant user validation with every request</p>
              </div>
              <div className="text-center">
                <div className="text-[#3ecf8e] mb-3">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h4 className="font-bold text-white mb-2">Automated billing</h4>
                <p className="text-sm text-[#9ca3af]">Zero manual work, we handle everything</p>
              </div>
              <div className="text-center">
                <div className="text-[#3ecf8e] mb-3">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h4 className="font-bold text-white mb-2">Usage analytics</h4>
                <p className="text-sm text-[#9ca3af]">Track your growth and user engagement</p>
              </div>
            </div>
          </div>

          {/* Documentation CTA */}
          <div className="text-center">
            <Link
              href="/vendors/apply"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-[#1f2937] border border-[#374151] hover:border-[#3ecf8e] text-[#ededed] rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-[#3ecf8e]/10"
            >
              <span>start your integration now</span>
              <svg className="w-4 h-4 text-[#3ecf8e] transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Early Adopter Bonus Section */}
      <section className="section-padding bg-gradient-to-br from-[#3ecf8e] to-[#059669]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border-4 border-white/60 shadow-2xl">
            <div className="inline-block bg-black/20 text-white px-6 py-2 rounded-full text-sm font-bold mb-4">
              🚀 EARLY ADOPTER SPECIAL
            </div>
            <h2 className="text-3xl sm:text-5xl font-black mb-6 text-white">
              Join early, pay less forever
            </h2>
            <p className="text-lg sm:text-2xl text-white mb-8 leading-relaxed font-semibold">
              We&apos;re small and growing. The earlier you join, the better your rate!
            </p>

            <div className="bg-white/95 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto">
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] rounded-lg">
                  <span className="font-bold text-black text-lg">Tools 1-10</span>
                  <span className="text-3xl font-black text-black">Start at 10%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#3ecf8e] to-[#059669] rounded-lg">
                  <span className="font-bold text-white text-lg">Tools 11-15</span>
                  <span className="text-3xl font-black text-white">Start at 15%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#10b981] to-[#047857] rounded-lg">
                  <span className="font-bold text-white text-lg">Tools 16-20</span>
                  <span className="text-3xl font-black text-white">Start at 20%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#6b7280] to-[#4b5563] rounded-lg">
                  <span className="font-bold text-white text-lg">Tools 21-25</span>
                  <span className="text-3xl font-black text-white">Start at 25%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#9ca3af] to-[#6b7280] rounded-lg">
                  <span className="font-bold text-white text-lg">Tools 26-30</span>
                  <span className="text-3xl font-black text-white">Start at 30%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#e5e7eb] rounded-lg border-2 border-[#9ca3af]">
                  <span className="font-bold text-black text-lg">Tools 31+</span>
                  <span className="text-3xl font-black text-black">Start at 35%</span>
                </div>
              </div>

              <p className="text-sm text-[#6b7280] mt-6 font-semibold">
                Your starting rate is locked in forever. As you grow, your fees only go down!
              </p>
            </div>

            <Link
              href="/vendors/apply"
              className="group relative inline-flex items-center justify-center px-10 py-4 text-xl font-black text-black bg-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl mt-8"
            >
              <span className="relative z-10 flex items-center gap-2">
                claim your spot now
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* External Sales Office Section */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            We are your external sales team
          </h2>

          <p className="text-lg sm:text-xl text-[#d1d5db] max-w-3xl mx-auto mb-12 leading-relaxed">
            You focus on building the best tool ever. We&apos;ll take care of getting it to the right users.
          </p>

          {/* Fee Structure */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-[#1f2937] to-[#111827] rounded-lg p-8 sm:p-12 border border-[#374151]">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-[#3ecf8e]">
                Transparent pricing
              </h3>
              <p className="text-base text-[#9ca3af] mb-8">
                Our fees are calculated annually (cycle resets at the beginning of each year)
              </p>

              {/* First Month Free Banner */}
              <div className="bg-[#3ecf8e] text-black px-6 py-3 rounded-lg mb-8 inline-block">
                <span className="font-bold text-lg">First month is FREE</span>
              </div>

              {/* Fee Tiers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* 35% Tier */}
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
                  <div className="text-4xl font-black text-white mb-2">35%</div>
                  <div className="flex items-center justify-center gap-2 text-[#9ca3af]">
                    <span className="text-lg font-bold">€</span>
                    <span className="text-sm">€0 - €1K</span>
                  </div>
                </div>

                {/* 30% Tier */}
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
                  <div className="text-4xl font-black text-white mb-2">30%</div>
                  <div className="flex items-center justify-center gap-2 text-[#9ca3af]">
                    <span className="text-lg font-bold">€</span>
                    <span className="text-sm">€1K - €5K</span>
                  </div>
                </div>

                {/* 25% Tier */}
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
                  <div className="text-4xl font-black text-white mb-2">25%</div>
                  <div className="flex items-center justify-center gap-2 text-[#9ca3af]">
                    <span className="text-lg font-bold">€</span>
                    <span className="text-sm">€5K - €10K</span>
                  </div>
                </div>

                {/* 20% Tier */}
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
                  <div className="text-4xl font-black text-white mb-2">20%</div>
                  <div className="flex items-center justify-center gap-2 text-[#9ca3af]">
                    <span className="text-lg font-bold">€</span>
                    <span className="text-sm">€10K - €20K</span>
                  </div>
                </div>

                {/* 15% Tier */}
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
                  <div className="text-4xl font-black text-white mb-2">15%</div>
                  <div className="flex items-center justify-center gap-2 text-[#9ca3af]">
                    <span className="text-lg font-bold">€</span>
                    <span className="text-sm">€20K - €50K</span>
                  </div>
                </div>

                {/* 10% Tier */}
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
                  <div className="text-4xl font-black text-white mb-2">10%</div>
                  <div className="flex items-center justify-center gap-2 text-[#9ca3af]">
                    <span className="text-lg font-bold">€</span>
                    <span className="text-sm">€50K - €100K</span>
                  </div>
                </div>

                {/* 6% Tier */}
                <div className="bg-[#1f2937] border-2 border-[#3ecf8e] rounded-lg p-6 hover:shadow-lg hover:shadow-[#3ecf8e]/20 transition-all sm:col-span-2 lg:col-span-3">
                  <div className="text-5xl font-black text-[#3ecf8e] mb-2">6%</div>
                  <div className="flex items-center justify-center gap-2 text-[#d1d5db]">
                    <span className="text-xl font-bold text-[#3ecf8e]">€</span>
                    <span className="text-base font-semibold">€100K+</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#9ca3af] mt-6">
                Fees are based on annual revenue generated through 1sub
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Phases Section */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
            Earn public approval
          </h2>
          <p className="text-lg text-[#d1d5db] mb-12 text-center leading-relaxed max-w-3xl mx-auto">
            Every tool goes through three transparent phases. Users pay at all stages, but they know exactly what phase your tool is in.
          </p>

          {/* Phase Timeline */}
          <div className="relative mb-12">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[#166534] via-[#22c55e] to-[#4ade80] transform -translate-y-1/2"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Phase 1: Alpha */}
              <div className="bg-gradient-to-br from-[#1f2937] to-[#111827] border-2 border-[#166534] rounded-lg p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#166534] text-white px-4 py-1 rounded-full text-sm font-bold">
                  Phase 1
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-[#166534] mb-3">α ALPHA</h3>
                  <p className="text-[#d1d5db] text-sm mb-4 leading-relaxed">
                    Your tool enters the platform. Users know it&apos;s in early access.
                  </p>
                  <div className="bg-[#166534]/10 border border-[#166534]/30 rounded-lg p-4 mb-3">
                    <div className="text-3xl font-black text-[#166534] mb-1">100</div>
                    <p className="text-xs text-[#9ca3af] mb-2">users and</p>
                    <div className="text-3xl font-black text-[#166534] mb-1">1k</div>
                    <p className="text-xs text-[#9ca3af]">revenue to exit</p>
                  </div>
                  <div className="inline-block bg-[#166534]/20 text-[#166534] px-3 py-1 rounded text-xs font-semibold">
                    Users pay • Phase visible
                  </div>
                </div>
              </div>

              {/* Phase 2: Beta */}
              <div className="bg-gradient-to-br from-[#1f2937] to-[#111827] border-2 border-[#22c55e] rounded-lg p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#22c55e] text-black px-4 py-1 rounded-full text-sm font-bold">
                  Phase 2
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-[#22c55e] mb-3">β BETA</h3>
                  <p className="text-[#d1d5db] text-sm mb-4 leading-relaxed">
                    Proven interest. Your tool is gaining traction and users.
                  </p>
                  <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg p-4 mb-3">
                    <div className="text-3xl font-black text-[#22c55e] mb-1">1000</div>
                    <p className="text-xs text-[#9ca3af] mb-2">users and</p>
                    <div className="text-3xl font-black text-[#22c55e] mb-1">10k</div>
                    <p className="text-xs text-[#9ca3af]">revenue to exit</p>
                  </div>
                  <div className="inline-block bg-[#22c55e]/20 text-[#22c55e] px-3 py-1 rounded text-xs font-semibold">
                    Users pay • Phase visible
                  </div>
                </div>
              </div>

              {/* Phase 3: Public */}
              <div className="bg-gradient-to-br from-[#1f2937] to-[#111827] border-2 border-[#4ade80] rounded-lg p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#4ade80] text-black px-4 py-1 rounded-full text-sm font-bold">
                  Phase 3
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-[#4ade80] mb-3">PUBLIC</h3>
                  <p className="text-[#d1d5db] text-sm mb-4 leading-relaxed">
                    Fully established. Your tool is a trusted part of 1sub.
                  </p>
                  <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-lg p-4 mb-3">
                    <div className="text-2xl font-black text-[#4ade80] mb-1">FULL</div>
                    <p className="text-xs text-[#9ca3af]">Fully launched</p>
                  </div>
                  <div className="inline-block bg-[#4ade80]/20 text-[#4ade80] px-3 py-1 rounded text-xs font-semibold">
                    Fully launched
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 max-w-3xl mx-auto">
            <p className="text-sm text-[#d1d5db] text-center leading-relaxed">
              <span className="font-bold text-[#3ecf8e]">Transparency builds trust.</span> Users see your progress and growth. They become part of your journey from alpha to public launch.
            </p>
          </div>
        </div>
      </section>

      {/* Partnership Rules Section */}
      <section className="section-padding">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
            Partnership guidelines
          </h2>
          <p className="text-lg text-[#d1d5db] mb-12 text-center leading-relaxed">
            Simple, fair rules to ensure a great experience for everyone
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Rule 1 */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
              <div className="text-4xl mb-4">🚪</div>
              <h3 className="text-xl font-bold mb-3 text-[#3ecf8e]">Freedom to leave</h3>
              <p className="text-[#d1d5db] text-base leading-relaxed">
                You can leave 1sub anytime with 60 days notice. No long-term commitments, no hidden contracts.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
              <div className="text-4xl mb-4">⚖️</div>
              <h3 className="text-xl font-bold mb-3 text-[#3ecf8e]">Fair pricing</h3>
              <p className="text-[#d1d5db] text-base leading-relaxed">
                You can have other payment systems, but 1sub users must get equal or better economic conditions than other customers.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-3 text-[#3ecf8e]">Respect our users</h3>
              <p className="text-[#d1d5db] text-base leading-relaxed">
                Don&apos;t attempt to migrate 1sub users to other subscription models. They&apos;re 1sub users, and must remain so until they choose to leave.
              </p>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="bg-[#111827] border border-[#374151] rounded-lg p-4 text-center">
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Failure to comply with these guidelines will result in an immediate penalty of €10,000 plus any additional damages identified and proven.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to grow your user base?
          </h2>
          <p className="text-lg text-[#d1d5db] mb-8 leading-relaxed">
            Join 1sub today and start reaching thousands of potential customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/vendors/apply"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#3ecf8e]/30"
            >
              <span className="relative z-10 flex items-center gap-2">
                apply to become a vendor
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] border-t border-[#374151]">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-[#3ecf8e] mb-2">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h3>
            <p className="text-[#9ca3af] mb-4">
              1 subscription, countless tools.
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a
                href="/privacy"
                className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
              >
                Terms and Conditions
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


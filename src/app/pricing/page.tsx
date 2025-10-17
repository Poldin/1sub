'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingPage() {
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
            <a
              href="/login"
              className="btn-secondary text-sm sm:text-base"
            >
              join us
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding text-center">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Simple, Transparent Pricing
          </h1>
          
          <p className="text-lg sm:text-xl text-[#d1d5db] max-w-3xl mx-auto mb-8 leading-relaxed">
            One subscription, countless tools. Choose the plan that fits your needs.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Starter Plan */}
            <div className="bg-[#1f2937] rounded-2xl p-8 border border-[#374151] flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <p className="text-[#9ca3af] text-sm mb-4">Perfect for trying out 1sub.io</p>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold">€9</span>
                  <span className="text-[#9ca3af] ml-2">/month</span>
                </div>
                <p className="text-[#3ecf8e] font-semibold">100 credits/month</p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Access to all tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Basic support</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Credit rollover</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Email notifications</span>
                </li>
              </ul>

              <button className="w-full py-3 px-4 bg-[#374151] text-[#ededed] rounded-lg font-semibold hover:bg-[#4b5563] transition-colors">
                Get Started
              </button>
            </div>

            {/* Pro Plan (Most Popular) */}
            <div className="bg-[#1f2937] rounded-2xl p-8 border-2 border-[#3ecf8e] flex flex-col relative">
              {/* Most Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#3ecf8e] text-black px-4 py-1 rounded-full text-sm font-bold">
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <p className="text-[#9ca3af] text-sm mb-4">Best for regular users</p>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold">€29</span>
                  <span className="text-[#9ca3af] ml-2">/month</span>
                </div>
                <p className="text-[#3ecf8e] font-semibold">500 credits/month</p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Access to all tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Priority support</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Credit rollover</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Email notifications</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">API access</span>
                </li>
              </ul>

              <button className="w-full py-3 px-4 bg-[#3ecf8e] text-black rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors">
                Get Started
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-[#1f2937] rounded-2xl p-8 border border-[#374151] flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                <p className="text-[#9ca3af] text-sm mb-4">For power users and teams</p>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold">€99</span>
                  <span className="text-[#9ca3af] ml-2">/month</span>
                </div>
                <p className="text-[#3ecf8e] font-semibold">2000 credits/month</p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Access to all tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">24/7 dedicated support</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Unlimited credit rollover</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Email notifications</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Full API access</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Custom integrations</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#3ecf8e] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-[#d1d5db]">Team management</span>
                </li>
              </ul>

              <button className="w-full py-3 px-4 bg-[#374151] text-[#ededed] rounded-lg font-semibold hover:bg-[#4b5563] transition-colors">
                Get Started
              </button>
            </div>
          </div>

          {/* Custom Plan Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#1f2937] rounded-2xl p-8 sm:p-12 border border-[#374151] text-center">
              <h2 className="text-3xl font-bold mb-4">Need a custom plan?</h2>
              <p className="text-[#d1d5db] mb-6 text-lg">
                Contact us for enterprise solutions and volume discounts
              </p>
              <a
                href="mailto:sales@1sub.io?subject=Enterprise%20Plan%20Inquiry"
                className="inline-block bg-[#3ecf8e] text-black px-8 py-3 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] border-t border-[#374151] mt-16">
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
                href="/support"
                className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
              >
                Support
              </a>
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



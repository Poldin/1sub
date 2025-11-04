'use client';

import { useState } from 'react';
import Footer from './components/Footer';
import ToolsGrid from './components/ToolsGrid';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#374151] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-[#3ecf8e]">
                1sub<span className="text-[#9ca3af] font-normal">.io</span>
              </h1>
            </div>
            
            {/* Navigation Links */}
            <div className="flex items-center gap-4">

              <a
                href="/login"
                className="btn-secondary text-sm sm:text-base"
              >
                join us
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding text-center">
        <div className="mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            1 subscription,{" "}
            <span className="text-[#3ecf8e]">countless tools</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-[#d1d5db] max-w-3xl mx-auto mb-6 leading-relaxed">
            access a vast collection of tools with 1 single subscription. 
          </p>
          
          
          <a
            href="/login"
            id="join"
            className="btn-secondary text-sm sm:text-base px-2"
          >
            join us today!
          </a>
        </div>
      </section>

      {/* Tools Showcase */}
      <section className="section-padding bg-[#111111]">
        <div className="mx-auto">
          
          {/* Credit Explanation */}
          <div className="text-center mb-6">
            <p className="text-lg text-[#d1d5db]">
              1 <span className="text-[#3ecf8e] font-semibold">CR</span> = 1 credit = €1
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Search tools and services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-[#1f2937] border border-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-[#ededed] text-base"
              />
              <div className="absolute left-4 top-3.5 text-[#9ca3af]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Search Tags */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setSearchTerm('AI')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                AI
              </button>
              <button
                onClick={() => setSearchTerm('Design')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Design
              </button>
              <button
                onClick={() => setSearchTerm('Analytics')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Analytics
              </button>
              <button
                onClick={() => setSearchTerm('Video')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Video
              </button>
              <button
                onClick={() => setSearchTerm('Marketing')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Marketing
              </button>
              <button
                onClick={() => setSearchTerm('Code')}
                className="px-3 py-1.5 bg-[#1f2937] border border-[#374151] rounded-full text-sm text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] transition-all"
              >
                Code
              </button>
            </div>
          </div>
          
          {/* All Tools Section */}
          <div className="mb-8">
            <ToolsGrid searchTerm={searchTerm} />
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            join our community
          </h2>
          <p className="text-lg text-[#d1d5db] mb-6 leading-relaxed">
            Connect, share, and discover new ways to optimize. <br />Our community helps you make the most 
            of every subscription.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/login"
              className="btn-secondary text-sm sm:text-base px-2"
            >
              join 1sub now!
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5865F2] text-white px-2 py-0.5 rounded-md text-sm sm:text-base hover:bg-[#4752C4] transition-colors border-2 border-white/20 hover:border-white/40"
            >
              join our Discord
            </a>
          </div>
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-[#059669] to-[#047857] rounded-lg p-8 sm:p-12 text-center shadow-2xl border-2 border-white/60">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
              bring new members and earn            
            </h2>
            
            {/* Commission Tiers - Step Visualization */}
            <div className="mb-6 flex items-end justify-center gap-1 sm:gap-2 px-4">
              {/* 1% Tier - Smallest */}
              <div className="flex flex-col items-center">
                <div className="border-2 border-white/80 rounded-lg p-3 sm:p-4 mb-2 w-20 sm:w-24 h-16 sm:h-16 flex flex-col items-center justify-center">
                  <div className="text-3xl sm:text-4xl font-black text-white opacity-40">1%</div>
                </div>
              </div>

            {/* 5% Tier - Smallest */}
              <div className="flex flex-col items-center">
                <div className="border-2 border-white/80 rounded-lg p-3 sm:p-4 mb-2 w-20 sm:w-24 h-24 sm:h-28 flex flex-col items-center justify-center">
                  <div className="text-3xl sm:text-4xl font-black text-white opacity-60">5%</div>
                </div>
              </div>
              
              {/* 2% Tier - Medium */}
              <div className="flex flex-col items-center">
                <div className="border-2 border-white/90 rounded-lg p-4 sm:p-6 mb-2 w-24 sm:w-32 h-32 sm:h-40 flex flex-col items-center justify-center">
                  <div className="text-4xl sm:text-5xl font-black text-white opacity-80">10%</div>
                </div>
              </div>
              
              {/* 3% Tier - Largest */}
              <div className="flex flex-col items-center">
                <div className="border-3 border-white rounded-lg p-6 sm:p-8 mb-2 w-28 sm:w-40 h-40 sm:h-52 flex flex-col items-center justify-center">
                  <div className="text-5xl sm:text-7xl font-black text-white opacity-100">15%</div>
                </div>
              </div>
            </div>
            
            <p className="text-xl sm:text-2xl text-green-50 font-semibold mb-4">
              lifetime commission
            </p>
            
            <p className="text-base text-green-200 mb-8 max-w-2xl mx-auto opacity-80">
            Earn commission for every new member you refer when they use tools with 1sub. Once entered, you get the commission until member leaves.
            </p>
            <a
              href="/login"
              className="inline-block bg-white text-[#059669] px-8 py-3 rounded-lg font-semibold text-lg hover:bg-green-50 transition-colors shadow-lg"
            >
              join us and share
            </a>
            <p className="text-sm text-green-100 mt-4 opacity-70">
              <a 
                href="/tc_referral" 
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
              >
                Terms and conditions
              </a> apply
            </p>
          </div>
        </div>
      </section>

      {/* Tool Provider Section */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            want to feature your tool?
          </h2>
          <p className="text-lg text-[#d1d5db] mb-4 leading-relaxed">
            Join 1sub and get discovered by thousands of subscribers.
          </p>
          <p className="text-base text-[#3ecf8e] mb-8 font-semibold">
            Get a headstart, 1st month is free of fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
            <a
              href="/register"
              className="btn-secondary"
            >
              <span className="font-bold">sign up and submit</span>
            </a>
            <a
              href="/vendors"
              className="btn-primary text-sm sm:text-base"
            >
              discover more
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

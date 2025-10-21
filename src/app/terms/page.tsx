'use client';

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#374151] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#3ecf8e]">
            1sub<span className="text-[#9ca3af]">.io</span>
          </Link>
          <Link 
            href="/" 
            className="text-[#9ca3af] hover:text-[#ededed] transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-[#9ca3af] mb-8">Last updated: January 10, 2025</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Acceptance of Terms</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              By accessing and using 1sub.io (&quot;the Platform&quot;), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">User Accounts</h2>
            <div className="space-y-4">
              <p className="text-[#d1d5db] leading-relaxed">
                To access certain features of the Platform, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-[#d1d5db] space-y-1 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Use of Services</h2>
            <div className="space-y-4">
              <p className="text-[#d1d5db] leading-relaxed">
                The Platform provides access to various tools and services through a credit-based system. You agree to:
              </p>
              <ul className="list-disc list-inside text-[#d1d5db] space-y-1 ml-4">
                <li>Use the Platform only for lawful purposes</li>
                <li>Not attempt to gain unauthorized access to any part of the Platform</li>
                <li>Not use the Platform to transmit harmful or malicious code</li>
                <li>Respect the intellectual property rights of others</li>
                <li>Not use the Platform for any commercial purposes without permission</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Payment and Credits</h2>
            <div className="space-y-4">
              <p className="text-[#d1d5db] leading-relaxed">
                The Platform operates on a credit-based system where:
              </p>
              <ul className="list-disc list-inside text-[#d1d5db] space-y-1 ml-4">
                <li>Credits are required to use tools and services</li>
                <li>Credits are purchased through our payment system</li>
                <li>Credits are non-refundable except as required by law</li>
                <li>Credits expire after 12 months of inactivity</li>
                <li>Pricing may change with 30 days notice</li>
                <li>All payments are processed securely through third-party providers</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Intellectual Property</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              The Platform and its original content, features, and functionality are owned by 1sub.io and are protected 
              by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may 
              not reproduce, distribute, modify, or create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">User-Generated Content</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              If you submit content to the Platform, you grant us a non-exclusive, royalty-free, worldwide license to use, 
              reproduce, modify, and distribute such content. You retain ownership of your content but acknowledge that 
              we may use it to improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Limitation of Liability</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              In no event shall 1sub.io, its directors, employees, or agents be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including without limitation, loss of profits, data, use, 
              goodwill, or other intangible losses, resulting from your use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Service Availability</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              We strive to maintain high service availability but cannot guarantee uninterrupted access. The Platform 
              may be temporarily unavailable due to maintenance, updates, or technical issues. We are not liable for 
              any downtime or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Termination</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice, for conduct that we believe 
              violates these Terms or is harmful to other users, us, or third parties, or for any other reason. Upon 
              termination, your right to use the Platform will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Changes to Terms</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes 
              by posting the new Terms on this page and updating the &quot;Last updated&quot; date. Your continued use 
              of the Platform after any modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Governing Law</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which 
              1sub.io operates, without regard to its conflict of law provisions. Any disputes arising from these Terms 
              shall be subject to the exclusive jurisdiction of the courts in that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Contact Information</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-[#1f2937] rounded-lg border border-[#374151]">
              <p className="text-[#ededed]">Email: legal@1sub.io</p>
              <p className="text-[#ededed]">Support: <Link href="/support" className="text-[#3ecf8e] hover:text-[#2dd4bf]">Visit Support Center</Link></p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#374151] mt-16 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center space-x-6 text-sm">
            <Link href="/" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Home</Link>
            <Link href="/privacy" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[#3ecf8e] font-medium">Terms</Link>
            <Link href="/support" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Support</Link>
          </div>
          <p className="text-[#9ca3af] text-xs mt-4">
            © 2025 1sub.io. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}


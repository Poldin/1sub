'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-[#9ca3af] mb-8">Last updated: January 10, 2025</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Introduction</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              At 1sub.io, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
              subscription platform and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2 text-[#ededed]">Personal Information</h3>
                <ul className="list-disc list-inside text-[#d1d5db] space-y-1 ml-4">
                  <li>Email address and name when you create an account</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                  <li>Profile information you choose to provide</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2 text-[#ededed]">Usage Information</h3>
                <ul className="list-disc list-inside text-[#d1d5db] space-y-1 ml-4">
                  <li>Tools you use and credits consumed</li>
                  <li>Platform activity and interactions</li>
                  <li>Device information and IP address</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-[#d1d5db] space-y-2 ml-4">
              <li>Provide and maintain our subscription platform services</li>
              <li>Process payments and manage your account</li>
              <li>Track credit usage and tool consumption</li>
              <li>Improve our services and develop new features</li>
              <li>Send you important updates and notifications</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Data Sharing and Disclosure</h2>
            <p className="text-[#d1d5db] leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-[#d1d5db] space-y-2 ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations or court orders</li>
              <li>To protect our rights, property, or safety</li>
              <li>With trusted service providers who assist in platform operations</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Your Rights</h2>
            <p className="text-[#d1d5db] leading-relaxed mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-[#d1d5db] space-y-2 ml-4">
              <li>Access and review your personal data</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Data Security</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the 
              internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Cookies and Tracking</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and improve our services. 
              You can control cookie preferences through your browser settings, though some features may not function properly 
              if cookies are disabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Changes to This Policy</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
              the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. Your continued use of our 
              services after any modifications constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#3ecf8e]">Contact Information</h2>
            <p className="text-[#d1d5db] leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-[#1f2937] rounded-lg border border-[#374151]">
              <p className="text-[#ededed]">Email: privacy@1sub.io</p>
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
            <Link href="/privacy" className="text-[#3ecf8e] font-medium">Privacy</Link>
            <Link href="/terms" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Terms</Link>
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


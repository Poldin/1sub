'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setStep('otp');
      // Here you would send password reset OTP to email
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp) {
      setStep('success');
      // Here you would verify OTP and send password reset instructions
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]"></div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-[#3ecf8e]">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h1>
          </Link>
          <p className="text-[#d1d5db] mt-2">reset your password</p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-[#111111] rounded-2xl p-8 shadow-2xl border border-[#374151]">
          {step === 'email' && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-center">forgot password?</h2>
              <p className="text-[#9ca3af] text-sm text-center mb-6">
                no worries, we&apos;ll send you reset instructions
              </p>
              
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#d1d5db] mb-2">
                    email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
                >
                  send reset code
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">check your email</h2>
                <p className="text-[#9ca3af] text-sm">
                  we sent a reset code to <span className="text-[#3ecf8e]">{email}</span>
                </p>
              </div>
              
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-[#d1d5db] mb-2">
                    reset code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-center text-xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
                >
                  verify code
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full text-[#9ca3af] text-sm hover:text-[#d1d5db] transition-colors"
                >
                  ← back to email
                </button>
              </form>
            </>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#3ecf8e] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold mb-4">check your email</h2>
              <p className="text-[#9ca3af] text-sm mb-6">
                we&apos;ve sent password reset instructions to <span className="text-[#3ecf8e]">{email}</span>
              </p>
              
              <div className="space-y-4">
                <Link 
                  href="/login"
                  className="block w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors text-center"
                >
                  back to sign in
                </Link>
                
                <button
                  onClick={() => setStep('email')}
                  className="w-full text-[#9ca3af] text-sm hover:text-[#d1d5db] transition-colors"
                >
                  didn&apos;t receive email? try again
                </button>
              </div>
            </div>
          )}

          {/* Links */}
          {step !== 'success' && (
            <div className="mt-6 text-center text-sm">
              <div className="text-[#9ca3af]">
                remember your password?{' '}
                <Link 
                  href="/login" 
                  className="text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors font-medium"
                >
                  sign in
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[#9ca3af] text-sm">
          <Link href="/" className="hover:text-[#d1d5db] transition-colors">
            ← back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

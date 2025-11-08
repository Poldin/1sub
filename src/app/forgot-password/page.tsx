'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getPasswordRequirementStates, validatePassword } from '@/lib/auth/password';

type Step = 'email' | 'otp' | 'password' | 'success';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [isProcessingLink, setIsProcessingLink] = useState(false);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [recoverySession, setRecoverySession] = useState<Session | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const processedRecoveryCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const recoveryCode = searchParams.get('code');
    const recoveryType = searchParams.get('type');

    if (!recoveryCode || recoveryType !== 'recovery') {
      return;
    }

    if (processedRecoveryCodeRef.current === recoveryCode) {
      return;
    }

    processedRecoveryCodeRef.current = recoveryCode;

    let isCancelled = false;

    const handleMagicLink = async () => {
      setIsProcessingLink(true);
      setLinkError('');

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(recoveryCode);

        if (error || !data.session) {
          throw error || new Error('Invalid recovery session');
        }

        if (isCancelled) return;

        await supabase.auth.setSession(data.session);
        setRecoverySession(data.session);
        setEmail(data.session.user?.email ?? '');
        setPassword('');
        setConfirmPassword('');
        setStep('password');
      } catch (err) {
        console.error('Password recovery link error', err);
        const message =
          err instanceof Error ? err.message : 'Reset link is invalid or has expired. Please request a new code.';
        if (!isCancelled) {
          processedRecoveryCodeRef.current = null;
          setLinkError(message || 'Reset link is invalid or has expired. Please request a new code.');
          setStep('email');
        }
      } finally {
        if (!isCancelled) {
          setIsProcessingLink(false);
        }
      }
    };

    void handleMagicLink();

    return () => {
      isCancelled = true;
    };
  }, [searchParams, router]);

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [step, resendCooldown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setEmailError('');
    setLinkError('');
    setIsSubmittingEmail(true);

    try {
      const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBase}/forgot-password`,
      });

      if (error) {
        setEmailError(error.message || 'Failed to send reset code. Please try again.');
        return;
      }

      setStep('otp');
      setResendCooldown(60);
      setOtp('');
      setOtpError('');
    } catch (err) {
      console.error('Password reset request failed', err);
      setEmailError('Failed to send reset code. Please try again later.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !email || isProcessingLink) {
      return;
    }

    setEmailError('');
    setLinkError('');
    setIsSubmittingEmail(true);

    try {
      const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBase}/forgot-password`,
      });

      if (error) {
        setEmailError(error.message || 'Failed to resend code. Please try again.');
        return;
      }

      setResendCooldown(60);
    } catch (err) {
      console.error('Resend reset code failed', err);
      setEmailError('Failed to resend code. Please try again later.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !email) return;

    setOtpError('');
    setIsSubmittingOtp(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });

      if (error || !data.session) {
        setOtpError(error?.message || 'Invalid or expired code. Please try again.');
        return;
      }

      await supabase.auth.setSession(data.session);
      setRecoverySession(data.session);
      setStep('password');
    } catch (err) {
      console.error('OTP verification failed', err);
      setOtpError('Unable to verify code. Please try again later.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const validationMessage = validatePassword(password);
    if (validationMessage) {
      setPasswordError(validationMessage);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (!recoverySession) {
      setPasswordError('Recovery session expired. Please restart the process.');
      setStep('email');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setPasswordError(error.message || 'Failed to update password. Please try again.');
        return;
      }

      await supabase.auth.signOut();
      setStep('success');
    } catch (err) {
      console.error('Password update failed', err);
      setPasswordError('Unable to update password. Please try again later.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const passwordStates = getPasswordRequirementStates(password);

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
                
                {isProcessingLink && (
                  <div className="text-[#9ca3af] text-sm bg-[#1f2937] border border-[#374151] rounded-lg p-3">
                    verifying secure link…
                  </div>
                )}

                {linkError && (
                  <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                    {linkError}
                  </div>
                )}

                {emailError && (
                  <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                    {emailError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingEmail || isProcessingLink}
                  className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingEmail || isProcessingLink ? 'sending...' : 'send reset code'}
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
                
                {otpError && (
                  <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                    {otpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingOtp}
                  className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingOtp ? 'verifying...' : 'verify code'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setOtpError('');
                    setResendCooldown(0);
                    setRecoverySession(null);
                  }}
                  className="w-full text-[#9ca3af] text-sm hover:text-[#d1d5db] transition-colors"
                >
                  ← back to email
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isSubmittingEmail}
                  className="w-full text-[#3ecf8e] text-sm hover:text-[#2dd4bf] transition-colors disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
              </form>
            </>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">set new password</h2>
                <p className="text-[#9ca3af] text-sm">
                  choose a strong password to secure your account
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  new password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  confirm password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="text-xs text-[#9ca3af] bg-[#1f2937] rounded-lg p-3 border border-[#374151]">
                <p className="mb-1 font-medium text-[#d1d5db]">Password requirements:</p>
                <ul className="space-y-1">
                  <li className={`flex items-center ${passwordStates.hasMinLength ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                    <span className="mr-2">{passwordStates.hasMinLength ? '✓' : '○'}</span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center ${passwordStates.hasUpperCase ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                    <span className="mr-2">{passwordStates.hasUpperCase ? '✓' : '○'}</span>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center ${passwordStates.hasLowerCase ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                    <span className="mr-2">{passwordStates.hasLowerCase ? '✓' : '○'}</span>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center ${passwordStates.hasNumber ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                    <span className="mr-2">{passwordStates.hasNumber ? '✓' : '○'}</span>
                    One number
                  </li>
                  <li className={`flex items-center ${passwordStates.hasSpecialChar ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                    <span className="mr-2">{passwordStates.hasSpecialChar ? '✓' : '○'}</span>
                    One special character
                  </li>
                </ul>
              </div>

              {passwordError && (
                <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? 'updating...' : 'update password'}
              </button>
            </form>
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
                your password has been updated successfully. you can now sign in with your new password.
              </p>
              
              <div className="space-y-4">
                <Link 
                  href="/login"
                  className="block w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors text-center"
                >
                  back to sign in
                </Link>
                
                <button
                  onClick={() => {
                    setStep('email');
                    setEmail('');
                    setOtp('');
                    setOtpError('');
                    setResendCooldown(0);
                    setRecoverySession(null);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full text-[#9ca3af] text-sm hover:text-[#d1d5db] transition-colors"
                >
                  reset another password
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

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
            <p className="mt-4 text-[#9ca3af]">Loading...</p>
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}

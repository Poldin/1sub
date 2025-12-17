'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Status = 'loading' | 'ready' | 'success' | 'error';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyRecoveryToken = async () => {
      try {
        const supabase = createClient();

        // First, check for tokens in URL hash fragments (most common format from Supabase)
        // Format: #access_token=...&type=recovery&expires_in=...
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && type === 'recovery') {
            // Set session directly from hash tokens
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              console.error('Failed to set session from hash tokens:', sessionError);
              setError(
                sessionError.message || 'Reset link is invalid or has expired. Please request a new one.'
              );
              setStatus('error');
              return;
            }

            if (sessionData.session) {
              setStatus('ready');
              // Clean up the hash from URL
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              return;
            }
          }
        }

        // Check for code or token in query parameters
        const code = searchParams.get('code');
        const token = searchParams.get('token');
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        // Debug: Log all URL parameters
        console.log('Reset password URL debug:', {
          fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
          code,
          token,
          token_hash,
          type,
          allParams: Object.fromEntries(searchParams.entries()),
        });

        // Try token_hash first (most reliable, no PKCE required)
        if (token_hash) {
          console.log('Attempting verifyOtp with token_hash:', token_hash.substring(0, 20) + '...');

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: token_hash,
          });

          console.log('verifyOtp result:', {
            hasSession: !!data?.session,
            error: verifyError?.message,
            errorCode: verifyError?.code,
          });

          if (!verifyError && data.session) {
            console.log('Token verified successfully, setting session...');
            await supabase.auth.setSession(data.session);
            setStatus('ready');
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
          console.error('Failed to verify token_hash:', verifyError);

          // Show specific error for token_hash failure
          if (verifyError) {
            setError(verifyError.message || 'Reset link is invalid or has expired. Please request a new one.');
            setStatus('error');
            return;
          }
        }

        // Try code exchange (requires PKCE - same browser only)
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (!exchangeError && data.session) {
            setStatus('ready');
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }

          console.error('Failed to exchange code for session:', exchangeError);

          // PKCE error - user opened link in different browser
          if (exchangeError?.message?.includes('code verifier') || exchangeError?.message?.includes('both auth code')) {
            setError(
              'This reset link must be opened in the same browser where you requested it. ' +
              'Please go back to the forgot password page and enter the 6-digit code from your email instead.'
            );
            setStatus('error');
            return;
          }

          // Try verifyOtp as fallback with the code
          const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: code,
          });

          if (!otpError && otpData.session) {
            await supabase.auth.setSession(otpData.session);
            setStatus('ready');
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }

          setError('Reset link is invalid or has expired. Please request a new one.');
          setStatus('error');
          return;
        }

        // Fallback: Check for token parameter
        if (token) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: token,
          });

          if (!verifyError && data.session) {
            await supabase.auth.setSession(data.session);
            setStatus('ready');
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }

          console.error('Failed to verify recovery token:', verifyError);
          setError(
            verifyError?.message || 'Reset link is invalid or has expired. Please request a new one.'
          );
          setStatus('error');
          return;
        }

        // If no valid token found
        setError('Reset link is invalid or missing. Please request a new one from the forgot password page.');
        setStatus('error');
      } catch (err) {
        console.error('Unexpected error verifying recovery token:', err);
        setError('An unexpected error occurred. Please try again.');
        setStatus('error');
      }
    };

    verifyRecoveryToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setError(null);
      setStatus('loading');

      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(updateError.message || 'Failed to update password. Please try again.');
        setStatus('ready');
        return;
      }

      setStatus('success');
      setPassword('');
      setConfirmPassword('');

      // Redirect back to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err) {
      console.error('Unexpected password reset error:', err);
      setError('An unexpected error occurred. Please try again.');
      setStatus('ready');
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent mb-6"></div>
          <p className="text-[#9ca3af]">validating your reset link...</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="space-y-6 text-center">
          <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-4">
            {error || 'Something went wrong.'}
          </div>
          <Link
            href="/forgot-password"
            className="inline-block bg-[#3ecf8e] text-black py-3 px-6 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
          >
            request a new reset link
          </Link>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-[#3ecf8e] rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">password updated!</h2>
          <p className="text-[#9ca3af] text-sm">
            you&apos;ll be redirected to sign in shortly.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
          >
            take me there now →
          </Link>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
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
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#d1d5db] mb-2">
            confirm new password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
        >
          update password
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-[#3ecf8e]">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h1>
          </Link>
          <p className="text-[#d1d5db] mt-2">reset your password</p>
        </div>

        <div className="bg-[#111111] rounded-2xl p-8 shadow-2xl border border-[#374151]">
          {renderContent()}
        </div>

        <div className="text-center mt-8 text-[#9ca3af] text-sm">
          <Link href="/login" className="hover:text-[#d1d5db] transition-colors">
            ← back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <span className="sr-only">Loading...</span>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}




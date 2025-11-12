'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect');
  const toolId = searchParams.get('tool');

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        // If there's a refresh token error, clear the session and stay on login page
        if (error) {
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            // Clear invalid session
            await supabase.auth.signOut({ scope: 'local' });
            setChecking(false);
            return;
          }
          // For other errors, just log and continue
          console.error('Error checking user:', error);
          setChecking(false);
          return;
        }
        
        if (user) {
          // User is already logged in, redirect
          if (redirectUrl) {
            const fullRedirect = toolId ? `${redirectUrl}?highlight=${toolId}` : redirectUrl;
            router.push(fullRedirect);
          } else {
            router.push('/backoffice');
          }
          return;
        }
      } catch (err) {
        console.error('Error checking user:', err);
        // If it's a refresh token error, clear session
        if (err instanceof Error && (
          err.message.includes('Refresh Token') || 
          err.message.includes('refresh_token') ||
          err.message.includes('Invalid Refresh Token') ||
          err.message.includes('Refresh Token Not Found')
        )) {
          try {
            const supabase = createClient();
            await supabase.auth.signOut({ scope: 'local' });
            // Clear cookies manually
            if (typeof document !== 'undefined') {
              document.cookie.split(';').forEach((cookie) => {
                const cookieName = cookie.split('=')[0].trim();
                if (cookieName.includes('sb-') || cookieName.includes('supabase') || cookieName.includes('auth-token')) {
                  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
                }
              });
            }
          } catch (signOutError) {
            console.error('Error signing out:', signOutError);
          }
        }
      } finally {
        setChecking(false);
      }
    };

    checkUser();
  }, [router, redirectUrl, toolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Successful login - redirect to the specified URL or backoffice
        if (redirectUrl) {
          const fullRedirect = toolId ? `${redirectUrl}?highlight=${toolId}` : redirectUrl;
          router.push(fullRedirect);
        } else {
          router.push('/backoffice');
        }
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Show loading state while checking authentication
  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
      {/* Background pattern */}
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-[#3ecf8e]">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h1>
          </Link>
        </div>

        {/* Login Form */}
        <div className="bg-[#111111] rounded-2xl p-8 shadow-2xl border border-[#374151]">
          <h2 className="text-2xl font-bold mb-6 text-center">sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#d1d5db] mb-2">
                email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#d1d5db] mb-2">
                password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] hover:text-[#d1d5db] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'signing in...' : 'sign in'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-4 text-center text-sm">
            <Link 
              href="/forgot-password" 
              className="block text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
            >
              forgot password?
            </Link>
            
            <div className="text-[#9ca3af]">
              don&apos;t have an account?{' '}
              <Link 
                href="/register" 
                className="text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors font-medium"
              >
                sign up
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[#9ca3af] text-sm space-y-2">
          <div>
            <Link href="/" className="hover:text-[#d1d5db] transition-colors">
              ← back to home
            </Link>
          </div>
          <div className="flex justify-center space-x-4 text-xs">
            <Link href="/privacy" className="hover:text-[#d1d5db] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#d1d5db] transition-colors">
              Terms
            </Link>
            <Link href="/support" className="hover:text-[#d1d5db] transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          router.push('/backoffice');
          return;
        }
      } catch (err) {
        console.error('Error checking user:', err);
      } finally {
        setChecking(false);
      }
    };

    checkUser();
  }, [router]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setVerifyingOtp(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          token: otp,
          fullName: formData.fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.error || 'Verification failed');
        return;
      }

      setSuccess(true);
      // Redirect to login after verification
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setOtpError('An unexpected error occurred. Please try again.');
      console.error('OTP verification error:', err);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setLoading(true);

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) {
        setPasswordError(error.message);
        return;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          setPasswordError('This email is already registered');
          return;
        }

        // Show OTP verification form
        setShowOtpForm(true);
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear password error when user starts typing
    if (e.target.name === 'password') {
      setPasswordError('');
    }
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex justify-center px-4 py-12">
      {/* Background pattern */}
      
      <div className="relative w-full max-w-md h-fit">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-[#3ecf8e]">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h1>
          </Link>
        </div>

        {/* Register Form */}
        <div className="bg-[#111111] rounded-2xl p-8 shadow-2xl border border-[#374151]">
          {!showOtpForm ? (
            <>
              <h2 className="text-2xl font-bold mb-6 text-center">create account</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#d1d5db] mb-2">
                full name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="John Doe"
                maxLength={50}
                required
              />
            </div>

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

                {passwordError && (
                  <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                    {passwordError}
                  </div>
                )}

                <div className="text-xs text-[#9ca3af] bg-[#1f2937] rounded-lg p-3 border border-[#374151]">
                  <p className="mb-1 font-medium text-[#d1d5db]">Password requirements:</p>
                  <ul className="space-y-1">
                    <li className={`flex items-center ${formData.password.length >= 8 ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                      <span className="mr-2">{formData.password.length >= 8 ? '✓' : '○'}</span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                      <span className="mr-2">{/[A-Z]/.test(formData.password) ? '✓' : '○'}</span>
                      One uppercase letter
                    </li>
                    <li className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                      <span className="mr-2">{/[a-z]/.test(formData.password) ? '✓' : '○'}</span>
                      One lowercase letter
                    </li>
                    <li className={`flex items-center ${/\d/.test(formData.password) ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                      <span className="mr-2">{/\d/.test(formData.password) ? '✓' : '○'}</span>
                      One number
                    </li>
                    <li className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-[#3ecf8e]' : 'text-[#9ca3af]'}`}>
                      <span className="mr-2">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '○'}</span>
                      One special character
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'creating account...' : 'create account'}
                </button>
              </form>

              {/* Links */}
              <div className="mt-6 text-center text-sm">
                <div className="text-[#9ca3af]">
                  already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors font-medium"
                  >
                    sign in
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-6 text-center">verify your email</h2>
              
              <div className="mb-6 text-[#d1d5db] text-sm bg-[#1f2937] border border-[#374151] rounded-lg p-4">
                <p className="mb-2">We&apos;ve sent a verification code to:</p>
                <p className="font-semibold text-[#3ecf8e]">{formData.email}</p>
                <p className="mt-2 text-[#9ca3af]">Please check your email and enter the 6-digit code below.</p>
              </div>

              {success && (
                <div className="mb-6 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg p-3">
                  Email verified successfully! Redirecting to login...
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-[#d1d5db] mb-2">
                    verification code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                    disabled={success}
                  />
                </div>

                {otpError && (
                  <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                    {otpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifyingOtp || success}
                  className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingOtp ? 'verifying...' : success ? 'verified!' : 'verify email'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOtpForm(false);
                    setOtp('');
                    setOtpError('');
                  }}
                  disabled={success}
                  className="w-full text-[#9ca3af] hover:text-[#d1d5db] transition-colors text-sm disabled:opacity-50"
                >
                  ← back to registration
                </button>
              </form>
            </>
          )}
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

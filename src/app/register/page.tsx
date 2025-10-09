'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import { createUserProfile } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);
    setError('');
    setPasswordError('');

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabaseClient.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        setError(error.message);
        return;
      }

      console.log('Registration data:', data);

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          // Email already confirmed, proceed with registration
          await createUserProfile(
            data.user.id,
            formData.email,
            formData.fullName
          );
          router.push('/backoffice');
        } else {
          // Email confirmation required
          setError('Please check your email and click the confirmation link to complete registration.');
        }
      } else {
        console.log('No user data returned');
        setError('Registration failed - no user data returned');
      }
    } catch (err) {
      console.error('Registration exception:', err);
      setError('An unexpected error occurred');
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
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setPasswordError('');
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
        </div>

        {/* Register Form */}
        <div className="bg-[#111111] rounded-2xl p-8 shadow-2xl border border-[#374151]">
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#d1d5db] mb-2">
                    confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-12 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] hover:text-[#d1d5db] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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

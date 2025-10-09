'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Get user profile to determine role and redirect accordingly
        try {
          const response = await fetch(`/api/v1/user/profile?userId=${data.user.id}`);
          const profileData = await response.json();
          
          if (response.ok && profileData.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/backoffice');
          }
        } catch (error) {
          // Fallback to backoffice if profile fetch fails
          router.push('/backoffice');
        }
      }
    } catch (err) {
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
        <div className="text-center mt-8 text-[#9ca3af] text-sm">
          <Link href="/" className="hover:text-[#d1d5db] transition-colors">
            ← back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

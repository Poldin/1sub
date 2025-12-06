'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface FormData {
  company: string;
  website?: string;
  description: string;
}

export default function VendorApplyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    company: '',
    website: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; fullName: string | null } | null>(null);
  const [existingApplication, setExistingApplication] = useState<{ status: string; company: string; created_at: string; rejection_reason?: string } | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          // Redirect to register with return URL
          router.push('/register?redirect=/vendors/apply');
          return;
        }

        // Fetch user profile
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          router.push('/register?redirect=/vendors/apply');
          return;
        }

        const profileData = await response.json();
        setUser({
          id: profileData.id,
          email: profileData.email,
          fullName: profileData.fullName
        });

        // Check for existing application
        const { data: applicationData } = await supabase
          .from('vendor_applications')
          .select('status, company, created_at, rejection_reason')
          .eq('user_id', profileData.id)
          .single();

        if (applicationData) {
          setExistingApplication(applicationData);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/register?redirect=/vendors/apply');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/vendor/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Application submitted successfully! We\'ll review your application and get back to you soon.' });
        setFormData({ company: '', website: '', description: '' });
        // Redirect after a delay
        setTimeout(() => {
          router.push('/vendors');
        }, 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Something went wrong. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex justify-center px-4 py-12">
      <div className="relative w-full max-w-2xl h-fit">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-[#3ecf8e]">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h1>
          </Link>
        </div>

        {/* Apply Form */}
        <div className="bg-[#111111] rounded-2xl p-8 shadow-2xl border border-[#374151]">
          <h2 className="text-2xl font-bold mb-6 text-center">apply to become a vendor</h2>
          
          {/* User Info Display */}
          {user && (
            <div className="mb-6 p-4 bg-[#1f2937] border border-[#374151] rounded-lg">
              <p className="text-sm text-[#9ca3af] mb-2">Applying as:</p>
              <p className="text-[#ededed] font-medium">{user.fullName || 'User'}</p>
              <p className="text-sm text-[#9ca3af]">{user.email}</p>
            </div>
          )}

          {/* Existing Application Status */}
          {existingApplication && (
            <div className={`mb-6 p-4 border rounded-lg ${
              existingApplication.status === 'approved' ? 'bg-green-500/10 border-green-500/30' :
              existingApplication.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}>
              <h3 className="font-semibold mb-2 text-[#ededed]">Application Status</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#9ca3af]">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    existingApplication.status === 'approved' ? 'bg-green-500 text-white' :
                    existingApplication.status === 'pending' ? 'bg-yellow-500 text-black' :
                    'bg-red-500 text-white'
                  }`}>
                    {existingApplication.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#9ca3af]">Company:</span>
                  <span className="text-sm text-[#ededed]">{existingApplication.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#9ca3af]">Submitted:</span>
                  <span className="text-sm text-[#ededed]">{new Date(existingApplication.created_at).toLocaleDateString()}</span>
                </div>
                {existingApplication.status === 'approved' && (
                  <div className="mt-3 pt-3 border-t border-green-500/30">
                    <p className="text-sm text-green-400">Your application has been approved! You can now access the vendor dashboard.</p>
                    <Link href="/vendor-dashboard" className="mt-2 inline-block px-4 py-2 bg-[#3ecf8e] text-black rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors">
                      Go to Vendor Dashboard
                    </Link>
                  </div>
                )}
                {existingApplication.status === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/30">
                    <p className="text-sm text-yellow-400">Your application is under review. We'll notify you once it's processed.</p>
                  </div>
                )}
                {existingApplication.status === 'rejected' && existingApplication.rejection_reason && (
                  <div className="mt-3 pt-3 border-t border-red-500/30">
                    <p className="text-sm text-red-400 mb-2">Rejection reason:</p>
                    <p className="text-sm text-[#d1d5db]">{existingApplication.rejection_reason}</p>
                    <p className="text-sm text-[#9ca3af] mt-2">You can submit a new application below if you&apos;ve addressed the concerns.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disable form if pending or approved */}
          {existingApplication && existingApplication.status !== 'rejected' ? (
            <div className="text-center p-8">
              <p className="text-[#9ca3af]">
                {existingApplication.status === 'approved' 
                  ? 'You already have an approved application.' 
                  : 'You already have a pending application.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-[#d1d5db] mb-2">
                company name *
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="Your Company"
                required
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-[#d1d5db] mb-2">
                website (optional)
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-[#d1d5db] mb-2">
                tell us about your tools *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-none"
                placeholder="Describe the tools or services you want to offer on 1sub..."
                required
              />
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e]'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#3ecf8e] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'submitting...' : 'submit application'}
            </button>
          </form>
          )}

          {/* Links */}
          <div className="mt-6 text-center text-sm">
            <div className="text-[#9ca3af]">
              <Link 
                href="/vendors" 
                className="text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors font-medium"
              >
                ← back to vendors page
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





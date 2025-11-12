'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  name: string;
  email: string;
  company: string;
  website?: string;
  description: string;
}

export default function VendorApplyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    website: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        setFormData({ name: '', email: '', company: '', website: '', description: '' });
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
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#d1d5db] mb-2">
                full name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#d1d5db] mb-2">
                email address *
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


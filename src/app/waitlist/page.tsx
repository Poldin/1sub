'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GridDistortion from '@/components/ui/GridDistortion';

type WaitlistType = 'user' | 'vendor';

interface FormData {
  email: string;
  name: string;
  company: string;
}

export default function WaitlistPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WaitlistType>('user');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    company: ''
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
      const response = await fetch('/api/v1/waitlist/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type: activeTab
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Successfully joined the waitlist! We\'ll be in touch soon.' });
        setFormData({ email: '', name: '', company: '' });
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] relative overflow-hidden">
      {/* Three.js Background */}
      <div className="absolute inset-0 z-0">
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
        <GridDistortion
          imageSrc="/background.png"
          grid={20}
          mouse={0.8}
          strength={2.0}
          relaxation={0.9}
          className="w-full h-full opacity-50"
        />
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
            >
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="w-full max-w-md">
          {/* Fixed Tab Switcher */}
          <div className="flex bg-[#1f2937]/50 backdrop-blur-sm rounded-full p-1 mb-8 border border-[#374151]">
            <button
              onClick={() => setActiveTab('user')}
              className={`flex-1 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === 'user'
                  ? 'bg-[#3ecf8e] text-black'
                  : 'text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              I want to use tools
            </button>
            <button
              onClick={() => setActiveTab('vendor')}
              className={`flex-1 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === 'vendor'
                  ? 'bg-[#3ecf8e] text-black'
                  : 'text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              I want to publish a tool
            </button>
          </div>

          {/* Form Card - COMPLETELY FIXED HEIGHT */}
          <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl p-8 border border-[#374151]/70 h-[600px] flex flex-col shadow-2xl">
            {/* Fixed Header Section */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-2">
                Join the Waitlist
              </h1>
              <p className="text-[#9ca3af]">
                {activeTab === 'user'
                  ? 'Get early access to our tool marketplace'
                  : 'Publish your tools and reach thousands of users'
                }
              </p>
            </div>

            {/* Fixed Email Field */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent transition-all backdrop-blur-sm"
                placeholder="your@email.com"
              />
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              {/* Form Content Area */}
              <div className="flex-1 flex flex-col space-y-6">
                {/* Dynamic Vendor Fields */}
                {activeTab === 'vendor' && (
                  <>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent transition-all backdrop-blur-sm"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium mb-2">
                        Company *
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent transition-all backdrop-blur-sm"
                        placeholder="Your Company"
                      />
                    </div>
                  </>
                )}

                {/* Message Display */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === 'success' 
                      ? 'bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e]'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#3ecf8e] text-black font-semibold py-3 px-6 rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

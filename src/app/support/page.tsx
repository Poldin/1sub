'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, HelpCircle, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import Sidebar from '../backoffice/components/Sidebar';
import Footer from '../components/Footer';
import { createClient } from '@/lib/supabase/client';

interface FAQ {
  question: string;
  answer: string;
}

export default function SupportPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  
  // User data states
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();

        setUser({
          id: data.id,
          fullName: data.fullName || null,
          email: data.email || '',
        });

        if (data.role) {
          setUserRole(data.role);
        }

        // Check if user has created any tools
        const supabase = createClient();
        const { data: userTools, error: toolsError } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', data.id);

        if (!toolsError && userTools && userTools.length > 0) {
          setHasTools(true);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // FAQ data
  const faqs: FAQ[] = [
    {
      question: 'How do credits work?',
      answer: 'Credits are the currency used to access tools on 1sub. Each tool costs a certain number of credits per use. You can purchase credits or earn them through referrals.'
    },
    {
      question: 'How do I top up my credits?',
      answer: 'You can top up your credits by clicking the "Top Up Credits" button in your backoffice or profile page. We accept various payment methods including credit cards and PayPal.'
    },
    {
      question: 'Can I get a refund?',
      answer: 'Yes, we offer refunds for unused credits within 30 days of purchase. Please contact our support team with your request and we\'ll process it within 2-3 business days.'
    },
    {
      question: 'How do I reset my password?',
      answer: 'Click on "Forgot Password" on the login page, enter your email address, and we\'ll send you a reset link. You can also reset your password from your profile page.'
    },
    {
      question: 'What tools are available?',
      answer: 'We have a wide variety of tools including AI content generators, data analyzers, image editors, video creators, and more. Browse our marketplace to see all available tools.'
    },
    {
      question: 'How do I become a vendor?',
      answer: 'Visit our vendors page to learn more about publishing your tools on 1sub. You can start earning credits when users use your tools.'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Support message:', formData);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setFormData({ name: '', email: '', message: '' });
      alert('Message sent successfully! We\'ll get back to you within 24 hours.');
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleShareAndEarnClick = () => {
    // This will be handled by the Sidebar component internally
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={user?.id || ''}
        userRole={userRole}
        hasTools={hasTools}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar with Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden">
          <div className="flex items-center justify-between p-2 sm:p-3 min-w-0">
            {/* Hamburger Button */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
            </button>
            
            {/* Page Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Support Center</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* FAQ Section */}
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed] mb-6 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-[#374151] rounded-lg">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-[#374151] transition-colors"
                  >
                    <span className="font-medium text-[#ededed]">{faq.question}</span>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-4 h-4 text-[#9ca3af]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
                    )}
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-[#9ca3af]">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed] mb-6 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Contact Us
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="How can we help you?"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-[#374151] rounded-lg">
              <h3 className="text-sm font-medium text-[#ededed] mb-2">Response Time</h3>
              <p className="text-xs text-[#9ca3af]">
                We typically respond to support requests within 24 hours. For urgent issues, please mention &quot;URGENT&quot; in your message.
              </p>
            </div>
          </div>
        </div>

         {/* Additional Help */}
         <div className="mt-8 bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
           <h2 className="text-lg font-semibold text-[#ededed] mb-4">Additional Resources</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-[#374151] rounded-lg">
               <h3 className="font-medium text-[#ededed] mb-2">Documentation</h3>
               <p className="text-sm text-[#9ca3af] mb-3">Browse our comprehensive guides and tutorials</p>
               <button className="text-[#3ecf8e] text-sm hover:underline">View Docs →</button>
             </div>
             <div className="p-4 bg-[#374151] rounded-lg">
               <h3 className="font-medium text-[#ededed] mb-2">Community</h3>
               <p className="text-sm text-[#9ca3af] mb-3">Join our community forum for help and discussions</p>
               <button className="text-[#3ecf8e] text-sm hover:underline">Join Community →</button>
             </div>
             <div className="p-4 bg-[#374151] rounded-lg">
               <h3 className="font-medium text-[#ededed] mb-2">Status Page</h3>
               <p className="text-sm text-[#9ca3af] mb-3">Check our system status and uptime</p>
               <button className="text-[#3ecf8e] text-sm hover:underline">Check Status →</button>
             </div>
           </div>
         </div>

         {/* Footer */}
         <Footer />
       </div>
       </main>
    </div>
  );
}


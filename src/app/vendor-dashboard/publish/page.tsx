'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, ArrowLeft, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import VendorSidebar from '../components/VendorSidebar';

export default function PublishToolPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    apiEndpoint: '',
    icon: ''
  });
  const [pricingConfig, setPricingConfig] = useState({
    one_time: {
      enabled: false,
      price: '',
      description: ''
    },
    subscription_monthly: {
      enabled: false,
      price: '',
      description: ''
    },
    subscription_yearly: {
      enabled: false,
      price: '',
      description: ''
    }
  });
  const [isPublishing, setIsPublishing] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one pricing option is enabled
    const hasAnyPricing = pricingConfig.one_time.enabled || 
                          pricingConfig.subscription_monthly.enabled || 
                          pricingConfig.subscription_yearly.enabled;
    
    if (!hasAnyPricing) {
      alert('Please enable at least one pricing option');
      return;
    }
    
    // Validate enabled options have prices
    if (pricingConfig.one_time.enabled && !pricingConfig.one_time.price) {
      alert('Please set a price for one-time payment');
      return;
    }
    if (pricingConfig.subscription_monthly.enabled && !pricingConfig.subscription_monthly.price) {
      alert('Please set a price for monthly subscription');
      return;
    }
    if (pricingConfig.subscription_yearly.enabled && !pricingConfig.subscription_yearly.price) {
      alert('Please set a price for yearly subscription');
      return;
    }
    
    setIsPublishing(true);
    
    try {
          // Build pricing_options metadata
          const pricing_options: Record<string, unknown> = {};
      
      if (pricingConfig.one_time.enabled) {
        pricing_options.one_time = {
          enabled: true,
          price: parseInt(pricingConfig.one_time.price),
          description: pricingConfig.one_time.description || 'One-time payment'
        };
      }
      
      if (pricingConfig.subscription_monthly.enabled) {
        pricing_options.subscription_monthly = {
          enabled: true,
          price: parseInt(pricingConfig.subscription_monthly.price),
          description: pricingConfig.subscription_monthly.description || 'Billed every month'
        };
      }
      
      if (pricingConfig.subscription_yearly.enabled) {
        pricing_options.subscription_yearly = {
          enabled: true,
          price: parseInt(pricingConfig.subscription_yearly.price),
          description: pricingConfig.subscription_yearly.description || 'Billed every year'
        };
      }
      
      const toolMetadata = {
        ...formData,
        metadata: {
          pricing_options,
          api_endpoint: formData.apiEndpoint,
          icon: formData.icon
        }
      };
      
      // Get authenticated user (vendor)
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        alert('You must be logged in to publish tools');
        setIsPublishing(false);
        return;
      }
      
      // Insert tool into database
      const { data: toolData, error: insertError } = await supabase
        .from('tools')
        .insert({
          name: formData.name,
          description: formData.description,
          url: formData.apiEndpoint,
          is_active: true,
          metadata: {
            pricing_options,
            icon: formData.icon,
            category: formData.category,
            vendor_id: authUser.id, // Store vendor in metadata for now
          }
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Database error:', insertError);
        alert(`Failed to publish tool: ${insertError.message}`);
        setIsPublishing(false);
        return;
      }
      
      console.log('Tool published successfully:', toolData);
      alert('Tool published successfully!');
      router.push('/vendor-dashboard/tools');
      
    } catch (err) {
      console.error('Error publishing tool:', err);
      alert('Failed to publish tool');
      setIsPublishing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <VendorSidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Publish New Tool</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed] mb-6">Tool Information</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Tool Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="AI Content Generator"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="Generate high-quality content with advanced AI..."
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="ai">AI & Machine Learning</option>
                  <option value="design">Design & Graphics</option>
                  <option value="productivity">Productivity</option>
                  <option value="analytics">Analytics</option>
                  <option value="marketing">Marketing</option>
                  <option value="development">Development</option>
                </select>
              </div>

              {/* Pricing Configuration */}
              <div className="border-t border-[#4b5563] pt-6">
                <h3 className="text-md font-semibold text-[#ededed] mb-2">
                  Pricing Configuration *
                </h3>
                <p className="text-sm text-[#9ca3af] mb-4">
                  Choose one or multiple pricing options for your tool
                </p>

                {/* One-time Payment Option */}
                <div className="mb-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#4b5563]">
                  <label className="flex items-center cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={pricingConfig.one_time.enabled}
                      onChange={(e) => setPricingConfig({
                        ...pricingConfig,
                        one_time: { ...pricingConfig.one_time, enabled: e.target.checked }
                      })}
                      className="w-5 h-5 rounded border-[#4b5563] bg-[#374151] text-[#3ecf8e] focus:ring-[#3ecf8e] focus:ring-offset-0"
                    />
                    <span className="ml-3 text-[#ededed] font-medium">One-time Payment</span>
                  </label>
                  
                  {pricingConfig.one_time.enabled && (
                    <div className="ml-8 space-y-3">
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-1">Price (credits) *</label>
                        <input
                          type="number"
                          value={pricingConfig.one_time.price}
                          onChange={(e) => setPricingConfig({
                            ...pricingConfig,
                            one_time: { ...pricingConfig.one_time, price: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                          placeholder="100"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={pricingConfig.one_time.description}
                          onChange={(e) => setPricingConfig({
                            ...pricingConfig,
                            one_time: { ...pricingConfig.one_time, description: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                          placeholder="Lifetime access"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Monthly Subscription Option */}
                <div className="mb-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#4b5563]">
                  <label className="flex items-center cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={pricingConfig.subscription_monthly.enabled}
                      onChange={(e) => setPricingConfig({
                        ...pricingConfig,
                        subscription_monthly: { ...pricingConfig.subscription_monthly, enabled: e.target.checked }
                      })}
                      className="w-5 h-5 rounded border-[#4b5563] bg-[#374151] text-[#3ecf8e] focus:ring-[#3ecf8e] focus:ring-offset-0"
                    />
                    <span className="ml-3 text-[#ededed] font-medium">Monthly Subscription</span>
                  </label>
                  
                  {pricingConfig.subscription_monthly.enabled && (
                    <div className="ml-8 space-y-3">
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-1">Price (credits/month) *</label>
                        <input
                          type="number"
                          value={pricingConfig.subscription_monthly.price}
                          onChange={(e) => setPricingConfig({
                            ...pricingConfig,
                            subscription_monthly: { ...pricingConfig.subscription_monthly, price: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                          placeholder="10"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={pricingConfig.subscription_monthly.description}
                          onChange={(e) => setPricingConfig({
                            ...pricingConfig,
                            subscription_monthly: { ...pricingConfig.subscription_monthly, description: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                          placeholder="Billed every month"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Yearly Subscription Option */}
                <div className="mb-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#4b5563]">
                  <label className="flex items-center cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={pricingConfig.subscription_yearly.enabled}
                      onChange={(e) => setPricingConfig({
                        ...pricingConfig,
                        subscription_yearly: { ...pricingConfig.subscription_yearly, enabled: e.target.checked }
                      })}
                      className="w-5 h-5 rounded border-[#4b5563] bg-[#374151] text-[#3ecf8e] focus:ring-[#3ecf8e] focus:ring-offset-0"
                    />
                    <span className="ml-3 text-[#ededed] font-medium">Yearly Subscription</span>
                  </label>
                  
                  {pricingConfig.subscription_yearly.enabled && (
                    <div className="ml-8 space-y-3">
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-1">Price (credits/year) *</label>
                        <input
                          type="number"
                          value={pricingConfig.subscription_yearly.price}
                          onChange={(e) => setPricingConfig({
                            ...pricingConfig,
                            subscription_yearly: { ...pricingConfig.subscription_yearly, price: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                          placeholder="100"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={pricingConfig.subscription_yearly.description}
                          onChange={(e) => setPricingConfig({
                            ...pricingConfig,
                            subscription_yearly: { ...pricingConfig.subscription_yearly, description: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                          placeholder="Best value - save 20%"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Validation Message */}
                {!pricingConfig.one_time.enabled && 
                 !pricingConfig.subscription_monthly.enabled && 
                 !pricingConfig.subscription_yearly.enabled && (
                  <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      ⚠️ Please enable at least one pricing option
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="apiEndpoint" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  API Endpoint *
                </label>
                <input
                  type="url"
                  id="apiEndpoint"
                  name="apiEndpoint"
                  value={formData.apiEndpoint}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="https://api.example.com/tool"
                  required
                />
              </div>

              <div>
                <label htmlFor="icon" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Icon URL (optional)
                </label>
                <input
                  type="url"
                  id="icon"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="https://example.com/icon.png"
                />
              </div>

              <button
                type="submit"
                disabled={isPublishing || (
                  !pricingConfig.one_time.enabled && 
                  !pricingConfig.subscription_monthly.enabled && 
                  !pricingConfig.subscription_yearly.enabled
                )}
                className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPublishing ? 'Publishing...' : 'Publish Tool'}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed] mb-6">Preview</h2>
            <div className="bg-[#374151] rounded-lg p-4">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#3ecf8e]/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#ededed]">
                    {formData.name || 'Tool Name'}
                  </h3>
                  <p className="text-sm text-[#9ca3af]">
                    {formData.category || 'Category'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#9ca3af] mb-4">
                {formData.description || 'Tool description will appear here...'}
              </p>
              
              {/* Pricing Preview */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-[#ededed] mb-2">Pricing Options</h4>
                
                {pricingConfig.one_time.enabled && (
                  <div className="flex justify-between items-center mb-2 p-2 bg-[#0a0a0a] rounded border border-[#4b5563]">
                    <div>
                      <span className="text-[#ededed] text-sm font-medium">One-time</span>
                      {pricingConfig.one_time.description && (
                        <p className="text-xs text-[#9ca3af]">{pricingConfig.one_time.description}</p>
                      )}
                    </div>
                    <span className="text-[#3ecf8e] font-semibold">
                      {pricingConfig.one_time.price || '—'} credits
                    </span>
                  </div>
                )}
                
                {pricingConfig.subscription_monthly.enabled && (
                  <div className="flex justify-between items-center mb-2 p-2 bg-[#0a0a0a] rounded border border-[#4b5563]">
                    <div>
                      <span className="text-[#ededed] text-sm font-medium">Monthly</span>
                      {pricingConfig.subscription_monthly.description && (
                        <p className="text-xs text-[#9ca3af]">{pricingConfig.subscription_monthly.description}</p>
                      )}
                    </div>
                    <span className="text-[#3ecf8e] font-semibold">
                      {pricingConfig.subscription_monthly.price || '—'} credits/mo
                    </span>
                  </div>
                )}
                
                {pricingConfig.subscription_yearly.enabled && (
                  <div className="flex justify-between items-center mb-2 p-2 bg-[#0a0a0a] rounded border border-[#4b5563]">
                    <div>
                      <span className="text-[#ededed] text-sm font-medium">Yearly</span>
                      {pricingConfig.subscription_yearly.description && (
                        <p className="text-xs text-[#9ca3af]">{pricingConfig.subscription_yearly.description}</p>
                      )}
                    </div>
                    <span className="text-[#3ecf8e] font-semibold">
                      {pricingConfig.subscription_yearly.price || '—'} credits/yr
                    </span>
                  </div>
                )}
                
                {!pricingConfig.one_time.enabled && 
                 !pricingConfig.subscription_monthly.enabled && 
                 !pricingConfig.subscription_yearly.enabled && (
                  <p className="text-[#9ca3af] text-sm">No pricing configured</p>
                )}
              </div>

              <button className="w-full px-4 py-2 bg-[#3ecf8e] text-black rounded-lg text-sm font-medium">
                Launch Tool
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#374151] mt-16 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Home</Link>
              <Link href="/privacy" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Terms</Link>
              <Link href="/support" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Support</Link>
            </div>
            <p className="text-[#9ca3af] text-xs mt-4">
              © 2025 1sub.io. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      </main>
    </div>
  );
}


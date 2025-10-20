'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import VendorSidebar from '../components/VendorSidebar';
import Footer from '../../components/Footer';

export default function PublishToolPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Name & Image, Step 2: Rest of form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile) {
      alert('Please select an image for your tool');
      return;
    }

    setIsUploadingImage(true);

    try {
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        alert('You must be logged in to publish tools');
        setIsUploadingImage(false);
        return;
      }

      // Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `tool-images/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('allfile')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload image: ' + uploadError.message);
        setIsUploadingImage(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('allfile')
        .getPublicUrl(filePath);

      // Save image URL to form data
      setFormData({
        ...formData,
        icon: publicUrl
      });

      setIsUploadingImage(false);
      setCurrentStep(2); // Move to step 2
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
      setIsUploadingImage(false);
    }
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 1 ? 'bg-[#3ecf8e] text-black' : 'bg-[#374151] text-[#9ca3af]'} font-semibold`}>
              1
            </div>
            <div className={`w-24 h-1 ${currentStep >= 2 ? 'bg-[#3ecf8e]' : 'bg-[#374151]'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= 2 ? 'bg-[#3ecf8e] text-black' : 'bg-[#374151] text-[#9ca3af]'} font-semibold`}>
              2
            </div>
          </div>
        </div>

        <div className={`grid gap-6 ${currentStep === 1 ? 'grid-cols-1 lg:grid-cols-[2fr_1fr]' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Step 1: Name, Image & Description */}
          {currentStep === 1 && (
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6">Step 1: Basic Information</h2>
              <form id="step1-form" onSubmit={handleStep1Submit} className="space-y-6">
                {/* Name and Image Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <label htmlFor="image" className="block text-sm font-medium text-[#d1d5db] mb-2">
                      Tool Image *
                    </label>
                    <div className={`flex items-center gap-3 border-2 border-[#4b5563] border-dashed rounded-lg hover:border-[#3ecf8e] transition-colors ${imagePreview ? 'p-1' : 'p-1'}`}>
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="h-10 w-10 object-cover rounded-lg flex-shrink-0" />
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md font-medium text-[#3ecf8e] hover:text-[#2dd4bf] text-sm"
                          >
                            <span>Change image</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleImageChange}
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-10 w-10 text-[#9ca3af] flex-shrink-0"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md font-medium text-[#3ecf8e] hover:text-[#2dd4bf] text-sm"
                          >
                            <span>Upload image</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleImageChange}
                              required={!imageFile}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description - Full Width Below */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[#d1d5db] mb-2">
                    Tool Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={10}
                    className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-y"
                    placeholder="Generate high-quality content with advanced AI. Perfect for content creators, marketers, and businesses..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploadingImage || !imageFile || !formData.name || !formData.description}
                  className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploadingImage ? 'Uploading...' : 'Continue to Step 2'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2 Form */}
          {currentStep === 2 && (
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6">Step 2: Complete Details</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-1/3 bg-[#374151] text-[#ededed] py-3 px-4 rounded-lg font-semibold hover:bg-[#4b5563] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isPublishing || (
                    !pricingConfig.one_time.enabled && 
                    !pricingConfig.subscription_monthly.enabled && 
                    !pricingConfig.subscription_yearly.enabled
                  )}
                  className="flex-1 bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPublishing ? 'Publishing...' : 'Publish Tool'}
                </button>
              </div>
              </form>
            </div>
          )}

          {/* Preview - Column 3 in Step 1, Column 2 in Step 2 */}
          <div className="rounded-lg overflow-hidden">
            <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#374151]">
              {/* Image - Full Width at Top */}
              <div className="w-full h-48 bg-gradient-to-br from-[#3ecf8e]/20 to-[#2dd4bf]/20 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt={formData.name || 'Tool preview'} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-[#9ca3af]">Upload an image to see preview</p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Tool Name */}
                <h3 className="text-lg font-bold text-[#ededed] mb-2">
                  {formData.name || 'Tool Name'}
                </h3>

                {/* Description - Truncated */}
                <p className="text-sm text-[#9ca3af] mb-4 line-clamp-3">
                  {formData.description || 'Your tool description will appear here. Users will see this to understand what your tool does...'}
                </p>

                {/* CTA Button */}
                <button className="w-full px-2 py-2 bg-[#3ecf8e] text-black rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors">
                  Get Started
                </button>
              </div>
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


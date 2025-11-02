'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import PricingModelsSection, { PricingModel } from './PricingModelsSection';

export default function NewProductPage() {
  const router = useRouter();
  const params = useParams();
  const toolId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const [pricingModel, setPricingModel] = useState<PricingModel>({
    one_time: {
      enabled: false,
      type: 'absolute',
      price: 0,
    },
    subscription: {
      enabled: true,
      price: 0,
      interval: 'month',
      trial_days: 0,
    },
    usage_based: {
      enabled: false,
      price_per_unit: 0,
      unit_name: '',
      minimum_units: 0,
    },
  });

  const [toolName, setToolName] = useState<string>('');

  // Check if form is valid
  const isFormValid = () => {
    // Check basic fields
    if (!formData.name.trim() || !formData.description.trim()) {
      return false;
    }

    // Check if at least one pricing model is enabled
    const hasAnyPricing = pricingModel.one_time.enabled || 
                          pricingModel.subscription.enabled || 
                          pricingModel.usage_based.enabled;

    if (!hasAnyPricing) {
      return false;
    }

    // Validate enabled pricing models
    if (pricingModel.one_time.enabled) {
      if (pricingModel.one_time.type === 'absolute') {
        if (!pricingModel.one_time.price || pricingModel.one_time.price <= 0) {
          return false;
        }
      } else if (pricingModel.one_time.type === 'range') {
        if (!pricingModel.one_time.min_price || pricingModel.one_time.min_price < 0 ||
            !pricingModel.one_time.max_price || pricingModel.one_time.max_price <= 0 ||
            pricingModel.one_time.min_price > pricingModel.one_time.max_price) {
          return false;
        }
      }
    }

    if (pricingModel.subscription.enabled && pricingModel.subscription.price <= 0) {
      return false;
    }

    if (pricingModel.usage_based.enabled) {
      if (pricingModel.usage_based.price_per_unit <= 0 || !pricingModel.usage_based.unit_name.trim()) {
        return false;
      }
    }

    return true;
  };

  // Fetch tool name
  useEffect(() => {
    const fetchToolName = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tools')
          .select('name')
          .eq('id', toolId)
          .single();

        if (!error && data) {
          setToolName(data.name);
        }
      } catch (error) {
        console.error('Error fetching tool name:', error);
      }
    };

    if (toolId) {
      fetchToolName();
    }
  }, [toolId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a product name');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please enter a product description');
      return;
    }

    // Check if at least one pricing model is enabled
    const hasAnyPricing = pricingModel.one_time.enabled || 
                          pricingModel.subscription.enabled || 
                          pricingModel.usage_based.enabled;

    if (!hasAnyPricing) {
      alert('Please enable at least one pricing model');
      return;
    }

    // Validate enabled pricing models
    if (pricingModel.one_time.enabled) {
      if (pricingModel.one_time.type === 'absolute') {
        if (!pricingModel.one_time.price || pricingModel.one_time.price <= 0) {
          alert('One-time payment price must be greater than 0');
          return;
        }
      } else if (pricingModel.one_time.type === 'range') {
        if (!pricingModel.one_time.min_price || pricingModel.one_time.min_price < 0) {
          alert('One-time payment minimum price must be greater than or equal to 0');
          return;
        }
        if (!pricingModel.one_time.max_price || pricingModel.one_time.max_price <= 0) {
          alert('One-time payment maximum price must be greater than 0');
          return;
        }
        if (pricingModel.one_time.min_price > pricingModel.one_time.max_price) {
          alert('One-time payment minimum price must be less than or equal to maximum price');
          return;
        }
      }
    }

    if (pricingModel.subscription.enabled && pricingModel.subscription.price <= 0) {
      alert('Subscription price must be greater than 0');
      return;
    }

    if (pricingModel.usage_based.enabled) {
      if (pricingModel.usage_based.price_per_unit <= 0) {
        alert('Usage-based price per unit must be greater than 0');
        return;
      }
      if (!pricingModel.usage_based.unit_name.trim()) {
        alert('Please specify a unit name for usage-based pricing');
        return;
      }
    }

    setIsCreating(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert('You must be logged in');
        setIsCreating(false);
        return;
      }

      let imageUrl = '';

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('allfile')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Failed to upload image: ' + uploadError.message);
          setIsCreating(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('allfile')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Calculate default price for the product (using first enabled pricing model)
      let defaultPrice = 0;
      if (pricingModel.one_time.enabled) {
        if (pricingModel.one_time.type === 'absolute') {
          defaultPrice = pricingModel.one_time.price || 0;
        } else if (pricingModel.one_time.type === 'range') {
          // Use the minimum price as default for range
          defaultPrice = pricingModel.one_time.min_price || 0;
        }
      } else if (pricingModel.subscription.enabled) {
        defaultPrice = pricingModel.subscription.price;
      } else if (pricingModel.usage_based.enabled) {
        defaultPrice = pricingModel.usage_based.price_per_unit;
      }

      // Create product
      const { data: productData, error: insertError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          price: defaultPrice,
          tool_id: toolId,
          is_active: true,
          metadata: {
            image_url: imageUrl,
            pricing_model: pricingModel,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database error:', insertError);
        alert(`Failed to create product: ${insertError.message}`);
        setIsCreating(false);
        return;
      }

      console.log('Product created successfully:', productData);

      // Redirect back to products list
      router.push('/vendor-dashboard/products');
    } catch (err) {
      console.error('Error creating product:', err);
      alert('Failed to create product');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header with Back Button */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#ededed]">Create New Product</h1>
                <p className="text-sm text-[#9ca3af]">for {toolName}</p>
              </div>
            </div>
            
            {/* Create Button */}
            <button
              onClick={handleSubmit}
              disabled={!isFormValid() || isCreating}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
            >
              {isCreating ? (
                <>
                  <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Side: Form Fields */}
            <div className="space-y-6">
              {/* Product Name and Upload Picture in same row */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label htmlFor="name" className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                    placeholder="Premium Plan"
                    required
                  />
                </div>
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors cursor-pointer text-sm font-medium border border-[#4b5563] hover:border-[#3ecf8e]"
                >
                  <Upload className="w-4 h-4" />
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-medium text-[#d1d5db] mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full h-32 px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-none text-sm"
                  placeholder="Full access to all features with priority support..."
                  required
                />
              </div>

              {/* Pricing Models */}
              <PricingModelsSection
                pricingModel={pricingModel}
                setPricingModel={setPricingModel}
              />
            </div>

            {/* Right Side: Card Preview - Sticky */}
            <div>
              <div className="sticky top-24">
                <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                  Preview
                </label>
                <div className="border border-[#4b5563] rounded-lg p-6 bg-[#1a1a1a]">
                  {/* Card Preview */}
                  <div className="bg-[#374151] rounded-lg overflow-hidden">
                    {/* Image */}
                    <div className="relative w-full h-48 bg-[#4b5563]">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Product preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Upload className="w-12 h-12 text-[#6b7280] mx-auto mb-2" />
                            <p className="text-xs text-[#9ca3af]">No image</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-[#ededed] mb-2">
                        {formData.name || 'Product Name'}
                      </h3>
                      <p className="text-sm text-[#9ca3af] line-clamp-3">
                        {formData.description || 'Product description will appear here...'}
                      </p>
                      
                      {/* Pricing Preview */}
                      <div className="mt-4 pt-4 border-t border-[#4b5563]">
                        {pricingModel.one_time.enabled && (
                          <div className="text-sm text-[#d1d5db]">
                            <span className="text-[#3ecf8e] font-semibold text-lg">
                              {pricingModel.one_time.type === 'absolute' 
                                ? `${pricingModel.one_time.price || 0} credits`
                                : `${pricingModel.one_time.min_price || 0} - ${pricingModel.one_time.max_price || 0} credits`
                              }
                            </span>
                            <span className="text-[#9ca3af] ml-2">one-time</span>
                          </div>
                        )}
                        {pricingModel.subscription.enabled && (
                          <div className="text-sm text-[#d1d5db] mt-1">
                            <span className="text-[#3ecf8e] font-semibold text-lg">
                              {pricingModel.subscription.price || 0} credits
                            </span>
                            <span className="text-[#9ca3af] ml-2">/{pricingModel.subscription.interval}</span>
                          </div>
                        )}
                        {pricingModel.usage_based.enabled && (
                          <div className="text-sm text-[#d1d5db] mt-1">
                            <span className="text-[#3ecf8e] font-semibold text-lg">
                              {pricingModel.usage_based.price_per_unit || 0} credits
                            </span>
                            <span className="text-[#9ca3af] ml-2">per {pricingModel.usage_based.unit_name || 'unit'}</span>
                          </div>
                        )}
                        {!pricingModel.one_time.enabled && !pricingModel.subscription.enabled && !pricingModel.usage_based.enabled && (
                          <p className="text-sm text-[#9ca3af]">No pricing model selected</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

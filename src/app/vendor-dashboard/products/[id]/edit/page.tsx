'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Save, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { ProductPricingModel } from '@/lib/tool-types';

interface Product {
  id: string;
  name: string;
  description: string | null;
  tool_id: string | null;
  is_active: boolean | null;
  pricing_model: ProductPricingModel | null;
  created_at: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [pricingModel, setPricingModel] = useState<ProductPricingModel>({
    one_time: {
      enabled: false,
      type: 'absolute',
      price: 0,
    },
    subscription: {
      enabled: false,
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

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tool_products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error) {
          console.error('Error fetching product:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          alert(`Failed to load product: ${error.message || 'Unknown error'}`);
          router.push('/vendor-dashboard/products');
          return;
        }

        if (!data) {
          console.error('Product not found with ID:', productId);
          alert('Product not found');
          router.push('/vendor-dashboard/products');
          return;
        }

        setProduct(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          is_active: data.is_active ?? true,
        });

        if (data.pricing_model) {
          setPricingModel({
            one_time: { 
              enabled: false, 
              price: 0, 
              ...data.pricing_model.one_time, 
              type: data.pricing_model.one_time?.type || ('absolute' as const) 
            },
            subscription: { enabled: false, price: 0, interval: 'month' as const, trial_days: 0, ...data.pricing_model.subscription },
            usage_based: { enabled: false, price_per_unit: 0, unit_name: '', minimum_units: 0, ...data.pricing_model.usage_based },
          });
        }

        // Fetch tool name
        const { data: toolData } = await supabase
          .from('tools')
          .select('name')
          .eq('id', data.tool_id)
          .single();

        if (toolData) {
          setToolName(toolData.name);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        alert('Failed to load product');
        router.push('/vendor-dashboard/products');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router]);

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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tool_products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
        return;
      }

      router.push('/vendor-dashboard/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    const hasAnyPricing = pricingModel.one_time?.enabled || 
                          pricingModel.subscription?.enabled || 
                          pricingModel.usage_based?.enabled;

    if (!hasAnyPricing) {
      alert('Please enable at least one pricing model');
      return;
    }

    // Validate enabled pricing models
    if (pricingModel.one_time?.enabled) {
      if (pricingModel.one_time.type === 'absolute') {
        if (!pricingModel.one_time.price || pricingModel.one_time.price <= 0) {
          alert('One-time payment price must be greater than 0');
          return;
        }
      } else if (pricingModel.one_time.type === 'range') {
        if (pricingModel.one_time.min_price === undefined || pricingModel.one_time.min_price < 0) {
          alert('One-time payment minimum price must be 0 or greater');
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

    if (pricingModel.subscription?.enabled && pricingModel.subscription.price <= 0) {
      alert('Subscription price must be greater than 0');
      return;
    }

    if (pricingModel.usage_based?.enabled) {
      if (pricingModel.usage_based.price_per_unit <= 0) {
        alert('Usage-based price per unit must be greater than 0');
        return;
      }
      if (!pricingModel.usage_based.unit_name.trim()) {
        alert('Please specify a unit name for usage-based pricing');
        return;
      }
    }

    setIsUpdating(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert('You must be logged in');
        setIsUpdating(false);
        return;
      }

      // Update product
      const { error: updateError } = await supabase
        .from('tool_products')
        .update({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          pricing_model: pricingModel,
        })
        .eq('id', productId);

      if (updateError) {
        console.error('Database error:', updateError);
        alert(`Failed to update product: ${updateError.message}`);
        setIsUpdating(false);
        return;
      }

      // Redirect back to products list
      router.push('/vendor-dashboard/products');
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Failed to update product');
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af]">Product not found</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold text-[#ededed]">Edit Product</h1>
                <p className="text-sm text-[#9ca3af]">for {toolName}</p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed] mb-6">Basic Information</h2>
            
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="Premium Plan"
                  required
                />
              </div>

              {/* Product Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-y"
                  placeholder="Full access to all features with priority support..."
                  required
                />
              </div>

              {/* Product Status */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    formData.is_active ? 'bg-[#3ecf8e]' : 'bg-[#4b5563]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    formData.is_active ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
                <label className="text-sm font-medium text-[#d1d5db]">
                  {formData.is_active ? 'Active' : 'Inactive'}
                </label>
              </div>

              {/* Product Image */}
              <div>
                <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Product Image
                </label>
                <div className="border-2 border-dashed border-[#4b5563] rounded-lg p-6 hover:border-[#3ecf8e] transition-colors">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-[#374151]">
                        <Image
                          src={imagePreview}
                          alt="Product preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <label
                        htmlFor="image-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors cursor-pointer font-medium"
                      >
                        <Upload className="w-4 h-4" />
                        Change Image
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="w-12 h-12 text-[#9ca3af] mb-3" />
                      <span className="text-sm text-[#d1d5db] font-medium mb-1">
                        Click to upload product image
                      </span>
                      <span className="text-xs text-[#9ca3af]">
                        PNG, JPG, GIF up to 10MB
                      </span>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Models */}
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed] mb-2">Pricing Models</h2>
            <p className="text-sm text-[#9ca3af] mb-6">
              Choose one or multiple pricing models for your product
            </p>

            <div className="space-y-6">
              {/* One-Time Payment */}
              <div className={`border rounded-lg p-4 transition-colors ${
                pricingModel.one_time?.enabled 
                  ? 'border-[#3ecf8e] bg-[#3ecf8e]/5' 
                  : 'border-[#4b5563]'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#ededed] mb-1">
                      One-Time Payment
                    </h3>
                    <p className="text-sm text-[#9ca3af]">
                      Single payment for lifetime access
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPricingModel({
                      ...pricingModel,
                      one_time: { 
                        enabled: !(pricingModel.one_time?.enabled ?? false),
                        type: (pricingModel.one_time?.type || 'absolute') as 'absolute' | 'range',
                        price: pricingModel.one_time?.price ?? 0,
                        min_price: pricingModel.one_time?.min_price,
                        max_price: pricingModel.one_time?.max_price,
                      }
                    })}
                    className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${
                      pricingModel.one_time?.enabled ? 'bg-[#3ecf8e]' : 'bg-[#4b5563]'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      pricingModel.one_time?.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {pricingModel.one_time?.enabled && (
                  <div className="space-y-4">
                    {/* Type Selection */}
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setPricingModel({
                          ...pricingModel,
                          one_time: { 
                            enabled: pricingModel.one_time?.enabled ?? false,
                            type: 'absolute' as const,
                            price: pricingModel.one_time?.price ?? 0,
                            min_price: undefined,
                            max_price: undefined
                          }
                        })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          pricingModel.one_time?.type === 'absolute'
                            ? 'bg-[#3ecf8e] text-black'
                            : 'bg-[#374151] text-[#ededed] hover:bg-[#4b5563]'
                        }`}
                      >
                        Fixed Price
                      </button>
                      <button
                        type="button"
                        onClick={() => setPricingModel({
                          ...pricingModel,
                          one_time: { 
                            enabled: pricingModel.one_time?.enabled ?? false,
                            type: 'range' as const,
                            price: undefined,
                            min_price: pricingModel.one_time?.min_price ?? 0,
                            max_price: pricingModel.one_time?.max_price ?? 0
                          }
                        })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          pricingModel.one_time?.type === 'range'
                            ? 'bg-[#3ecf8e] text-black'
                            : 'bg-[#374151] text-[#ededed] hover:bg-[#4b5563]'
                        }`}
                      >
                        Price Range
                      </button>
                    </div>

                    {/* Absolute Price Input */}
                    {pricingModel.one_time.type === 'absolute' && (
                      <div>
                        <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                          Price (Credits) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricingModel.one_time?.price || 0}
                          onChange={(e) => setPricingModel({
                            ...pricingModel,
                            one_time: { 
                              enabled: pricingModel.one_time?.enabled ?? false,
                              type: pricingModel.one_time?.type || ('absolute' as const),
                              price: parseFloat(e.target.value) || 0,
                              min_price: pricingModel.one_time?.min_price,
                              max_price: pricingModel.one_time?.max_price,
                            }
                          })}
                          className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                          placeholder="99.00"
                        />
                      </div>
                    )}

                    {/* Range Price Inputs */}
                    {pricingModel.one_time?.type === 'range' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                            Minimum Price (Credits) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricingModel.one_time?.min_price || 0}
                            onChange={(e) => setPricingModel({
                              ...pricingModel,
                              one_time: { 
                                enabled: pricingModel.one_time?.enabled ?? false,
                                type: pricingModel.one_time?.type || ('range' as const),
                                price: pricingModel.one_time?.price,
                                min_price: parseFloat(e.target.value) || 0,
                                max_price: pricingModel.one_time?.max_price,
                              }
                            })}
                            className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                            Maximum Price (Credits) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricingModel.one_time?.max_price || 0}
                            onChange={(e) => setPricingModel({
                              ...pricingModel,
                              one_time: { 
                                enabled: pricingModel.one_time?.enabled ?? false,
                                type: pricingModel.one_time?.type || ('range' as const),
                                price: pricingModel.one_time?.price,
                                min_price: pricingModel.one_time?.min_price,
                                max_price: parseFloat(e.target.value) || 0,
                              }
                            })}
                            className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                            placeholder="999.00"
                          />
                        </div>
                        {pricingModel.one_time?.min_price !== undefined && 
                         pricingModel.one_time?.max_price !== undefined && 
                         pricingModel.one_time.min_price! > pricingModel.one_time.max_price! && (
                          <p className="text-xs text-red-400">
                            Minimum price must be less than or equal to maximum price
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subscription */}
              <div className={`border rounded-lg p-4 transition-colors ${
                pricingModel.subscription?.enabled 
                  ? 'border-[#3ecf8e] bg-[#3ecf8e]/5' 
                  : 'border-[#4b5563]'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#ededed] mb-1">
                      Subscription
                    </h3>
                    <p className="text-sm text-[#9ca3af]">
                      Recurring payment for continuous access
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPricingModel({
                      ...pricingModel,
                      subscription: { 
                        enabled: !(pricingModel.subscription?.enabled ?? false),
                        price: pricingModel.subscription?.price ?? 0,
                        interval: pricingModel.subscription?.interval || ('month' as const),
                        trial_days: pricingModel.subscription?.trial_days,
                      }
                    })}
                    className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${
                      pricingModel.subscription?.enabled ? 'bg-[#3ecf8e]' : 'bg-[#4b5563]'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      pricingModel.subscription?.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {pricingModel.subscription?.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Price (Credits) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricingModel.subscription?.price ?? 0}
                        onChange={(e) => setPricingModel({
                          ...pricingModel,
                          subscription: { 
                            enabled: pricingModel.subscription?.enabled ?? false,
                            price: parseFloat(e.target.value) || 0,
                            interval: pricingModel.subscription?.interval || ('month' as const),
                            trial_days: pricingModel.subscription?.trial_days,
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                        placeholder="9.99"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Billing Interval *
                      </label>
                      <select
                        value={pricingModel.subscription?.interval || 'month'}
                        onChange={(e) => setPricingModel({
                          ...pricingModel,
                          subscription: { 
                            enabled: pricingModel.subscription?.enabled ?? false,
                            price: pricingModel.subscription?.price ?? 0,
                            interval: e.target.value as 'month' | 'year',
                            trial_days: pricingModel.subscription?.trial_days,
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Trial Period (Days) - Optional
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pricingModel.subscription?.trial_days || 0}
                        onChange={(e) => setPricingModel({
                          ...pricingModel,
                          subscription: { 
                            enabled: pricingModel.subscription?.enabled ?? false,
                            price: pricingModel.subscription?.price ?? 0,
                            interval: pricingModel.subscription?.interval || ('month' as const),
                            trial_days: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                        placeholder="7"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Usage-Based */}
              <div className={`border rounded-lg p-4 transition-colors ${
                pricingModel.usage_based?.enabled 
                  ? 'border-[#3ecf8e] bg-[#3ecf8e]/5' 
                  : 'border-[#4b5563]'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#ededed] mb-1">
                      Usage-Based
                    </h3>
                    <p className="text-sm text-[#9ca3af]">
                      Pay per usage unit (e.g., API calls, tokens, requests)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPricingModel({
                      ...pricingModel,
                      usage_based: { 
                        enabled: !(pricingModel.usage_based?.enabled ?? false),
                        price_per_unit: pricingModel.usage_based?.price_per_unit ?? 0,
                        unit_name: pricingModel.usage_based?.unit_name || '',
                        minimum_units: pricingModel.usage_based?.minimum_units,
                      }
                    })}
                    className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${
                      pricingModel.usage_based?.enabled ? 'bg-[#3ecf8e]' : 'bg-[#4b5563]'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      pricingModel.usage_based?.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {pricingModel.usage_based?.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Price Per Unit (Credits) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricingModel.usage_based?.price_per_unit ?? 0}
                        onChange={(e) => setPricingModel({
                          ...pricingModel,
                          usage_based: { 
                            enabled: pricingModel.usage_based?.enabled ?? false,
                            price_per_unit: parseFloat(e.target.value) || 0,
                            unit_name: pricingModel.usage_based?.unit_name || '',
                            minimum_units: pricingModel.usage_based?.minimum_units,
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                        placeholder="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Unit Name *
                      </label>
                      <input
                        type="text"
                        value={pricingModel.usage_based?.unit_name || ''}
                        onChange={(e) => setPricingModel({
                          ...pricingModel,
                          usage_based: { 
                            enabled: pricingModel.usage_based?.enabled ?? false,
                            price_per_unit: pricingModel.usage_based?.price_per_unit ?? 0,
                            unit_name: e.target.value,
                            minimum_units: pricingModel.usage_based?.minimum_units,
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                        placeholder="API call, request, token, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Minimum Units - Optional
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pricingModel.usage_based?.minimum_units || 0}
                        onChange={(e) => setPricingModel({
                          ...pricingModel,
                          usage_based: { 
                            enabled: pricingModel.usage_based?.enabled ?? false,
                            price_per_unit: pricingModel.usage_based?.price_per_unit ?? 0,
                            unit_name: pricingModel.usage_based?.unit_name || '',
                            minimum_units: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                        placeholder="100"
                      />
                      <p className="text-xs text-[#9ca3af] mt-1">
                        Minimum units that must be purchased
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isUpdating ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





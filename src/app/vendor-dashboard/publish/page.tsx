'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Plus, BookOpen, ExternalLink, AlertCircle, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import Footer from '../../components/Footer';
import ToolSelector from '../components/ToolSelector';

export default function PublishToolPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    toolExternalUrl: '',
    customPricingEmail: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);

  // UI Metadata fields
  const [uiMetadata, setUiMetadata] = useState({
    emoji: '🔧',
    logoUrl: '',
    logoFile: null as File | null,
    tags: [] as string[],
    tagInput: '',
    category: '',
    discountPercentage: 0
  });

  // Common emoji options for tools
  const emojiOptions = ['🔧', '⚙️', '🛠️', '🎨', '💡', '🚀', '📊', '🤖', '💻', '🎯', '📱', '🌐', '🔍', '📝', '🎬', '🎵', '💰', '📈', '🔐', '🎮', '🏗️', '🧪', '📚', '🎭'];

  // Content Metadata fields
  const [contentMetadata, setContentMetadata] = useState({
    longDescription: ''
  });

  // States for unified Sidebar
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);
  const [isVendor, setIsVendor] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push('/login');
          return;
        }

        setUserId(user.id);

        // Fetch user profile data - check if user is a vendor
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, is_vendor')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          console.error('Error fetching user profile:', profileError);
          router.push('/backoffice');
          return;
        }

        // Check if user is a vendor - redirect if not
        if (!profileData.is_vendor) {
          alert('You must be an approved vendor to create tools. Please apply to become a vendor first.');
          router.push('/vendors/apply');
          return;
        }

        if (profileData) {
          setUserRole(profileData.role || 'user');
          setIsVendor(profileData.is_vendor || false);
        }

        // Check if user has tools
        const { data: toolsData } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', user.id);

        setHasTools((toolsData?.length || 0) > 0);
      } catch (err) {
        console.error('Error fetching user data:', err);
        router.push('/backoffice');
      }
    };

    fetchUserData();
  }, [router]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Optimize the image
      const { optimizeHeroImage, formatFileSize } = await import('@/lib/image-optimization');
      const result = await optimizeHeroImage(file);

      // Show optimization result
      if (result.reductionPercentage > 0) {
        console.log(
          `Image optimized: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)} ` +
          `(${result.reductionPercentage}% reduction)`
        );
      }

      // Use optimized file
      setImageFile(result.file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(result.file);
    } catch (error) {
      console.error('Image optimization error:', error);
      alert('Failed to optimize image. Please try a different image.');
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Optimize the logo
      const { optimizeLogoImage, formatFileSize } = await import('@/lib/image-optimization');
      const result = await optimizeLogoImage(file);

      // Show optimization result
      if (result.reductionPercentage > 0) {
        console.log(
          `Logo optimized: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)} ` +
          `(${result.reductionPercentage}% reduction)`
        );
      }

      // Use optimized file
      setUiMetadata({ ...uiMetadata, logoFile: result.file });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUiMetadata(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(result.file);
    } catch (error) {
      console.error('Logo optimization error:', error);
      alert('Failed to optimize logo. Please try a different image.');
    }
  };

  const handleAddTag = () => {
    if (uiMetadata.tagInput.trim() && !uiMetadata.tags.includes(uiMetadata.tagInput.trim())) {
      setUiMetadata({
        ...uiMetadata,
        tags: [...uiMetadata.tags, uiMetadata.tagInput.trim()],
        tagInput: ''
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setUiMetadata({
      ...uiMetadata,
      tags: uiMetadata.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify user is still a vendor before submission
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      alert('You must be logged in to create a tool');
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('is_vendor')
      .eq('id', user.id)
      .single();

    if (!profileData?.is_vendor) {
      alert('You must be an approved vendor to create tools. Please apply to become a vendor first.');
      router.push('/vendors/apply');
      return;
    }

    if (!imageFile) {
      alert('Please select an image for your tool');
      return;
    }

    // Validate external URL
    if (!formData.toolExternalUrl || formData.toolExternalUrl.trim() === '') {
      alert('Please provide an external tool URL');
      return;
    }

    // Validate URL format
    try {
      const url = new URL(formData.toolExternalUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        alert('External URL must use HTTP or HTTPS protocol');
        return;
      }
    } catch {
      // URL parsing failed - invalid format
      alert('Please provide a valid external tool URL (e.g., https://example.com)');
      return;
    }

    setIsPublishing(true);

    try {
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        alert('You must be logged in to publish tools');
        setIsPublishing(false);
        return;
      }

      // Upload hero image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `tool-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('allfile')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload image: ' + uploadError.message);
        setIsPublishing(false);
        return;
      }

      // Get public URL for hero image
      const { data: { publicUrl } } = supabase.storage
        .from('allfile')
        .getPublicUrl(filePath);

      let logoUrl = uiMetadata.logoUrl;

      // Upload logo if provided
      if (uiMetadata.logoFile) {
        const logoExt = uiMetadata.logoFile.name.split('.').pop();
        const logoFileName = `${authUser.id}-logo-${Date.now()}.${logoExt}`;
        const logoFilePath = `tool-logos/${logoFileName}`;

        const { error: logoUploadError } = await supabase.storage
          .from('allfile')
          .upload(logoFilePath, uiMetadata.logoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (logoUploadError) {
          console.error('Logo upload error:', logoUploadError);
          alert('Failed to upload logo: ' + logoUploadError.message);
          setIsPublishing(false);
          return;
        }

        const { data: { publicUrl: logoPublicUrl } } = supabase.storage
          .from('allfile')
          .getPublicUrl(logoFilePath);

        logoUrl = logoPublicUrl;
      }

      // Generate API key for the tool
      const { generateApiKey, hashApiKey } = await import('@/lib/api-keys-client');
      const apiKey = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);
      const apiKeyCreatedAt = new Date().toISOString();

      // Prepare metadata structure
      const metadata: {
        vendor_id: string;
        ui: {
          emoji?: string;
          hero_image_url: string;
          logo_url?: string;
          tags?: string[];
          category?: string;
          development_stage?: 'alpha' | 'beta' | null;
          discount_percentage?: number;
        };
        content: {
          long_description?: string;
        };
        api_key_hash?: string;
        api_key_created_at?: string;
        api_key_active?: boolean;
        custom_pricing_email?: string;
      } = {
        vendor_id: authUser.id, // Store vendor_id for checkout and transaction tracking
        ui: {
          emoji: uiMetadata.emoji || undefined,
          hero_image_url: publicUrl,
          logo_url: logoUrl || undefined,
          tags: uiMetadata.tags.length > 0 ? uiMetadata.tags : undefined,
          category: uiMetadata.category || undefined,
          discount_percentage: uiMetadata.discountPercentage > 0 ? uiMetadata.discountPercentage : undefined,
        },
        content: {
          long_description: contentMetadata.longDescription || undefined,
        },
        api_key_hash: apiKeyHash,
        api_key_created_at: apiKeyCreatedAt,
        api_key_active: true,
        custom_pricing_email: formData.customPricingEmail || undefined
      };

      // Remove undefined values
      Object.keys(metadata.ui).forEach(key => {
        const typedKey = key as keyof typeof metadata.ui;
        if (metadata.ui[typedKey] === undefined) delete metadata.ui[typedKey];
      });
      Object.keys(metadata.content).forEach(key => {
        const typedKey = key as keyof typeof metadata.content;
        if (metadata.content[typedKey] === undefined) delete metadata.content[typedKey];
      });

      // Create tool with complete metadata
      const { data: toolData, error: insertError } = await supabase
        .from('tools')
        .insert({
          name: formData.name,
          description: formData.description,
          url: formData.toolExternalUrl || '', // External tool URL
          is_active: true,
          user_profile_id: authUser.id,
          metadata: metadata
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database error:', insertError);
        alert(`Failed to create tool: ${insertError.message}`);
        setIsPublishing(false);
        return;
      }

      console.log('Tool created successfully:', toolData);

      // Show API key to vendor (display once)
      alert(`Tool created successfully!\n\nYour API key is: ${apiKey}\n\nPlease save this API key - it will not be shown again.`);

      // Redirect to products page to configure pricing via products
      router.push(`/vendor-dashboard/products`);

    } catch (err: unknown) {
      console.error('Error creating tool:', err);
      alert('Failed to create tool');
      setIsPublishing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUiMetadataChange = (field: string, value: string | number | File | null) => {
    setUiMetadata({
      ...uiMetadata,
      [field]: value
    });
  };

  const handleContentMetadataChange = (field: string, value: string | string[]) => {
    setContentMetadata({
      ...contentMetadata,
      [field]: value
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Unified Sidebar */}
      <Sidebar
        isOpen={isMenuOpen}
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={userId}
        userRole={userRole}
        hasTools={hasTools}
        isVendor={isVendor}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar with Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden border-b border-[#374151]">
          <div className="flex items-center justify-between p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-3">
              {/* Hamburger Button */}
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
              >
                <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
              </button>

              {/* Tool Selector */}
              {hasTools && userId && (
                <ToolSelector userId={userId} />
              )}

              {/* Page Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Publish New Tool</h1>
            </div>

            {/* Spacer */}
            <div className="w-10"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[2fr_1fr]">
            {/* Left Column: Forms */}
            <div className="space-y-6">
              <form id="tool-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Integration Guide Banner */}
                <div className="bg-gradient-to-r from-[#3ecf8e]/10 to-[#2dd4bf]/10 border border-[#3ecf8e]/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-6 h-6 text-[#3ecf8e] mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#ededed] mb-1">New to Tool Integration?</h3>
                      <p className="text-sm text-[#d1d5db] mb-3">
                        After publishing your tool, you&apos;ll receive an API key. Check out our integration guide to learn how to connect your tool to 1SUB, verify users, and consume credits.
                      </p>
                      <button
                        type="button"
                        onClick={() => router.push('/vendor-dashboard/integration')}
                        className="flex items-center gap-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                      >
                        <BookOpen className="w-4 h-4" />
                        View Integration Guide
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <h2 className="text-lg font-semibold text-[#ededed] mb-6">Basic Information</h2>

                  {/* Name and Image Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                        Hero Image *
                      </label>
                      <div className="flex items-center gap-3 p-1 border-2 border-[#4b5563] border-dashed rounded-lg hover:border-[#3ecf8e] transition-colors">
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

                  {/* Description */}
                  <div className="mb-6">
                    <label htmlFor="description" className="block text-sm font-medium text-[#d1d5db] mb-2">
                      Short Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-y"
                      placeholder="Generate high-quality content with advanced AI. Perfect for content creators, marketers, and businesses..."
                      required
                    />
                  </div>

                  {/* External Tool URL */}
                  <div className="mb-6">
                    <label htmlFor="toolExternalUrl" className="block text-sm font-medium text-[#d1d5db] mb-2 flex items-center gap-2">
                      External Tool URL *
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-[#9ca3af] cursor-help" />
                        <div className="absolute left-0 top-6 w-80 bg-[#111111] border border-[#374151] rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <p className="text-xs text-[#d1d5db] mb-2">
                            This is where users will be redirected after purchasing credits for your tool. They&apos;ll receive a JWT token in the URL parameter.
                          </p>
                          <p className="text-xs text-[#9ca3af]">
                            Example: <code className="text-[#3ecf8e]">https://your-tool.com/auth/callback</code>
                          </p>
                        </div>
                      </div>
                    </label>
                    <input
                      type="url"
                      id="toolExternalUrl"
                      name="toolExternalUrl"
                      value={formData.toolExternalUrl}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                      placeholder="https://your-tool.com/auth/callback"
                      required
                    />
                    <div className="mt-3 bg-[#111111] border border-[#374151] rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-[#d1d5db]">
                          <strong className="text-blue-400">How it works:</strong>
                        </div>
                      </div>
                      <ol className="text-xs text-[#9ca3af] space-y-1 ml-6 list-decimal">
                        <li>User purchases credits for your tool on 1SUB</li>
                        <li>User is redirected to this URL with a JWT token: <code className="text-[#3ecf8e]">?token=eyJhbGci...</code></li>
                        <li>Your tool verifies the token via the 1SUB API</li>
                        <li>User can now use your tool&apos;s features</li>
                      </ol>
                      <div className="mt-2 pt-2 border-t border-[#374151]">
                        <p className="text-xs text-[#9ca3af]">
                          <strong>Requirements:</strong> Must use HTTPS (or HTTP for localhost testing)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Long Description */}
                  <div className="mb-6">
                    <label htmlFor="longDescription" className="block text-sm font-medium text-[#d1d5db] mb-2">
                      Long Description
                    </label>
                    <textarea
                      id="longDescription"
                      name="longDescription"
                      value={contentMetadata.longDescription}
                      onChange={(e) => handleContentMetadataChange('longDescription', e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent resize-y"
                      placeholder="Provide a detailed description of your tool. This will be shown in the tool detail view..."
                    />
                  </div>

                  {/* Custom Pricing Contact Email */}
                  <div className="mb-6">
                    <label htmlFor="customPricingEmail" className="block text-sm font-medium text-[#d1d5db] mb-2 flex items-center gap-2">
                      Custom Pricing Contact Email (Optional)
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-[#9ca3af] cursor-help" />
                        <div className="absolute left-0 top-6 w-80 bg-[#111111] border border-[#374151] rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <p className="text-xs text-[#d1d5db] mb-2">
                            Email address for users to contact you about custom pricing plans. This serves as a fallback when individual products don&apos;t specify their own contact email.
                          </p>
                          <p className="text-xs text-[#9ca3af]">
                            Example: <code className="text-[#3ecf8e]">sales@your-company.com</code>
                          </p>
                        </div>
                      </div>
                    </label>
                    <input
                      type="email"
                      id="customPricingEmail"
                      name="customPricingEmail"
                      value={formData.customPricingEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                      placeholder="sales@your-company.com"
                    />
                    <p className="text-xs text-[#9ca3af] mt-2">
                      This email will be used for &quot;Contact for Custom Pricing&quot; products if they don&apos;t specify their own contact email.
                    </p>
                  </div>
                </div>

                {/* UI Metadata */}
                <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                  <h2 className="text-lg font-semibold text-[#ededed] mb-6">Visual & Display</h2>

                  <div className="space-y-6">
                    {/* Emoji and Logo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                          Emoji
                        </label>
                        <div className="space-y-3">
                          {/* Selected Emoji Display */}
                          <div className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-2xl text-center min-h-[3rem] flex items-center justify-center">
                            {uiMetadata.emoji || '🔧'}
                          </div>

                          {/* Emoji Picker Grid */}
                          <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-[#374151] rounded-lg border border-[#4b5563]">
                            {emojiOptions.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleUiMetadataChange('emoji', emoji)}
                                className={`text-2xl p-2 rounded-lg transition-colors hover:bg-[#4b5563] ${uiMetadata.emoji === emoji
                                    ? 'bg-[#3ecf8e] text-black ring-2 ring-[#3ecf8e]'
                                    : 'hover:scale-110'
                                  }`}
                                title={`Select ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          {/* Custom Emoji Input (fallback) */}
                          <div>
                            <label className="block text-xs text-[#9ca3af] mb-1">
                              Or enter custom emoji:
                            </label>
                            <input
                              type="text"
                              value={uiMetadata.emoji}
                              onChange={(e) => handleUiMetadataChange('emoji', e.target.value)}
                              className="w-full px-3 py-2 bg-[#2d3748] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-center"
                              placeholder="Type emoji here"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="logo" className="block text-sm font-medium text-[#d1d5db] mb-2">
                          Logo (Alternative to Emoji)
                        </label>
                        <div className="flex items-center gap-3 p-1 border-2 border-[#4b5563] border-dashed rounded-lg hover:border-[#3ecf8e] transition-colors">
                          {uiMetadata.logoUrl ? (
                            <>
                              <img src={uiMetadata.logoUrl} alt="Logo preview" className="h-10 w-10 object-cover rounded-lg flex-shrink-0" />
                              <label
                                htmlFor="logo-upload"
                                className="relative cursor-pointer rounded-md font-medium text-[#3ecf8e] hover:text-[#2dd4bf] text-sm"
                              >
                                <span>Change logo</span>
                                <input
                                  id="logo-upload"
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={handleLogoChange}
                                />
                              </label>
                            </>
                          ) : (
                            <label
                              htmlFor="logo-upload"
                              className="relative cursor-pointer rounded-md font-medium text-[#3ecf8e] hover:text-[#2dd4bf] text-sm"
                            >
                              <span>Upload logo</span>
                              <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleLogoChange}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Tags
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          id="tags"
                          value={uiMetadata.tagInput}
                          onChange={(e) => handleUiMetadataChange('tagInput', e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          className="flex-1 px-4 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                          placeholder="Add a tag and press Enter"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {uiMetadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {uiMetadata.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#374151] text-[#d1d5db] rounded-lg text-sm"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Category and Development Stage */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="category" className="block text-sm font-medium text-[#d1d5db] mb-2">
                          Category
                        </label>
                        <input
                          type="text"
                          id="category"
                          name="category"
                          value={uiMetadata.category}
                          onChange={(e) => handleUiMetadataChange('category', e.target.value)}
                          className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                          placeholder="AI, Marketing, Design, etc."
                        />
                      </div>

                      {/* Development Stage is now calculated dynamically based on paying users */}
                    </div>

                    {/* Discount Percentage */}
                    <div>
                      <label htmlFor="discountPercentage" className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Discount Percentage (Optional)
                      </label>
                      <input
                        type="number"
                        id="discountPercentage"
                        name="discountPercentage"
                        value={uiMetadata.discountPercentage || ''}
                        onChange={(e) => handleUiMetadataChange('discountPercentage', parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                        className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isPublishing || !imageFile || !formData.name || !formData.description}
                  className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPublishing ? 'Creating Tool...' : 'Create Tool'}
                </button>
              </form>
            </div>

            {/* Preview */}
            <div className="rounded-lg overflow-hidden">
              <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#374151] sticky top-24">
                <div className="p-4 border-b border-[#374151]">
                  <h3 className="text-sm font-semibold text-[#ededed]">Preview</h3>
                </div>

                {/* Development Stage Badge - calculated dynamically, defaults to Alpha for new tools */}
                <div className="px-4 pt-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500 text-white shadow-lg border border-purple-400/50">
                    Alpha
                  </span>
                </div>

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
                  {/* Logo/Emoji and Name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                      {uiMetadata.logoUrl ? (
                        <img src={uiMetadata.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-2xl">{uiMetadata.emoji || '🔧'}</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-[#ededed] mb-1">
                        {formData.name || 'Tool Name'}
                      </h3>
                      {uiMetadata.discountPercentage > 0 && (
                        <span className="inline-block bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                          -{uiMetadata.discountPercentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description - Truncated */}
                  <p className="text-sm text-[#9ca3af] mb-3 line-clamp-2">
                    {formData.description || 'Your tool description will appear here...'}
                  </p>

                  {/* Tags */}
                  {uiMetadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {uiMetadata.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-[#374151] text-[#d1d5db] px-2 py-0.5 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      {uiMetadata.tags.length > 3 && (
                        <span className="text-[#9ca3af] text-xs py-0.5">+{uiMetadata.tags.length - 3}</span>
                      )}
                    </div>
                  )}

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

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Menu, Copy, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../../../backoffice/components/Sidebar';
import Footer from '../../../../components/Footer';
import ToolSelector from '../../../components/ToolSelector';
import MarkdownEditor from '../../../../components/MarkdownEditor';

interface Tool {
  id: string;
  name: string;
  slug?: string;
  description: string;
  url: string;
  is_active: boolean;
  user_profile_id: string;
  metadata?: Record<string, unknown>;
}

export default function EditToolPage() {
  const router = useRouter();
  const params = useParams();
  const toolId = params.id as string;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tool, setTool] = useState<Tool | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    toolExternalUrl: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // UI Metadata fields
  const [uiMetadata, setUiMetadata] = useState({
    emoji: '🔧',
    logoUrl: '',
    logoFile: null as File | null,
    tags: [] as string[],
    tagInput: '',
    category: '',
    developmentStage: '' as 'alpha' | 'beta' | '',
    discountPercentage: 0
  });

  // Common emoji options for tools
  const emojiOptions = ['🔧', '⚙️', '🛠️', '🎨', '💡', '🚀', '📊', '🤖', '💻', '🎯', '📱', '🌐', '🔍', '📝', '🎬', '🎵', '💰', '📈', '🔐', '🎮', '🏗️', '🧪', '📚', '🎭'];

  // Content Metadata fields
  const [contentMetadata, setContentMetadata] = useState({
    longDescription: ''
  });

  // Custom Pricing Email
  const [customPricingEmail, setCustomPricingEmail] = useState('');

  const [originalData, setOriginalData] = useState({
    name: '',
    description: '',
    toolExternalUrl: '',
    emoji: '🔧',
    logoUrl: '',
    tags: [] as string[],
    category: '',
    developmentStage: '' as 'alpha' | 'beta' | '',
    discountPercentage: 0,
    longDescription: '',
    customPricingEmail: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

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

  // Check if form has changes
  useEffect(() => {
    const changed =
      formData.name !== originalData.name ||
      formData.description !== originalData.description ||
      formData.toolExternalUrl !== originalData.toolExternalUrl ||
      imageFile !== null ||
      uiMetadata.emoji !== originalData.emoji ||
      uiMetadata.logoFile !== null ||
      JSON.stringify(uiMetadata.tags) !== JSON.stringify(originalData.tags) ||
      uiMetadata.category !== originalData.category ||
      uiMetadata.developmentStage !== originalData.developmentStage ||
      uiMetadata.discountPercentage !== originalData.discountPercentage ||
      contentMetadata.longDescription !== originalData.longDescription ||
      customPricingEmail !== originalData.customPricingEmail;
    setHasChanges(changed);
  }, [formData, imageFile, uiMetadata, contentMetadata, customPricingEmail, originalData]);

  // Fetch tool data
  useEffect(() => {
    const fetchTool = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          alert('You must be logged in');
          router.push('/login');
          return;
        }

        setUserId(user.id);

        // Fetch user profile data
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role, is_vendor')
          .eq('id', user.id)
          .single();

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

        const { data: toolData, error: fetchError } = await supabase
          .from('tools')
          .select('*')
          .eq('id', toolId)
          .eq('user_profile_id', user.id) // Ensure user owns this tool
          .single();

        if (fetchError || !toolData) {
          console.error('Error fetching tool:', fetchError);
          alert('Tool not found or you do not have permission to edit it');
          router.push('/vendor-dashboard');
          return;
        }

        setTool(toolData);
        const metadata = (toolData.metadata as Record<string, unknown>) || {};
        const uiMeta = (metadata.ui as Record<string, unknown>) || {};
        const contentMeta = (metadata.content as Record<string, unknown>) || {};

        // Handle backward compatibility: if url looks like image URL, check metadata
        let externalUrl = toolData.url || '';
        if (externalUrl.includes('storage') || externalUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          externalUrl = '';
        }

        const initialFormData = {
          name: toolData.name,
          description: toolData.description || '',
          toolExternalUrl: externalUrl
        };

        const initialUiMetadata = {
          emoji: (uiMeta.emoji as string) || '🔧',
          logoUrl: (uiMeta.logo_url as string) || '',
          logoFile: null,
          tags: (uiMeta.tags as string[]) || [],
          tagInput: '',
          category: (uiMeta.category as string) || '',
          developmentStage: (uiMeta.development_stage as 'alpha' | 'beta') || '' as 'alpha' | 'beta' | '',
          discountPercentage: (uiMeta.discount_percentage as number) || 0
        };

        const initialContentMetadata = {
          longDescription: (contentMeta.long_description as string) || ''
        };

        // Get custom pricing email from metadata
        const initialCustomPricingEmail = (metadata.custom_pricing_email as string) || '';

        setFormData(initialFormData);
        setUiMetadata(initialUiMetadata);
        setContentMetadata(initialContentMetadata);
        setCustomPricingEmail(initialCustomPricingEmail);

        setOriginalData({
          ...initialFormData,
          emoji: initialUiMetadata.emoji,
          logoUrl: initialUiMetadata.logoUrl,
          tags: [...initialUiMetadata.tags],
          category: initialUiMetadata.category,
          developmentStage: initialUiMetadata.developmentStage,
          discountPercentage: initialUiMetadata.discountPercentage,
          longDescription: initialContentMetadata.longDescription,
          customPricingEmail: initialCustomPricingEmail
        });

        // Hero image is in metadata.ui.hero_image_url
        const heroUrl = (uiMeta.hero_image_url as string) || '';
        setImagePreview(heroUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        alert('Failed to load tool');
        router.push('/vendor-dashboard');
      }
    };

    fetchTool();
  }, [toolId, router]);

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

  const handleSubmit = async () => {
    if (!hasChanges) return;

    setIsSaving(true);

    try {
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        alert('You must be logged in');
        setIsSaving(false);
        return;
      }

      // Validate external URL
      if (!formData.toolExternalUrl || formData.toolExternalUrl.trim() === '') {
        alert('Please provide an external tool URL');
        setIsSaving(false);
        return;
      }

      // Validate URL format
      try {
        const url = new URL(formData.toolExternalUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          alert('External URL must use HTTP or HTTPS protocol');
          setIsSaving(false);
          return;
        }
      } catch {
        alert('Please provide a valid external tool URL (e.g., https://example.com)');
        setIsSaving(false);
        return;
      }

      // Get current metadata
      const currentMetadata = (tool?.metadata as Record<string, unknown>) || {};
      const currentUiMetadata = (currentMetadata.ui as Record<string, unknown>) || {};

      let heroImageUrl = (currentUiMetadata.hero_image_url as string) || '';
      let logoUrl = uiMetadata.logoUrl;

      // Upload new hero image if selected
      if (imageFile) {
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
          setIsSaving(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('allfile')
          .getPublicUrl(filePath);

        heroImageUrl = publicUrl;
      }

      // Upload new logo if selected
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
          setIsSaving(false);
          return;
        }

        const { data: { publicUrl: logoPublicUrl } } = supabase.storage
          .from('allfile')
          .getPublicUrl(logoFilePath);

        logoUrl = logoPublicUrl;
      }

      // Update metadata with all fields
      const updatedMetadata = {
        ...currentMetadata,
        ui: {
          ...currentUiMetadata,
          emoji: uiMetadata.emoji || undefined,
          hero_image_url: heroImageUrl,
          logo_url: logoUrl || undefined,
          tags: uiMetadata.tags.length > 0 ? uiMetadata.tags : undefined,
          category: uiMetadata.category || undefined,
          development_stage: uiMetadata.developmentStage ? (uiMetadata.developmentStage as 'alpha' | 'beta') : null,
          discount_percentage: uiMetadata.discountPercentage > 0 ? uiMetadata.discountPercentage : undefined,
        },
        content: {
          long_description: contentMetadata.longDescription || undefined,
        },
        custom_pricing_email: customPricingEmail || undefined
      };

      // Remove undefined values
      Object.keys(updatedMetadata.ui).forEach(key => {
        const typedKey = key as keyof typeof updatedMetadata.ui;
        if (updatedMetadata.ui[typedKey] === undefined) delete updatedMetadata.ui[typedKey];
      });
      Object.keys(updatedMetadata.content).forEach(key => {
        const typedKey = key as keyof typeof updatedMetadata.content;
        if (updatedMetadata.content[typedKey] === undefined) delete updatedMetadata.content[typedKey];
      });
      if (updatedMetadata.custom_pricing_email === undefined) {
        delete updatedMetadata.custom_pricing_email;
      }

      // Update tool with all data
      const { error: updateError } = await supabase
        .from('tools')
        .update({
          name: formData.name,
          description: formData.description,
          url: formData.toolExternalUrl,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', toolId)
        .eq('user_profile_id', authUser.id);

      if (updateError) {
        console.error('Update error:', updateError);
        alert(`Failed to update tool: ${updateError.message}`);
        setIsSaving(false);
        return;
      }

      // Update original data to reflect saved state
      const updatedOriginalData = {
        name: formData.name,
        description: formData.description,
        toolExternalUrl: formData.toolExternalUrl,
        emoji: uiMetadata.emoji,
        logoUrl: logoUrl,
        tags: [...uiMetadata.tags],
        category: uiMetadata.category,
        developmentStage: uiMetadata.developmentStage,
        discountPercentage: uiMetadata.discountPercentage,
        longDescription: contentMetadata.longDescription,
        customPricingEmail: customPricingEmail
      };
      setOriginalData(updatedOriginalData);
      setImagePreview(heroImageUrl);
      setImageFile(null);
      setUiMetadata(prev => ({ ...prev, logoFile: null }));
      setHasChanges(false);
      setIsSaving(false);

      alert('Tool updated successfully!');

    } catch (err) {
      console.error('Error updating tool:', err);
      alert('Failed to update tool');
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUiMetadataChange = (field: string, value: string | number | 'alpha' | 'beta' | File | null) => {
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

  const handleCopyToolId = () => {
    navigator.clipboard.writeText(toolId);
    alert('Tool ID copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading tool...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex">
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
        flex-1 min-w-0 transition-all duration-300 ease-in-out
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar with Hamburger, Tool Selector, and Save */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden border-b border-[#374151]">
          <div className="flex items-center justify-between p-3">
            {/* Left: Hamburger and Tool Selector */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Tool Selector with current tool selected */}
              {userId && (
                <ToolSelector userId={userId} currentToolId={toolId} />
              )}
            </div>

            {/* Right: Save Button */}
            <button
              onClick={handleSubmit}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 bg-[#3ecf8e] text-black rounded-lg font-medium hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[2fr_1fr]">
            {/* Left Column: Forms */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h2 className="text-lg font-semibold text-[#ededed] mb-6">Basic Information</h2>

                {/* Tool ID Display */}
                <div className="mb-6 p-4 bg-[#374151] rounded-lg border border-[#4b5563]">
                  <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                    Tool ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={toolId}
                      readOnly
                      className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#4b5563] rounded-lg text-[#ededed] font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleCopyToolId}
                      className="p-2 bg-[#374151] border border-[#4b5563] rounded-lg hover:bg-[#4b5563] transition-colors"
                      title="Copy Tool ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#9ca3af] mt-2">
                    Use this ID for external tool integration
                  </p>
                </div>

                <form id="tool-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
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
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slug Display (Read-Only) */}
                  {tool?.slug && (
                    <div>
                      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Tool URL (SEO-friendly)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#374151] rounded-lg text-[#d1d5db] font-mono">
                          1sub.io/tools/{tool.slug}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/tools/${tool.slug}`);
                            alert('Tool URL copied to clipboard!');
                          }}
                          className="px-4 py-3 bg-[#374151] hover:bg-[#4b5563] rounded-lg text-white transition-colors flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Copy URL
                        </button>
                      </div>
                      <p className="text-xs text-[#9ca3af] mt-1">
                        The slug is automatically generated from your tool name and cannot be changed directly.
                      </p>
                    </div>
                  )}

                  {/* Description - Full Width Below */}
                  <div>
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
                  <div>
                    <label htmlFor="toolExternalUrl" className="block text-sm font-medium text-[#d1d5db] mb-2">
                      External Tool URL *
                    </label>
                    <input
                      type="url"
                      id="toolExternalUrl"
                      name="toolExternalUrl"
                      value={formData.toolExternalUrl}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                      placeholder="https://your-tool.com"
                      required
                    />
                    <p className="mt-2 text-sm text-[#9ca3af]">
                      The URL where users will be redirected after purchasing your tool. Must use HTTP or HTTPS.
                    </p>
                  </div>

                  {/* Long Description - Markdown Editor */}
                  <div>
                    <MarkdownEditor
                      value={contentMetadata.longDescription}
                      onChange={(value) => handleContentMetadataChange('longDescription', value)}
                      placeholder="Provide a detailed description of your tool. This will be shown in the tool detail view...

Puoi usare markdown:
- **Grassetto**
- *Corsivo*
- `Codice inline`
- Liste puntate
- [Link](url)
- E molto altro..."
                      label="Long Description"
                      rows={12}
                    />
                  </div>

                  {/* Custom Pricing Contact Email */}
                  <div>
                    <label htmlFor="customPricingEmail" className="block text-sm font-medium text-[#d1d5db] mb-2 flex items-center gap-2">
                      Custom Pricing Contact Email (Optional)
                      <div className="group relative">
                        <svg className="w-4 h-4 text-[#9ca3af] cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-[#d1d5db] shadow-lg z-10">
                          This email will be used for custom pricing inquiries when users want to contact you about custom plans or pricing. If not set, product-specific contact emails will be used.
                        </div>
                      </div>
                    </label>
                    <input
                      type="email"
                      id="customPricingEmail"
                      name="customPricingEmail"
                      value={customPricingEmail}
                      onChange={(e) => setCustomPricingEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                      placeholder="contact@yourcompany.com"
                    />
                    <p className="mt-2 text-sm text-[#9ca3af]">
                      This email will be shown to users when they want to inquire about custom pricing for your tool.
                    </p>
                  </div>
                </form>
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

                    <div>
                      <label htmlFor="developmentStage" className="block text-sm font-medium text-[#d1d5db] mb-2">
                        Development Stage
                      </label>
                      <select
                        id="developmentStage"
                        name="developmentStage"
                        value={uiMetadata.developmentStage}
                        onChange={(e) => handleUiMetadataChange('developmentStage', e.target.value)}
                        className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                      >
                        <option value="">None</option>
                        <option value="alpha">Alpha</option>
                        <option value="beta">Beta</option>
                      </select>
                    </div>
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

            </div>

            {/* Right Column: Preview - Sticky */}
            <div className="lg:sticky lg:top-[88px] lg:h-fit lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto rounded-lg">
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

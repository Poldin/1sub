'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Menu, ArrowLeft, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../../../backoffice/components/Sidebar';
import Footer from '../../../../components/Footer';
import ToolSelector from '../../../components/ToolSelector';

interface Tool {
  id: string;
  name: string;
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
  const [originalData, setOriginalData] = useState({
    name: '',
    description: '',
    toolExternalUrl: ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  
  // States for unified Sidebar
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);

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
      imageFile !== null;
    setHasChanges(changed);
  }, [formData, imageFile, originalData]);

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
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setUserRole(profileData.role || 'user');
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
        const uiMetadata = (metadata.ui as Record<string, unknown>) || {};
        
        // Handle backward compatibility: if url looks like image URL, check metadata
        let externalUrl = toolData.url || '';
        if (externalUrl.includes('storage') || externalUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          // This might be an old image URL, check if we have a proper external URL
          // For now, we'll prompt the user to update it
          externalUrl = '';
        }
        
        const initialData = {
          name: toolData.name,
          description: toolData.description || '',
          toolExternalUrl: externalUrl
        };
        setFormData(initialData);
        setOriginalData(initialData);
        
        // Hero image is in metadata.ui.hero_image_url
        const heroUrl = (uiMetadata.hero_image_url as string) || '';
        setImagePreview(heroUrl); // Show current hero image
        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        alert('Failed to load tool');
        router.push('/vendor-dashboard');
      }
    };

    fetchTool();
  }, [toolId, router]);

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

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('allfile')
          .getPublicUrl(filePath);

        heroImageUrl = publicUrl;
      }

      // Update metadata with hero image URL
      const updatedMetadata = {
        ...currentMetadata,
        ui: {
          ...currentUiMetadata,
          hero_image_url: heroImageUrl
        }
      };

      // Update tool with external URL and updated metadata
      const { error: updateError } = await supabase
        .from('tools')
        .update({
          name: formData.name,
          description: formData.description,
          url: formData.toolExternalUrl, // External tool URL
          metadata: updatedMetadata, // Hero image in metadata
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
      const updatedData = {
        name: formData.name,
        description: formData.description,
        toolExternalUrl: formData.toolExternalUrl
      };
      setOriginalData(updatedData);
      setFormData(updatedData);
      setImagePreview(heroImageUrl); // Update preview with new hero image URL
      setImageFile(null);
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Unified Sidebar */}
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
        onShareAndEarnClick={handleShareAndEarnClick}
        userId={userId}
        userRole={userRole}
        hasTools={hasTools}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
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
            {/* Form: Name, Image & Description */}
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
              <h2 className="text-lg font-semibold text-[#ededed] mb-6">Tool Information</h2>
              
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
              </form>
            </div>

            {/* Preview */}
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


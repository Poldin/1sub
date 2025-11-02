'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
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
    icon: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  
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
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
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
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile) {
      alert('Please select an image for your tool');
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
        setIsPublishing(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('allfile')
        .getPublicUrl(filePath);

      // Prepare complete data object for logging
      const completeToolData = {
        name: formData.name,
        description: formData.description,
        imageUrl: publicUrl
      };

      console.log('Complete tool data:', completeToolData);

      // Create tool with basic information
      const { data: toolData, error: insertError } = await supabase
        .from('tools')
        .insert({
          name: formData.name,
          description: formData.description,
          url: publicUrl, // Image URL
          is_active: true, // Active by default
          user_profile_id: authUser.id, // Foreign key to user_profiles
          metadata: {}
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
      
      // Redirect to products page to create first product
      router.push(`/vendor-dashboard/products/${toolData.id}/new`);
      
    } catch (err) {
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
              {/* Form: Name, Image & Description */}
              <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h2 className="text-lg font-semibold text-[#ededed] mb-6">Basic Information</h2>
                <form id="tool-form" onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={isPublishing || !imageFile || !formData.name || !formData.description}
                  className="w-full bg-[#3ecf8e] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPublishing ? 'Creating Tool...' : 'Create Tool'}
                </button>
              </form>
              </div>
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

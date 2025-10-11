'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft, Eye } from 'lucide-react';
import VendorSidebar from '../components/VendorSidebar';

export default function PublishToolPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    creditsPerUse: '',
    apiEndpoint: '',
    icon: ''
  });
  const [isPublishing, setIsPublishing] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    console.log('Publishing tool:', formData);
    // Simulate API call
    setTimeout(() => {
      setIsPublishing(false);
      alert('Tool published successfully!');
      router.push('/vendor-dashboard/tools');
    }, 1000);
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

              <div>
                <label htmlFor="creditsPerUse" className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Credits per Use *
                </label>
                <input
                  type="number"
                  id="creditsPerUse"
                  name="creditsPerUse"
                  value={formData.creditsPerUse}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-3 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent"
                  placeholder="5"
                  required
                />
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
                disabled={isPublishing}
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
                    {formData.category || 'Category'} • {formData.creditsPerUse || '0'} credits
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#9ca3af] mb-4">
                {formData.description || 'Tool description will appear here...'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[#3ecf8e] font-medium">
                  {formData.creditsPerUse || '0'} credits per use
                </span>
                <button className="px-4 py-2 bg-[#3ecf8e] text-black rounded-lg text-sm font-medium">
                  Launch Tool
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}


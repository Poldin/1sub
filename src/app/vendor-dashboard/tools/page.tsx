'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import VendorSidebar from '../components/VendorSidebar';

interface VendorTool {
  id: string;
  name: string;
  description: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  metadata?: {
    pricing_options?: {
      one_time?: { enabled: boolean; price: number; description?: string };
      subscription_monthly?: { enabled: boolean; price: number; description?: string };
      subscription_yearly?: { enabled: boolean; price: number; description?: string };
    };
    icon?: string;
    category?: string;
    vendor_id?: string;
  };
  // Statistics (calculated from other tables)
  total_purchases?: number;
  total_revenue?: number;
  last_purchase_at?: string;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export default function VendorToolsPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tools, setTools] = useState<VendorTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fetch vendor's tools from database
  useEffect(() => {
    const fetchVendorTools = async () => {
      try {
        setToolsLoading(true);
        setToolsError(null);
        
        const supabase = createClient();
        
        // Get authenticated vendor
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setToolsError('You must be logged in to view your tools');
          setToolsLoading(false);
          return;
        }
        
        setVendorId(user.id);
        
        // Fetch tools where vendor_id is in metadata
        // (Later we'll query by direct vendor_id column if it exists)
        const { data: toolsData, error: fetchError } = await supabase
          .from('tools')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fetchError) {
          console.error('Error fetching tools:', fetchError);
          setToolsError('Failed to load your tools');
          setToolsLoading(false);
          return;
        }
        
        // Filter tools by vendor_id in metadata
        const vendorTools = (toolsData || []).filter(tool => {
          const metadata = tool.metadata as Record<string, unknown>;
          return metadata?.vendor_id === user.id;
        });
        
        // Fetch statistics for each tool
        const toolsWithStats = await Promise.all(
          vendorTools.map(async (tool) => {
            // Get purchase count and revenue from credit_transactions
            const { data: transactions } = await supabase
              .from('credit_transactions')
              .select('credits_amount, created_at')
              .eq('tool_id', tool.id)
              .eq('type', 'add') // Vendor earnings
              .order('created_at', { ascending: false });
            
            const totalPurchases = transactions?.length || 0;
            const totalRevenue = transactions?.reduce((sum, t) => sum + (t.credits_amount || 0), 0) || 0;
            const lastPurchaseAt = transactions?.[0]?.created_at || null;
            
            return {
              ...tool,
              total_purchases: totalPurchases,
              total_revenue: totalRevenue,
              last_purchase_at: lastPurchaseAt,
            };
          })
        );
        
        setTools(toolsWithStats);
        setToolsLoading(false);
        
      } catch (err) {
        console.error('Unexpected error:', err);
        setToolsError('An unexpected error occurred');
        setToolsLoading(false);
      }
    };
    
    fetchVendorTools();
  }, []);

  const handleViewTool = (toolId: string) => {
    // Navigate to tool details page (to be created)
    router.push(`/vendor-dashboard/tools/${toolId}`);
  };

  const handleEditTool = (toolId: string) => {
    // Navigate to edit page (to be created)
    router.push(`/vendor-dashboard/tools/${toolId}/edit`);
  };

  const handleDeleteTool = async (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${tool.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      const supabase = createClient();
      
      // Soft delete: Set is_active to false
      const { error } = await supabase
        .from('tools')
        .update({ is_active: false })
        .eq('id', toolId);
      
      if (error) {
        console.error('Error deleting tool:', error);
        alert('Failed to delete tool');
        return;
      }
      
      // Update local state
      setTools(tools.filter(t => t.id !== toolId));
      alert('Tool deleted successfully');
      
    } catch (err) {
      console.error('Error:', err);
      alert('An error occurred while deleting the tool');
    }
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">My Tools</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-[#ededed]">My Tools</h2>
            <button
              onClick={() => router.push('/vendor-dashboard/publish')}
              className="flex items-center px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Publish New Tool
            </button>
          </div>

          <div className="bg-[#1f2937] rounded-lg border border-[#374151] mt-8">
            <div className="p-6 border-b border-[#374151]">
              <h3 className="text-xl font-semibold text-[#ededed]">Published Tools</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#374151]">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Pricing</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Purchases</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Last Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {toolsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#3ecf8e] border-t-transparent"></div>
                        <p className="mt-4 text-[#9ca3af]">Loading your tools...</p>
                      </td>
                    </tr>
                  ) : toolsError ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <p className="text-red-400 mb-4">{toolsError}</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf]"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : tools.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#9ca3af]">
                        <p className="mb-4">No tools published yet.</p>
                        <button
                          onClick={() => router.push('/vendor-dashboard/publish')}
                          className="text-[#3ecf8e] hover:text-[#2dd4bf] font-medium"
                        >
                          Publish your first tool →
                        </button>
                      </td>
                    </tr>
                  ) : (
                    tools.map((tool) => (
                      <tr key={tool.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-[#ededed]">
                          {tool.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tool.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {tool.is_active ? 'active' : 'inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#ededed]">
                          {tool.metadata?.pricing_options ? (
                            <span className="text-xs">Multiple options</span>
                          ) : (
                            <span>N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#ededed]">
                          {tool.total_purchases || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#9ca3af]">
                          {tool.last_purchase_at ? (
                            formatRelativeTime(tool.last_purchase_at)
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewTool(tool.id)}
                            className="text-[#3ecf8e] hover:text-[#2dd4bf] mr-4"
                            title="View Tool"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEditTool(tool.id)}
                            className="text-[#3ecf8e] hover:text-[#2dd4bf] mr-4"
                            title="Edit Tool"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteTool(tool.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete Tool"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Plus, Package, Edit, Trash2, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '../../backoffice/components/Sidebar';
import Footer from '../../components/Footer';
import ToolSelector from '../components/ToolSelector';

interface Product {
  id: string;
  name: string;
  description: string;
  tool_id: string;
  is_active: boolean;
  created_at: string;
  pricing_model?: {
    pricing_model?: {
      one_time?: { enabled: boolean; price?: number; type?: string; min_price?: number; max_price?: number };
      subscription?: { enabled: boolean; price?: number; interval?: string; trial_days?: number };
      usage_based?: { enabled: boolean; price_per_unit?: number; unit_name?: string; minimum_units?: number };
    };
    image_url?: string;
  } | null;
}

export default function ProductsPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // User data states
  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');
  const [hasTools, setHasTools] = useState(false);

  // Tool selection states
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [selectedToolName, setSelectedToolName] = useState<string>('');

  // Products states
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleShareAndEarnClick = () => {
    // Handled by Sidebar component
  };

  const handleToolChange = (toolId: string, toolName: string) => {
    setSelectedToolId(toolId);
    setSelectedToolName(toolName);
    // Fetch products for the selected tool
    fetchProducts(toolId);
  };

  // Fetch products for a specific tool
  const fetchProducts = async (toolId: string) => {
    setProductsLoading(true);
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('tool_products')
        .select('*')
        .eq('tool_id', toolId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
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

      // Refresh products list
      if (selectedToolId) {
        fetchProducts(selectedToolId);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  // Fetch user data and tools
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();

        setUser({
          id: data.id,
          fullName: data.fullName || null,
          email: data.email || '',
        });

        if (data.role) {
          setUserRole(data.role);
        }

        // Fetch user's tools
        const supabase = createClient();
        const { data: toolsData, error } = await supabase
          .from('tools')
          .select('*')
          .eq('user_profile_id', data.id);

        if (!error && toolsData) {
          setHasTools(toolsData.length > 0);
          
          // Set initial tool selection
          if (toolsData.length > 0) {
            const savedToolId = localStorage.getItem('selectedToolId');
            const toolExists = savedToolId && toolsData.some(tool => tool.id === savedToolId);
            const initialToolId = toolExists ? savedToolId : toolsData[0].id;
            const initialTool = toolsData.find(tool => tool.id === initialToolId);
            
            setSelectedToolId(initialToolId);
            setSelectedToolName(initialTool?.name || '');
            
            // Fetch products
            fetchProducts(initialToolId);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
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
        userId={user?.id || ''}
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
              
              {/* Tool Selector - Only show if user has tools */}
              {hasTools && user?.id && (
                <ToolSelector userId={user.id} onToolChange={handleToolChange} />
              )}
              
              {/* Page Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Products</h1>
            </div>
            
            {/* Create New Product Button */}
            {hasTools && selectedToolId && (
              <button
                onClick={() => router.push(`/vendor-dashboard/products/${selectedToolId}/new`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold"
              >
                <Plus className="w-4 h-4" />
                New Product
              </button>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!hasTools ? (
            // No tools yet
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#3ecf8e]/20 rounded-full mb-6">
                <Package className="w-10 h-10 text-[#3ecf8e]" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#ededed] mb-4">
                Create a tool first
              </h2>
              <p className="text-lg text-[#9ca3af] mb-8">
                You need to create a tool before you can add products to it.
              </p>
              <button
                onClick={() => router.push('/vendor-dashboard/publish')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors text-lg font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create Your First Tool
              </button>
            </div>
          ) : (
            <>
              {/* Page Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-8 bg-[#3ecf8e] rounded-full"></div>
                  <h2 className="text-3xl font-bold text-[#ededed]">
                    Products for {selectedToolName}
                  </h2>
                </div>
                <p className="text-[#9ca3af] ml-5">
                  Manage products that users can purchase for this tool
                </p>
              </div>

              {/* Products Grid */}
              {productsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
                  <p className="mt-4 text-[#9ca3af]">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="bg-[#1f2937] rounded-lg p-12 border border-[#374151] text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3ecf8e]/20 rounded-full mb-4">
                    <Package className="w-8 h-8 text-[#3ecf8e]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#ededed] mb-2">
                    No products yet
                  </h3>
                  <p className="text-[#9ca3af] mb-6">
                    Create your first product to get started
                  </p>
                  <button
                    onClick={() => router.push(`/vendor-dashboard/products/${selectedToolId}/new`)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Product
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-[#1f2937] rounded-lg border border-[#374151] overflow-hidden hover:border-[#3ecf8e]/50 transition-colors"
                    >
                      {/* Product Image */}
                      {product.pricing_model?.image_url ? (
                        <div className="w-full h-48 overflow-hidden bg-[#374151]">
                          <img
                            src={product.pricing_model.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-[#3ecf8e]/20 to-[#2dd4bf]/20 flex items-center justify-center">
                          <Package className="w-16 h-16 text-[#3ecf8e]/50" />
                        </div>
                      )}

                      {/* Product Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold text-[#ededed] line-clamp-1">
                            {product.name}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            product.is_active 
                              ? 'bg-[#3ecf8e]/20 text-[#3ecf8e]' 
                              : 'bg-[#9ca3af]/20 text-[#9ca3af]'
                          }`}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <p className="text-sm text-[#9ca3af] mb-4 line-clamp-2">
                          {product.description}
                        </p>

                        <div className="flex items-center gap-2 mb-4">
                          <DollarSign className="w-4 h-4 text-[#3ecf8e]" />
                          <span className="text-xl font-bold text-[#ededed]">
                            {(() => {
                              // Extract price from pricing_model
                              const pm = product.pricing_model?.pricing_model;
                              if (pm?.one_time?.enabled && pm.one_time.price) {
                                return `${pm.one_time.price} credits`;
                              }
                              if (pm?.subscription?.enabled && pm.subscription.price) {
                                return `${pm.subscription.price} credits/${pm.subscription.interval || 'month'}`;
                              }
                              if (pm?.usage_based?.enabled && pm.usage_based.price_per_unit) {
                                return `${pm.usage_based.price_per_unit} credits/${pm.usage_based.unit_name || 'unit'}`;
                              }
                              return 'Price not set';
                            })()}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/vendor-dashboard/products/${product.id}/edit`)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors font-semibold"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-semibold"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <Footer />
        </div>
      </main>
    </div>
  );
}


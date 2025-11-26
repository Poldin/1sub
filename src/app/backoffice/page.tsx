'use client';

import { useState, useEffect, Suspense } from 'react';
import { Menu, User, LogOut, ExternalLink, Briefcase, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import Footer from '@/app/components/Footer';
import ToolsGrid from '@/app/components/ToolsGrid';

function BackofficeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<{ id: string; fullName: string | null; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [credits, setCredits] = useState(0); // Keep for internal use (tool purchase logic)

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('user'); // Change to 'vendor' to test vendor view
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [hasTools, setHasTools] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [highlightedToolId, setHighlightedToolId] = useState<string | null>(null);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsMenuOpen(savedSidebarState === 'true');
    }
  }, []);

  // Fetch user data
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

        if (data.isVendor !== undefined) {
          setIsVendor(data.isVendor);
        }

        if (data.credits !== undefined) {
          setCredits(data.credits);
        }

        // Check if user has created any tools
        const supabase = createClient();
        const { data: userTools, error: toolsError } = await supabase
          .from('tools')
          .select('id')
          .eq('user_profile_id', data.id);

        if (!toolsError && userTools && userTools.length > 0) {
          setHasTools(true);
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

  // Handle URL params for purchase success and highlighted tools
  useEffect(() => {
    // Check if returning from successful purchase
    if (searchParams.get('purchase_success') === 'true') {
      setShowPurchaseSuccess(true);

      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowPurchaseSuccess(false);
      }, 5000);

      // Clean up URL
      window.history.replaceState({}, '', '/backoffice');
    }

    // Check if coming from homepage with highlighted tool
    const highlightParam = searchParams.get('highlight');
    if (highlightParam) {
      setHighlightedToolId(highlightParam);

      // Scroll to highlighted tool after a brief delay
      setTimeout(() => {
        const element = document.getElementById(`tool-${highlightParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedToolId(null);
        // Clean up URL
        window.history.replaceState({}, '', '/backoffice');
      }, 3000);
    }
  }, [searchParams]); // Dependency on search params

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    // Save sidebar state to localStorage
    localStorage.setItem('sidebarOpen', String(newState));
  };

  const handleLaunchTool = async (toolId: string, selectedProductId?: string) => {
    if (!user) return;

    const supabase = createClient();

    // Fetch tool details from database
    const { data: tool, error: fetchError } = await supabase
      .from('tools')
      .select(`
        *,
        products:tool_products(*)
      `)
      .eq('id', toolId)
      .single();

    if (fetchError || !tool) {
      console.error('Error fetching tool:', fetchError);
      alert('Tool not found');
      return;
    }

    try {
      const toolMetadata = tool.metadata as Record<string, unknown>;

      // Check if tool has products (new structure)
      const hasProducts = Array.isArray(tool.products) && tool.products.length > 0;

      // Check if tool has pricing_options in metadata (old structure)
      const pricingOptions = toolMetadata?.pricing_options as {
        one_time?: { enabled: boolean; price: number; description?: string };
        subscription_monthly?: { enabled: boolean; price: number; description?: string };
        subscription_yearly?: { enabled: boolean; price: number; description?: string };
      } | undefined;

      // Handle tools with products (new unified structure)
      if (hasProducts && tool.products) {
        const activeProducts = tool.products.filter((p: { is_active?: boolean }) => p.is_active);

        if (activeProducts.length === 0) {
          alert('This tool has no active products');
          return;
        }

        // Check if selected product is a custom plan
        if (selectedProductId) {
          const selectedProduct = activeProducts.find((p: { id: string }) => p.id === selectedProductId);
          if (selectedProduct) {
            const isCustomPlan = (selectedProduct as { is_custom_plan?: boolean }).is_custom_plan || 
                                 (selectedProduct as { pricing_model?: { custom_plan?: { enabled: boolean } } }).pricing_model?.custom_plan?.enabled;
            if (isCustomPlan) {
              // Get contact email from product or tool metadata
              const contactEmail = (selectedProduct as { contact_email?: string }).contact_email || 
                                   (selectedProduct as { pricing_model?: { custom_plan?: { contact_email?: string } } }).pricing_model?.custom_plan?.contact_email ||
                                   (toolMetadata?.custom_pricing_email as string);
              
              if (contactEmail) {
                const subject = encodeURIComponent(`Inquiry about ${(selectedProduct as { name: string }).name}`);
                const body = encodeURIComponent(`Hi,\n\nI'm interested in learning more about the "${(selectedProduct as { name: string }).name}" plan and would like to discuss custom pricing.\n\nThank you!`);
                window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
              } else {
                alert('This product requires custom pricing. Please contact the vendor directly for a quote.');
              }
              return;
            }
          }
        }

        // Get minimum price from products to check balance (excluding custom plans)
        const productPrices = activeProducts.map((p: {
          id: string;
          is_custom_plan?: boolean;
          pricing_model: {
            one_time?: { enabled: boolean; price?: number; min_price?: number };
            subscription?: { enabled: boolean; price: number };
            usage_based?: { enabled: boolean; price_per_unit: number };
            custom_plan?: { enabled: boolean };
          }
        }) => {
          // Skip custom plans in price calculation
          const isCustomPlan = p.is_custom_plan || p.pricing_model.custom_plan?.enabled;
          if (isCustomPlan) return 0;

          const pm = p.pricing_model;
          if (pm.one_time?.enabled) {
            if (pm.one_time.price) return pm.one_time.price;
            if (pm.one_time.min_price) return pm.one_time.min_price; // Use min price as fallback
          }
          if (pm.subscription?.enabled && pm.subscription.price) return pm.subscription.price;
          if (pm.usage_based?.enabled && pm.usage_based.price_per_unit) return pm.usage_based.price_per_unit;
          return 0;
        }).filter((price: number) => price > 0);

        const cheapestPrice = productPrices.length > 0 ? Math.min(...productPrices) : 0;

        // Check if user has enough credits for cheapest option
        if (cheapestPrice > 0 && credits < cheapestPrice) {
          router.push(`/buy-credits?needed=${cheapestPrice}&tool_id=${tool.id}&tool_name=${encodeURIComponent(tool.name)}`);
          return;
        }

        // Prevent self-purchase
        // TEMPORARILY DISABLED: Allow vendors to purchase their own tools
        // if (toolMetadata?.vendor_id === user.id) {
        //   alert('You cannot purchase your own tools');
        //   return;
        // }

        // Create checkout with products
        const { data: checkout, error } = await supabase
          .from('checkouts')
          .insert({
            user_id: user.id,
            vendor_id: toolMetadata?.vendor_id || tool.user_profile_id || null,
            credit_amount: null, // Will be set when user selects product
            type: null, // Will be set when user selects product
            metadata: {
              tool_id: tool.id,
              tool_name: tool.name,
              tool_url: tool.url,
              products: activeProducts, // Pass products to checkout
              status: 'pending',
              selected_pricing: selectedProductId, // Auto-select the chosen product
            },
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating checkout:', error);
          alert('Failed to initiate checkout');
          return;
        }

        router.push(`/credit_checkout/${checkout.id}`);
      } else if (pricingOptions) {
        // Handle tools with pricing_options (old structure)
        // Get all enabled pricing options
        const enabledPrices = [];
        if (pricingOptions.one_time?.enabled) enabledPrices.push(pricingOptions.one_time.price);
        if (pricingOptions.subscription_monthly?.enabled) enabledPrices.push(pricingOptions.subscription_monthly.price);
        if (pricingOptions.subscription_yearly?.enabled) enabledPrices.push(pricingOptions.subscription_yearly.price);

        // Get cheapest price to check balance
        const cheapestPrice = enabledPrices.length > 0 ? Math.min(...enabledPrices) : 0;

        // Check if user has enough credits for cheapest option
        if (credits < cheapestPrice) {
          router.push(`/buy-credits?needed=${cheapestPrice}&tool_id=${tool.id}&tool_name=${encodeURIComponent(tool.name)}`);
          return;
        }

        // Prevent self-purchase
        // TEMPORARILY DISABLED: Allow vendors to purchase their own tools
        // if (toolMetadata?.vendor_id === user.id) {
        //   alert('You cannot purchase your own tools');
        //   return;
        // }

        // Create checkout with pricing_options (user will select on checkout page)
        const { data: checkout, error } = await supabase
          .from('checkouts')
          .insert({
            user_id: user.id,
            vendor_id: toolMetadata?.vendor_id || tool.user_profile_id || null,
            credit_amount: null, // Will be set when user selects pricing
            type: null, // Will be set when user selects pricing
            metadata: {
              tool_id: tool.id,
              tool_name: tool.name,
              tool_url: tool.url, // ✅ Use actual tool URL
              pricing_options: pricingOptions,
              status: 'pending',
              selected_pricing: selectedProductId, // Auto-select if provided
            },
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating checkout:', error);
          alert('Failed to initiate checkout');
          return;
        }

        router.push(`/credit_checkout/${checkout.id}`);
      } else {
        // No valid pricing found
        alert('This tool has no valid pricing configured. Please contact the vendor.');
        return;
      }
    } catch (err) {
      console.error('Checkout creation error:', err);
      alert('An error occurred while creating checkout');
    }
  };

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
    <>
      {/* Success Banner */}
      {showPurchaseSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 backdrop-blur text-white px-6 py-4 rounded-lg shadow-lg animate-slide-in">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5" />
            <div>
              <p className="font-semibold">Purchase Successful!</p>
              <p className="text-sm opacity-90">Tool access granted</p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
        {/* Sidebar Component */}
        <Sidebar
          isOpen={isMenuOpen}
          onClose={toggleMenu}
          userId={user?.id || ''}
          userRole={userRole}
          hasTools={hasTools}
          isVendor={isVendor}
        />

        {/* Main Content Area */}
        <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
          {/* Top Bar con Hamburger */}
          <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-50">
            <div className="flex items-center justify-center gap-2 p-2 sm:p-3 min-w-0 lg:justify-between">
              {/* Hamburger Button */}
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
              >
                <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
              </button>

              {/* Search Bar Component */}
              <SearchBar />

              {/* Profile Button with Logout */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 p-2 bg-[#1f2937] hover:bg-[#374151] rounded-lg transition-colors flex-shrink-0" data-testid="user-menu">
                  <User className="w-4 h-4 text-[#3ecf8e]" />
                  <span className="hidden lg:block text-sm font-medium text-[#ededed]">
                    {user?.fullName || user?.email || 'profile'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="overflow-x-hidden" data-testid="dashboard-content">
            <div>

              {/* Categories */}
              {/* <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Categories</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">🤖</div>
                  <h3 className="font-semibold text-sm">AI Tools</h3>
                  <p className="text-xs text-[#9ca3af]">24 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="font-semibold text-sm">Analytics</h3>
                  <p className="text-xs text-[#9ca3af]">18 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">🎨</div>
                  <h3 className="font-semibold text-sm">Design</h3>
                  <p className="text-xs text-[#9ca3af]">32 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">💼</div>
                  <h3 className="font-semibold text-sm">Business</h3>
                  <p className="text-xs text-[#9ca3af]">15 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">🔧</div>
                  <h3 className="font-semibold text-sm">Developer</h3>
                  <p className="text-xs text-[#9ca3af]">28 tools</p>
                </div>
                <div className="bg-[#1f2937] hover:bg-[#374151] rounded-lg p-4 cursor-pointer transition-colors group">
                  <div className="text-3xl mb-2">📱</div>
                  <h3 className="font-semibold text-sm">Mobile</h3>
                  <p className="text-xs text-[#9ca3af]">12 tools</p>
                </div>
              </div>
            </div> */}

              {/* Vendor Dashboard Access - Only for approved vendors */}
              {isVendor && (
                <div className="my-8 px-3 sm:px-4 lg:px-8">
                  <div className="bg-gradient-to-r from-[#3ecf8e]/20 to-[#2dd4bf]/20 border border-[#3ecf8e]/30 rounded-xl p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-[#3ecf8e] p-3 rounded-lg">
                          <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#ededed]">Vendor Dashboard</h3>
                          <p className="text-[#9ca3af]">Manage your tools, view analytics, and track earnings</p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/vendor-dashboard')}
                        className="bg-[#3ecf8e] hover:bg-[#2dd4bf] text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        Go to Dashboard
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}



              {/* All Tools Section */}
              <div className="my-8 px-2 sm:px-3">
                <ToolsGrid
                  onToolLaunch={handleLaunchTool}
                  highlightedToolId={highlightedToolId}
                />
              </div>

            </div>
          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>
    </>
  );
}

export default function Backoffice() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
          <p className="mt-4 text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    }>
      <BackofficeContent />
    </Suspense>
  );
}


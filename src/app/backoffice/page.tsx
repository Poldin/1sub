'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { Menu, User, LogOut, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import Footer from '@/app/components/Footer';
import ToolsGrid from '@/app/components/ToolsGrid';
import { usePurchasedProducts } from '@/hooks/usePurchasedProducts';
import { useTools } from '@/hooks/useTools';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [showMyToolsOnly, setShowMyToolsOnly] = useState(false);
  const [purchasedToolIds, setPurchasedToolIds] = useState<Set<string>>(new Set());

  // Get user's purchased tools and active subscriptions
  const { subscriptions, hasTool, loading: purchasedLoading } = usePurchasedProducts();
  const { tools: allTools, loading: toolsLoading } = useTools({ filterBySeo: false });

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktop = window.innerWidth >= 1024;
      const savedState = localStorage.getItem('sidebarOpen');
      
      if (isDesktop) {
        setIsMenuOpen(savedState !== null ? savedState === 'true' : true);
      } else {
        setIsMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load sidebar state from localStorage on mount - removed, now handled in useEffect above

  // Fetch user data function (extracted for reuse)
  const fetchUserData = useCallback(async () => {
      try {
        const response = await fetch('/api/user/profile', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        // Check if response is valid
        if (!response) {
          throw new Error('No response received from server');
        }

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          
          // Try to get error message from response
          let errorMessage = 'Failed to fetch user profile';
          let errorDetails: Record<string, unknown> = {};
          
          try {
            // Clone response to read it without consuming the original
            const responseText = await response.clone().text();
            
            if (responseText) {
              try {
                const errorData = JSON.parse(responseText);
                if (errorData && typeof errorData === 'object') {
                  errorDetails = errorData;
                  if (errorData.error) {
                    errorMessage = typeof errorData.error === 'string' 
                      ? errorData.error 
                      : 'Failed to fetch user profile';
                  }
                  if (errorData.details) {
                    errorMessage += `: ${errorData.details}`;
                  }
                }
              } catch {
                // If not valid JSON, use the text as error message
                if (responseText.trim()) {
                  errorMessage = responseText;
                }
              }
            }
          } catch (parseError) {
            // If we can't read the response, log the parse error
            console.warn('Could not parse error response:', parseError);
          }
          
          // Build error log with available information
          const logData: Record<string, unknown> = {
            status: response.status,
            statusText: response.statusText || 'Unknown',
            message: errorMessage,
          };
          
          // Add URL if available
          if (response.url) {
            logData.url = response.url;
          }
          
          // Only include errorDetails if it has meaningful content
          if (errorDetails && Object.keys(errorDetails).length > 0) {
            logData.details = errorDetails;
          }
          
          // Log the error with all available context
          console.error('Profile fetch error:', logData);
          
          // Also log the raw response for debugging if needed
          if (process.env.NODE_ENV === 'development') {
            console.debug('Response headers:', Object.fromEntries(response.headers.entries()));
          }
          
          // For 500 errors, still try to redirect to login as the session might be invalid
          if (response.status >= 500) {
            console.warn('Server error fetching profile, redirecting to login');
            router.push('/login');
            return;
          }
          
          throw new Error(errorMessage);
        }

        let data;
        try {
          const responseText = await response.text();
          if (!responseText || !responseText.trim()) {
            throw new Error('Empty response from server');
          }
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Invalid response format from server');
        }

        if (!data || !data.id) {
          console.error('Invalid user profile data:', data);
          throw new Error('Invalid user profile data received');
        }

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
        // Log detailed error information
        const errorInfo: Record<string, unknown> = {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : typeof error,
        };
        
        if (error instanceof Error) {
          errorInfo.stack = error.stack;
        } else if (error && typeof error === 'object') {
          // Include any additional error properties
          Object.assign(errorInfo, error);
        }
        
        console.error('Error fetching user data:', errorInfo);
        // Only redirect to login if it's an authentication issue
        // For other errors, we might want to show an error message instead
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
  }, [router]);

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Fetch user's purchased tools (one-time purchases)
  useEffect(() => {
    const fetchPurchasedTools = async () => {
      if (!user?.id) return;

      try {
        const supabase = createClient();
        
        // Get completed one-time purchases (exclude subscriptions)
        const { data: checkouts, error } = await supabase
          .from('checkouts')
          .select('metadata, type, created_at')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching purchased tools:', error);
          return;
        }

        if (checkouts && Array.isArray(checkouts)) {
          // Filter completed purchases, exclude subscriptions
          const completedPurchases = checkouts.filter((checkout: { metadata: unknown; type: string | null }) => {
            const meta = checkout.metadata as Record<string, unknown>;
            const isCompleted = meta?.status === 'completed';
            // Exclude subscriptions - check both type and metadata
            const isNotSubscription = checkout.type !== 'tool_subscription' && 
              !(meta?.checkout_type === 'tool_subscription') &&
              !(meta?.billing_period);
            return isCompleted && isNotSubscription;
          });

          // Extract unique tool IDs
          const toolIds = new Set<string>();
          completedPurchases.forEach((checkout: { metadata: unknown }) => {
            const meta = checkout.metadata as Record<string, unknown>;
            const toolId = meta?.tool_id as string;
            if (toolId) {
              toolIds.add(toolId);
            }
          });

          setPurchasedToolIds(toolIds);
        }
      } catch (error) {
        console.error('Error fetching purchased tools:', error);
      }
    };

    fetchPurchasedTools();
  }, [user?.id]);

  // Filter tools based on "my tools" toggle
  const filteredTools = useMemo(() => {
    if (!showMyToolsOnly) return allTools;

    // Combine subscription tool IDs and purchased tool IDs
    return allTools.filter(tool => {
      const hasSubscription = hasTool(tool.id);
      const hasPurchased = purchasedToolIds.has(tool.id);
      return hasSubscription || hasPurchased;
    });
  }, [showMyToolsOnly, allTools, hasTool, purchasedToolIds]);

  // Handle vendor_applied parameter to force refresh user data
  useEffect(() => {
    if (searchParams.get('vendor_applied') === 'true') {
      // Refetch user data to get updated vendor status
      fetchUserData();
      // Clean up URL parameter
      window.history.replaceState({}, '', '/backoffice');
    }
  }, [searchParams, fetchUserData]);

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
    localStorage.setItem('sidebarOpen', String(newState));
  };

  const handleCloseSidebar = () => {
    setIsMenuOpen(false);
    localStorage.setItem('sidebarOpen', 'false');
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
          router.push('/pricing');
          return;
        }

        // Prevent self-purchase
        // TEMPORARILY DISABLED: Allow vendors to purchase their own tools
        // if (toolMetadata?.vendor_id === user.id) {
        //   alert('You cannot purchase your own tools');
        //   return;
        // }

        // Create checkout using API endpoint
        const response = await fetch('/api/checkout/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool_id: tool.id,
            selected_product_id: selectedProductId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error creating checkout:', errorData);
          alert(errorData.error || 'Failed to initiate checkout');
          return;
        }

        const result = await response.json();
        router.push(`/credit_checkout/${result.checkout_id}`);
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
          router.push('/pricing');
          return;
        }

        // Prevent self-purchase
        // TEMPORARILY DISABLED: Allow vendors to purchase their own tools
        // if (toolMetadata?.vendor_id === user.id) {
        //   alert('You cannot purchase your own tools');
        //   return;
        // }

        // Create checkout using API endpoint
        const response = await fetch('/api/checkout/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool_id: tool.id,
            selected_product_id: selectedProductId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error creating checkout:', errorData);
          alert(errorData.error || 'Failed to initiate checkout');
          return;
        }

        const result = await response.json();
        router.push(`/credit_checkout/${result.checkout_id}`);
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

              {/* Profile Button with Logout - Hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2">
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

              {/* Category Filter Tags with My Tools Button */}
              <div className="my-0 px-3 sm:px-4 lg:px-8">
                <div className="flex justify-center overflow-x-auto gap-2 scrollbar-hide pb-2">
                  {/* My Tools Button */}
                  <button
                    onClick={() => {
                      setShowMyToolsOnly(!showMyToolsOnly);
                      // Clear search term when enabling my tools filter
                      if (!showMyToolsOnly) {
                        setSearchTerm('');
                      }
                    }}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                      showMyToolsOnly
                        ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-lg shadow-[#6366f1]/30'
                        : 'bg-[#1f2937] border border-[#374151] text-[#d1d5db] hover:bg-[#374151] hover:border-[#6366f1] hover:text-[#6366f1]'
                    }`}
                  >
                    My Tools
                  </button>

                  {/* Category Tags */}
                  {['AI', 'Design', 'Analytics', 'Video', 'Marketing', 'Code'].map((category) => (
                    <button
                      key={category}
                      onClick={() => setSearchTerm(searchTerm === category ? '' : category)}
                      disabled={showMyToolsOnly}
                      className={`group/cat flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        showMyToolsOnly
                          ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#6b7280] cursor-not-allowed opacity-50'
                          : searchTerm === category
                          ? 'bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-white shadow-lg shadow-[#3ecf8e]/30'
                          : 'bg-[#1f2937] border border-[#374151] text-[#d1d5db] hover:bg-[#374151] hover:border-[#3ecf8e] hover:text-[#3ecf8e]'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-[#374151] text-[#d1d5db] hover:bg-[#3ecf8e] hover:text-white transition-all duration-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* All Tools Section */}
              <div className="my-8 px-2 sm:px-3">
                {showMyToolsOnly && filteredTools.length === 0 && !toolsLoading && !purchasedLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1f2937] border-2 border-[#374151] mb-4">
                      <svg 
                        className="w-8 h-8 text-[#6b7280]" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-[#ededed] mb-2">No Tools Yet</h3>
                    <p className="text-[#9ca3af] mb-4">
                      You haven&apos;t purchased or subscribed to any tools yet.
                    </p>
                    <button
                      onClick={() => setShowMyToolsOnly(false)}
                      className="px-6 py-2 bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[#3ecf8e]/30 transition-all duration-300"
                    >
                      Browse All Tools
                    </button>
                  </div>
                ) : (
                  <ToolsGrid
                    onToolLaunch={handleLaunchTool}
                    highlightedToolId={highlightedToolId}
                    searchTerm={searchTerm}
                    tools={filteredTools}
                    loading={toolsLoading || purchasedLoading}
                    onDialogOpen={handleCloseSidebar}
                  />
                )}
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


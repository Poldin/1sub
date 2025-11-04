import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tool_id, selected_product_id } = body;

    if (!tool_id) {
      return NextResponse.json(
        { error: 'tool_id is required' },
        { status: 400 }
      );
    }

    // Fetch tool details
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select(`
        *,
        products:tool_products(*)
      `)
      .eq('id', tool_id)
      .single();

    if (toolError || !tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    const toolMetadata = tool.metadata as Record<string, unknown>;
    const hasProducts = Array.isArray(tool.products) && tool.products.length > 0;

    // Check if tool has products (new structure)
    if (hasProducts && tool.products) {
      const activeProducts = tool.products.filter((p: { is_active?: boolean }) => p.is_active);
      
      if (activeProducts.length === 0) {
        return NextResponse.json(
          { error: 'This tool has no active products' },
          { status: 400 }
        );
      }

      // Prevent self-purchase
      if (toolMetadata?.vendor_id === authUser.id) {
        return NextResponse.json(
          { error: 'You cannot purchase your own tools' },
          { status: 400 }
        );
      }

      // Create checkout with products
      const { data: checkout, error } = await supabase
        .from('checkouts')
        .insert({
          user_id: authUser.id,
          vendor_id: toolMetadata?.vendor_id || tool.user_profile_id || null,
          credit_amount: null, // Will be set when user selects product
          type: null, // Will be set when user selects product
          metadata: {
            tool_id: tool.id,
            tool_name: tool.name,
            tool_url: tool.url,
            products: activeProducts,
            selected_pricing: selected_product_id || null,
            status: 'pending',
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating checkout:', error);
        return NextResponse.json(
          { error: 'Failed to create checkout' },
          { status: 500 }
        );
      }

      return NextResponse.json({ checkout_id: checkout.id });
    }

    // Handle pricing_options (old structure)
    const pricingOptions = toolMetadata?.pricing_options as {
      one_time?: { enabled: boolean; price: number; description?: string };
      subscription_monthly?: { enabled: boolean; price: number; description?: string };
      subscription_yearly?: { enabled: boolean; price: number; description?: string };
    } | undefined;

    if (pricingOptions) {
      // Prevent self-purchase
      if (toolMetadata?.vendor_id === authUser.id) {
        return NextResponse.json(
          { error: 'You cannot purchase your own tools' },
          { status: 400 }
        );
      }

      // Create checkout with pricing_options
      const { data: checkout, error } = await supabase
        .from('checkouts')
        .insert({
          user_id: authUser.id,
          vendor_id: toolMetadata?.vendor_id || tool.user_profile_id || null,
          credit_amount: null, // Will be set when user selects pricing
          type: null, // Will be set when user selects pricing
          metadata: {
            tool_id: tool.id,
            tool_name: tool.name,
            tool_url: tool.url,
            pricing_options: pricingOptions,
            selected_pricing: selected_product_id || null,
            status: 'pending',
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating checkout:', error);
        return NextResponse.json(
          { error: 'Failed to create checkout' },
          { status: 500 }
        );
      }

      return NextResponse.json({ checkout_id: checkout.id });
    }

    // No valid pricing found
    return NextResponse.json(
      { error: 'This tool has no valid pricing configured' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


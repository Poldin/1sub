/**
 * API Endpoint: /api/vendor/products/[id]
 *
 * Delete a product and all related data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: productId } = await context.params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the product belongs to a tool owned by this vendor
    const { data: product, error: productError } = await supabase
      .from('tool_products')
      .select('id, tool_id, name, tools!inner(user_profile_id)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Type assertion for the joined tools data
    const toolData = product.tools as unknown as { user_profile_id: string };

    if (toolData.user_profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Product does not belong to your tool' },
        { status: 403 }
      );
    }

    // Use service role client to delete the product
    // This bypasses RLS and allows CASCADE to automatically delete related data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Service role credentials not configured');
      return NextResponse.json(
        {
          error: 'Service role not configured',
          details: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required for product deletion.'
        },
        { status: 500 }
      );
    }

    // Create service role client to bypass RLS
    const supabaseServiceRole = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

    // Delete the product - CASCADE will handle related data if any
    const { error: productDeleteError } = await supabaseServiceRole
      .from('tool_products')
      .delete()
      .eq('id', productId);

    if (productDeleteError) {
      console.error('Error deleting product:', productDeleteError);
      return NextResponse.json(
        {
          error: `Failed to delete product: ${productDeleteError.message}`,
          details: 'Product deletion failed. Please contact support if this issue persists.'
        },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted product ${productId}`);

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error in delete product endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * API Endpoint: /api/vendor/products
 *
 * Create a new product for a tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { tool_id, name, description, pricing_model, is_custom_plan, contact_email } = body;

    // Validate required fields
    if (!tool_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: tool_id and name are required' },
        { status: 400 }
      );
    }

    // Verify the tool belongs to this vendor
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id, user_profile_id')
      .eq('id', tool_id)
      .single();

    if (toolError || !tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    if (tool.user_profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Tool does not belong to you' },
        { status: 403 }
      );
    }

    // Use service role client to create the product
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Service role credentials not configured');
      return NextResponse.json(
        {
          error: 'Service role not configured',
          details: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.'
        },
        { status: 500 }
      );
    }

    const supabaseServiceRole = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

    // Create the product
    const { data: productData, error: insertError } = await supabaseServiceRole
      .from('tool_products')
      .insert({
        name,
        description,
        tool_id,
        is_active: true,
        pricing_model,
        is_custom_plan: is_custom_plan || false,
        contact_email: contact_email || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating product:', insertError);
      return NextResponse.json(
        {
          error: `Failed to create product: ${insertError.message}`,
          details: 'Product creation failed. Please contact support if this issue persists.'
        },
        { status: 500 }
      );
    }

    console.log(`Successfully created product ${productData.id} for tool ${tool_id}`);

    return NextResponse.json({
      success: true,
      product: productData,
      message: `Product "${name}" created successfully`,
    });
  } catch (error) {
    console.error('Error in create product endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * API Endpoint: GET /api/registration/validate?token=XXX
 * 
 * Validates a registration token and returns the associated tool data.
 * Used by the /register page when rendering in co-branded mode.
 * 
 * The registration_token is stored in the public `registration_tokens` table
 * which has RLS policies allowing public read access for validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing registration token' },
        { status: 400 }
      );
    }

    // Token format validation (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the registration token in the public table
    const { data: tokenData, error: tokenError } = await supabase
      .from('registration_tokens')
      .select('tool_id')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired registration token' },
        { status: 404 }
      );
    }

    const matchedToolId = tokenData.tool_id;

    // Fetch the tool with products (vendor_name is denormalized in tools table)
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select(`
        id,
        slug,
        name,
        description,
        url,
        is_active,
        metadata,
        vendor_name,
        products:tool_products(*)
      `)
      .eq('id', matchedToolId)
      .eq('is_active', true)
      .single();

    if (toolError || !tool) {
      return NextResponse.json(
        { error: 'Tool not found or inactive' },
        { status: 404 }
      );
    }

    // Return tool data for co-branded registration
    return NextResponse.json({
      success: true,
      tool: {
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
        metadata: tool.metadata,
        vendor_name: tool.vendor_name,
        products: tool.products,
      },
    });

  } catch (error) {
    console.error('Registration validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


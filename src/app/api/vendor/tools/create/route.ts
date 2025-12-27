/**
 * API Endpoint: /api/vendor/tools/create
 *
 * Create a new tool with API key generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database';
import { generateApiKey, storeApiKey } from '@/security';
import { createTool } from '@/domains/tools';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a vendor
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('is_vendor')
      .eq('id', user.id)
      .single();

    if (!profileData?.is_vendor) {
      return NextResponse.json(
        { error: 'You must be an approved vendor to create tools' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      longDescription,
      toolExternalUrl,
      customPricingEmail,
      emoji,
      logoUrl,
      heroImageUrl,
      tags,
      category,
      discountPercentage,
    } = body;

    // Validate required fields
    if (!name || !description || !toolExternalUrl) {
      return NextResponse.json(
        { error: 'Name, description, and tool URL are required' },
        { status: 400 }
      );
    }

    // Prepare metadata (keep for extra data and backward compatibility)
    const metadata = {
      vendor_id: user.id,
      ui: {
        emoji,
        tags,
        discount_percentage: discountPercentage,
      },
      content: {
        long_description: longDescription,
      },
      custom_pricing_email: customPricingEmail,
    };

    // Create tool using domain service with new schema
    const result = await createTool({
      name,
      short_description: description,
      description: longDescription || description,
      website_url: toolExternalUrl,
      vendor_id: user.id,
      icon_url: logoUrl || emoji || null,
      cover_image_url: heroImageUrl || null,
      category: category || null,
      metadata,
      status: 'active',
    });

    if (!result.success) {
      console.error('Tool creation failed:', result.error);
      return NextResponse.json(
        { error: `Failed to create tool: ${result.error}` },
        { status: 500 }
      );
    }

    // Generate and store API key
    const apiKey = generateApiKey();
    const storeResult = await storeApiKey(result.tool!.id, apiKey);

    if (!storeResult.success) {
      // Rollback: delete the tool if API key creation failed
      await supabase.from('tools').delete().eq('id', result.tool!.id);
      console.error('API key storage failed:', storeResult.error);
      return NextResponse.json(
        {
          error: 'Failed to generate API key',
          details: storeResult.error || 'Unknown error occurred. Please check if RLS policies are properly configured.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tool: result.tool,
      api_key: apiKey,
      message: 'Tool created successfully. Please save your API key - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


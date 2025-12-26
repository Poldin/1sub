/**
 * API Endpoint: /api/vendor/tools/create
 * 
 * Create a new tool with API key generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database';
import { generateApiKey, storeApiKey } from '@/security';

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
    const { name, description, url, metadata } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Create tool
    const { data: toolData, error: insertError } = await supabase
      .from('tools')
      .insert({
        name,
        description,
        url: url || '',
        is_active: true,
        user_profile_id: user.id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        { error: `Failed to create tool: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Generate and store API key
    const apiKey = generateApiKey();
    const storeResult = await storeApiKey(toolData.id, apiKey);

    if (!storeResult.success) {
      // Rollback: delete the tool if API key creation failed
      await supabase.from('tools').delete().eq('id', toolData.id);
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
      tool: toolData,
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


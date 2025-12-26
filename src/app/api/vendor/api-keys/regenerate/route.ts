/**
 * API Endpoint: /api/vendor/api-keys/regenerate
 * 
 * Regenerate API key for a tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database';
import { regenerateApiKey } from '@/security';

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

    // Parse request body
    const body = await request.json();
    const { tool_id } = body;

    if (!tool_id) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    // Regenerate API key
    const result = await regenerateApiKey(tool_id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Unauthorized' ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      api_key: result.apiKey,
      message: 'API key regenerated successfully. Please save it securely - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


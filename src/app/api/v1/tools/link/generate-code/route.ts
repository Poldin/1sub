/**
 * API Endpoint: POST /api/v1/tools/link/generate-code
 * 
 * Generates a short-lived link code for a user.
 * This endpoint is called internally by 1sub UI to show codes to users.
 * 
 * Features:
 * - Authenticated endpoint (requires user session)
 * - Generates 6-character alphanumeric codes
 * - 10-minute expiration
 * - Invalidates previous unused codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface GenerateCodeRequest {
  toolId: string;
}

interface GenerateCodeResponse {
  code: string;
  expiresAt: string;
  toolName: string;
}

interface APIError {
  error: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // =======================================================================
    // 1. Authenticate User
    // =======================================================================
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json<APIError>(
        {
          error: 'Unauthorized',
          message: 'User authentication required',
        },
        { status: 401 }
      );
    }

    // =======================================================================
    // 2. Parse Request Body
    // =======================================================================
    let body: GenerateCodeRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    const { toolId } = body;

    if (!toolId) {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'toolId is required',
        },
        { status: 422 }
      );
    }

    // =======================================================================
    // 3. Verify User Has Subscription to This Tool
    // =======================================================================
    const { data: subscription, error: subError } = await supabase
      .from('tool_subscriptions')
      .select('id, tool_id')
      .eq('user_id', authUser.id)
      .eq('tool_id', toolId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (subError || !subscription) {
      return NextResponse.json<APIError>(
        {
          error: 'Forbidden',
          message: 'No active subscription found for this tool',
        },
        { status: 403 }
      );
    }

    // =======================================================================
    // 4. Get Tool Name for Response
    // =======================================================================
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('name')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json<APIError>(
        {
          error: 'Not found',
          message: 'Tool not found',
        },
        { status: 404 }
      );
    }

    // =======================================================================
    // 5. Generate Link Code Using Database Function
    // =======================================================================
    const { data: codeDataRaw, error: codeError } = await supabase
      .rpc('create_tool_link_code', {
        p_tool_id: toolId,
        p_onesub_user_id: authUser.id,
        p_ttl_minutes: 10
      })
      .single();

    type CreateCodeResult = { code: string; expires_at: string };
    const codeData = (codeDataRaw as unknown as CreateCodeResult | null);

    if (codeError || !codeData) {
      console.error('[Generate Code] Error creating code:', codeError);
      return NextResponse.json<APIError>(
        {
          error: 'Internal error',
          message: 'Failed to generate link code',
        },
        { status: 500 }
      );
    }

    // =======================================================================
    // 6. Return Code
    // =======================================================================
    const response: GenerateCodeResponse = {
      code: codeData.code,
      expiresAt: codeData.expires_at,
      toolName: tool.name,
    };

    return NextResponse.json<GenerateCodeResponse>(response, { status: 200 });

  } catch (error) {
    console.error('[Generate Code] Unexpected error:', error);
    return NextResponse.json<APIError>(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}


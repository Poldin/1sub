/**
 * API Endpoint: /api/vendor/tools/[id]
 * 
 * Delete a tool and all related data
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
    const { id: toolId } = await context.params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the tool belongs to this vendor
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id, user_profile_id, name')
      .eq('id', toolId)
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

    // Use service role client to delete the tool
    // This bypasses RLS and allows CASCADE to automatically delete all related data:
    // - api_keys, tool_user_links, tool_link_codes, usage_logs
    // - tool_products, tool_subscriptions, credit_transactions
    // - custom_pricing_requests, webhook_logs
    // - authorization_codes, verification_tokens, revocations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Service role credentials not configured');
      return NextResponse.json(
        {
          error: 'Service role not configured',
          details: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required for tool deletion.'
        },
        { status: 500 }
      );
    }

    // Create service role client to bypass RLS
    const supabaseServiceRole = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

    // Delete the tool - CASCADE will handle all related data automatically
    const { error: toolDeleteError } = await supabaseServiceRole
      .from('tools')
      .delete()
      .eq('id', toolId);

    if (toolDeleteError) {
      console.error('Error deleting tool:', toolDeleteError);
      return NextResponse.json(
        {
          error: `Failed to delete tool: ${toolDeleteError.message}`,
          details: 'Tool deletion failed. Please contact support if this issue persists.'
        },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted tool ${toolId} and all related data via CASCADE`);

    return NextResponse.json({
      success: true,
      message: `Tool "${tool.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error in delete tool endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

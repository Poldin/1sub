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

    // Delete related data first to avoid foreign key issues
    // Delete in order of dependency

    // Delete API keys
    const { error: apiKeysError } = await supabase
      .from('api_keys')
      .delete()
      .eq('tool_id', toolId);
    if (apiKeysError) {
      console.error('Error deleting api_keys:', apiKeysError);
      return NextResponse.json(
        { error: `Failed to delete API keys: ${apiKeysError.message}` },
        { status: 500 }
      );
    }

    // Delete tool user links
    const { error: toolUserLinksError } = await supabase
      .from('tool_user_links')
      .delete()
      .eq('tool_id', toolId);
    if (toolUserLinksError) {
      console.error('Error deleting tool_user_links:', toolUserLinksError);
      return NextResponse.json(
        { error: `Failed to delete tool user links: ${toolUserLinksError.message}` },
        { status: 500 }
      );
    }

    // Delete tool link codes
    const { error: toolLinkCodesError } = await supabase
      .from('tool_link_codes')
      .delete()
      .eq('tool_id', toolId);
    if (toolLinkCodesError) {
      console.error('Error deleting tool_link_codes:', toolLinkCodesError);
      return NextResponse.json(
        { error: `Failed to delete tool link codes: ${toolLinkCodesError.message}` },
        { status: 500 }
      );
    }

    // Delete usage logs
    const { error: usageLogsError } = await supabase
      .from('usage_logs')
      .delete()
      .eq('tool_id', toolId);
    if (usageLogsError) {
      console.error('Error deleting usage_logs:', usageLogsError);
      return NextResponse.json(
        { error: `Failed to delete usage logs: ${usageLogsError.message}` },
        { status: 500 }
      );
    }

    // Delete tool products
    const { error: toolProductsError } = await supabase
      .from('tool_products')
      .delete()
      .eq('tool_id', toolId);
    if (toolProductsError) {
      console.error('Error deleting tool_products:', toolProductsError);
      return NextResponse.json(
        { error: `Failed to delete tool products: ${toolProductsError.message}` },
        { status: 500 }
      );
    }

    // Delete tool subscriptions - this is critical
    // Use service role client to bypass RLS since vendor owns the tool
    // This allows deletion of subscriptions owned by other users for the vendor's tool
    let subscriptionsDeleted = 0;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      // Use service role to bypass RLS for subscription deletion
      const supabaseServiceRole = createServiceRoleClient(supabaseUrl, supabaseServiceKey);
      
      const { error: toolSubscriptionsError, count } = await supabaseServiceRole
        .from('tool_subscriptions')
        .delete({ count: 'exact' })
        .eq('tool_id', toolId);
      
      if (toolSubscriptionsError) {
        console.error('Error deleting tool_subscriptions with service role:', toolSubscriptionsError);
        return NextResponse.json(
          { 
            error: `Failed to delete tool subscriptions: ${toolSubscriptionsError.message}`,
          },
          { status: 500 }
        );
      }
      subscriptionsDeleted = count || 0;
      console.log(`Deleted ${subscriptionsDeleted} tool subscriptions using service role`);
    } else {
      // Fallback to regular client if service role is not configured
      console.warn('Service role not configured, using regular client for subscription deletion');
      const { error: toolSubscriptionsError, count } = await supabase
        .from('tool_subscriptions')
        .delete({ count: 'exact' })
        .eq('tool_id', toolId);
      
      if (toolSubscriptionsError) {
        console.error('Error deleting tool_subscriptions:', toolSubscriptionsError);
        return NextResponse.json(
          { 
            error: `Failed to delete tool subscriptions: ${toolSubscriptionsError.message}`,
            details: 'This may be due to Row Level Security policies preventing deletion of subscriptions owned by other users.'
          },
          { status: 500 }
        );
      }
      subscriptionsDeleted = count || 0;
    }

    // Delete credit transactions
    const { error: creditTransactionsError } = await supabase
      .from('credit_transactions')
      .delete()
      .eq('tool_id', toolId);
    if (creditTransactionsError) {
      console.error('Error deleting credit_transactions:', creditTransactionsError);
      return NextResponse.json(
        { error: `Failed to delete credit transactions: ${creditTransactionsError.message}` },
        { status: 500 }
      );
    }

    // Finally delete the tool itself
    const { error: toolDeleteError } = await supabase
      .from('tools')
      .delete()
      .eq('id', toolId);

    if (toolDeleteError) {
      console.error('Error deleting tool:', toolDeleteError);
      return NextResponse.json(
        { 
          error: `Failed to delete tool: ${toolDeleteError.message}`,
          details: 'This may be due to remaining foreign key constraints. Please ensure all related data has been deleted.'
        },
        { status: 500 }
      );
    }

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

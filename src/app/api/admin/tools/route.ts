import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';

    // Fetch all tools with vendor info
    let toolsQuery = supabase
      .from('tools')
      .select(`
        id,
        name,
        description,
        url,
        is_active,
        created_at,
        updated_at,
        metadata,
        user_profile_id,
        user_profiles:user_profiles!tools_user_profile_id_fkey(
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter === 'active') {
      toolsQuery = toolsQuery.eq('is_active', true);
    } else if (statusFilter === 'inactive') {
      toolsQuery = toolsQuery.eq('is_active', false);
    } else if (statusFilter === 'pending') {
      // Pending tools would be tools that are not yet active
      toolsQuery = toolsQuery.eq('is_active', false);
    }

    const { data: tools, error: toolsError } = await toolsQuery;

    if (toolsError) {
      console.error('Error fetching tools:', toolsError);
      return NextResponse.json(
        { error: 'Failed to fetch tools' },
        { status: 500 }
      );
    }

    if (!tools || tools.length === 0) {
      return NextResponse.json({
        tools: [],
        stats: {
          totalTools: 0,
          activeTools: 0,
          pendingTools: 0,
        },
      });
    }

    // Get vendor emails
    const vendorIds = [...new Set(tools.map(t => t.user_profile_id).filter(Boolean))];
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userEmailMap = new Map(
      authUsers?.users.map(u => [u.id, u.email || 'Unknown']) || []
    );

    // Get tool IDs for usage counting
    const toolIds = tools.map(t => t.id);

    // Count usage from credit_transactions
    const { data: usageData, error: usageError } = await supabase
      .from('credit_transactions')
      .select('tool_id, credits_amount')
      .in('tool_id', toolIds)
      .eq('type', 'subtract');

    if (usageError) {
      console.error('Error fetching usage data:', usageError);
    }

    // Calculate usage per tool
    const usageMap = new Map<string, { count: number; totalCredits: number }>();
    (usageData || []).forEach(transaction => {
      if (transaction.tool_id) {
        const existing = usageMap.get(transaction.tool_id) || { count: 0, totalCredits: 0 };
        usageMap.set(transaction.tool_id, {
          count: existing.count + 1,
          totalCredits: existing.totalCredits + (transaction.credits_amount || 0),
        });
      }
    });

    // Get credits per use from tool products or metadata
    // For now, we'll use a default or get from products table if needed
    const { data: products } = await supabase
      .from('tool_products')
      .select('tool_id, pricing_model')
      .in('tool_id', toolIds)
      .eq('is_active', true);

    const creditsPerUseMap = new Map<string, number>();
    (products || []).forEach(product => {
      const pricing = product.pricing_model as { credit_cost?: number; fixed_price?: { credit_cost?: number } } | null;
      const creditCost = pricing?.credit_cost || pricing?.fixed_price?.credit_cost || 0;
      if (creditCost > 0) {
        creditsPerUseMap.set(product.tool_id, creditCost);
      }
    });

    // Enrich tools with vendor email, usage stats, and category
    const enrichedTools = tools.map(tool => {
      const metadata = tool.metadata as Record<string, unknown> | null;
      const uiMetadata = metadata?.ui as Record<string, unknown> | undefined;
      const category = (uiMetadata?.category as string) || (metadata?.category as string) || 'Other';
      const usage = usageMap.get(tool.id) || { count: 0, totalCredits: 0 };
      const creditsPerUse = creditsPerUseMap.get(tool.id) || 0;
      const vendorEmail = tool.user_profile_id ? (userEmailMap.get(tool.user_profile_id) || 'Unknown') : 'Unknown';

      // Apply search filter
      if (search && !tool.name.toLowerCase().includes(search.toLowerCase()) && 
          !vendorEmail.toLowerCase().includes(search.toLowerCase())) {
        return null;
      }

      // Handle user_profiles as array or single object
      const userProfile = Array.isArray(tool.user_profiles) 
        ? tool.user_profiles[0] 
        : tool.user_profiles;
      const vendorName = (userProfile as { full_name: string | null } | null | undefined)?.full_name || null;

      return {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        vendorEmail,
        vendorName,
        category,
        status: tool.is_active ? 'active' : 'inactive',
        creditsPerUse,
        totalUses: usage.count,
        totalCreditsConsumed: usage.totalCredits,
        created_at: tool.created_at,
        updated_at: tool.updated_at,
      };
    }).filter(Boolean);

    // Calculate stats
    const totalTools = enrichedTools.length;
    const activeTools = enrichedTools.filter(t => t?.status === 'active').length;
    const pendingTools = enrichedTools.filter(t => t?.status === 'inactive').length;

    return NextResponse.json({
      tools: enrichedTools,
      stats: {
        totalTools,
        activeTools,
        pendingTools,
      },
    });
  } catch (error) {
    console.error('Admin tools error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


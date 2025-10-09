import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Simple admin check function
async function checkAdminAccess(req: NextRequest) {
  try {
    // Get user ID from query parameter (passed from client)
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return { error: 'User ID required' };
    }

    // Check if user is admin
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { error: 'User not found' };
    }

    if (user.role !== 'admin') {
      return { error: 'Admin access required' };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Authentication failed' };
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess(req);
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('user_id');
    const toolId = searchParams.get('tool_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query with joins
    let query = supabaseAdmin
      .from('usage_logs')
      .select(`
        id,
        credits_consumed,
        status,
        metadata,
        created_at,
        users!inner(id, email, full_name),
        tools(id, name)
      `, { count: 'exact' });

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (toolId) {
      query = query.eq('tool_id', toolId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching usage logs:', error);
      return NextResponse.json({ error: 'Failed to fetch usage logs' }, { status: 500 });
    }

    // Transform data to flatten user and tool info
    const logs = (data || []).map(log => ({
      ...log,
      user: log.users,
      tool: log.tools
    }));

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in usage logs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
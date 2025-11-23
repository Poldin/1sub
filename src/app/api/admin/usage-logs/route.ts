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
    const dateFilter = searchParams.get('dateFilter') || 'today';
    const statusFilter = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Calculate date range
    let startDate: Date;
    const endDate = new Date();
    
    switch (dateFilter) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }

    // Fetch usage logs
    let logsQuery = supabase
      .from('usage_logs')
      .select(`
        id,
        created_at,
        credits_consumed,
        status,
        user_id,
        tool_id,
        metadata
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (statusFilter !== 'all') {
      logsQuery = logsQuery.eq('status', statusFilter);
    }

    const { data: logs, error: logsError } = await logsQuery;

    if (logsError) {
      console.error('Error fetching usage logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch usage logs' },
        { status: 500 }
      );
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        logs: [],
        stats: {
          usesToday: 0,
          creditsConsumed: 0,
          activeUsers: 0,
        },
      });
    }

    // Get unique user IDs and tool IDs
    const userIds = [...new Set(logs.map(l => l.user_id))];
    const toolIds = [...new Set(logs.map(l => l.tool_id).filter(Boolean))];

    // Get user profiles
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    // Get user emails from auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userEmailMap = new Map(
      authUsers?.users.map(u => [u.id, u.email || 'Unknown']) || []
    );

    // Get tools
    const { data: tools } = await supabase
      .from('tools')
      .select('id, name')
      .in('id', toolIds);

    const toolMap = new Map(
      (tools || []).map(t => [t.id, t.name])
    );

    const profileMap = new Map(
      (userProfiles || []).map(p => [p.id, p])
    );

    // Enrich logs with user and tool info
    const enrichedLogs = logs.map(log => {
      const profile = profileMap.get(log.user_id);
      const email = userEmailMap.get(log.user_id) || 'Unknown';
      const toolName = log.tool_id ? (toolMap.get(log.tool_id) || 'Unknown Tool') : 'Unknown Tool';
      const metadata = log.metadata as Record<string, unknown> | null;
      const duration = metadata?.duration as number | undefined;

      return {
        id: log.id,
        timestamp: log.created_at,
        userEmail: email,
        userName: profile?.full_name || null,
        toolName,
        creditsUsed: log.credits_consumed,
        status: log.status,
        duration: duration ? `${duration.toFixed(1)}s` : null,
      };
    });

    // Calculate stats for today only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayLogs } = await supabase
      .from('usage_logs')
      .select('user_id, credits_consumed')
      .gte('created_at', today.toISOString());

    const usesToday = todayLogs?.length || 0;
    const creditsConsumed = todayLogs?.reduce((sum, log) => sum + (log.credits_consumed || 0), 0) || 0;
    const activeUsers = new Set(todayLogs?.map(log => log.user_id) || []).size;

    return NextResponse.json({
      logs: enrichedLogs,
      stats: {
        usesToday,
        creditsConsumed,
        activeUsers,
      },
    });
  } catch (error) {
    console.error('Admin usage logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


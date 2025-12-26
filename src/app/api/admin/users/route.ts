import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentBalance } from '@/domains/credits';

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
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch user profiles
    const usersQuery = supabase
      .from('user_profiles')
      .select('id, full_name, created_at, role, is_vendor', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: userProfiles, error: profilesError, count } = await usersQuery;

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!userProfiles || userProfiles.length === 0) {
      return NextResponse.json({
        users: [],
        stats: {
          totalUsers: 0,
          activeToday: 0,
          totalCredits: 0,
        },
        total: 0,
      });
    }

    // Get user emails from auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userEmailMap = new Map(
      authUsers?.users.map(u => [u.id, u.email || 'Unknown']) || []
    );

    const userIds = userProfiles.map(p => p.id);

    // Get current balances for all users
    const balancesMap = new Map<string, number>();
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const balance = await getCurrentBalance(userId);
          balancesMap.set(userId, balance);
        } catch (error) {
          console.error(`Error fetching balance for user ${userId}:`, error);
          balancesMap.set(userId, 0);
        }
      })
    );

    // Get tool usage counts
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('user_id, tool_id')
      .in('user_id', userIds)
      .eq('type', 'subtract');

    const toolUsageMap = new Map<string, Set<string>>();
    (transactions || []).forEach(tx => {
      if (tx.user_id && tx.tool_id) {
        const existing = toolUsageMap.get(tx.user_id) || new Set<string>();
        existing.add(tx.tool_id);
        toolUsageMap.set(tx.user_id, existing);
      }
    });

    // Get active users (users with activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentTransactions } = await supabase
      .from('credit_transactions')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', sevenDaysAgo.toISOString());

    const activeUserIds = new Set(
      (recentTransactions || []).map(tx => tx.user_id)
    );

    // Get today's active users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayTransactions } = await supabase
      .from('credit_transactions')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', today.toISOString());

    const todayActiveUserIds = new Set(
      (todayTransactions || []).map(tx => tx.user_id)
    );

    // Calculate total credits in circulation
    let totalCredits = 0;
    balancesMap.forEach(balance => {
      totalCredits += balance;
    });

    // Enrich users with additional data
    const enrichedUsers = userProfiles.map(profile => {
      const email = userEmailMap.get(profile.id) || 'Unknown';
      const balance = balancesMap.get(profile.id) || 0;
      const toolCount = toolUsageMap.get(profile.id)?.size || 0;
      const isActive = activeUserIds.has(profile.id);
      const isActiveToday = todayActiveUserIds.has(profile.id);

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          email.toLowerCase().includes(searchLower) ||
          (profile.full_name && profile.full_name.toLowerCase().includes(searchLower));
        if (!matchesSearch) {
          return null;
        }
      }

      // Apply status filter
      if (filter === 'active' && !isActive) {
        return null;
      }
      if (filter === 'inactive' && isActive) {
        return null;
      }
      if (filter === 'new') {
        const createdAt = profile.created_at ? new Date(profile.created_at) : null;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        if (!createdAt || createdAt < oneWeekAgo) {
          return null;
        }
      }

      return {
        id: profile.id,
        email,
        full_name: profile.full_name,
        creditsBalance: balance,
        toolsUsed: toolCount,
        registrationDate: profile.created_at,
        lastActive: isActiveToday ? 'Today' : (isActive ? 'This week' : 'Over a week ago'),
        role: profile.role,
        isVendor: profile.is_vendor || false,
      };
    }).filter(Boolean);

    // Calculate stats (from all users, not just filtered)
    const allActiveToday = todayActiveUserIds.size;
    const allTotalCredits = Array.from(balancesMap.values()).reduce((sum, b) => sum + b, 0);

    return NextResponse.json({
      users: enrichedUsers,
      stats: {
        totalUsers: count || 0,
        activeToday: allActiveToday,
        totalCredits: allTotalCredits,
      },
      total: count || 0,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


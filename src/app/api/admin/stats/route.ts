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

    if (profileError) {
      console.error('Error fetching user profile for admin check:', profileError);
      return NextResponse.json(
        { error: 'Forbidden', details: profileError.message },
        { status: 403 }
      );
    }

    if (!profile || profile.role !== 'admin') {
      console.error('User is not admin:', { userId: authUser.id, role: profile?.role });
      return NextResponse.json(
        { error: 'Forbidden', details: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total user count
    const { count: userCount, error: userCountError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (userCountError) {
      console.error('Error fetching user count:', userCountError);
    }

    // Get all user IDs
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id');

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch user profiles' },
        { status: 500 }
      );
    }

    // If no users, return zero stats
    if (!userProfiles || userProfiles.length === 0) {
      return NextResponse.json({
        totalBalance: 0,
        userCount: 0,
        averageBalance: 0,
      });
    }

    // Get all balances from user_balances table (much more efficient than aggregating transactions)
    const { data: allBalances, error: balancesError } = await supabase
      .from('user_balances')
      .select('balance');

    if (balancesError) {
      console.error('Error fetching balances:', balancesError);
      // Continue with zero balances if we can't fetch balances
    }

    // Calculate total balance (sum of all user balances)
    const totalBalance = (allBalances || []).reduce((sum, record) => sum + (record.balance || 0), 0);

    // Calculate average balance
    const userCountValue = userCount || userProfiles.length;
    const averageBalance = userCountValue > 0
      ? totalBalance / userCountValue
      : 0;

    return NextResponse.json({
      totalBalance,
      userCount: userCount || 0,
      averageBalance,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


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

    const userIds = (userProfiles || []).map(p => p.id);

    // If no users, return zero stats
    if (userIds.length === 0) {
      return NextResponse.json({
        totalBalance: 0,
        userCount: 0,
        averageBalance: 0,
      });
    }

    // Get latest transaction for each user more efficiently
    // Fetch all transactions for these users, ordered by created_at desc
    // Then group by user_id to get the latest balance_after for each user
    const { data: allTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('user_id, balance_after, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      // Continue with zero balances if we can't fetch transactions
    }

    // Group transactions by user_id and get the latest balance_after for each user
    const userBalances = new Map<string, number>();
    
    if (allTransactions && allTransactions.length > 0) {
      // Since transactions are ordered by created_at desc, the first transaction
      // for each user_id is their latest balance
      for (const tx of allTransactions) {
        if (tx.user_id && !userBalances.has(tx.user_id)) {
          userBalances.set(tx.user_id, tx.balance_after || 0);
        }
      }
    }

    // Get balances for all users (default to 0 if no transactions)
    const balances = userIds.map(userId => userBalances.get(userId) || 0);

    // Calculate total balance (sum of all user balances)
    const totalBalance = balances.reduce((sum, balance) => sum + balance, 0);

    // Calculate average balance
    const averageBalance = balances.length > 0
      ? totalBalance / balances.length
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


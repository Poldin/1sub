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

    // Get total user count
    const { count: userCount, error: userCountError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (userCountError) {
      console.error('Error fetching user count:', userCountError);
    }

    // Get total balance from credit transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('credits_amount, balance_after')
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
    }

    // Calculate total balance (sum of all credit amounts)
    const totalBalance = transactions?.reduce((sum, t) => sum + (t.credits_amount || 0), 0) || 0;

    // Calculate average balance
    const latestBalances = transactions?.reduce((acc, t) => {
      if (t.balance_after && !acc.has(t.balance_after)) {
        acc.set(t.balance_after, t.balance_after);
      }
      return acc;
    }, new Map<number, number>());

    const averageBalance = latestBalances && latestBalances.size > 0
      ? Array.from(latestBalances.values()).reduce((sum, b) => sum + b, 0) / latestBalances.size
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


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
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Fetch recent credit transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select(`
        id,
        credits_amount,
        type,
        reason,
        created_at,
        user_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        transactions: [],
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(transactions.map(t => t.user_id))];

    // Get user profiles
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    }

    // Get user emails from auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userEmailMap = new Map(
      authUsers?.users.map(u => [u.id, u.email || 'Unknown']) || []
    );

    // Create profile map
    const profileMap = new Map(
      (userProfiles || []).map(p => [p.id, p])
    );

    // Enrich transactions with user data
    const enrichedTransactions = transactions.map(t => {
      const profile = profileMap.get(t.user_id);
      const email = userEmailMap.get(t.user_id) || 'Unknown';
      
      return {
        id: t.id,
        delta: t.type === 'add' ? (t.credits_amount || 0) : -(t.credits_amount || 0),
        transaction_type: t.type,
        reason: t.reason || 'N/A',
        created_at: t.created_at || new Date().toISOString(),
        users: {
          email,
          full_name: profile?.full_name || null,
        },
      };
    });

    return NextResponse.json({
      transactions: enrichedTransactions,
    });
  } catch (error) {
    console.error('Admin transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




















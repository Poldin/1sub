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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Fetch recent admin credit adjustments
    // Look for transactions with metadata.admin_action or metadata.admin_id
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select(`
        id,
        user_id,
        credits_amount,
        type,
        reason,
        created_at,
        metadata
      `)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Fetch more to filter

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch adjustments' },
        { status: 500 }
      );
    }

    // Filter for admin adjustments
    const adminAdjustments = (transactions || []).filter(tx => {
      const metadata = tx.metadata as Record<string, unknown> | null;
      return metadata?.admin_id || metadata?.adjustment_type === 'admin_manual';
    }).slice(0, limit);

    if (adminAdjustments.length === 0) {
      return NextResponse.json({
        adjustments: [],
      });
    }

    // Get user IDs and admin IDs
    const userIds = [...new Set(adminAdjustments.map(tx => tx.user_id))];
    const adminIds = [...new Set(
      adminAdjustments.map(tx => {
        const metadata = tx.metadata as Record<string, unknown> | null;
        return metadata?.admin_id as string | undefined;
      }).filter(Boolean)
    )];

    // Get user emails
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userEmailMap = new Map(
      authUsers?.users.map(u => [u.id, u.email || 'Unknown']) || []
    );

    // Get user profiles for names
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profileMap = new Map(
      (userProfiles || []).map(p => [p.id, p])
    );

    // Get admin profiles for names
    const { data: adminProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', adminIds);

    const adminProfileMap = new Map(
      (adminProfiles || []).map(p => [p.id, p])
    );

    // Enrich adjustments with user and admin info
    const enrichedAdjustments = adminAdjustments.map(tx => {
      const metadata = tx.metadata as Record<string, unknown> | null;
      const adminId = metadata?.admin_id as string | undefined;
      const reason = metadata?.reason as string | undefined || tx.reason || 'N/A';
      
      const userEmail = userEmailMap.get(tx.user_id) || 'Unknown';
      const userProfile = profileMap.get(tx.user_id);
      const adminEmail = adminId ? (userEmailMap.get(adminId) || 'Unknown') : 'Unknown';
      const adminProfile = adminId ? adminProfileMap.get(adminId) : null;

      return {
        id: tx.id,
        userEmail,
        userName: userProfile?.full_name || null,
        amount: tx.type === 'add' ? (tx.credits_amount || 0) : -(tx.credits_amount || 0),
        reason: reason.replace(/^Admin adjustment: /, ''),
        createdAt: tx.created_at,
        adminName: adminProfile?.full_name || adminEmail,
        adminEmail,
      };
    });

    return NextResponse.json({
      adjustments: enrichedAdjustments,
    });
  } catch (error) {
    console.error('Admin adjustments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





















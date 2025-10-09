import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { grantCredits } from '@/lib/credits';
import { auditCreditOperation } from '@/lib/audit';

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

    // Get system-wide credit statistics
    const { data: totalCredits, error: creditsError } = await supabaseAdmin
      .from('credit_balances')
      .select('balance')
      .not('balance', 'is', null);

    if (creditsError) {
      console.error('Error fetching credit statistics:', creditsError);
      return NextResponse.json({ error: 'Failed to fetch credit statistics' }, { status: 500 });
    }

    const totalBalance = totalCredits?.reduce((sum, cb) => sum + parseFloat(cb.balance), 0) || 0;
    const userCount = totalCredits?.length || 0;

    // Get recent credit transactions
    const { data: recentTransactions, error: transactionsError } = await supabaseAdmin
      .from('credit_transactions')
      .select(`
        id,
        delta,
        transaction_type,
        reason,
        created_at,
        users(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (transactionsError) {
      console.error('Error fetching recent transactions:', transactionsError);
    }

    return NextResponse.json({
      summary: {
        totalBalance,
        userCount,
        averageBalance: userCount > 0 ? totalBalance / userCount : 0
      },
      recentTransactions: recentTransactions || []
    });
  } catch (error) {
    console.error('Error in credits GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess(req);
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { user_id, amount, reason } = body;

    // Validate required fields
    if (!user_id || amount === undefined || !reason) {
      return NextResponse.json({ 
        error: 'Missing required fields: user_id, amount, reason' 
      }, { status: 400 });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ 
        error: 'Amount must be a non-zero number' 
      }, { status: 400 });
    }

    // Use existing grantCredits function for consistency
    const transaction = await grantCredits(
      user_id,
      amount,
      `Admin adjustment: ${reason}`,
      `admin_adjustment_${user_id}_${Date.now()}`
    );

    // Log audit trail
    await auditCreditOperation('ADJUST', user_id, amount, reason, req);

    return NextResponse.json({ 
      message: 'Credit adjustment successful',
      transaction 
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in credits POST:', error);
    
    if (error instanceof Error && error.message.includes('User not found')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
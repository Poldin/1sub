import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const { id } = await params;

    // Get user details with credit balance
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at,
        credit_balances!inner(balance, created_at, updated_at)
      `)
      .eq('id', id)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }

    // Get user's credit transactions
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
    }

    // Get user's usage logs
    const { data: usageLogs, error: usageError } = await supabaseAdmin
      .from('usage_logs')
      .select(`
        id,
        credits_consumed,
        status,
        created_at,
        metadata,
        tools(name)
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (usageError) {
      console.error('Error fetching usage logs:', usageError);
    }

    return NextResponse.json({
      user: {
        ...user,
        balance: user.credit_balances?.[0]?.balance || 0
      },
      transactions: transactions || [],
      usageLogs: usageLogs || []
    });
  } catch (error) {
    console.error('Error in user GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const { id } = await params;

    const body = await req.json();
    const { full_name, role } = body;

    // Build update object
    const updateData: {
      full_name?: string;
      role?: string;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Error in user PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const minBalance = searchParams.get('min_balance');
    const maxBalance = searchParams.get('max_balance');

    // Build query with joins
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at,
        credit_balances!inner(balance)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (minBalance) {
      query = query.gte('credit_balances.balance', parseFloat(minBalance));
    }

    if (maxBalance) {
      query = query.lte('credit_balances.balance', parseFloat(maxBalance));
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Transform data to flatten credit balance
    const users = (data || []).map(user => ({
      ...user,
      balance: user.credit_balances?.[0]?.balance || 0
    }));

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in users GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
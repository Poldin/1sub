/**
 * API Endpoint: GET /api/vendor/payouts/history
 * 
 * Gets the vendor's payout history with pagination.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // Optional filter by status

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('vendor_payouts')
      .select('*', { count: 'exact' })
      .eq('vendor_id', user.id);

    // Add status filter if provided
    if (status && ['pending', 'scheduled', 'processing', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status);
    }

    // Execute query with pagination
    const { data: payouts, error: payoutsError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (payoutsError) {
      console.error('Failed to get payout history:', payoutsError);
      return NextResponse.json(
        { error: 'Failed to get payout history' },
        { status: 500 }
      );
    }

    // Calculate totals
    const totalCompleted = payouts?.filter(p => p.status === 'completed').length || 0;
    const totalAmount = payouts
      ?.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.euro_amount || 0), 0) || 0;

    return NextResponse.json({
      payouts: payouts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary: {
        totalCompleted,
        totalAmount,
      },
    });

  } catch (error) {
    console.error('Error in /api/vendor/payouts/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate limit and offset
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('credit_transactions')
      .select(`
        id,
        delta,
        balance_after,
        transaction_type,
        reason,
        idempotency_key,
        created_at,
        metadata
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching credit transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credit transactions' },
        { status: 500 }
      );
    }

    // Transform the data to match our API contract
    const transactions = data?.map(transaction => ({
      id: transaction.id,
      delta: Number(transaction.delta),
      balanceAfter: Number(transaction.balance_after),
      transactionType: transaction.transaction_type,
      reason: transaction.reason,
      idempotencyKey: transaction.idempotency_key,
      createdAt: transaction.created_at,
      metadata: transaction.metadata || {}
    })) || [];

    return NextResponse.json({
      transactions,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit
      }
    });
  } catch (error) {
    console.error('Error in credit transactions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

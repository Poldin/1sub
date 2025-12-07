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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch credit transactions for the user
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select(`
        id,
        credits_amount,
        type,
        reason,
        created_at,
        metadata,
        tool_id,
        checkout_id
      `)
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (transactionsError) {
      console.error('Error fetching credit transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected interface
    const transformedTransactions = transactions?.map(transaction => {
      // Map database types to frontend types
      let frontendType: 'grant' | 'consume';
      let displayAmount: number;
      
      if (transaction.type === 'add') {
        frontendType = 'grant';
        displayAmount = Math.abs(transaction.credits_amount || 0);
      } else {
        frontendType = 'consume';
        displayAmount = -(Math.abs(transaction.credits_amount || 0)); // Make negative for display
      }

      return {
        id: transaction.id,
        type: frontendType,
        amount: displayAmount,
        reason: transaction.reason || 'Unknown',
        date: transaction.created_at || new Date().toISOString(),
        metadata: transaction.metadata || {},
        toolId: transaction.tool_id,
        checkoutId: transaction.checkout_id
      };
    }) || [];

    return NextResponse.json({
      transactions: transformedTransactions,
      total: transformedTransactions.length,
      hasMore: transformedTransactions.length === limit
    });

  } catch (error) {
    console.error('Get user transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

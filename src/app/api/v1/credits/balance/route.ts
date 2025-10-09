import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('credit_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no rows found, treat as zero balance instead of 500
      if ((error as any)?.code === 'PGRST116') {
        return NextResponse.json({ balance: 0 });
      }
      console.error('Error fetching credit balance:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credit balance' },
        { status: 500 }
      );
    }

    return NextResponse.json({ balance: data?.balance || 0 });
  } catch (error) {
    console.error('Error in credits balance API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

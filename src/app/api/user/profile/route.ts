import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, role, is_vendor')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Calculate remaining credits from credit_transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('credits_amount, type')
      .eq('user_id', authUser.id);

    if (transactionsError) {
      console.error('Error fetching credit transactions:', transactionsError);
      // Continue without credits if there's an error
    }

    // Calculate total credits
    let totalCredits = 0;
    if (transactions && transactions.length > 0) {
      totalCredits = transactions.reduce((sum, transaction) => {
        const amount = transaction.credits_amount || 0;
        if (transaction.type === 'add') {
          return sum + amount;
        } else if (transaction.type === 'subtract') {
          return sum - amount;
        }
        return sum;
      }, 0);
    }

    return NextResponse.json({
      id: authUser.id,
      email: authUser.email,
      fullName: profile.full_name,
      role: profile.role,
      isVendor: profile.is_vendor,
      credits: totalCredits,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculateCreditsFromTransactions } from '@/lib/credits';

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

    // Fetch all credit transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('credits_amount, type')
      .eq('user_id', authUser.id);

    if (transactionsError) {
      console.error('Error fetching credit transactions:', transactionsError);
      // Continue without credits if there's an error
    }

    // Calculate total credits using centralized utility
    const totalCredits = calculateCreditsFromTransactions(transactions || []);
    
    // Sensitive user data removed from logs

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


/**
 * API Endpoint: GET /api/vendor/payouts/balance
 * 
 * Gets the vendor's available credit balance and payout information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVendorCreditBalance, getNextPayoutDate, getMinimumPayoutThreshold } from '@/lib/stripe-connect';

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

    // Get vendor's credit balance
    const { balance, error: balanceError } = await getVendorCreditBalance(user.id);

    if (balanceError) {
      console.error('Failed to get credit balance:', balanceError);
      return NextResponse.json(
        { error: balanceError },
        { status: 500 }
      );
    }

    // Get pending/scheduled payouts
    const { data: pendingPayouts, error: payoutsError } = await supabase
      .from('vendor_payouts')
      .select('*')
      .eq('vendor_id', user.id)
      .in('status', ['pending', 'scheduled', 'processing'])
      .order('created_at', { ascending: false });

    if (payoutsError) {
      console.error('Failed to get pending payouts:', payoutsError);
    }

    const totalPending = pendingPayouts?.reduce((sum, payout) => sum + (payout.credits_amount || 0), 0) || 0;

    // Get next payout date
    const nextPayoutDate = getNextPayoutDate();
    const minimumThreshold = getMinimumPayoutThreshold();

    // Check if eligible for next payout
    const eligibleForPayout = balance >= minimumThreshold;

    return NextResponse.json({
      availableBalance: balance,
      pendingPayouts: totalPending,
      nextPayoutDate: nextPayoutDate.toISOString(),
      minimumThreshold: minimumThreshold,
      eligibleForPayout: eligibleForPayout,
      pendingPayoutDetails: pendingPayouts || [],
      conversionRate: 1, // 1 credit = 1 EUR
      currency: 'EUR',
    });

  } catch (error) {
    console.error('Error in /api/vendor/payouts/balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


/**
 * API Endpoint: GET /api/vendor/payouts/connect/status
 * 
 * Gets the Stripe Connect account status for a vendor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccountDetails, updateAccountStatus } from '@/domains/payments';

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

    // Get vendor's Stripe account from database
    const { data: vendorAccount, error: accountError } = await supabase
      .from('vendor_stripe_accounts')
      .select('*')
      .eq('vendor_id', user.id)
      .single();

    if (accountError || !vendorAccount) {
      return NextResponse.json({
        connected: false,
        accountStatus: null,
        onboardingCompleted: false,
      });
    }

    // Get latest status from Stripe
    const { account, error: stripeError } = await getAccountDetails(vendorAccount.stripe_account_id);

    if (stripeError || !account) {
      console.error('Failed to get Stripe account details:', stripeError);
      return NextResponse.json({
        connected: true,
        accountStatus: vendorAccount.account_status,
        onboardingCompleted: vendorAccount.onboarding_completed,
        accountId: vendorAccount.stripe_account_id,
      });
    }

    // Determine account status
    const isActive = account.charges_enabled && account.payouts_enabled;
    const isRestricted = !account.charges_enabled || !account.payouts_enabled;
    const onboardingComplete = account.details_submitted || false;

    let accountStatus: 'active' | 'pending' | 'restricted' | 'disabled' = 'pending';
    if (isActive) {
      accountStatus = 'active';
    } else if (isRestricted) {
      accountStatus = 'restricted';
    }

    // Update database if status changed
    if (accountStatus !== vendorAccount.account_status || onboardingComplete !== vendorAccount.onboarding_completed) {
      await updateAccountStatus(vendorAccount.stripe_account_id, accountStatus, onboardingComplete);
    }

    return NextResponse.json({
      connected: true,
      accountStatus: accountStatus,
      onboardingCompleted: onboardingComplete,
      accountId: vendorAccount.stripe_account_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirementsNeeded: account.requirements?.currently_due || [],
    });

  } catch (error) {
    console.error('Error in /api/vendor/payouts/connect/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



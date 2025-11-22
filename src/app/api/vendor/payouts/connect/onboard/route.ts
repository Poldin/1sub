/**
 * API Endpoint: POST /api/vendor/payouts/connect/onboard
 * 
 * Initiates Stripe Connect onboarding for a vendor.
 * Creates a Stripe Connect account and returns an onboarding URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConnectAccount, createAccountLink } from '@/lib/stripe-connect';

export async function POST(request: NextRequest) {
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

    // Get user profile (optional - use auth user data if profile doesn't exist)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, email, full_name')
      .eq('id', user.id)
      .single();

    // Use profile email if available, otherwise use auth user email
    const userEmail = profile?.email || user.email || '';
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Verify user is a vendor (has published tools)
    const { data: tools } = await supabase
      .from('tools')
      .select('id')
      .eq('user_profile_id', user.id)
      .limit(1);

    if (!tools || tools.length === 0) {
      return NextResponse.json(
        { error: 'You must publish a tool before setting up payouts' },
        { status: 403 }
      );
    }

    // Create or get Stripe Connect account
    const { accountId, error: accountError } = await createConnectAccount(
      user.id,
      userEmail
    );

    if (accountError || !accountId) {
      console.error('Failed to create Stripe account:', accountError);
      return NextResponse.json(
        { error: accountError || 'Failed to create Stripe account' },
        { status: 500 }
      );
    }

    // Create account link for onboarding
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const returnUrl = `${origin}/vendor-dashboard/payouts?onboarding=success`;
    const refreshUrl = `${origin}/vendor-dashboard/payouts?onboarding=refresh`;

    const { url, error: linkError } = await createAccountLink(accountId, returnUrl, refreshUrl);

    if (linkError || !url) {
      console.error('Failed to create account link:', linkError);
      return NextResponse.json(
        { error: linkError || 'Failed to create onboarding link' },
        { status: 500 }
      );
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'stripe_connect_onboarding_initiated',
        resource_type: 'vendor_stripe_accounts',
        metadata: {
          stripe_account_id: accountId,
        },
      });

    return NextResponse.json({
      success: true,
      onboardingUrl: url,
      accountId: accountId,
    });

  } catch (error) {
    console.error('Error in /api/vendor/payouts/connect/onboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


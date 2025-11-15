/**
 * Check Subscription Activation API
 * 
 * Checks if a platform subscription has been activated after Stripe checkout.
 * Used by the success page to poll for webhook processing completion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlanById } from '@/lib/subscription-plans';

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

    // Get session_id from query params
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if subscription exists for this user
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('stripe_session_id', sessionId)
      .single();

    if (subError || !subscription) {
      // Subscription not yet created by webhook
      return NextResponse.json({
        activated: false,
        message: 'Subscription is being processed',
      });
    }

    // Get plan details
    const plan = getPlanById(subscription.plan_id);

    return NextResponse.json({
      activated: true,
      planName: plan?.name || subscription.plan_id,
      creditsPerMonth: plan?.creditsPerMonth || 0,
      billingPeriod: subscription.billing_period,
      status: subscription.status,
    });

  } catch (error) {
    console.error('Error checking subscription activation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


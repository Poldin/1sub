/**
 * Stripe Billing Portal API
 * 
 * Creates a Stripe Billing Portal session for users to manage their subscriptions.
 * The portal allows users to:
 * - Update payment method
 * - View invoice history
 * - Cancel subscription
 * - Update billing information
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

// Initialize Stripe with latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover' as any,
});

export async function POST(request: NextRequest) {
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

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', authUser.id)
      .in('status', ['active', 'past_due', 'trialing', 'paused'])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found. You need an active subscription to access the billing portal.' },
        { status: 404 }
      );
    }

    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer ID not found' },
        { status: 400 }
      );
    }

    // Create Stripe Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?portal=true`,
    });

    console.log('[Billing Portal] Session created:', {
      userId: authUser.id,
      customerId: subscription.stripe_customer_id,
      sessionId: portalSession.id,
    });

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        action: 'billing_portal_accessed',
        resource_type: 'platform_subscriptions',
        resource_id: subscription.stripe_subscription_id,
        metadata: {
          session_id: portalSession.id,
          customer_id: subscription.stripe_customer_id,
        },
      });

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });

  } catch (error) {
    console.error('[Billing Portal] Error creating portal session:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


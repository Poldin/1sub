/**
 * Create Platform Subscription API
 * 
 * Creates a Stripe Checkout session for platform subscription.
 * Users subscribe to monthly/yearly plans that provide recurring credits.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getPlanById, getPlanPrice, getStripePriceId } from '@/lib/subscription-plans';

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

    // Parse request body
    const body = await request.json();
    const { planId, billingPeriod } = body as { 
      planId: string; 
      billingPeriod: 'monthly' | 'yearly';
    };

    // Validate inputs
    if (!planId || !billingPeriod) {
      return NextResponse.json(
        { error: 'Plan ID and billing period are required' },
        { status: 400 }
      );
    }

    if (billingPeriod !== 'monthly' && billingPeriod !== 'yearly') {
      return NextResponse.json(
        { error: 'Billing period must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    const price = getPlanPrice(planId, billingPeriod);
    if (!price) {
      return NextResponse.json(
        { error: 'Invalid pricing for selected plan' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('platform_subscriptions')
      .select('id, plan_id, status, stripe_subscription_id')
      .eq('user_id', authUser.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (existingSubscription) {
      // User already has an active subscription
      // For now, we'll return an error. In the future, we can handle upgrades/downgrades
      return NextResponse.json(
        { 
          error: 'You already have an active subscription. Please cancel it before subscribing to a new plan.',
          currentPlanId: existingSubscription.plan_id,
        },
        { status: 400 }
      );
    }

    // Get user profile for customer info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', authUser.id)
      .single();

    // Get Stripe Price ID from environment variables
    const stripePriceId = getStripePriceId(planId, billingPeriod);
    
    if (!stripePriceId) {
      console.error('[Platform Subscription] Missing Stripe Price ID:', {
        planId,
        billingPeriod,
        envVarNeeded: billingPeriod === 'monthly' 
          ? `NEXT_PUBLIC_STRIPE_${planId.toUpperCase()}_MONTHLY_PRICE_ID`
          : `NEXT_PUBLIC_STRIPE_${planId.toUpperCase()}_YEARLY_PRICE_ID`
      });
      return NextResponse.json(
        { 
          error: 'Stripe configuration error. Please contact support.',
          details: 'Missing Stripe Price ID configuration'
        },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session for subscription using pre-configured Price ID
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      customer_email: profile?.email || authUser.email,
      client_reference_id: authUser.id,
      metadata: {
        userId: authUser.id,
        userEmail: authUser.email || '',
        planId,
        billingPeriod,
        creditsPerMonth: plan.creditsPerMonth.toString(),
        maxOverdraft: plan.maxOverdraft?.toString() || '0',
      },
      subscription_data: {
        metadata: {
          userId: authUser.id,
          planId,
          billingPeriod,
          creditsPerMonth: plan.creditsPerMonth.toString(),
          maxOverdraft: plan.maxOverdraft?.toString() || '0',
        },
      },
    });

    console.log('[Platform Subscription] Checkout session created:', {
      sessionId: session.id,
      userId: authUser.id,
      planId,
      billingPeriod,
      price,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });

  } catch (error) {
    console.error('Error creating platform subscription:', error);
    
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


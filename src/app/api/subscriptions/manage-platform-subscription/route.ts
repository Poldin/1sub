/**
 * Manage Platform Subscription API
 * 
 * Allows users to manage their platform subscriptions (cancel, update, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface PlatformSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
  metadata: Record<string, unknown> | null;
  cancelled_at?: string | null;
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
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
    const { action, subscriptionId } = body as { 
      action: 'cancel' | 'update'; 
      subscriptionId: string;
    };

    if (!action || !subscriptionId) {
      return NextResponse.json(
        { error: 'Action and subscription ID are required' },
        { status: 400 }
      );
    }

    // Get subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (subscription.user_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to manage this subscription' },
        { status: 403 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'cancel':
        return await handleCancelSubscription(subscription, supabase);
      
      case 'update':
        return NextResponse.json(
          { error: 'Update action not yet implemented' },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error managing platform subscription:', error);
    
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

async function handleCancelSubscription(subscription: PlatformSubscription, supabase: SupabaseClient) {
  try {
    const stripeSubscriptionId = subscription.stripe_subscription_id;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No Stripe subscription ID found' },
        { status: 400 }
      );
    }

    // Cancel subscription in Stripe (at period end)
    const stripeSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    console.log('[Platform Subscription] Subscription cancelled in Stripe:', {
      subscriptionId: subscription.id,
      stripeSubscriptionId,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    });

    // Update database
    const { error: updateError } = await supabase
      .from('platform_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        metadata: {
          ...subscription.metadata,
          cancelled_by_user: true,
          cancel_at_period_end: true,
          cancellation_date: new Date().toISOString(),
        },
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('[Platform Subscription] Failed to update database:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription status' },
        { status: 500 }
      );
    }

    // Log to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: subscription.user_id,
        action: 'platform_subscription_cancelled',
        resource_type: 'platform_subscriptions',
        resource_id: subscription.id,
        metadata: {
          plan_id: subscription.plan_id,
          stripe_subscription_id: stripeSubscriptionId,
          cancelled_by: 'user',
          cancel_at_period_end: true,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully. You will retain access until the end of your billing period.',
      subscription: {
        id: subscription.id,
        status: 'cancelled',
        cancelAtPeriodEnd: true,
        periodEnd: subscription.current_period_end,
      },
    });

  } catch (error) {
    console.error('[Platform Subscription] Error cancelling subscription:', error);
    throw error;
  }
}


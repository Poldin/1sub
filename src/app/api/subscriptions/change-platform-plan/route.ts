/**
 * Change Platform Subscription Plan API
 * 
 * Handles platform subscription upgrades and downgrades.
 * - Upgrades: Applied immediately with Stripe subscription update (no proration, price changes next cycle)
 * - Downgrades: Scheduled to apply at the end of current billing period
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getPlanById, PLATFORM_PLANS } from '@/lib/subscription-plans';

// Initialize Stripe
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
    const { targetPlanId, billingPeriod } = body as {
      targetPlanId: string;
      billingPeriod: 'monthly' | 'yearly';
    };

    // Validate inputs
    if (!targetPlanId || !billingPeriod) {
      return NextResponse.json(
        { error: 'Target plan ID and billing period are required' },
        { status: 400 }
      );
    }

    if (billingPeriod !== 'monthly' && billingPeriod !== 'yearly') {
      return NextResponse.json(
        { error: 'Billing period must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Validate target plan exists
    const targetPlan = getPlanById(targetPlanId);
    if (!targetPlan) {
      return NextResponse.json(
        { error: 'Invalid target plan ID' },
        { status: 400 }
      );
    }

    // Load current active subscription
    const { data: currentSubscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', authUser.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !currentSubscription) {
      return NextResponse.json(
        { 
          error: 'No active subscription found. Please subscribe first via /pricing.',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        },
        { status: 400 }
      );
    }

    // Get current plan details
    const currentPlan = getPlanById(currentSubscription.plan_id);
    if (!currentPlan) {
      return NextResponse.json(
        { error: 'Current plan configuration not found' },
        { status: 500 }
      );
    }

    // Check if it's the same plan and billing period
    if (
      currentSubscription.plan_id === targetPlanId &&
      currentSubscription.billing_period === billingPeriod
    ) {
      return NextResponse.json({
        success: true,
        message: 'You are already on this plan',
        changeType: 'none',
        currentPlanId: currentPlan.id,
      });
    }

    // Determine change type based on credits per month
    // Also consider interval changes as upgrades if going to yearly with same plan
    let changeType: 'upgrade' | 'downgrade' | 'interval_change';
    
    if (currentSubscription.plan_id === targetPlanId) {
      // Same plan, different interval
      changeType = 'interval_change';
    } else if (targetPlan.creditsPerMonth > currentPlan.creditsPerMonth) {
      changeType = 'upgrade';
    } else {
      changeType = 'downgrade';
    }

    const stripeSubscriptionId = currentSubscription.stripe_subscription_id;
    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'Stripe subscription ID not found' },
        { status: 500 }
      );
    }

    // Get Stripe subscription to access price IDs and billing details
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    // Calculate new price based on billing period
    const newPrice = billingPeriod === 'monthly' ? targetPlan.price : targetPlan.yearlyPrice;

    console.log('[Change Plan] Plan change requested:', {
      userId: authUser.id,
      changeType,
      from: {
        planId: currentPlan.id,
        billingPeriod: currentSubscription.billing_period,
        creditsPerMonth: currentPlan.creditsPerMonth,
      },
      to: {
        planId: targetPlan.id,
        billingPeriod,
        creditsPerMonth: targetPlan.creditsPerMonth,
      },
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    });

    // Handle based on change type
    if (changeType === 'upgrade' || changeType === 'interval_change') {
      // UPGRADE or INTERVAL CHANGE: Apply immediately in Stripe and DB
      // Update Stripe subscription with new price (no proration)
      
      // Create new price data for the subscription
      const stripePriceData: Stripe.PriceCreateParams = {
        currency: 'eur',
        product_data: {
          name: `1sub ${targetPlan.name} Plan`,
        },
        unit_amount: Math.round(newPrice * 100), // Convert to cents
        recurring: {
          interval: billingPeriod === 'monthly' ? 'month' : 'year',
          interval_count: 1,
        },
      };

      // Create the new price
      const newStripePrice = await stripe.prices.create(stripePriceData);

      // Update subscription to use new price
      // Set proration_behavior to 'none' so billing amount changes at next renewal
      await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newStripePrice.id,
          },
        ],
        proration_behavior: 'none', // No proration - price changes at next renewal
        metadata: {
          ...stripeSubscription.metadata,
          planId: targetPlanId,
          billingPeriod,
          creditsPerMonth: targetPlan.creditsPerMonth.toString(),
          maxOverdraft: targetPlan.maxOverdraft?.toString() || '0',
        },
      });

      // Update database immediately
      const { error: updateError } = await supabase
        .from('platform_subscriptions')
        .update({
          previous_plan_id: currentSubscription.plan_id,
          plan_id: targetPlanId,
          billing_period: billingPeriod,
          credits_per_period: targetPlan.creditsPerMonth,
          max_overdraft: targetPlan.maxOverdraft || 0,
          plan_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSubscription.id);

      if (updateError) {
        console.error('[Change Plan] Database update failed:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription in database' },
          { status: 500 }
        );
      }

      console.log('[Change Plan] Upgrade/interval change applied immediately:', {
        userId: authUser.id,
        subscriptionId: currentSubscription.id,
        newPlanId: targetPlanId,
        newBillingPeriod: billingPeriod,
      });

      return NextResponse.json({
        success: true,
        changeType: changeType === 'upgrade' ? 'upgrade' : 'interval_change',
        message: `Your plan has been ${changeType === 'upgrade' ? 'upgraded' : 'changed'} to ${targetPlan.name} (${billingPeriod}). The new price will apply from your next billing cycle.`,
        newPlanId: targetPlanId,
        newPlanName: targetPlan.name,
        newCreditsPerMonth: targetPlan.creditsPerMonth,
        effectiveDate: 'immediate',
        newPriceEffectiveDate: currentPeriodEnd.toISOString(),
      });

    } else {
      // DOWNGRADE: Schedule for end of billing period
      const pendingChange = {
        target_plan_id: targetPlanId,
        target_billing_period: billingPeriod,
        change_type: 'downgrade',
        requested_at: new Date().toISOString(),
        effective_at: currentPeriodEnd.toISOString(),
        target_credits_per_month: targetPlan.creditsPerMonth,
        target_max_overdraft: targetPlan.maxOverdraft || 0,
      };

      // Store pending change in database
      const { error: updateError } = await supabase
        .from('platform_subscriptions')
        .update({
          pending_plan_change: pendingChange,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSubscription.id);

      if (updateError) {
        console.error('[Change Plan] Failed to store pending downgrade:', updateError);
        return NextResponse.json(
          { error: 'Failed to schedule plan downgrade' },
          { status: 500 }
        );
      }

      console.log('[Change Plan] Downgrade scheduled for end of period:', {
        userId: authUser.id,
        subscriptionId: currentSubscription.id,
        targetPlanId,
        effectiveAt: currentPeriodEnd.toISOString(),
      });

      return NextResponse.json({
        success: true,
        changeType: 'downgrade',
        message: `Your plan will be downgraded to ${targetPlan.name} (${billingPeriod}) at the end of your current billing period. You'll continue to enjoy your current ${currentPlan.name} benefits until then.`,
        newPlanId: targetPlanId,
        newPlanName: targetPlan.name,
        newCreditsPerMonth: targetPlan.creditsPerMonth,
        effectiveDate: currentPeriodEnd.toISOString(),
        currentPlanEndsAt: currentPeriodEnd.toISOString(),
      });
    }

  } catch (error) {
    console.error('[Change Plan] Error processing plan change:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while changing plan' },
      { status: 500 }
    );
  }
}

// Optional: DELETE endpoint to cancel a pending downgrade
export async function DELETE(request: NextRequest) {
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

    // Load current subscription
    const { data: currentSubscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', authUser.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !currentSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    if (!currentSubscription.pending_plan_change) {
      return NextResponse.json(
        { error: 'No pending plan change to cancel' },
        { status: 400 }
      );
    }

    // Clear pending plan change
    const { error: updateError } = await supabase
      .from('platform_subscriptions')
      .update({
        pending_plan_change: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSubscription.id);

    if (updateError) {
      console.error('[Change Plan] Failed to cancel pending change:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel pending plan change' },
        { status: 500 }
      );
    }

    console.log('[Change Plan] Pending downgrade cancelled:', {
      userId: authUser.id,
      subscriptionId: currentSubscription.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Pending plan change has been cancelled',
    });

  } catch (error) {
    console.error('[Change Plan] Error cancelling pending change:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}














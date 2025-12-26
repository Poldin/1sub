/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for both one-time credit purchases and platform subscriptions.
 * Verifies webhook signatures for security and processes successful payments.
 * 
 * Events handled:
 * - checkout.session.completed: Process one-time purchases or create subscriptions
 * - invoice.paid: Add recurring credits for active subscriptions
 * - customer.subscription.deleted: Cancel platform subscriptions
 * - payment_intent.succeeded: Log successful payment
 * 
 * Features:
 * - Webhook signature verification
 * - Idempotency to prevent duplicate credit additions
 * - Comprehensive error logging
 * - Always returns 200 to acknowledge receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addCredits } from '@/domains/credits';
import { createServiceClient } from '@/infrastructure/database/client';

// Extended Invoice type to include expandable properties
interface InvoiceWithSubscription extends Omit<Stripe.Invoice, 'subscription' | 'payment_intent'> {
  subscription?: string | Stripe.Subscription | null;
  payment_intent?: string | Stripe.PaymentIntent | null;
}

// Validate Stripe configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not configured');
}

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey);

// Get Supabase service client for webhook
function getSupabaseClient() {
  return createServiceClient();
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    console.log('[Stripe Webhook] Event received:', {
      type: event.type,
      id: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as InvoiceWithSubscription;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionExpired(session);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as InvoiceWithSubscription;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_action_required': {
        const invoice = event.data.object as InvoiceWithSubscription;
        await handleInvoicePaymentActionRequired(invoice);
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionPaused(subscription);
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionResumed(subscription);
        break;
      }

      case 'customer.subscription.pending_update_applied': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionPendingUpdateApplied(subscription);
        break;
      }

      case 'customer.subscription.pending_update_expired': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionPendingUpdateExpired(subscription);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerUpdated(customer);
        break;
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(customer);
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    // Still return 200 to prevent Stripe from retrying
    // Log error for manual review
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('[Stripe Webhook] Processing checkout session:', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      mode: session.mode,
      metadata: session.metadata,
    });

    // Only process if payment was successful
    if (session.payment_status !== 'paid') {
      console.log('[Stripe Webhook] Payment not completed, skipping');
      return;
    }

    const metadata = session.metadata;
    if (!metadata) {
      console.error('[Stripe Webhook] No metadata in session');
      return;
    }

    // Check if this is a subscription or one-time payment
    if (session.mode === 'subscription') {
      await handleSubscriptionCheckout(session);
      return;
    }

    // Handle one-time credit purchase
    const { userId, creditAmount, idempotencyKey, packageKey } = metadata;

    if (!userId || !creditAmount || !idempotencyKey) {
      console.error('[Stripe Webhook] Missing required metadata:', { userId, creditAmount, idempotencyKey });
      return;
    }

    const credits = parseInt(creditAmount, 10);
    if (isNaN(credits) || credits <= 0) {
      console.error('[Stripe Webhook] Invalid credit amount:', creditAmount);
      return;
    }

    const supabase = getSupabaseClient();

    // Verify user profile exists (email is NOT a field in user_profiles, it's only in auth.users)
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Stripe Webhook] User profile not found:', userId, userError);
      return;
    }

    // Add credits using unified credit service with idempotency
    // Note: We need to use a server-side approach since addCredits expects cookies
    // For webhooks, we'll directly insert into credit_transactions with idempotency check
    
    // Check for existing transaction with same idempotency key
    const { data: existingTransaction } = await supabase
      .from('credit_transactions')
      .select('id, credits_amount')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingTransaction) {
      console.log('[Stripe Webhook] Transaction already processed (idempotent):', {
        transactionId: existingTransaction.id,
        userId,
        credits,
      });
      return;
    }

    // Get current balance from user_balances table
    const { data: balanceRecord } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const currentBalance = balanceRecord?.balance ?? 0;
    const newBalance = currentBalance + credits;

    // Insert credit transaction (trigger will update user_balances automatically)
    const { data: transaction, error: insertError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credits_amount: credits,
        type: 'add',
        reason: `Stripe credit purchase: ${packageKey || 'N/A'}`,
        idempotency_key: idempotencyKey,
        stripe_transaction_id: session.id,
        metadata: {
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          package_key: packageKey,
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          customer_email: session.customer_email,
          timestamp: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[Stripe Webhook] Failed to insert credit transaction:', insertError);
      throw insertError;
    }

    console.log('[Stripe Webhook] Credits added successfully:', {
      transactionId: transaction.id,
      userId,
      userEmail: session.customer_email,
      credits,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      stripeSessionId: session.id,
    });

    // Log to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'credits_add_stripe',
        resource_type: 'credit_transactions',
        resource_id: transaction.id,
        metadata: {
          credits,
          balance_before: currentBalance,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
        }
      });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling checkout session completed:', error);
    throw error;
  }
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  try {
    console.log('[Stripe Webhook] Processing subscription checkout:', {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
      metadata: session.metadata,
    });

    const metadata = session.metadata;
    if (!metadata) {
      console.error('[Stripe Webhook] No metadata in subscription session');
      return;
    }

    const { userId, planId, billingPeriod, creditsPerMonth, maxOverdraft } = metadata;

    if (!userId || !planId || !billingPeriod || !creditsPerMonth) {
      console.error('[Stripe Webhook] Missing required subscription metadata:', {
        userId,
        planId,
        billingPeriod,
        creditsPerMonth,
        maxOverdraft,
        fullMetadata: metadata,
      });
      return;
    }

    const supabase = getSupabaseClient();

    // Verify user profile exists (email is NOT a field in user_profiles, it's only in auth.users)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[Stripe Webhook] User profile not found:', userId, profileError);
      return;
    }

    // Get subscription ID from Stripe
    const stripeSubscriptionId = session.subscription as string;
    if (!stripeSubscriptionId) {
      console.error('[Stripe Webhook] No subscription ID in session');
      return;
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from('platform_subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (existingSub) {
      console.log('[Stripe Webhook] Subscription already exists:', stripeSubscriptionId);
      return;
    }

    // Calculate next billing date
    const now = new Date();
    const nextBillingDate = new Date(now);
    if (billingPeriod === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Create platform subscription
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        billing_period: billingPeriod,
        credits_per_period: parseInt(creditsPerMonth, 10),
        max_overdraft: parseInt(maxOverdraft || '0', 10),
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: session.customer as string,
        stripe_session_id: session.id,
        current_period_start: now.toISOString(),
        current_period_end: nextBillingDate.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        metadata: {
          initial_session_id: session.id,
          created_via: 'stripe_checkout',
          timestamp: now.toISOString(),
        },
      })
      .select('id')
      .single();

    if (subError) {
      console.error('[Stripe Webhook] Failed to create platform subscription:', subError);
      throw subError;
    }

    console.log('[Stripe Webhook] Platform subscription created:', {
      subscriptionId: subscription.id,
      userId,
      planId,
      stripeSubscriptionId,
    });

    // Log platform transaction
    const transactionId = await logPlatformTransaction({
      stripeId: session.id,
      stripeCustomerId: session.customer as string,
      userId,
      amount: session.amount_total || 0,
      currency: session.currency || 'eur',
      type: 'subscription',
      status: 'succeeded',
      creditsAmount: parseInt(creditsPerMonth, 10),
      subscriptionId: subscription.id,
      description: `Platform subscription: ${planId} (${billingPeriod})`,
      metadata: {
        stripe_session_id: session.id,
        stripe_subscription_id: stripeSubscriptionId,
        plan_id: planId,
        billing_period: billingPeriod,
        initial_purchase: true,
      },
    });

    console.log('[Stripe Webhook] Platform transaction created:', {
      transactionId,
      subscriptionId: subscription.id,
      amount: session.amount_total,
      currency: session.currency,
    });

    // Add initial credits to user account
    const credits = parseInt(creditsPerMonth, 10);
    const idempotencyKey = `platform-sub-initial-${stripeSubscriptionId}`;

    await addCreditsToUser(userId, credits, `Platform subscription activation: ${planId}`, idempotencyKey, {
      subscription_id: subscription.id,
      stripe_subscription_id: stripeSubscriptionId,
      plan_id: planId,
      initial_activation: true,
    });

    // Log to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'platform_subscription_created',
        resource_type: 'platform_subscriptions',
        resource_id: subscription.id,
        metadata: {
          plan_id: planId,
          billing_period: billingPeriod,
          credits_per_period: credits,
          stripe_subscription_id: stripeSubscriptionId,
        },
      });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription checkout:', error);
    throw error;
  }
}

async function handleInvoicePaid(invoice: InvoiceWithSubscription) {
  try {
    // Only process recurring invoices (not the first one, which is handled by checkout.session.completed)
    if (!invoice.subscription || invoice.billing_reason === 'subscription_create') {
      console.log('[Stripe Webhook] Skipping initial invoice');
      return;
    }

    // subscription can be string (ID) or Subscription object
    const stripeSubscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription.id;
    const supabase = getSupabaseClient();

    // Get platform subscription
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('[Stripe Webhook] Subscription not found:', stripeSubscriptionId);
      return;
    }

    // Check if there's a pending plan change to apply
    const pendingChange = subscription.pending_plan_change as {
      target_plan_id: string;
      target_billing_period: string;
      change_type: string;
      requested_at: string;
      effective_at: string;
      target_credits_per_month: number;
      target_max_overdraft: number;
    } | null;

    let creditsToAdd = subscription.credits_per_period;
    let planIdForCredits = subscription.plan_id;
    let updatedFields: Record<string, unknown> = {
      current_period_start: new Date(invoice.period_start * 1000).toISOString(),
      current_period_end: new Date(invoice.period_end * 1000).toISOString(),
      last_billing_date: new Date().toISOString(),
    };

    // Apply pending downgrade if effective date has passed
    if (pendingChange && new Date(pendingChange.effective_at) <= new Date()) {
      console.log('[Stripe Webhook] Applying pending plan change:', {
        userId: subscription.user_id,
        fromPlan: subscription.plan_id,
        toPlan: pendingChange.target_plan_id,
        changeType: pendingChange.change_type,
      });

      // Update the Stripe subscription to new price
      // Create new price for the target plan
      const targetPlanPrice = pendingChange.target_billing_period === 'monthly' 
        ? (await getPlanPrice(pendingChange.target_plan_id, 'monthly'))
        : (await getPlanPrice(pendingChange.target_plan_id, 'yearly'));

      if (targetPlanPrice) {
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as Stripe.Subscription;
          
          const stripePriceData: Stripe.PriceCreateParams = {
            currency: 'eur',
            product_data: {
              name: `1sub ${pendingChange.target_plan_id} Plan`,
            },
            unit_amount: Math.round(targetPlanPrice * 100),
            recurring: {
              interval: pendingChange.target_billing_period === 'monthly' ? 'month' : 'year',
              interval_count: 1,
            },
          };

          const newStripePrice = await stripe.prices.create(stripePriceData);

          await stripe.subscriptions.update(stripeSubscriptionId, {
            items: [
              {
                id: stripeSubscription.items.data[0].id,
                price: newStripePrice.id,
              },
            ],
            proration_behavior: 'none',
            metadata: {
              ...stripeSubscription.metadata,
              planId: pendingChange.target_plan_id,
              billingPeriod: pendingChange.target_billing_period,
              creditsPerMonth: pendingChange.target_credits_per_month.toString(),
              maxOverdraft: pendingChange.target_max_overdraft.toString(),
            },
          });

          console.log('[Stripe Webhook] Stripe subscription updated with new price');
        } catch (stripeError) {
          console.error('[Stripe Webhook] Error updating Stripe subscription:', stripeError);
          // Continue with DB update even if Stripe update fails - can be fixed manually
        }
      }

      // Update database with new plan
      updatedFields = {
        ...updatedFields,
        previous_plan_id: subscription.plan_id,
        plan_id: pendingChange.target_plan_id,
        billing_period: pendingChange.target_billing_period,
        credits_per_period: pendingChange.target_credits_per_month,
        max_overdraft: pendingChange.target_max_overdraft,
        pending_plan_change: null, // Clear pending change
        plan_changed_at: new Date().toISOString(),
      };

      // Use new plan's credits for this billing cycle
      creditsToAdd = pendingChange.target_credits_per_month;
      planIdForCredits = pendingChange.target_plan_id;

      // Log plan change to audit
      await supabase
        .from('audit_logs')
        .insert({
          user_id: subscription.user_id,
          action: 'plan_changed',
          resource_type: 'platform_subscriptions',
          resource_id: subscription.id,
          metadata: {
            old_plan_id: subscription.plan_id,
            new_plan_id: pendingChange.target_plan_id,
            change_type: pendingChange.change_type,
            requested_at: pendingChange.requested_at,
            effective_at: pendingChange.effective_at,
            trigger: 'webhook_renewal',
          },
        });
    }

    // Add credits for this billing period
    const idempotencyKey = `platform-sub-invoice-${invoice.id}`;

    await addCreditsToUser(
      subscription.user_id,
      creditsToAdd,
      `Platform subscription renewal: ${planIdForCredits}`,
      idempotencyKey,
      {
        subscription_id: subscription.id,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_invoice_id: invoice.id,
        plan_id: planIdForCredits,
        billing_period: updatedFields.billing_period || subscription.billing_period,
      }
    );

    // Calculate next billing date
    const periodEnd = new Date(invoice.period_end * 1000);
    const nextBilling = new Date(periodEnd);
    const billingPeriod = (updatedFields.billing_period as string) || subscription.billing_period;
    if (billingPeriod === 'monthly') {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }

    // Update subscription with all fields
    await supabase
      .from('platform_subscriptions')
      .update({
        ...updatedFields,
        next_billing_date: nextBilling.toISOString(),
      })
      .eq('id', subscription.id);

    console.log('[Stripe Webhook] Recurring credits added:', {
      subscriptionId: subscription.id,
      userId: subscription.user_id,
      credits: creditsToAdd,
      planId: planIdForCredits,
      invoiceId: invoice.id,
      pendingChangeApplied: !!pendingChange,
    });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling invoice paid:', error);
    throw error;
  }
}

// Helper function to get plan price (imported from subscription-plans)
async function getPlanPrice(planId: string, billingPeriod: 'monthly' | 'yearly'): Promise<number | undefined> {
  // This is a simplified version - in real code, import from subscription-plans
  const plans: Record<string, { price: number; yearlyPrice: number }> = {
    starter: { price: 50, yearlyPrice: 540 },
    professional: { price: 150, yearlyPrice: 1620 },
    business: { price: 300, yearlyPrice: 3240 },
    enterprise: { price: 1000, yearlyPrice: 10800 },
  };
  
  const plan = plans[planId];
  if (!plan) return undefined;
  
  return billingPeriod === 'monthly' ? plan.price : plan.yearlyPrice;
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const stripeSubscriptionId = subscription.id;
    const supabase = getSupabaseClient();

    // Update platform subscription status
    const { data: platformSub, error } = await supabase
      .from('platform_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .select('id, user_id, plan_id')
      .single();

    if (error || !platformSub) {
      console.error('[Stripe Webhook] Failed to cancel subscription:', error);
      return;
    }

    console.log('[Stripe Webhook] Subscription cancelled:', {
      subscriptionId: platformSub.id,
      userId: platformSub.user_id,
      stripeSubscriptionId,
    });

    // Log to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: platformSub.user_id,
        action: 'platform_subscription_cancelled',
        resource_type: 'platform_subscriptions',
        resource_id: platformSub.id,
        metadata: {
          plan_id: platformSub.plan_id,
          stripe_subscription_id: stripeSubscriptionId,
          cancelled_via: 'stripe_webhook',
        },
      });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription deleted:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const stripeSubscriptionId = subscription.id;
    const supabase = getSupabaseClient();

    // Update subscription status if it changed
    const status = subscription.status === 'active' ? 'active' : 
                   subscription.status === 'past_due' ? 'past_due' :
                   subscription.status === 'canceled' ? 'cancelled' : 'active';

    await supabase
      .from('platform_subscriptions')
      .update({ status })
      .eq('stripe_subscription_id', stripeSubscriptionId);

    console.log('[Stripe Webhook] Subscription updated:', {
      stripeSubscriptionId,
      status: subscription.status,
    });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription updated:', error);
    throw error;
  }
}

// Helper function to add credits with idempotency
async function addCreditsToUser(
  userId: string,
  credits: number,
  reason: string,
  idempotencyKey: string,
  metadata: Record<string, unknown>
) {
  const supabase = getSupabaseClient();

  // Check for existing transaction
  const { data: existingTransaction } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existingTransaction) {
    console.log('[Stripe Webhook] Credits already added (idempotent):', idempotencyKey);
    return;
  }

  // Get current balance from user_balances table
  const { data: balanceRecord } = await supabase
    .from('user_balances')
    .select('balance')
    .eq('user_id', userId)
    .single();

  const currentBalance = balanceRecord?.balance ?? 0;
  const newBalance = currentBalance + credits;

  // Insert credit transaction (trigger will update user_balances automatically)
  const { data: transaction, error: insertError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      credits_amount: credits,
      type: 'add',
      reason,
      idempotency_key: idempotencyKey,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[Stripe Webhook] Failed to add credits:', insertError);
    throw insertError;
  }

  console.log('[Stripe Webhook] Credits added:', {
    transactionId: transaction.id,
    userId,
    credits,
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
  });
}

// Helper function to log platform transaction
async function logPlatformTransaction(params: {
  stripeId: string;
  stripeCustomerId?: string | null;
  userId: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'one_time' | 'refund';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
  creditsAmount?: number;
  subscriptionId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('platform_transactions')
      .insert({
        stripe_id: params.stripeId,
        stripe_customer_id: params.stripeCustomerId,
        user_id: params.userId,
        amount: params.amount,
        currency: params.currency,
        type: params.type,
        status: params.status,
        credits_amount: params.creditsAmount,
        subscription_id: params.subscriptionId,
        description: params.description,
        metadata: params.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Stripe Webhook] Failed to log platform transaction:', error);
      return null;
    }

    console.log('[Stripe Webhook] Platform transaction logged:', {
      transactionId: data.id,
      stripeId: params.stripeId,
      type: params.type,
      status: params.status,
    });

    return data.id;
  } catch (error) {
    console.error('[Stripe Webhook] Error logging platform transaction:', error);
    return null;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('[Stripe Webhook] Payment intent succeeded:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });

    const userId = paymentIntent.metadata?.userId;
    if (!userId) {
      console.log('[Stripe Webhook] No userId in payment intent metadata');
      return;
    }

    // Log transaction
    await logPlatformTransaction({
      stripeId: paymentIntent.id,
      stripeCustomerId: typeof paymentIntent.customer === 'string' ? paymentIntent.customer : null,
      userId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      type: 'one_time',
      status: 'succeeded',
      description: `Payment intent succeeded: ${paymentIntent.id}`,
      metadata: {
        payment_intent_id: paymentIntent.id,
        payment_method: paymentIntent.payment_method,
      },
    });
  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('[Stripe Webhook] Payment intent failed:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      lastPaymentError: paymentIntent.last_payment_error,
    });

    const userId = paymentIntent.metadata?.userId;
    if (!userId) {
      console.log('[Stripe Webhook] No userId in payment intent metadata');
      return;
    }

    // Log failed transaction
    await logPlatformTransaction({
      stripeId: paymentIntent.id,
      stripeCustomerId: typeof paymentIntent.customer === 'string' ? paymentIntent.customer : null,
      userId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      type: 'one_time',
      status: 'failed',
      description: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
      metadata: {
        payment_intent_id: paymentIntent.id,
        error: paymentIntent.last_payment_error,
      },
    });
  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment intent failed:', error);
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  try {
    console.log('[Stripe Webhook] Checkout session expired:', {
      sessionId: session.id,
      metadata: session.metadata,
    });

    const userId = session.metadata?.userId;
    if (!userId) {
      console.log('[Stripe Webhook] No userId in session metadata');
      return;
    }

    // Log cancelled transaction
    await logPlatformTransaction({
      stripeId: session.id,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
      userId,
      amount: session.amount_total || 0,
      currency: session.currency || 'eur',
      type: session.mode === 'subscription' ? 'subscription' : 'one_time',
      status: 'cancelled',
      description: 'Checkout session expired',
      metadata: {
        session_id: session.id,
        mode: session.mode,
      },
    });
  } catch (error) {
    console.error('[Stripe Webhook] Error handling checkout session expired:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: InvoiceWithSubscription) {
  try {
    const subscriptionId = invoice.subscription 
      ? (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id)
      : null;

    console.log('[Stripe Webhook] Invoice payment failed:', {
      invoiceId: invoice.id,
      subscriptionId,
      amountDue: invoice.amount_due / 100,
      attemptCount: invoice.attempt_count,
    });

    const stripeSubscriptionId = subscriptionId;
    if (!stripeSubscriptionId) {
      console.log('[Stripe Webhook] No subscription in invoice');
      return;
    }

    const supabase = getSupabaseClient();

    // Get platform subscription
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('id, user_id, plan_id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (!subscription) {
      console.error('[Stripe Webhook] Subscription not found for invoice');
      return;
    }

    // Update subscription status to past_due
    await supabase
      .from('platform_subscriptions')
      .update({ 
        status: 'past_due',
        metadata: {
          last_payment_failure: new Date().toISOString(),
          invoice_id: invoice.id,
          attempt_count: invoice.attempt_count,
        },
      })
      .eq('id', subscription.id);

    // Log failed payment transaction
    await logPlatformTransaction({
      stripeId: invoice.id,
      stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : null,
      userId: subscription.user_id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      type: 'subscription',
      status: 'failed',
      subscriptionId: subscription.id,
      description: `Subscription payment failed: ${subscription.plan_id}`,
      metadata: {
        invoice_id: invoice.id,
        stripe_subscription_id: stripeSubscriptionId,
        attempt_count: invoice.attempt_count,
      },
    });

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: subscription.user_id,
        action: 'subscription_payment_failed',
        resource_type: 'platform_subscriptions',
        resource_id: subscription.id,
        metadata: {
          invoice_id: invoice.id,
          amount_due: invoice.amount_due / 100,
          attempt_count: invoice.attempt_count,
        },
      });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling invoice payment failed:', error);
  }
}

async function handleInvoicePaymentActionRequired(invoice: InvoiceWithSubscription) {
  try {
    const subscriptionId = invoice.subscription 
      ? (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id)
      : null;

    const paymentIntentId = invoice.payment_intent
      ? (typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent.id)
      : null;

    console.log('[Stripe Webhook] Invoice payment action required:', {
      invoiceId: invoice.id,
      subscriptionId,
      amountDue: invoice.amount_due / 100,
    });

    const stripeSubscriptionId = subscriptionId;
    if (!stripeSubscriptionId) {
      console.log('[Stripe Webhook] No subscription in invoice');
      return;
    }

    const supabase = getSupabaseClient();

    // Get platform subscription
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (!subscription) {
      console.error('[Stripe Webhook] Subscription not found for invoice');
      return;
    }

    // Log to audit - user needs to take action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: subscription.user_id,
        action: 'subscription_payment_action_required',
        resource_type: 'platform_subscriptions',
        resource_id: subscription.id,
        metadata: {
          invoice_id: invoice.id,
          amount_due: invoice.amount_due / 100,
          payment_intent: paymentIntentId,
        },
      });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling invoice payment action required:', error);
  }
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  try {
    console.log('[Stripe Webhook] Subscription paused:', {
      subscriptionId: subscription.id,
      pauseCollection: subscription.pause_collection,
    });

    const supabase = getSupabaseClient();

    await supabase
      .from('platform_subscriptions')
      .update({ 
        status: 'paused',
        metadata: {
          paused_at: new Date().toISOString(),
          pause_collection: subscription.pause_collection,
        },
      })
      .eq('stripe_subscription_id', subscription.id);

    // Get subscription for logging
    const { data: platformSub } = await supabase
      .from('platform_subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (platformSub) {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: platformSub.user_id,
          action: 'subscription_paused',
          resource_type: 'platform_subscriptions',
          resource_id: platformSub.id,
          metadata: {
            stripe_subscription_id: subscription.id,
          },
        });
    }

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription paused:', error);
  }
}

async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  try {
    console.log('[Stripe Webhook] Subscription resumed:', {
      subscriptionId: subscription.id,
    });

    const supabase = getSupabaseClient();

    await supabase
      .from('platform_subscriptions')
      .update({ 
        status: 'active',
        metadata: {
          resumed_at: new Date().toISOString(),
        },
      })
      .eq('stripe_subscription_id', subscription.id);

    // Get subscription for logging
    const { data: platformSub } = await supabase
      .from('platform_subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (platformSub) {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: platformSub.user_id,
          action: 'subscription_resumed',
          resource_type: 'platform_subscriptions',
          resource_id: platformSub.id,
          metadata: {
            stripe_subscription_id: subscription.id,
          },
        });
    }

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription resumed:', error);
  }
}

async function handleSubscriptionPendingUpdateApplied(subscription: Stripe.Subscription) {
  try {
    console.log('[Stripe Webhook] Subscription pending update applied:', {
      subscriptionId: subscription.id,
      items: subscription.items.data,
    });

    const supabase = getSupabaseClient();

    // Get subscription
    const { data: platformSub } = await supabase
      .from('platform_subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (platformSub) {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: platformSub.user_id,
          action: 'subscription_pending_update_applied',
          resource_type: 'platform_subscriptions',
          resource_id: platformSub.id,
          metadata: {
            stripe_subscription_id: subscription.id,
            items: subscription.items.data,
          },
        });
    }

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription pending update applied:', error);
  }
}

async function handleSubscriptionPendingUpdateExpired(subscription: Stripe.Subscription) {
  try {
    console.log('[Stripe Webhook] Subscription pending update expired:', {
      subscriptionId: subscription.id,
    });

    const supabase = getSupabaseClient();

    // Get subscription
    const { data: platformSub } = await supabase
      .from('platform_subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (platformSub) {
      // Clear pending plan change if exists
      await supabase
        .from('platform_subscriptions')
        .update({ 
          pending_plan_change: null,
          metadata: {
            pending_update_expired_at: new Date().toISOString(),
          },
        })
        .eq('id', platformSub.id);

      await supabase
        .from('audit_logs')
        .insert({
          user_id: platformSub.user_id,
          action: 'subscription_pending_update_expired',
          resource_type: 'platform_subscriptions',
          resource_id: platformSub.id,
          metadata: {
            stripe_subscription_id: subscription.id,
          },
        });
    }

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription pending update expired:', error);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    console.log('[Stripe Webhook] Charge refunded:', {
      chargeId: charge.id,
      amount: charge.amount / 100,
      amountRefunded: charge.amount_refunded / 100,
      refunds: charge.refunds,
    });

    const userId = charge.metadata?.userId;
    if (!userId) {
      console.log('[Stripe Webhook] No userId in charge metadata');
      return;
    }

    const supabase = getSupabaseClient();

    // Log refund transaction
    await logPlatformTransaction({
      stripeId: charge.id,
      stripeCustomerId: typeof charge.customer === 'string' ? charge.customer : null,
      userId,
      amount: charge.amount_refunded,
      currency: charge.currency,
      type: 'refund',
      status: 'refunded',
      description: `Refund for charge ${charge.id}`,
      metadata: {
        charge_id: charge.id,
        original_amount: charge.amount,
        refunded_amount: charge.amount_refunded,
        refunds: charge.refunds?.data,
      },
    });

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'payment_refunded',
        resource_type: 'platform_transactions',
        resource_id: charge.id,
        metadata: {
          charge_id: charge.id,
          amount_refunded: charge.amount_refunded / 100,
          currency: charge.currency,
        },
      });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling charge refunded:', error);
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  try {
    console.log('[Stripe Webhook] Customer updated:', {
      customerId: customer.id,
      email: customer.email,
    });

    const supabase = getSupabaseClient();

    // Update stripe_customer_id in user_profiles if email matches
    if (customer.email) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', customer.email)
        .single();

      if (profile) {
        // You can update user profile with customer info if needed
        await supabase
          .from('audit_logs')
          .insert({
            user_id: profile.id,
            action: 'stripe_customer_updated',
            resource_type: 'user_profiles',
            resource_id: profile.id,
            metadata: {
              stripe_customer_id: customer.id,
              email: customer.email,
            },
          });
      }
    }

  } catch (error) {
    console.error('[Stripe Webhook] Error handling customer updated:', error);
  }
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  try {
    console.log('[Stripe Webhook] Customer deleted:', {
      customerId: customer.id,
      email: customer.email,
    });

    const supabase = getSupabaseClient();

    // Cancel any active subscriptions for this customer
    const { data: subscriptions } = await supabase
      .from('platform_subscriptions')
      .select('id, user_id')
      .eq('stripe_customer_id', customer.id)
      .in('status', ['active', 'trialing']);

    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        await supabase
          .from('platform_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', sub.id);

        await supabase
          .from('audit_logs')
          .insert({
            user_id: sub.user_id,
            action: 'subscription_cancelled_customer_deleted',
            resource_type: 'platform_subscriptions',
            resource_id: sub.id,
            metadata: {
              stripe_customer_id: customer.id,
              reason: 'customer_deleted',
            },
          });
      }
    }

  } catch (error) {
    console.error('[Stripe Webhook] Error handling customer deleted:', error);
  }
}


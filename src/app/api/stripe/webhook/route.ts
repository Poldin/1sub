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
import { addCredits } from '@/lib/credits-service';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Initialize Supabase (service role for webhook)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
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
        const invoice = event.data.object as Stripe.Invoice;
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
        console.log('[Stripe Webhook] Payment intent succeeded:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        });
        // Additional logging or processing can be added here
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

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Stripe Webhook] User not found:', userId);
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
      userEmail: user.email,
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
    const metadata = session.metadata;
    if (!metadata) {
      console.error('[Stripe Webhook] No metadata in subscription session');
      return;
    }

    const { userId, planId, billingPeriod, creditsPerMonth, maxOverdraft } = metadata;

    if (!userId || !planId || !billingPeriod || !creditsPerMonth) {
      console.error('[Stripe Webhook] Missing required subscription metadata:', metadata);
      return;
    }

    const supabase = getSupabaseClient();

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[Stripe Webhook] User not found:', userId);
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

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    // Only process recurring invoices (not the first one, which is handled by checkout.session.completed)
    if (!invoice.subscription || invoice.billing_reason === 'subscription_create') {
      console.log('[Stripe Webhook] Skipping initial invoice');
      return;
    }

    const stripeSubscriptionId = invoice.subscription as string;
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

    // Add credits for this billing period
    const credits = subscription.credits_per_period;
    const idempotencyKey = `platform-sub-invoice-${invoice.id}`;

    await addCreditsToUser(
      subscription.user_id,
      credits,
      `Platform subscription renewal: ${subscription.plan_id}`,
      idempotencyKey,
      {
        subscription_id: subscription.id,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_invoice_id: invoice.id,
        plan_id: subscription.plan_id,
        billing_period: subscription.billing_period,
      }
    );

    // Update subscription billing dates
    const periodEnd = new Date(invoice.period_end * 1000);
    const nextBilling = new Date(periodEnd);
    if (subscription.billing_period === 'monthly') {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }

    await supabase
      .from('platform_subscriptions')
      .update({
        current_period_start: new Date(invoice.period_start * 1000).toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: nextBilling.toISOString(),
        last_billing_date: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    console.log('[Stripe Webhook] Recurring credits added:', {
      subscriptionId: subscription.id,
      userId: subscription.user_id,
      credits,
      invoiceId: invoice.id,
    });

  } catch (error) {
    console.error('[Stripe Webhook] Error handling invoice paid:', error);
    throw error;
  }
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


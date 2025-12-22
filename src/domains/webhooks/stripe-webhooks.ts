/**
 * Stripe Webhooks Service
 *
 * CANONICAL SOURCE: All Stripe webhook handling MUST use this service.
 *
 * Handles:
 * - checkout.session.completed
 * - customer.subscription.* events
 * - invoice.* events
 * - payment_intent.* events
 */

import Stripe from 'stripe';
import { createServiceClient } from '@/infrastructure/database/client';
import { completeToolCheckout } from '@/domains/checkout/tool-checkout';
import { completeCreditCheckout } from '@/domains/checkout/credit-checkout';
import { invalidateEntitlements } from '@/domains/verification';
import { revokeAccess } from '@/domains/auth';

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookResult {
  success: boolean;
  handled: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// STRIPE CLIENT
// ============================================================================

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey);
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verifies a Stripe webhook signature.
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
  endpointSecret: string
): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handles checkout.session.completed event.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookResult> {
  const metadata = session.metadata || {};
  const checkoutId = metadata.checkout_id;
  const checkoutType = metadata.type;

  if (!checkoutId) {
    return { success: false, handled: false, error: 'Missing checkout_id in metadata' };
  }

  const amount = session.amount_total || 0;
  const currency = session.currency || 'usd';

  if (checkoutType === 'credit_purchase') {
    const result = await completeCreditCheckout({
      checkoutId,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      amount,
      currency,
    });

    return {
      success: result.success,
      handled: true,
      message: result.success ? `Added ${result.creditsAdded} credits` : undefined,
      error: result.error,
    };
  }

  if (checkoutType === 'tool_purchase') {
    const result = await completeToolCheckout({
      checkoutId,
      stripeSessionId: session.id,
      stripeSubscriptionId:
        typeof session.subscription === 'string' ? session.subscription : undefined,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      amount,
      currency,
    });

    return {
      success: result.success,
      handled: true,
      message: result.success ? `Created subscription ${result.subscriptionId}` : undefined,
      error: result.error,
    };
  }

  return { success: true, handled: false, message: 'Unknown checkout type' };
}

/**
 * Handles customer.subscription.updated event.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  const supabase = createServiceClient();

  // Find our subscription by Stripe ID
  const { data: toolSub, error: findError } = await supabase
    .from('tool_subscriptions')
    .select('id, user_id, tool_id, status')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (findError || !toolSub) {
    return { success: true, handled: false, message: 'Subscription not found in our system' };
  }

  // Map Stripe status to our status
  let newStatus = toolSub.status;
  switch (subscription.status) {
    case 'active':
      newStatus = 'active';
      break;
    case 'past_due':
      newStatus = 'past_due';
      break;
    case 'canceled':
      newStatus = 'cancelled';
      break;
    case 'unpaid':
      newStatus = 'failed';
      break;
    case 'trialing':
      newStatus = 'trialing';
      break;
    case 'paused':
      newStatus = 'paused';
      break;
  }

  // Get current_period_end (handle both old and new Stripe API)
  const subAny = subscription as unknown as Record<string, unknown>;
  const periodEnd = subAny.current_period_end as number | undefined;

  // Update subscription status
  const { error: updateError } = await supabase
    .from('tool_subscriptions')
    .update({
      status: newStatus,
      next_billing_date: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      metadata: {
        stripe_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
    })
    .eq('id', toolSub.id);

  if (updateError) {
    return { success: false, handled: true, error: 'Failed to update subscription' };
  }

  // Invalidate entitlements cache
  await invalidateEntitlements(toolSub.user_id, toolSub.tool_id);

  return { success: true, handled: true, message: `Updated subscription to ${newStatus}` };
}

/**
 * Handles customer.subscription.deleted event.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  const supabase = createServiceClient();

  // Find our subscription by Stripe ID
  const { data: toolSub, error: findError } = await supabase
    .from('tool_subscriptions')
    .select('id, user_id, tool_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (findError || !toolSub) {
    return { success: true, handled: false, message: 'Subscription not found in our system' };
  }

  // Update subscription status
  const { error: updateError } = await supabase
    .from('tool_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', toolSub.id);

  if (updateError) {
    return { success: false, handled: true, error: 'Failed to cancel subscription' };
  }

  // Revoke access
  await revokeAccess(toolSub.user_id, toolSub.tool_id, 'subscription_cancelled');

  // Invalidate entitlements cache
  await invalidateEntitlements(toolSub.user_id, toolSub.tool_id);

  return { success: true, handled: true, message: 'Subscription cancelled' };
}

/**
 * Handles invoice.payment_failed event.
 */
export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<WebhookResult> {
  // Handle both old and new Stripe API
  const invoiceAny = invoice as unknown as Record<string, unknown>;
  const subscriptionField = invoiceAny.subscription as string | { id: string } | null;

  if (!subscriptionField) {
    return { success: true, handled: false, message: 'Not a subscription invoice' };
  }

  const subscriptionId =
    typeof subscriptionField === 'string' ? subscriptionField : subscriptionField.id;

  const supabase = createServiceClient();

  // Find our subscription
  const { data: toolSub, error: findError } = await supabase
    .from('tool_subscriptions')
    .select('id, user_id, tool_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (findError || !toolSub) {
    return { success: true, handled: false, message: 'Subscription not found' };
  }

  // Update subscription status to past_due
  await supabase
    .from('tool_subscriptions')
    .update({
      status: 'past_due',
      metadata: {
        payment_failed_at: new Date().toISOString(),
        invoice_id: invoice.id,
      },
    })
    .eq('id', toolSub.id);

  // Invalidate entitlements cache
  await invalidateEntitlements(toolSub.user_id, toolSub.tool_id);

  return { success: true, handled: true, message: 'Marked subscription as past_due' };
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

/**
 * Main webhook handler that routes to specific handlers.
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<WebhookResult> {
  console.log(`[StripeWebhook] Processing event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);

    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription);

    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription);

    case 'invoice.payment_failed':
      return handlePaymentFailed(event.data.object as Stripe.Invoice);

    default:
      return { success: true, handled: false, message: `Unhandled event type: ${event.type}` };
  }
}

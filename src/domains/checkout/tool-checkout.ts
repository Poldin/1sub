/**
 * Tool Checkout Service
 *
 * CANONICAL SOURCE: All tool/subscription purchases MUST use this service.
 *
 * Flow: /api/checkout/* → Stripe → webhook → subscription created
 *
 * This is for purchasing access to tools (subscriptions or one-time).
 * NOT for purchasing credits - see credit-checkout.ts for that.
 */

import { createServiceClient, createServerClient } from '@/infrastructure/database/client';
import Stripe from 'stripe';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolCheckoutParams {
  userId: string;
  toolId: string;
  priceId: string;
  pricingType: 'subscription' | 'one_time';
  period?: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCheckoutResult {
  success: boolean;
  checkoutId?: string;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface ToolCheckoutRecord {
  id: string;
  user_id: string;
  tool_id: string;
  type: string;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
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
// CHECKOUT CREATION
// ============================================================================

/**
 * Creates a Stripe checkout session for tool purchase.
 */
export async function createToolCheckout(
  params: ToolCheckoutParams
): Promise<ToolCheckoutResult> {
  const { userId, toolId, priceId, pricingType, period, successUrl, cancelUrl, metadata } =
    params;

  try {
    const supabase = createServiceClient();
    const stripe = getStripeClient();

    // Get user email for Stripe
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !user?.email) {
      return { success: false, error: 'User not found' };
    }

    // Get or create Stripe customer
    let customerId: string | undefined;
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: userId },
      });
      customerId = customer.id;

      await supabase.from('stripe_customers').insert({
        user_id: userId,
        stripe_customer_id: customerId,
      });
    }

    // Create checkout record
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .insert({
        user_id: userId,
        tool_id: toolId,
        type: 'tool_purchase',
        status: 'pending',
        metadata: {
          ...metadata,
          pricing_type: pricingType,
          period,
          price_id: priceId,
        },
      })
      .select('id')
      .single();

    if (checkoutError || !checkout) {
      return { success: false, error: 'Failed to create checkout record' };
    }

    // Create Stripe session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: pricingType === 'subscription' ? 'subscription' : 'payment',
      success_url: `${successUrl}?checkout_id=${checkout.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        checkout_id: checkout.id,
        user_id: userId,
        tool_id: toolId,
        type: 'tool_purchase',
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update checkout with session ID
    await supabase
      .from('checkouts')
      .update({
        stripe_session_id: session.id,
        metadata: {
          ...metadata,
          pricing_type: pricingType,
          period,
          price_id: priceId,
        },
      })
      .eq('id', checkout.id);

    return {
      success: true,
      checkoutId: checkout.id,
      sessionId: session.id,
      url: session.url || undefined,
    };
  } catch (error) {
    console.error('[ToolCheckout] Error creating checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Completes a tool checkout after successful payment.
 * Called by webhook handler.
 */
export async function completeToolCheckout(params: {
  checkoutId: string;
  stripeSessionId: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
}): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  const {
    checkoutId,
    stripeSessionId,
    stripeSubscriptionId,
    stripePaymentIntentId,
    amount,
    currency,
  } = params;

  try {
    const supabase = createServiceClient();

    // Get checkout record
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('id', checkoutId)
      .single();

    if (checkoutError || !checkout) {
      return { success: false, error: 'Checkout not found' };
    }

    if (checkout.status === 'completed') {
      return { success: true, subscriptionId: checkout.subscription_id };
    }

    const checkoutMetadata = (checkout.metadata as Record<string, unknown>) || {};
    const pricingType = checkoutMetadata.pricing_type as string;
    const period = checkoutMetadata.period as string;

    // Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('tool_subscriptions')
      .insert({
        user_id: checkout.user_id,
        tool_id: checkout.tool_id,
        checkout_id: checkoutId,
        status: 'active',
        period: period || 'monthly',
        stripe_subscription_id: stripeSubscriptionId,
        metadata: {
          pricing_type: pricingType,
          stripe_payment_intent_id: stripePaymentIntentId,
        },
      })
      .select('id')
      .single();

    if (subError) {
      console.error('[ToolCheckout] Error creating subscription:', subError);
      return { success: false, error: 'Failed to create subscription' };
    }

    // Update checkout as completed
    await supabase
      .from('checkouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        stripe_session_id: stripeSessionId,
        stripe_payment_intent_id: stripePaymentIntentId,
        amount,
        currency,
        subscription_id: subscription.id,
      })
      .eq('id', checkoutId);

    return { success: true, subscriptionId: subscription.id };
  } catch (error) {
    console.error('[ToolCheckout] Error completing checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// CHECKOUT QUERIES
// ============================================================================

/**
 * Gets a checkout record by ID.
 */
export async function getToolCheckout(checkoutId: string): Promise<ToolCheckoutRecord | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('checkouts')
    .select('*')
    .eq('id', checkoutId)
    .eq('type', 'tool_purchase')
    .single();

  if (error || !data) {
    return null;
  }

  return data as ToolCheckoutRecord;
}

/**
 * Gets checkout by Stripe session ID.
 */
export async function getToolCheckoutBySession(
  sessionId: string
): Promise<ToolCheckoutRecord | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('checkouts')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .eq('type', 'tool_purchase')
    .single();

  if (error || !data) {
    return null;
  }

  return data as ToolCheckoutRecord;
}

/**
 * Gets all checkouts for a user.
 */
export async function getUserToolCheckouts(userId: string): Promise<ToolCheckoutRecord[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('checkouts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'tool_purchase')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ToolCheckout] Error fetching user checkouts:', error);
    return [];
  }

  return (data || []) as ToolCheckoutRecord[];
}

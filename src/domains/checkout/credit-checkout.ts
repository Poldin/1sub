/**
 * Credit Checkout Service
 *
 * CANONICAL SOURCE: All credit purchases MUST use this service.
 *
 * Flow: /api/stripe/create-checkout-session → Stripe → webhook → credits added
 *
 * This is for purchasing credits only.
 * NOT for purchasing tools - see tool-checkout.ts for that.
 */

import { createServiceClient, createServerClient } from '@/infrastructure/database/client';
import { addCredits } from '@/domains/credits';
import Stripe from 'stripe';

// ============================================================================
// TYPES
// ============================================================================

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  stripePriceId: string;
  popular?: boolean;
}

export interface CreditCheckoutParams {
  userId: string;
  packageId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreditCheckoutResult {
  success: boolean;
  checkoutId?: string;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface CreditCheckoutRecord {
  id: string;
  user_id: string;
  type: string;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number | null;
  currency: string | null;
  credits_amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// CREDIT PACKAGES
// ============================================================================

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    price: 10,
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_100 || '',
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 500,
    price: 40,
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_500 || '',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 1000,
    price: 70,
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_1000 || '',
  },
];

export function getCreditPackage(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId);
}

export function getCreditPackageByPriceId(priceId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.stripePriceId === priceId);
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
 * Creates a Stripe checkout session for credit purchase.
 */
export async function createCreditCheckout(
  params: CreditCheckoutParams
): Promise<CreditCheckoutResult> {
  const { userId, packageId, successUrl, cancelUrl } = params;

  try {
    const pkg = getCreditPackage(packageId);
    if (!pkg) {
      return { success: false, error: 'Invalid package' };
    }

    if (!pkg.stripePriceId) {
      return { success: false, error: 'Package not configured' };
    }

    const supabase = createServiceClient();
    const stripe = getStripeClient();

    // Get user email
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
        type: 'credit_purchase',
        status: 'pending',
        credits_amount: pkg.credits,
        metadata: {
          package_id: packageId,
          package_name: pkg.name,
          credits: pkg.credits,
          price: pkg.price,
        },
      })
      .select('id')
      .single();

    if (checkoutError || !checkout) {
      return { success: false, error: 'Failed to create checkout record' };
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pkg.stripePriceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${successUrl}?checkout_id=${checkout.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        checkout_id: checkout.id,
        user_id: userId,
        type: 'credit_purchase',
        package_id: packageId,
        credits: String(pkg.credits),
      },
    });

    // Update checkout with session ID
    await supabase
      .from('checkouts')
      .update({ stripe_session_id: session.id })
      .eq('id', checkout.id);

    return {
      success: true,
      checkoutId: checkout.id,
      sessionId: session.id,
      url: session.url || undefined,
    };
  } catch (error) {
    console.error('[CreditCheckout] Error creating checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Completes a credit checkout after successful payment.
 * Called by webhook handler.
 */
export async function completeCreditCheckout(params: {
  checkoutId: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
}): Promise<{ success: boolean; creditsAdded?: number; error?: string }> {
  const { checkoutId, stripeSessionId, stripePaymentIntentId, amount, currency } = params;

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
      return { success: true, creditsAdded: checkout.credits_amount };
    }

    const creditsToAdd = checkout.credits_amount;
    if (!creditsToAdd || creditsToAdd <= 0) {
      return { success: false, error: 'Invalid credits amount' };
    }

    // Add credits to user's balance
    const creditResult = await addCredits({
      userId: checkout.user_id,
      amount: creditsToAdd,
      reason: 'Credit package purchase',
      idempotencyKey: `checkout_${checkoutId}`,
      checkoutId,
      metadata: {
        stripe_session_id: stripeSessionId,
        stripe_payment_intent_id: stripePaymentIntentId,
      },
    });

    if (!creditResult.success) {
      console.error('[CreditCheckout] Error adding credits:', creditResult.error);
      return { success: false, error: 'Failed to add credits' };
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
      })
      .eq('id', checkoutId);

    return { success: true, creditsAdded: creditsToAdd };
  } catch (error) {
    console.error('[CreditCheckout] Error completing checkout:', error);
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
 * Gets a credit checkout record by ID.
 */
export async function getCreditCheckout(checkoutId: string): Promise<CreditCheckoutRecord | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('checkouts')
    .select('*')
    .eq('id', checkoutId)
    .eq('type', 'credit_purchase')
    .single();

  if (error || !data) {
    return null;
  }

  return data as CreditCheckoutRecord;
}

/**
 * Gets credit checkout by Stripe session ID.
 */
export async function getCreditCheckoutBySession(
  sessionId: string
): Promise<CreditCheckoutRecord | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('checkouts')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .eq('type', 'credit_purchase')
    .single();

  if (error || !data) {
    return null;
  }

  return data as CreditCheckoutRecord;
}

/**
 * Gets all credit checkouts for a user.
 */
export async function getUserCreditCheckouts(userId: string): Promise<CreditCheckoutRecord[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('checkouts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'credit_purchase')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[CreditCheckout] Error fetching user checkouts:', error);
    return [];
  }

  return (data || []) as CreditCheckoutRecord[];
}

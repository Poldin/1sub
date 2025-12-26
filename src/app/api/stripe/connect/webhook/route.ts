/**
 * Stripe Connect Webhook Handler
 * 
 * Handles Stripe Connect webhook events for vendor account updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateAccountStatus } from '@/domains/payments';
import { createServiceClient } from '@/infrastructure/database/client';

// Validate Stripe configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not configured');
}

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover' as any,
});

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT || process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Stripe Connect Webhook] Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Connect Webhook] No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Connect Webhook] Signature verification failed:', err);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    console.log('[Stripe Connect Webhook] Event received:', {
      type: event.type,
      id: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      case 'account.external_account.created':
      case 'account.external_account.updated': {
        const externalAccount = event.data.object;
        console.log('[Stripe Connect Webhook] External account updated:', {
          accountId: externalAccount.account,
          type: event.type,
        });
        break;
      }

      default:
        console.log('[Stripe Connect Webhook] Unhandled event type:', event.type);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Stripe Connect Webhook] Error processing webhook:', error);
    // Still return 200 to prevent Stripe from retrying
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    console.log('[Stripe Connect Webhook] Processing account.updated:', {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });

    // Determine account status
    const isActive = account.charges_enabled && account.payouts_enabled;
    const isRestricted = !account.charges_enabled || !account.payouts_enabled;
    const onboardingComplete = account.details_submitted || false;

    let accountStatus: 'active' | 'pending' | 'restricted' | 'disabled' = 'pending';
    if (isActive) {
      accountStatus = 'active';
    } else if (isRestricted) {
      accountStatus = 'restricted';
    }

    // Update database
    const { success, error } = await updateAccountStatus(account.id, accountStatus, onboardingComplete);

    if (!success) {
      console.error('[Stripe Connect Webhook] Failed to update account status:', error);
      return;
    }

    // Get vendor ID and log to audit
    const supabase = createServiceClient();
    const { data: vendorAccount } = await supabase
      .from('vendor_stripe_accounts')
      .select('vendor_id')
      .eq('stripe_account_id', account.id)
      .single();

    if (vendorAccount) {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: vendorAccount.vendor_id,
          action: 'stripe_connect_account_updated',
          resource_type: 'vendor_stripe_accounts',
          metadata: {
            stripe_account_id: account.id,
            account_status: accountStatus,
            onboarding_completed: onboardingComplete,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
          },
        });
    }

    console.log('[Stripe Connect Webhook] Account updated successfully:', {
      accountId: account.id,
      status: accountStatus,
    });

  } catch (error) {
    console.error('[Stripe Connect Webhook] Error handling account.updated:', error);
    throw error;
  }
}



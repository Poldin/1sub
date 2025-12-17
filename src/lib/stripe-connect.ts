/**
 * Stripe Connect Utility Functions
 * 
 * Handles vendor Stripe Connect account creation, onboarding, and payout processing.
 * One credit = one euro (EUR).
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

// Initialize Supabase client with service role
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface VendorStripeAccount {
  id: string;
  vendor_id: string;
  stripe_account_id: string;
  account_status: 'pending' | 'active' | 'restricted' | 'disabled';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorPayout {
  id: string;
  vendor_id: string;
  credits_amount: number;
  euro_amount: number;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed';
  scheduled_date: string | null;
  processed_at: string | null;
  stripe_transfer_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Create a Stripe Connect account for a vendor
 */
export async function createConnectAccount(vendorId: string, email: string): Promise<{ accountId: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // Check if vendor already has a Stripe account
    const { data: existing } = await supabase
      .from('vendor_stripe_accounts')
      .select('stripe_account_id')
      .eq('vendor_id', vendorId)
      .single();

    if (existing) {
      return { accountId: existing.stripe_account_id };
    }

    // Create Stripe Connect account (Standard type)
    const account = await stripe.accounts.create({
      type: 'standard',
      email: email,
      metadata: {
        vendor_id: vendorId,
      },
    });

    // Store in database
    const { error: insertError } = await supabase
      .from('vendor_stripe_accounts')
      .insert({
        vendor_id: vendorId,
        stripe_account_id: account.id,
        account_status: 'pending',
        onboarding_completed: false,
      });

    if (insertError) {
      console.error('Failed to store Stripe account:', insertError);
      return { accountId: account.id, error: 'Failed to store account information' };
    }

    return { accountId: account.id };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return { 
      accountId: '', 
      error: error instanceof Error ? error.message : 'Failed to create Stripe account' 
    };
  }
}

/**
 * Create an account link for vendor onboarding
 */
export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<{ url: string; error?: string }> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error('Error creating account link:', error);
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Failed to create onboarding link' 
    };
  }
}

/**
 * Get Stripe Connect account details
 */
export async function getAccountDetails(accountId: string): Promise<{ account: Stripe.Account | null; error?: string }> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return { account };
  } catch (error) {
    console.error('Error retrieving account:', error);
    return { 
      account: null, 
      error: error instanceof Error ? error.message : 'Failed to retrieve account' 
    };
  }
}

/**
 * Update vendor Stripe account status in database
 */
export async function updateAccountStatus(
  accountId: string, 
  status: 'pending' | 'active' | 'restricted' | 'disabled',
  onboardingCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('vendor_stripe_accounts')
      .update({
        account_status: status,
        onboarding_completed: onboardingCompleted,
      })
      .eq('stripe_account_id', accountId);

    if (error) {
      console.error('Failed to update account status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating account status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update account status' 
    };
  }
}

/**
 * Calculate vendor's available credit balance
 */
export async function getVendorCreditBalance(vendorId: string): Promise<{ balance: number; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // Get all vendor earning transactions
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('credits_amount')
      .eq('user_id', vendorId)
      .eq('type', 'add')
      .ilike('reason', 'Tool sale:%');

    if (txError) {
      console.error('Failed to fetch transactions:', txError);
      return { balance: 0, error: txError.message };
    }

    const earnings = transactions?.reduce((sum, tx) => sum + (tx.credits_amount || 0), 0) || 0;

    // Get total payouts already processed or scheduled
    const { data: payouts, error: payoutError } = await supabase
      .from('vendor_payouts')
      .select('credits_amount')
      .eq('vendor_id', vendorId)
      .in('status', ['scheduled', 'processing', 'completed']);

    if (payoutError) {
      console.error('Failed to fetch payouts:', payoutError);
      return { balance: 0, error: payoutError.message };
    }

    const payoutsTotal = payouts?.reduce((sum, payout) => sum + (payout.credits_amount || 0), 0) || 0;

    const availableBalance = earnings - payoutsTotal;

    return { balance: Math.max(0, availableBalance) };
  } catch (error) {
    console.error('Error calculating credit balance:', error);
    return { 
      balance: 0, 
      error: error instanceof Error ? error.message : 'Failed to calculate balance' 
    };
  }
}

/**
 * Create a scheduled payout for a vendor
 */
export async function scheduleVendorPayout(
  vendorId: string,
  creditsAmount: number,
  scheduledDate: Date
): Promise<{ payoutId: string | null; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // Verify vendor has sufficient balance
    const { balance, error: balanceError } = await getVendorCreditBalance(vendorId);
    if (balanceError) {
      return { payoutId: null, error: balanceError };
    }

    if (balance < creditsAmount) {
      return { payoutId: null, error: 'Insufficient credit balance' };
    }

    // Create payout record (1 credit = 1 EUR)
    const { data: payout, error: insertError } = await supabase
      .from('vendor_payouts')
      .insert({
        vendor_id: vendorId,
        credits_amount: creditsAmount,
        euro_amount: creditsAmount, // 1:1 conversion
        status: 'scheduled',
        scheduled_date: scheduledDate.toISOString(),
        metadata: {
          scheduled_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create payout:', insertError);
      return { payoutId: null, error: insertError.message };
    }

    return { payoutId: payout.id };
  } catch (error) {
    console.error('Error scheduling payout:', error);
    return { 
      payoutId: null, 
      error: error instanceof Error ? error.message : 'Failed to schedule payout' 
    };
  }
}

/**
 * Process a scheduled payout using Stripe Transfer
 */
export async function processVendorPayout(payoutId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from('vendor_payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return { success: false, error: 'Payout not found' };
    }

    if (payout.status !== 'scheduled') {
      return { success: false, error: 'Payout is not scheduled' };
    }

    // Get vendor Stripe account separately
    const { data: vendorAccount, error: accountError } = await supabase
      .from('vendor_stripe_accounts')
      .select('stripe_account_id, account_status')
      .eq('vendor_id', payout.vendor_id)
      .single();

    if (accountError || !vendorAccount) {
      return { success: false, error: 'Vendor Stripe account not found' };
    }
    
    if (vendorAccount.account_status !== 'active') {
      return { success: false, error: 'Vendor Stripe account is not active' };
    }

    // Update status to processing
    await supabase
      .from('vendor_payouts')
      .update({ status: 'processing' })
      .eq('id', payoutId);

    try {
      // Create Stripe transfer (amount in cents, so multiply by 100)
      const transfer = await stripe.transfers.create({
        amount: Math.round(payout.euro_amount * 100),
        currency: 'eur',
        destination: (vendorAccount as { stripe_account_id: string }).stripe_account_id,
        metadata: {
          payout_id: payoutId,
          vendor_id: payout.vendor_id,
          credits_amount: payout.credits_amount.toString(),
        },
      });

      // Update payout as completed
      await supabase
        .from('vendor_payouts')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          stripe_transfer_id: transfer.id,
          metadata: {
            ...payout.metadata,
            transfer_id: transfer.id,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('id', payoutId);

      // Log to audit
      await supabase
        .from('audit_logs')
        .insert({
          user_id: payout.vendor_id,
          action: 'vendor_payout_completed',
          resource_type: 'vendor_payouts',
          resource_id: payoutId,
          metadata: {
            credits_amount: payout.credits_amount,
            euro_amount: payout.euro_amount,
            stripe_transfer_id: transfer.id,
          },
        });

      return { success: true };
    } catch (stripeError) {
      console.error('Stripe transfer failed:', stripeError);
      
      // Update payout as failed
      await supabase
        .from('vendor_payouts')
        .update({
          status: 'failed',
          metadata: {
            ...payout.metadata,
            error: stripeError instanceof Error ? stripeError.message : 'Transfer failed',
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', payoutId);

      return { 
        success: false, 
        error: stripeError instanceof Error ? stripeError.message : 'Transfer failed' 
      };
    }
  } catch (error) {
    console.error('Error processing payout:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process payout' 
    };
  }
}

/**
 * Get next scheduled payout date (1st of next month)
 */
export function getNextPayoutDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

/**
 * Get minimum payout threshold from environment or default
 */
export function getMinimumPayoutThreshold(): number {
  const envValue = process.env.MIN_PAYOUT_CREDITS;
  return envValue ? parseInt(envValue, 10) : 50;
}


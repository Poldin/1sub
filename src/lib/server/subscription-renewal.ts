/**
 * Subscription Renewal Service
 * 
 * Handles automatic renewal of active subscriptions.
 * Called by cron job to process subscriptions that are due for renewal.
 * 
 * Features:
 * - Automatic credit deduction from user balance
 * - Vendor credit addition for subscription renewals
 * - Subscription status management (active, paused, failed)
 * - Failed renewal retry logic (up to 3 attempts)
 * - Comprehensive logging and error handling
 */

import { createClient } from '@supabase/supabase-js';
import { notifySubscriptionUpdated } from '@/domains/webhooks';

// Initialize Supabase (service role for cron job)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

interface Subscription {
  id: string;
  user_id: string;
  tool_id: string;
  status: string;
  credits_per_period: number;
  period: string;
  next_billing_date: string;
  last_billing_date: string | null;
  failed_renewal_count: number;
  metadata: Record<string, unknown> | null;
}

interface RenewalResult {
  success: boolean;
  subscriptionId: string;
  userId: string;
  error?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  amountCharged?: number;
}

interface BatchRenewalResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  paused: number;
  results: RenewalResult[];
}

/**
 * Calculate next billing date based on current date and billing period
 */
function calculateNextBillingDate(currentDate: Date, billingPeriod: string): Date {
  const nextDate = new Date(currentDate);

  switch (billingPeriod.toLowerCase()) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // Default to monthly
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

/**
 * Process a single subscription renewal
 */
async function processSubscriptionRenewal(
  subscription: Subscription,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<RenewalResult> {
  const {
    id: subscriptionId,
    user_id: userId,
    tool_id: toolId,
    credits_per_period: creditPrice,
    period: billingPeriod,
    metadata,
  } = subscription;
  
  // Extract vendor_id from metadata if available
  const vendorId = metadata?.vendor_id as string | undefined;

  try {
    console.log(`[Subscription Renewal] Processing subscription ${subscriptionId}`, {
      userId,
      toolId,
      creditPrice,
      billingPeriod,
    });

    // Get user's current balance from user_balances table
    // Note: credit service uses cookies which aren't available in cron jobs
    // So we'll fetch balance directly from user_balances table
    const { data: balanceRecord } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const currentBalance = balanceRecord?.balance ?? 0;

    // Check for sufficient credits
    if (currentBalance < creditPrice) {
      console.warn(`[Subscription Renewal] Insufficient credits for subscription ${subscriptionId}`, {
        userId,
        currentBalance,
        required: creditPrice,
        shortfall: creditPrice - currentBalance,
      });

      // Update subscription to paused status
      await supabase
        .from('tool_subscriptions')
        .update({
          status: 'paused',
          pause_reason: 'Insufficient credits',
          failed_renewal_count: subscription.failed_renewal_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      return {
        success: false,
        subscriptionId,
        userId,
        error: 'Insufficient credits',
        balanceBefore: currentBalance,
        amountCharged: 0,
      };
    }

    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(now, billingPeriod);

    // Create idempotency key for this renewal
    const idempotencyKey = `subscription-renewal-${subscriptionId}-${now.toISOString()}`;

    // Deduct credits from user
    // Trigger will automatically update user_balances table
    const { error: userTransactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        tool_id: toolId,
        credits_amount: creditPrice,
        type: 'subtract',
        reason: `Subscription renewal: ${metadata?.tool_name || 'Unknown tool'}`,
        idempotency_key: idempotencyKey,
        metadata: {
          subscription_id: subscriptionId,
          billing_period: billingPeriod,
          renewal_date: now.toISOString(),
          tool_name: metadata?.tool_name,
        },
      })
      .select('id')
      .single();

    if (userTransactionError) {
      console.error(`[Subscription Renewal] Failed to deduct credits for subscription ${subscriptionId}:`, userTransactionError);

      // Mark as failed and schedule retry
      await supabase
        .from('tool_subscriptions')
        .update({
          status: 'failed',
          failed_renewal_count: subscription.failed_renewal_count + 1,
          next_retry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Retry in 24 hours
          updated_at: now.toISOString(),
        })
        .eq('id', subscriptionId);

      return {
        success: false,
        subscriptionId,
        userId,
        error: 'Failed to deduct credits',
        balanceBefore: currentBalance,
      };
    }

    // Add credits to vendor
    if (vendorId) {
      // Trigger will automatically update user_balances table
      const { error: vendorTransactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: vendorId,
          tool_id: toolId,
          credits_amount: creditPrice,
          type: 'add',
          reason: `Subscription renewal payment: ${metadata?.tool_name || 'Unknown tool'}`,
          idempotency_key: `${idempotencyKey}-vendor`,
          metadata: {
            subscription_id: subscriptionId,
            subscriber_id: userId,
            billing_period: billingPeriod,
            renewal_date: now.toISOString(),
            tool_name: metadata?.tool_name,
          },
        });

      if (vendorTransactionError) {
        console.error(`[Subscription Renewal] CRITICAL: Failed to credit vendor for subscription ${subscriptionId}:`, vendorTransactionError);
        // Continue - user was already charged
      }
    }

    // Update subscription record
    const { error: updateError } = await supabase
      .from('tool_subscriptions')
      .update({
        status: 'active',
        last_billing_date: now.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        failed_renewal_count: 0,
        next_retry_date: null,
        pause_reason: null,
        updated_at: now.toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error(`[Subscription Renewal] Failed to update subscription ${subscriptionId}:`, updateError);
      // Transaction was processed, so log but don't fail
    }

    // Get updated balance after transaction
    const { data: updatedBalanceRecord } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    const newBalance = updatedBalanceRecord?.balance ?? currentBalance - creditPrice;

    console.log(`[Subscription Renewal] Successfully renewed subscription ${subscriptionId}`, {
      userId,
      vendorId,
      creditPrice,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      nextBillingDate: nextBillingDate.toISOString(),
    });

    // Send webhook notification for subscription update
    try {
      await notifySubscriptionUpdated(
        toolId,
        userId,
        billingPeriod,
        'active',
        nextBillingDate.toISOString(),
        newBalance ?? (currentBalance - creditPrice)
      );
    } catch (webhookError) {
      // Don't fail the renewal if webhook fails
      console.error(`[Webhook] Failed to send subscription.updated webhook for subscription ${subscriptionId}:`, webhookError);
    }

    return {
      success: true,
      subscriptionId,
      userId,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      amountCharged: creditPrice,
    };

  } catch (error) {
    console.error(`[Subscription Renewal] Unexpected error processing subscription ${subscriptionId}:`, error);

    // Mark subscription as failed
    try {
      await supabase
        .from('tool_subscriptions')
        .update({
          status: 'failed',
          failed_renewal_count: subscription.failed_renewal_count + 1,
          next_retry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);
    } catch (updateError) {
      console.error(`[Subscription Renewal] Failed to update subscription status:`, updateError);
    }

    return {
      success: false,
      subscriptionId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process subscriptions in batch
 * Fetches subscriptions due for renewal and processes them one by one
 * 
 * @param limit - Maximum number of subscriptions to process in this batch (default: 100)
 * @returns BatchRenewalResult with statistics and individual results
 */
export async function processSubscriptionRenewals(limit: number = 100): Promise<BatchRenewalResult> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  try {
    console.log(`[Subscription Renewal] Starting batch processing at ${now}`, { limit });

    // Fetch active subscriptions due for renewal
    const { data: subscriptions, error: fetchError } = await supabase
      .from('tool_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_billing_date', now)
      .limit(limit);

    if (fetchError) {
      console.error('[Subscription Renewal] Failed to fetch subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Subscription Renewal] No subscriptions due for renewal');
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        paused: 0,
        results: [],
      };
    }

    console.log(`[Subscription Renewal] Found ${subscriptions.length} subscriptions to process`);

    // Process each subscription
    const results: RenewalResult[] = [];
    for (const subscription of subscriptions) {
      const result = await processSubscriptionRenewal(subscription as Subscription, supabase);
      results.push(result);

      // Small delay between processing to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && r.error !== 'Insufficient credits').length;
    const paused = results.filter(r => !r.success && r.error === 'Insufficient credits').length;

    console.log('[Subscription Renewal] Batch processing complete', {
      totalProcessed: results.length,
      successful,
      failed,
      paused,
    });

    return {
      totalProcessed: results.length,
      successful,
      failed,
      paused,
      results,
    };

  } catch (error) {
    console.error('[Subscription Renewal] Error in batch processing:', error);
    throw error;
  }
}

/**
 * Retry failed subscription renewals (up to 3 attempts)
 * Processes subscriptions with status 'failed' and failed_renewal_count < 3
 * 
 * @param limit - Maximum number of failed subscriptions to retry (default: 50)
 * @returns BatchRenewalResult with statistics and individual results
 */
export async function retryFailedSubscriptionRenewals(limit: number = 50): Promise<BatchRenewalResult> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  try {
    console.log(`[Subscription Renewal] Starting retry processing at ${now}`, { limit });

    // Fetch failed subscriptions that are due for retry and haven't exceeded max attempts
    const { data: subscriptions, error: fetchError } = await supabase
      .from('tool_subscriptions')
      .select('*')
      .eq('status', 'failed')
      .lt('failed_renewal_count', 3)
      .lte('next_retry_date', now)
      .limit(limit);

    if (fetchError) {
      console.error('[Subscription Renewal] Failed to fetch failed subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Subscription Renewal] No failed subscriptions to retry');
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        paused: 0,
        results: [],
      };
    }

    console.log(`[Subscription Renewal] Found ${subscriptions.length} failed subscriptions to retry`);

    // Process each subscription
    const results: RenewalResult[] = [];
    for (const subscription of subscriptions) {
      const result = await processSubscriptionRenewal(subscription as Subscription, supabase);
      results.push(result);

      // Small delay between processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && r.error !== 'Insufficient credits').length;
    const paused = results.filter(r => !r.success && r.error === 'Insufficient credits').length;

    console.log('[Subscription Renewal] Retry processing complete', {
      totalProcessed: results.length,
      successful,
      failed,
      paused,
    });

    return {
      totalProcessed: results.length,
      successful,
      failed,
      paused,
      results,
    };

  } catch (error) {
    console.error('[Subscription Renewal] Error in retry processing:', error);
    throw error;
  }
}


/**
 * Grace Period Enforcement Service
 *
 * Handles subscription grace periods for failed payments.
 * Ensures users don't retain access indefinitely after payment failure.
 *
 * Grace Period Policy:
 * - past_due subscriptions get 7 days grace period
 * - After grace period, subscription is cancelled and access revoked
 * - Users are notified before expiration
 */

import { createServiceClient } from '@/infrastructure/database/client';

// Grace period configuration
export const GRACE_PERIOD_DAYS = 7;
export const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export interface GracePeriodStatus {
  subscriptionId: string;
  userId: string;
  planId: string;
  status: 'past_due' | 'cancelled';
  paymentFailedAt: string;
  gracePeriodEndsAt: string;
  daysRemaining: number;
  isExpired: boolean;
}

/**
 * Calculate grace period expiration for a past_due subscription
 */
export function calculateGracePeriodExpiry(paymentFailedAt: Date): Date {
  return new Date(paymentFailedAt.getTime() + GRACE_PERIOD_MS);
}

/**
 * Check if grace period has expired
 */
export function isGracePeriodExpired(paymentFailedAt: Date): boolean {
  const expiryDate = calculateGracePeriodExpiry(paymentFailedAt);
  return Date.now() > expiryDate.getTime();
}

/**
 * Get days remaining in grace period
 */
export function getGracePeriodDaysRemaining(paymentFailedAt: Date): number {
  const expiryDate = calculateGracePeriodExpiry(paymentFailedAt);
  const msRemaining = expiryDate.getTime() - Date.now();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
}

/**
 * Get all subscriptions with expired grace periods
 */
export async function getExpiredGracePeriodSubscriptions(): Promise<GracePeriodStatus[]> {
  const supabase = createServiceClient();

  // Get all past_due subscriptions
  const { data: subscriptions, error } = await supabase
    .from('platform_subscriptions')
    .select('id, user_id, plan_id, status, metadata')
    .eq('status', 'past_due');

  if (error || !subscriptions) {
    console.error('[GracePeriod] Error fetching past_due subscriptions:', error);
    return [];
  }

  const expiredSubscriptions: GracePeriodStatus[] = [];

  for (const sub of subscriptions) {
    const metadata = (sub.metadata as Record<string, unknown>) || {};
    const lastPaymentFailure = metadata.last_payment_failure as string | undefined;

    if (!lastPaymentFailure) {
      console.warn('[GracePeriod] past_due subscription missing last_payment_failure:', sub.id);
      continue;
    }

    const paymentFailedAt = new Date(lastPaymentFailure);
    const gracePeriodEndsAt = calculateGracePeriodExpiry(paymentFailedAt);
    const daysRemaining = getGracePeriodDaysRemaining(paymentFailedAt);
    const isExpired = isGracePeriodExpired(paymentFailedAt);

    const status: GracePeriodStatus = {
      subscriptionId: sub.id,
      userId: sub.user_id,
      planId: sub.plan_id,
      status: sub.status,
      paymentFailedAt: paymentFailedAt.toISOString(),
      gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
      daysRemaining,
      isExpired,
    };

    if (isExpired) {
      expiredSubscriptions.push(status);
    }
  }

  return expiredSubscriptions;
}

/**
 * Revoke access for a subscription with expired grace period
 */
export async function revokeExpiredSubscription(
  subscriptionId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  try {
    // Cancel the subscription
    const { error: updateError } = await supabase
      .from('platform_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        metadata: {
          cancellation_reason: 'grace_period_expired',
          grace_period_expired_at: new Date().toISOString(),
          original_failure_reason: reason,
        },
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[GracePeriod] Error cancelling subscription:', updateError);
      return { success: false, error: updateError.message };
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'subscription_cancelled_grace_period_expired',
        resource_type: 'platform_subscriptions',
        resource_id: subscriptionId,
        metadata: {
          reason: 'grace_period_expired',
          grace_period_days: GRACE_PERIOD_DAYS,
        },
      });

    console.log('[GracePeriod] Subscription cancelled due to expired grace period:', {
      subscriptionId,
      userId,
    });

    return { success: true };
  } catch (error) {
    console.error('[GracePeriod] Error revoking subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process all expired grace periods
 * This should be called by a cron job daily
 */
export async function processExpiredGracePeriods(): Promise<{
  processed: number;
  revoked: number;
  errors: number;
}> {
  console.log('[GracePeriod] Starting grace period enforcement check...');

  const expiredSubscriptions = await getExpiredGracePeriodSubscriptions();

  console.log('[GracePeriod] Found expired grace periods:', expiredSubscriptions.length);

  let revoked = 0;
  let errors = 0;

  for (const sub of expiredSubscriptions) {
    const result = await revokeExpiredSubscription(
      sub.subscriptionId,
      sub.userId,
      'payment_failed'
    );

    if (result.success) {
      revoked++;
    } else {
      errors++;
    }
  }

  console.log('[GracePeriod] Grace period enforcement complete:', {
    processed: expiredSubscriptions.length,
    revoked,
    errors,
  });

  return {
    processed: expiredSubscriptions.length,
    revoked,
    errors,
  };
}

/**
 * Get grace period status for a specific subscription
 */
export async function getSubscriptionGracePeriodStatus(
  subscriptionId: string
): Promise<GracePeriodStatus | null> {
  const supabase = createServiceClient();

  const { data: subscription, error } = await supabase
    .from('platform_subscriptions')
    .select('id, user_id, plan_id, status, metadata')
    .eq('id', subscriptionId)
    .single();

  if (error || !subscription) {
    return null;
  }

  if (subscription.status !== 'past_due') {
    return null;
  }

  const metadata = (subscription.metadata as Record<string, unknown>) || {};
  const lastPaymentFailure = metadata.last_payment_failure as string | undefined;

  if (!lastPaymentFailure) {
    return null;
  }

  const paymentFailedAt = new Date(lastPaymentFailure);
  const gracePeriodEndsAt = calculateGracePeriodExpiry(paymentFailedAt);
  const daysRemaining = getGracePeriodDaysRemaining(paymentFailedAt);
  const isExpired = isGracePeriodExpired(paymentFailedAt);

  return {
    subscriptionId: subscription.id,
    userId: subscription.user_id,
    planId: subscription.plan_id,
    status: subscription.status,
    paymentFailedAt: paymentFailedAt.toISOString(),
    gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
    daysRemaining,
    isExpired,
  };
}

/**
 * Get all subscriptions in grace period (not yet expired)
 */
export async function getActiveGracePeriodSubscriptions(): Promise<GracePeriodStatus[]> {
  const supabase = createServiceClient();

  const { data: subscriptions, error } = await supabase
    .from('platform_subscriptions')
    .select('id, user_id, plan_id, status, metadata')
    .eq('status', 'past_due');

  if (error || !subscriptions) {
    return [];
  }

  const activeGracePeriods: GracePeriodStatus[] = [];

  for (const sub of subscriptions) {
    const metadata = (sub.metadata as Record<string, unknown>) || {};
    const lastPaymentFailure = metadata.last_payment_failure as string | undefined;

    if (!lastPaymentFailure) {
      continue;
    }

    const paymentFailedAt = new Date(lastPaymentFailure);
    const gracePeriodEndsAt = calculateGracePeriodExpiry(paymentFailedAt);
    const daysRemaining = getGracePeriodDaysRemaining(paymentFailedAt);
    const isExpired = isGracePeriodExpired(paymentFailedAt);

    if (!isExpired) {
      activeGracePeriods.push({
        subscriptionId: sub.id,
        userId: sub.user_id,
        planId: sub.plan_id,
        status: sub.status,
        paymentFailedAt: paymentFailedAt.toISOString(),
        gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
        daysRemaining,
        isExpired,
      });
    }
  }

  return activeGracePeriods;
}

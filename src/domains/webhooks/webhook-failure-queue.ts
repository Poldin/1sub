/**
 * Webhook Failure Queue
 *
 * Handles failed webhook processing with retry logic and dead letter queue.
 *
 * Features:
 * - Exponential backoff retry strategy
 * - Maximum retry attempts (5)
 * - Dead letter queue for permanent failures
 * - Duplicate event detection
 *
 * Database Schema Required:
 *
 * CREATE TABLE webhook_failures (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   event_id TEXT NOT NULL,
 *   event_type TEXT NOT NULL,
 *   payload JSONB NOT NULL,
 *   error_message TEXT,
 *   retry_count INTEGER DEFAULT 0,
 *   max_retries INTEGER DEFAULT 5,
 *   next_retry_at TIMESTAMPTZ,
 *   status TEXT DEFAULT 'pending', -- 'pending', 'retrying', 'succeeded', 'dead_letter'
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now(),
 *   processed_at TIMESTAMPTZ
 * );
 *
 * CREATE INDEX idx_webhook_failures_status ON webhook_failures(status);
 * CREATE INDEX idx_webhook_failures_next_retry ON webhook_failures(next_retry_at) WHERE status = 'pending';
 * CREATE UNIQUE INDEX idx_webhook_failures_event_id ON webhook_failures(event_id);
 */

import { createServiceClient } from '@/infrastructure/database/client';
import Stripe from 'stripe';

// Retry configuration
export const MAX_RETRIES = 5;
export const INITIAL_RETRY_DELAY_MS = 60000; // 1 minute
export const MAX_RETRY_DELAY_MS = 3600000; // 1 hour

export interface WebhookFailure {
  id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  status: 'pending' | 'retrying' | 'succeeded' | 'dead_letter';
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

/**
 * Calculate next retry delay using exponential backoff
 */
export function calculateRetryDelay(retryCount: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/**
 * Calculate next retry timestamp
 */
export function calculateNextRetry(retryCount: number): Date {
  const delay = calculateRetryDelay(retryCount);
  return new Date(Date.now() + delay);
}

/**
 * Queue a failed webhook for retry
 */
export async function queueWebhookFailure(
  event: Stripe.Event,
  error: Error
): Promise<{ success: boolean; failureId?: string; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Check if this event is already in the queue (idempotency)
    const { data: existing } = await supabase
      .from('webhook_failures')
      .select('id, retry_count, status')
      .eq('event_id', event.id)
      .single();

    if (existing) {
      // Event already in queue - update it
      if (existing.status === 'dead_letter') {
        console.log('[WebhookQueue] Event already in dead letter queue:', event.id);
        return { success: false, error: 'Event in dead letter queue' };
      }

      // Increment retry count
      const newRetryCount = existing.retry_count + 1;
      const nextRetryAt = calculateNextRetry(newRetryCount);

      const { error: updateError } = await supabase
        .from('webhook_failures')
        .update({
          retry_count: newRetryCount,
          next_retry_at: nextRetryAt.toISOString(),
          error_message: error.message,
          updated_at: new Date().toISOString(),
          status: newRetryCount >= MAX_RETRIES ? 'dead_letter' : 'pending',
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[WebhookQueue] Error updating webhook failure:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log('[WebhookQueue] Updated webhook failure retry count:', {
        eventId: event.id,
        retryCount: newRetryCount,
        nextRetryAt: nextRetryAt.toISOString(),
      });

      return { success: true, failureId: existing.id };
    }

    // New failure - insert into queue
    const nextRetryAt = calculateNextRetry(0);

    const { data: failure, error: insertError } = await supabase
      .from('webhook_failures')
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
        error_message: error.message,
        retry_count: 0,
        max_retries: MAX_RETRIES,
        next_retry_at: nextRetryAt.toISOString(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[WebhookQueue] Error inserting webhook failure:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('[WebhookQueue] Queued webhook failure for retry:', {
      eventId: event.id,
      eventType: event.type,
      nextRetryAt: nextRetryAt.toISOString(),
      failureId: failure.id,
    });

    return { success: true, failureId: failure.id };
  } catch (error) {
    console.error('[WebhookQueue] Error queueing webhook failure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all webhook failures ready for retry
 */
export async function getWebhooksReadyForRetry(): Promise<WebhookFailure[]> {
  const supabase = createServiceClient();

  const { data: failures, error } = await supabase
    .from('webhook_failures')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(50); // Process in batches

  if (error) {
    console.error('[WebhookQueue] Error fetching webhooks for retry:', error);
    return [];
  }

  return (failures || []) as WebhookFailure[];
}

/**
 * Mark webhook as successfully processed
 */
export async function markWebhookSuccess(failureId: string): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from('webhook_failures')
    .update({
      status: 'succeeded',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', failureId);

  console.log('[WebhookQueue] Marked webhook as succeeded:', failureId);
}

/**
 * Mark webhook as dead letter (permanent failure)
 */
export async function markWebhookDeadLetter(
  failureId: string,
  error: string
): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from('webhook_failures')
    .update({
      status: 'dead_letter',
      error_message: error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', failureId);

  console.log('[WebhookQueue] Marked webhook as dead letter:', failureId);
}

/**
 * Process retry queue
 * This should be called by a cron job every few minutes
 */
export async function processRetryQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  deadLetter: number;
}> {
  console.log('[WebhookQueue] Starting retry queue processing...');

  const failures = await getWebhooksReadyForRetry();

  console.log('[WebhookQueue] Found webhooks ready for retry:', failures.length);

  let succeeded = 0;
  let failed = 0;
  let deadLetter = 0;

  for (const failure of failures) {
    try {
      // Mark as retrying
      const supabase = createServiceClient();
      await supabase
        .from('webhook_failures')
        .update({ status: 'retrying' })
        .eq('id', failure.id);

      // Attempt to reprocess the webhook
      const event = failure.payload as unknown as Stripe.Event;

      // Import the webhook handler dynamically to avoid circular dependencies
      const { handleStripeWebhook } = await import('./stripe-webhooks');
      const result = await handleStripeWebhook(event);

      if (result.success) {
        await markWebhookSuccess(failure.id);
        succeeded++;
        console.log('[WebhookQueue] Retry succeeded:', failure.event_id);
      } else {
        // Retry failed - increment counter or move to dead letter
        if (failure.retry_count + 1 >= MAX_RETRIES) {
          await markWebhookDeadLetter(
            failure.id,
            result.error || 'Max retries exceeded'
          );
          deadLetter++;
          console.error('[WebhookQueue] Max retries exceeded, moved to dead letter:', failure.event_id);
        } else {
          // Update for next retry
          const nextRetryAt = calculateNextRetry(failure.retry_count + 1);
          await supabase
            .from('webhook_failures')
            .update({
              retry_count: failure.retry_count + 1,
              next_retry_at: nextRetryAt.toISOString(),
              status: 'pending',
              error_message: result.error || 'Processing failed',
            })
            .eq('id', failure.id);
          failed++;
          console.error('[WebhookQueue] Retry failed, will retry again:', failure.event_id);
        }
      }
    } catch (error) {
      console.error('[WebhookQueue] Error processing retry:', error);
      failed++;

      // Move to dead letter if max retries reached
      if (failure.retry_count + 1 >= MAX_RETRIES) {
        await markWebhookDeadLetter(
          failure.id,
          error instanceof Error ? error.message : 'Unknown error'
        );
        deadLetter++;
      }
    }
  }

  console.log('[WebhookQueue] Retry queue processing complete:', {
    processed: failures.length,
    succeeded,
    failed,
    deadLetter,
  });

  return {
    processed: failures.length,
    succeeded,
    failed,
    deadLetter,
  };
}

/**
 * Get dead letter queue items
 */
export async function getDeadLetterQueue(): Promise<WebhookFailure[]> {
  const supabase = createServiceClient();

  const { data: failures, error } = await supabase
    .from('webhook_failures')
    .select('*')
    .eq('status', 'dead_letter')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[WebhookQueue] Error fetching dead letter queue:', error);
    return [];
  }

  return (failures || []) as WebhookFailure[];
}

/**
 * Get webhook failure statistics
 */
export async function getWebhookFailureStats(): Promise<{
  pending: number;
  succeeded: number;
  deadLetter: number;
  total: number;
}> {
  const supabase = createServiceClient();

  const [pendingResult, succeededResult, deadLetterResult, totalResult] = await Promise.all([
    supabase
      .from('webhook_failures')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('webhook_failures')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'succeeded'),
    supabase
      .from('webhook_failures')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead_letter'),
    supabase
      .from('webhook_failures')
      .select('id', { count: 'exact', head: true }),
  ]);

  return {
    pending: pendingResult.count || 0,
    succeeded: succeededResult.count || 0,
    deadLetter: deadLetterResult.count || 0,
    total: totalResult.count || 0,
  };
}

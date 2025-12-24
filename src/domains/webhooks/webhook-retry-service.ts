/**
 * Webhook Retry Service
 *
 * Handles retry queue management with exponential backoff for failed webhooks.
 * Follows the pattern established in subscription-renewal.ts for database-backed retries.
 *
 * Key Features:
 * - Exponential backoff schedule (1min, 5min, 15min, 1hr, 6hr)
 * - Maximum 5 retry attempts
 * - Retries only 5xx errors, timeouts, and network errors
 * - Dead letter queue for permanently failed webhooks
 * - Idempotent enqueue operation
 */

import { createServiceClient } from '@/infrastructure/database/client';
import type { WebhookPayload, WebhookEventType } from './outbound-webhooks';

// Exponential backoff schedule
export const RETRY_SCHEDULE = [
  { attempt: 1, delayMs: 1 * 60 * 1000 }, // 1 minute
  { attempt: 2, delayMs: 5 * 60 * 1000 }, // 5 minutes
  { attempt: 3, delayMs: 15 * 60 * 1000 }, // 15 minutes
  { attempt: 4, delayMs: 60 * 60 * 1000 }, // 1 hour
  { attempt: 5, delayMs: 6 * 60 * 60 * 1000 }, // 6 hours
];

export const MAX_RETRY_ATTEMPTS = 5;

interface RetryQueueEntry {
  id: string;
  tool_id: string;
  event_id: string;
  event_type: WebhookEventType;
  url: string;
  payload: WebhookPayload;
  webhook_secret: string;
  retry_count: number;
  last_error?: string;
  last_status_code?: number;
}

interface RetryResult {
  id: string;
  success: boolean;
  shouldRetry: boolean;
  movedToDeadLetter: boolean;
  error?: string;
}

interface ProcessingStats {
  processed: number;
  succeeded: number;
  failed: number;
  deadLetter: number;
}

/**
 * Check if HTTP status code or error message indicates a retryable failure
 *
 * Retryable errors:
 * - 5xx server errors (temporary server issues)
 * - Timeout errors
 * - Network errors (connection refused, DNS issues)
 *
 * Non-retryable errors:
 * - 4xx client errors (bad request, unauthorized, not found, etc.)
 */
export function isRetryableError(
  statusCode?: number,
  error?: string
): boolean {
  // Retry server errors (5xx)
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // Retry timeouts
  if (error?.toLowerCase().includes('timeout')) {
    return true;
  }

  // Retry network errors
  if (
    error?.toLowerCase().includes('network') ||
    error?.toLowerCase().includes('econnrefused') ||
    error?.toLowerCase().includes('enotfound') ||
    error?.toLowerCase().includes('etimedout') ||
    error?.toLowerCase().includes('socket hang up')
  ) {
    return true;
  }

  // DO NOT retry client errors (4xx)
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return false;
  }

  // For unknown errors without status code, don't retry to be safe
  return false;
}

/**
 * Calculate next retry timestamp based on attempt number
 */
export function calculateNextRetryAt(attemptNumber: number): Date {
  const schedule = RETRY_SCHEDULE.find((s) => s.attempt === attemptNumber);
  const delayMs =
    schedule?.delayMs ||
    RETRY_SCHEDULE[RETRY_SCHEDULE.length - 1].delayMs;

  return new Date(Date.now() + delayMs);
}

/**
 * Enqueue failed webhook for retry
 *
 * This function is idempotent - if the event_id is already in the queue,
 * it will not create a duplicate entry.
 */
export async function enqueueWebhookRetry(params: {
  toolId: string;
  eventId: string;
  eventType: string;
  url: string;
  payload: WebhookPayload;
  webhookSecret: string;
  error?: string;
  statusCode?: number;
}): Promise<void> {
  const supabase = createServiceClient();

  try {
    // Check if already in queue (idempotency check)
    const { data: existing } = await supabase
      .from('webhook_retry_queue')
      .select('id')
      .eq('event_id', params.eventId)
      .eq('tool_id', params.toolId)
      .single();

    if (existing) {
      console.log(
        `[Webhook Retry] Event ${params.eventId} already in retry queue`
      );
      return;
    }

    // Calculate first retry time (1 minute from now)
    const nextRetryAt = calculateNextRetryAt(1);

    const { error: insertError } = await supabase
      .from('webhook_retry_queue')
      .insert({
        tool_id: params.toolId,
        event_id: params.eventId,
        event_type: params.eventType,
        url: params.url,
        payload: params.payload,
        webhook_secret: params.webhookSecret,
        retry_count: 0,
        max_retries: MAX_RETRY_ATTEMPTS,
        next_retry_at: nextRetryAt.toISOString(),
        status: 'pending',
        last_error: params.error,
        last_status_code: params.statusCode,
      });

    if (insertError) {
      throw insertError;
    }

    console.log(
      `[Webhook Retry] Enqueued ${params.eventType} for tool ${params.toolId}, retry at ${nextRetryAt.toISOString()}`
    );
  } catch (error) {
    console.error('[Webhook Retry] Failed to enqueue retry:', error);
    // Don't throw - this is a best-effort operation
    // The webhook failure is already logged in webhook_logs
  }
}

/**
 * Process a single retry attempt
 */
async function processRetryAttempt(
  entry: RetryQueueEntry
): Promise<RetryResult> {
  const supabase = createServiceClient();
  const attemptNumber = entry.retry_count + 1;

  try {
    console.log(
      `[Webhook Retry] Attempting retry ${attemptNumber}/${MAX_RETRY_ATTEMPTS} for event ${entry.event_id}`
    );

    // Update status to 'retrying'
    await supabase
      .from('webhook_retry_queue')
      .update({
        status: 'retrying',
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', entry.id);

    // Import sendWebhook dynamically to avoid circular dependency
    const { sendWebhook, logWebhookDelivery } = await import(
      './outbound-webhooks'
    );

    // Attempt webhook delivery
    const result = await sendWebhook(
      entry.url,
      entry.webhook_secret,
      entry.payload
    );

    // Log the retry attempt
    await logWebhookDelivery({
      toolId: entry.tool_id,
      eventId: entry.event_id,
      eventType: entry.event_type,
      url: entry.url,
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      deliveryTime: result.deliveryTime,
      attemptNumber,
      isRetry: true,
      retryQueueId: entry.id,
    });

    if (result.success) {
      // SUCCESS: Remove from retry queue
      await supabase.from('webhook_retry_queue').delete().eq('id', entry.id);

      console.log(
        `[Webhook Retry] Successfully delivered ${entry.event_id} on attempt ${attemptNumber}`
      );

      return {
        id: entry.id,
        success: true,
        shouldRetry: false,
        movedToDeadLetter: false,
      };
    }

    // FAILURE: Check if should retry
    const shouldRetry = isRetryableError(result.statusCode, result.error);

    if (!shouldRetry || attemptNumber >= MAX_RETRY_ATTEMPTS) {
      // Move to dead letter queue
      await moveToDeadLetterQueue(entry, result.error, result.statusCode);

      console.warn(
        `[Webhook Retry] Moved ${entry.event_id} to dead letter queue after ${attemptNumber} attempts (retryable: ${shouldRetry})`
      );

      return {
        id: entry.id,
        success: false,
        shouldRetry: false,
        movedToDeadLetter: true,
        error: result.error,
      };
    }

    // Schedule next retry
    const nextRetryAt = calculateNextRetryAt(attemptNumber + 1);

    await supabase
      .from('webhook_retry_queue')
      .update({
        retry_count: attemptNumber,
        status: 'pending',
        last_error: result.error,
        last_status_code: result.statusCode,
        next_retry_at: nextRetryAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id);

    console.log(
      `[Webhook Retry] Scheduled retry ${attemptNumber + 1} for ${entry.event_id} at ${nextRetryAt.toISOString()}`
    );

    return {
      id: entry.id,
      success: false,
      shouldRetry: true,
      movedToDeadLetter: false,
      error: result.error,
    };
  } catch (error) {
    console.error(
      `[Webhook Retry] Error processing retry for ${entry.event_id}:`,
      error
    );

    // On unexpected error, schedule retry if attempts remain
    if (attemptNumber < MAX_RETRY_ATTEMPTS) {
      const nextRetryAt = calculateNextRetryAt(attemptNumber + 1);

      await supabase
        .from('webhook_retry_queue')
        .update({
          retry_count: attemptNumber,
          status: 'pending',
          last_error: error instanceof Error ? error.message : 'Unknown error',
          next_retry_at: nextRetryAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id);
    } else {
      await moveToDeadLetterQueue(
        entry,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return {
      id: entry.id,
      success: false,
      shouldRetry: attemptNumber < MAX_RETRY_ATTEMPTS,
      movedToDeadLetter: attemptNumber >= MAX_RETRY_ATTEMPTS,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Move entry to dead letter queue
 */
async function moveToDeadLetterQueue(
  entry: RetryQueueEntry,
  lastError?: string,
  lastStatusCode?: number
): Promise<void> {
  const supabase = createServiceClient();

  try {
    // Calculate approximate first attempt time (7.5 hours ago from now)
    const totalRetryTime =
      1 * 60 * 1000 +
      5 * 60 * 1000 +
      15 * 60 * 1000 +
      60 * 60 * 1000 +
      6 * 60 * 60 * 1000;
    const firstAttemptAt = new Date(Date.now() - totalRetryTime);

    // Insert into dead letter queue
    await supabase.from('webhook_dead_letter_queue').insert({
      retry_queue_id: entry.id,
      tool_id: entry.tool_id,
      event_id: entry.event_id,
      event_type: entry.event_type,
      url: entry.url,
      payload: entry.payload,
      total_attempts: entry.retry_count + 1,
      first_attempt_at: firstAttemptAt.toISOString(),
      last_attempt_at: new Date().toISOString(),
      last_error: lastError || entry.last_error || 'Max retries exceeded',
      last_status_code: lastStatusCode || entry.last_status_code,
      status: 'unresolved',
    });

    // Update retry queue status
    await supabase
      .from('webhook_retry_queue')
      .update({ status: 'dead_letter' })
      .eq('id', entry.id);

    console.log(
      `[Webhook Retry] Moved event ${entry.event_id} to dead letter queue`
    );
  } catch (error) {
    console.error(
      '[Webhook Retry] Failed to move to dead letter queue:',
      error
    );
  }
}

/**
 * Process all pending retries (called by cron job)
 *
 * This is the main entry point called by the daily cron job at 2am UTC.
 * It processes all webhooks in the retry queue that are due for retry.
 *
 * @param limit Maximum number of entries to process in one run (default 100)
 * @returns Statistics about the processing run
 */
export async function processWebhookRetries(
  limit: number = 100
): Promise<ProcessingStats> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  try {
    console.log(
      `[Webhook Retry] Processing retries at ${now}, limit=${limit}`
    );

    // Fetch entries due for retry
    const { data: entries, error } = await supabase
      .from('webhook_retry_queue')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[Webhook Retry] Failed to fetch retry queue:', error);
      throw error;
    }

    if (!entries || entries.length === 0) {
      console.log('[Webhook Retry] No entries due for retry');
      return { processed: 0, succeeded: 0, failed: 0, deadLetter: 0 };
    }

    console.log(`[Webhook Retry] Found ${entries.length} entries to process`);

    const results: RetryResult[] = [];
    for (const entry of entries) {
      const result = await processRetryAttempt(entry as RetryQueueEntry);
      results.push(result);

      // Small delay to avoid overwhelming target servers
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const stats: ProcessingStats = {
      processed: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success && r.shouldRetry).length,
      deadLetter: results.filter((r) => r.movedToDeadLetter).length,
    };

    console.log('[Webhook Retry] Processing complete:', stats);

    return stats;
  } catch (error) {
    console.error('[Webhook Retry] Error in batch processing:', error);
    throw error;
  }
}

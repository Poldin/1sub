/**
 * Subscription Processing Cron Job
 * 
 * This endpoint is called periodically by a cron service (e.g., Vercel Cron, external scheduler)
 * to process subscription renewals automatically.
 * 
 * Features:
 * - Verifies cron secret for security
 * - Processes active subscriptions due for renewal
 * - Retries failed subscriptions (up to 3 attempts)
 * - Returns detailed processing statistics
 * - Comprehensive error handling and logging
 * 
 * Setup:
 * 1. Set CRON_SECRET environment variable
 * 2. Configure cron service to call this endpoint (e.g., daily)
 * 3. Pass cron secret in Authorization header: Bearer {CRON_SECRET}
 * 
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-subscriptions",
 *     "schedule": "0 0 * * *"  // Daily at midnight UTC
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processSubscriptionRenewals, retryFailedSubscriptionRenewals } from '@/domains/subscriptions';
import { processWebhookRetries } from '@/domains/webhooks/webhook-retry-service';
import { sendWebhookFailureAlert } from '@/domains/webhooks/webhook-alerts';
import { processRetryQueue as processStripeWebhookRetries, getWebhookFailureStats } from '@/domains/webhooks/webhook-failure-queue';
import { processExpiredGracePeriods } from '@/domains/subscriptions/grace-period';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'This endpoint requires POST method',
      usage: 'POST /api/cron/process-subscriptions with Authorization: Bearer {CRON_SECRET}'
    },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Cron] Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized: Missing authorization header' },
        { status: 401 }
      );
    }

    const providedSecret = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (providedSecret !== cronSecret) {
      console.warn('[Cron] Invalid cron secret provided');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting subscription processing');

    // Parse request body for optional parameters
    let batchSize = 100;
    let retryBatchSize = 50;
    let processRetries = true;

    try {
      const body = await request.json();
      if (body.batchSize) batchSize = parseInt(body.batchSize, 10);
      if (body.retryBatchSize) retryBatchSize = parseInt(body.retryBatchSize, 10);
      if (typeof body.processRetries === 'boolean') processRetries = body.processRetries;
    } catch (error) {
      // Body is optional, continue with defaults
    }

    // Process active subscriptions due for renewal
    console.log('[Cron] Processing active subscriptions', { batchSize });
    const renewalResults = await processSubscriptionRenewals(batchSize);

    // Process failed subscriptions (retry)
    let retryResults = null;
    if (processRetries) {
      console.log('[Cron] Processing failed subscriptions (retry)', { retryBatchSize });
      retryResults = await retryFailedSubscriptionRenewals(retryBatchSize);
    }

    // Process outbound webhook retries (to vendors)
    console.log('[Cron] Processing outbound webhook retries');
    const webhookStats = await processWebhookRetries(100);
    console.log('[Cron] Outbound webhook retry stats:', webhookStats);

    // Send alerts if webhooks moved to dead letter queue
    if (webhookStats.deadLetter > 0) {
      console.log(`[Cron] Sending alert for ${webhookStats.deadLetter} dead letter webhooks`);
      try {
        await sendWebhookFailureAlert({
          count: webhookStats.deadLetter,
          period: 'daily run',
        });
      } catch (alertError) {
        console.error('[Cron] Failed to send webhook failure alert:', alertError);
        // Don't fail the cron if alert fails
      }
    }

    // Process inbound Stripe webhook retries
    console.log('[Cron] Processing Stripe webhook retries');
    const stripeWebhookStats = await processStripeWebhookRetries();
    console.log('[Cron] Stripe webhook retry stats:', stripeWebhookStats);

    // Get current Stripe webhook failure stats
    const stripeFailureStats = await getWebhookFailureStats();

    // Process expired grace periods
    console.log('[Cron] Processing expired grace periods');
    const gracePeriodStats = await processExpiredGracePeriods();
    console.log('[Cron] Grace period stats:', gracePeriodStats);

    const endTime = Date.now();
    const duration = endTime - startTime;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      active_subscriptions: {
        processed: renewalResults.totalProcessed,
        successful: renewalResults.successful,
        failed: renewalResults.failed,
        paused: renewalResults.paused,
      },
      failed_retries: retryResults ? {
        processed: retryResults.totalProcessed,
        successful: retryResults.successful,
        failed: retryResults.failed,
        paused: retryResults.paused,
      } : null,
      outbound_webhook_retries: {
        processed: webhookStats.processed,
        succeeded: webhookStats.succeeded,
        failed: webhookStats.failed,
        deadLetter: webhookStats.deadLetter,
      },
      stripe_webhook_retries: {
        processed: stripeWebhookStats.processed,
        succeeded: stripeWebhookStats.succeeded,
        failed: stripeWebhookStats.failed,
        deadLetter: stripeWebhookStats.deadLetter,
      },
      stripe_webhook_queue_stats: {
        pending: stripeFailureStats.pending,
        succeeded: stripeFailureStats.succeeded,
        deadLetter: stripeFailureStats.deadLetter,
        total: stripeFailureStats.total,
      },
      grace_periods: {
        processed: gracePeriodStats.processed,
        revoked: gracePeriodStats.revoked,
        errors: gracePeriodStats.errors,
      },
      totals: {
        subscriptions_processed: renewalResults.totalProcessed + (retryResults?.totalProcessed || 0),
        successful_renewals: renewalResults.successful + (retryResults?.successful || 0),
        failed_renewals: renewalResults.failed + (retryResults?.failed || 0),
        paused_subscriptions: renewalResults.paused + (retryResults?.paused || 0),
        grace_periods_expired: gracePeriodStats.revoked,
      }
    };

    console.log('[Cron] Processing complete (subscriptions + webhooks + stripe webhooks + grace periods)', response);

    return NextResponse.json(response);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error('[Cron] Error processing subscriptions:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

// For Vercel Cron, we need to export the config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

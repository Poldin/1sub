/**
 * Unified Outbound Webhooks System
 *
 * CANONICAL SOURCE: All vendor webhook sending MUST use this service.
 *
 * This replaces both:
 * - src/lib/tool-webhooks.ts (DEPRECATED)
 * - src/domains/webhooks/vendor-webhooks.ts (DEPRECATED)
 *
 * Key improvements:
 * - Consistent payload structure with event.id for deduplication
 * - 15-second timeout on all requests
 * - Standardized signature header (X-1Sub-Signature)
 * - Proper logging for ALL webhook attempts
 * - Non-blocking async delivery
 */

import crypto from 'crypto';
import { createServiceClient } from '@/infrastructure/database/client';
import { generateWebhookSignature } from '@/security';
import { invalidateCachedEntitlements } from '@/lib/redis-cache';
import { enqueueWebhookRetry, isRetryableError } from './webhook-retry-service';

// ============================================================================
// UNIFIED EVENT TYPES (canonical list)
// ============================================================================

export type WebhookEventType =
  // Subscription lifecycle
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.updated'
  | 'subscription.canceled'
  // Purchases
  | 'purchase.completed'
  // Access management
  | 'entitlement.granted'
  | 'entitlement.revoked'
  | 'entitlement.changed'
  // Credits
  | 'credits.consumed'
  | 'user.credit_low'
  | 'user.credit_depleted'
  // System
  | 'tool.status_changed'
  | 'verify.required';

// ============================================================================
// UNIFIED PAYLOAD STRUCTURE (matches documentation)
// ============================================================================

export interface WebhookPayload {
  id: string;                    // UUID for deduplication
  type: WebhookEventType;        // Event type
  created: number;               // Unix timestamp
  data: {
    oneSubUserId: string;        // Always present (or 'system')
    userEmail?: string;          // User email when available
    toolId?: string;             // Tool ID when relevant
    [key: string]: unknown;      // Event-specific fields
  };
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retryAfter?: number;
  deliveryTime?: number;         // Response time in ms
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events?: WebhookEventType[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const WEBHOOK_CONFIG = {
  TIMEOUT_MS: 15000,             // 15 second timeout
  SIGNATURE_HEADER: 'X-1Sub-Signature',  // Standardized header
  USER_AGENT: '1Sub-Webhooks/2.0',
};

// ============================================================================
// CORE WEBHOOK SENDER (with timeout)
// ============================================================================

export async function sendWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();

  try {
    const body = JSON.stringify(payload);
    const signature = generateWebhookSignature(body, secret);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_CONFIG.SIGNATURE_HEADER]: signature,
          'User-Agent': WEBHOOK_CONFIG.USER_AGENT,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const deliveryTime = Date.now() - startTime;

      if (!response.ok) {
        const retryAfter = response.headers.get('Retry-After');
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}`,
          retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
          deliveryTime,
        };
      }

      return {
        success: true,
        statusCode: response.status,
        deliveryTime,
      };

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    const deliveryTime = Date.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `Timeout after ${WEBHOOK_CONFIG.TIMEOUT_MS}ms`,
        deliveryTime,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      deliveryTime,
    };
  }
}

// ============================================================================
// WEBHOOK CONFIG RETRIEVAL
// ============================================================================

export async function getToolWebhookConfig(toolId: string): Promise<WebhookConfig | null> {
  const supabase = createServiceClient();

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('metadata')
    .eq('tool_id', toolId)
    .eq('is_active', true)
    .single();

  if (error || !apiKey) {
    return null;
  }

  const metadata = (apiKey.metadata as Record<string, unknown>) || {};
  const webhookUrl = metadata.webhook_url as string;
  const webhookSecret = metadata.webhook_secret as string;

  if (!webhookUrl || !webhookSecret) {
    return null;
  }

  return {
    url: webhookUrl,
    secret: webhookSecret,
    events: metadata.webhook_events as WebhookEventType[] | undefined,
  };
}

// ============================================================================
// LOGGING (ALWAYS CALLED)
// ============================================================================

export async function logWebhookDelivery(params: {
  toolId: string;
  eventId: string;
  eventType: WebhookEventType;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  deliveryTime?: number;
  attemptNumber?: number;
  isRetry?: boolean;
  retryQueueId?: string;
}): Promise<void> {
  const supabase = createServiceClient();

  try {
    await supabase.from('webhook_logs').insert({
      tool_id: params.toolId,
      event_id: params.eventId,
      event_type: params.eventType,
      url: params.url,
      success: params.success,
      status_code: params.statusCode,
      error: params.error,
      delivery_time_ms: params.deliveryTime,
      attempt_number: params.attemptNumber || 1,
      is_retry: params.isRetry || false,
      retry_attempt: params.attemptNumber || 1,
      retry_queue_id: params.retryQueueId,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail webhook delivery if logging fails
    console.error('[Webhook] Failed to log delivery:', error);
  }
}

// ============================================================================
// HIGH-LEVEL SEND FUNCTION (logs + sends)
// ============================================================================

async function sendToolWebhookInternal(
  toolId: string,
  eventType: WebhookEventType,
  eventData: WebhookPayload['data']
): Promise<boolean> {
  // Get webhook config
  const config = await getToolWebhookConfig(toolId);
  if (!config) {
    console.log(`[Webhook] No webhook configured for tool ${toolId}`);
    return false;
  }

  // Check if tool subscribed to this event
  if (config.events && !config.events.includes(eventType)) {
    console.log(`[Webhook] Tool ${toolId} not subscribed to ${eventType}`);
    return true; // Not an error, just not subscribed
  }

  // Build payload with required fields
  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    data: eventData,
  };

  // Send webhook
  const result = await sendWebhook(config.url, config.secret, payload);

  // ALWAYS log delivery attempt
  await logWebhookDelivery({
    toolId,
    eventId: payload.id,
    eventType,
    url: config.url,
    success: result.success,
    statusCode: result.statusCode,
    error: result.error,
    deliveryTime: result.deliveryTime,
    attemptNumber: 1,
  });

  if (!result.success) {
    console.error(
      `[Webhook] Failed to send ${eventType} to tool ${toolId}:`,
      result.error
    );

    // Check if error is retryable (5xx, timeout, network errors)
    if (isRetryableError(result.statusCode, result.error)) {
      // Enqueue for retry with exponential backoff
      await enqueueWebhookRetry({
        toolId,
        eventId: payload.id,
        eventType,
        url: config.url,
        payload,
        webhookSecret: config.secret,
        error: result.error,
        statusCode: result.statusCode,
      });
      console.log(
        `[Webhook] Enqueued ${eventType} for retry (5xx/timeout error)`
      );
    } else {
      console.log(
        `[Webhook] Not enqueueing ${eventType} for retry (4xx/non-retryable error)`
      );
    }

    return false;
  }

  console.log(`[Webhook] Successfully sent ${eventType} to tool ${toolId}`);
  return true;
}

// ============================================================================
// USER EMAIL HELPER
// ============================================================================

async function getUserEmail(userId: string): Promise<string | undefined> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      console.warn(`[Webhook] Could not fetch email for user ${userId}:`, error);
      return undefined;
    }

    return data.user.email;
  } catch (error) {
    console.error(`[Webhook] Error fetching user email:`, error);
    return undefined;
  }
}

// ============================================================================
// PUBLIC API - Event Senders (NON-BLOCKING)
// ============================================================================

/**
 * Notify tool of subscription creation
 */
export async function notifySubscriptionCreated(
  toolId: string,
  oneSubUserId: string,
  subscriptionId: string,
  planId: string
): Promise<void> {
  const userEmail = await getUserEmail(oneSubUserId);

  // Fire-and-forget (non-blocking)
  sendToolWebhookInternal(toolId, 'subscription.created', {
    oneSubUserId,
    userEmail,
    subscriptionId,
    planId,
    status: 'active',
  }).catch(err => {
    console.error('[Webhook] subscription.created failed:', err);
  });
}

/**
 * Notify tool of subscription activation
 */
export async function notifySubscriptionActivated(
  toolId: string,
  oneSubUserId: string,
  planId: string,
  currentPeriodEnd: string,
  creditsRemaining?: number
): Promise<void> {
  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'subscription.activated', {
    oneSubUserId,
    userEmail,
    planId,
    status: 'active',
    currentPeriodEnd,
    quantity: 1,
    creditsRemaining,
  }).catch(err => {
    console.error('[Webhook] subscription.activated failed:', err);
  });
}

/**
 * Notify tool of subscription cancellation
 * Also invalidates the entitlement cache for immediate effect.
 */
export async function notifySubscriptionCanceled(
  toolId: string,
  oneSubUserId: string,
  planId: string,
  currentPeriodEnd: string
): Promise<void> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'subscription.canceled', {
    oneSubUserId,
    userEmail,
    planId,
    status: 'canceled',
    currentPeriodEnd,
    quantity: 1,
  }).catch(err => {
    console.error('[Webhook] subscription.canceled failed:', err);
  });
}

/**
 * Notify tool of subscription update
 * Also invalidates the entitlement cache for immediate effect.
 */
export async function notifySubscriptionUpdated(
  toolId: string,
  oneSubUserId: string,
  planId: string,
  status: string,
  currentPeriodEnd: string,
  creditsRemaining?: number
): Promise<void> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'subscription.updated', {
    oneSubUserId,
    userEmail,
    planId,
    status,
    currentPeriodEnd,
    quantity: 1,
    creditsRemaining,
  }).catch(err => {
    console.error('[Webhook] subscription.updated failed:', err);
  });
}

/**
 * Notify tool of purchase completion (one-time purchases)
 */
export async function notifyPurchaseCompleted(
  toolId: string,
  oneSubUserId: string,
  checkoutId: string,
  amount: number,
  creditsRemaining?: number,
  purchaseType?: string
): Promise<void> {
  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'purchase.completed', {
    oneSubUserId,
    userEmail,
    checkoutId,
    amount,
    creditsRemaining,
    purchaseType,
  }).catch(err => {
    console.error('[Webhook] purchase.completed failed:', err);
  });
}

/**
 * Notify tool when a user's entitlement is granted (auth code exchanged)
 */
export async function notifyEntitlementGranted(
  toolId: string,
  oneSubUserId: string,
  grantId: string,
  planId: string,
  creditsRemaining?: number
): Promise<void> {
  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'entitlement.granted', {
    oneSubUserId,
    userEmail,
    grantId,
    planId,
    status: 'active',
    creditsRemaining,
  }).catch(err => {
    console.error('[Webhook] entitlement.granted failed:', err);
  });
}

/**
 * Notify tool when a user's entitlement is revoked
 * Also invalidates the entitlement cache for immediate effect.
 */
export async function notifyEntitlementRevoked(
  toolId: string,
  oneSubUserId: string,
  reason: string,
  revokedAt: string
): Promise<void> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'entitlement.revoked', {
    oneSubUserId,
    userEmail,
    reason,
    revokedAt,
    status: 'canceled',
  }).catch(err => {
    console.error('[Webhook] entitlement.revoked failed:', err);
  });
}

/**
 * Notify tool when a user's entitlement changes (plan upgrade/downgrade)
 * Also invalidates the entitlement cache for immediate effect.
 */
export async function notifyEntitlementChanged(
  toolId: string,
  oneSubUserId: string,
  previousState: { planId?: string; features?: string[] },
  newState: { planId?: string; features?: string[] },
  creditsRemaining?: number
): Promise<void> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'entitlement.changed', {
    oneSubUserId,
    userEmail,
    previousState,
    newState,
    planId: newState.planId,
    creditsRemaining,
  }).catch(err => {
    console.error('[Webhook] entitlement.changed failed:', err);
  });
}

/**
 * Notify tool when user credits are consumed
 * NOTE: Uses consistent schema (oneSubUserId, not user_id)
 */
export async function notifyCreditsConsumed(
  toolId: string,
  oneSubUserId: string,
  amount: number,
  balanceRemaining: number,
  transactionId: string
): Promise<void> {
  sendToolWebhookInternal(toolId, 'credits.consumed', {
    oneSubUserId,           // Consistent field name
    amount,
    balanceRemaining,
    transactionId,
  }).catch(err => {
    console.error('[Webhook] credits.consumed failed:', err);
  });
}

/**
 * Notify tool when user credits are low
 */
export async function notifyUserCreditLow(
  toolId: string,
  oneSubUserId: string,
  creditBalance: number,
  threshold: number
): Promise<void> {
  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'user.credit_low', {
    oneSubUserId,
    userEmail,
    creditBalance,
    threshold,
  }).catch(err => {
    console.error('[Webhook] user.credit_low failed:', err);
  });
}

/**
 * Notify tool when user credits are depleted
 */
export async function notifyUserCreditDepleted(
  toolId: string,
  oneSubUserId: string
): Promise<void> {
  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'user.credit_depleted', {
    oneSubUserId,
    userEmail,
    creditBalance: 0,
  }).catch(err => {
    console.error('[Webhook] user.credit_depleted failed:', err);
  });
}

/**
 * Notify tool when tool status changes
 */
export async function notifyToolStatusChanged(
  toolId: string,
  toolStatus: boolean
): Promise<void> {
  sendToolWebhookInternal(toolId, 'tool.status_changed', {
    oneSubUserId: 'system', // System event, not user-specific
    toolId,
    toolStatus,
  }).catch(err => {
    console.error('[Webhook] tool.status_changed failed:', err);
  });
}

/**
 * Notify tool that immediate verification is required
 * Used for security events (fraud, admin action, etc.)
 * Also invalidates the entitlement cache to force fresh lookup.
 */
export async function notifyVerifyRequired(
  toolId: string,
  oneSubUserId: string,
  reason: string
): Promise<void> {
  // Invalidate cache to force fresh verification
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  const userEmail = await getUserEmail(oneSubUserId);

  sendToolWebhookInternal(toolId, 'verify.required', {
    oneSubUserId,
    userEmail,
    reason,
  }).catch(err => {
    console.error('[Webhook] verify.required failed:', err);
  });
}

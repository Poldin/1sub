/**
 * Vendor Webhooks Service
 *
 * CANONICAL SOURCE: All vendor webhook sending MUST use this service.
 *
 * Sends webhooks to vendors for:
 * - Subscription events
 * - Access revocation
 * - Credit consumption
 */

import { createServiceClient } from '@/infrastructure/database/client';
import { generateWebhookSignature } from '@/security';

// ============================================================================
// TYPES
// ============================================================================

export type WebhookEventType =
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'subscription.renewed'
  | 'access.revoked'
  | 'credits.consumed';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retryAfter?: number;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events?: WebhookEventType[];
}

// ============================================================================
// WEBHOOK SENDING
// ============================================================================

/**
 * Sends a webhook to a vendor endpoint.
 */
export async function sendWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  try {
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(`${timestamp}.${body}`, secret);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-1Sub-Signature': signature,
        'X-1Sub-Timestamp': String(timestamp),
      },
      body,
    });

    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After');
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}`,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
      };
    }

    return { success: true, statusCode: response.status };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets webhook config for a tool.
 */
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
// EVENT SENDERS
// ============================================================================

/**
 * Sends subscription.created webhook.
 */
export async function sendSubscriptionCreated(params: {
  toolId: string;
  userId: string;
  subscriptionId: string;
  planId: string;
}): Promise<WebhookDeliveryResult> {
  const config = await getToolWebhookConfig(params.toolId);
  if (!config) {
    return { success: true }; // No webhook configured, skip silently
  }

  if (config.events && !config.events.includes('subscription.created')) {
    return { success: true }; // Event not subscribed
  }

  const payload: WebhookPayload = {
    event: 'subscription.created',
    timestamp: new Date().toISOString(),
    data: {
      user_id: params.userId,
      subscription_id: params.subscriptionId,
      plan_id: params.planId,
    },
  };

  return sendWebhook(config.url, config.secret, payload);
}

/**
 * Sends subscription.cancelled webhook.
 */
export async function sendSubscriptionCancelled(params: {
  toolId: string;
  userId: string;
  subscriptionId: string;
  reason?: string;
}): Promise<WebhookDeliveryResult> {
  const config = await getToolWebhookConfig(params.toolId);
  if (!config) {
    return { success: true };
  }

  if (config.events && !config.events.includes('subscription.cancelled')) {
    return { success: true };
  }

  const payload: WebhookPayload = {
    event: 'subscription.cancelled',
    timestamp: new Date().toISOString(),
    data: {
      user_id: params.userId,
      subscription_id: params.subscriptionId,
      reason: params.reason,
    },
  };

  return sendWebhook(config.url, config.secret, payload);
}

/**
 * Sends access.revoked webhook.
 */
export async function sendAccessRevoked(params: {
  toolId: string;
  userId: string;
  reason: string;
}): Promise<WebhookDeliveryResult> {
  const config = await getToolWebhookConfig(params.toolId);
  if (!config) {
    return { success: true };
  }

  if (config.events && !config.events.includes('access.revoked')) {
    return { success: true };
  }

  const payload: WebhookPayload = {
    event: 'access.revoked',
    timestamp: new Date().toISOString(),
    data: {
      user_id: params.userId,
      reason: params.reason,
    },
  };

  return sendWebhook(config.url, config.secret, payload);
}

/**
 * Sends credits.consumed webhook.
 */
export async function sendCreditsConsumed(params: {
  toolId: string;
  userId: string;
  amount: number;
  balanceRemaining: number;
  transactionId: string;
}): Promise<WebhookDeliveryResult> {
  const config = await getToolWebhookConfig(params.toolId);
  if (!config) {
    return { success: true };
  }

  if (config.events && !config.events.includes('credits.consumed')) {
    return { success: true };
  }

  const payload: WebhookPayload = {
    event: 'credits.consumed',
    timestamp: new Date().toISOString(),
    data: {
      user_id: params.userId,
      amount: params.amount,
      balance_remaining: params.balanceRemaining,
      transaction_id: params.transactionId,
    },
  };

  return sendWebhook(config.url, config.secret, payload);
}

// ============================================================================
// WEBHOOK LOGGING
// ============================================================================

/**
 * Logs a webhook delivery attempt.
 */
export async function logWebhookDelivery(params: {
  toolId: string;
  eventType: WebhookEventType;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}): Promise<void> {
  const supabase = createServiceClient();

  await supabase.from('webhook_logs').insert({
    tool_id: params.toolId,
    event_type: params.eventType,
    url: params.url,
    success: params.success,
    status_code: params.statusCode,
    error: params.error,
    created_at: new Date().toISOString(),
  });
}

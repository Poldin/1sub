/**
 * Tool Webhook Utilities
 *
 * Handles outgoing webhooks from 1sub to external tools for subscription events.
 * Uses HMAC signatures for authentication (tools verify using their webhook secret).
 *
 * STATE-OF-THE-ART OPTIMIZATION:
 * - Webhooks invalidate entitlement cache immediately
 * - Vendors receive immediate notification of changes
 * - Bounded revocation: cache TTL ensures worst-case revocation time
 */

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import type { WebhookPayload, WebhookEventType } from '@/lib/tool-verification-types';
import { invalidateCachedEntitlements } from '@/lib/redis-cache';

/**
 * Get user email from auth.users table
 * 
 * @param userId - The user ID
 * @returns User email or undefined if not found
 */
async function getUserEmail(userId: string): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    
    // Query auth.users via admin API
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

/**
 * Generate HMAC signature for webhook payload
 * 
 * @param payload - The webhook payload (as string)
 * @param secret - The tool's webhook secret
 * @returns Signature in the format "t=timestamp,v1=signature"
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify webhook signature (for tools to use)
 * This is a reference implementation that tools can adapt
 * 
 * @param payload - The raw webhook payload (as string)
 * @param signature - The signature header value
 * @param secret - The webhook secret
 * @param toleranceSeconds - Allowed time drift (default 5 minutes)
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  try {
    // Parse signature header: "t=timestamp,v1=signature"
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = parseInt(timestampPart.split('=')[1]);
    const expectedSignature = signaturePart.split('=')[1];

    // Check timestamp is within tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Webhook Verification] Error:', error);
    return false;
  }
}

/**
 * Send webhook to external tool
 * 
 * @param toolId - The tool ID
 * @param eventType - The event type
 * @param eventData - The event data
 * @returns Success status
 */
export async function sendToolWebhook(
  toolId: string,
  eventType: WebhookEventType,
  eventData: WebhookPayload['data']
): Promise<boolean> {
  const supabase = await createClient();

  // ==========================================================================
  // 1. Get Tool Webhook Configuration
  // ==========================================================================
  const { data: apiKey, error: apiKeyError } = await supabase
    .from('api_keys')
    .select('metadata')
    .eq('tool_id', toolId)
    .eq('is_active', true)
    .single();

  if (apiKeyError || !apiKey) {
    console.error(`[Webhook] No API key found for tool ${toolId}:`, apiKeyError);
    return false;
  }

  const metadata = apiKey.metadata as Record<string, unknown> || {};
  const webhookUrl = metadata.webhook_url as string;
  const webhookSecret = metadata.webhook_secret as string;

  if (!webhookUrl || !webhookSecret) {
    console.log(`[Webhook] No webhook configured for tool ${toolId}`);
    return false;
  }

  // ==========================================================================
  // 2. Build Webhook Payload
  // ==========================================================================
  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    data: eventData,
  };

  const payloadString = JSON.stringify(payload);

  // ==========================================================================
  // 3. Generate Signature
  // ==========================================================================
  const signature = generateWebhookSignature(payloadString, webhookSecret);

  // ==========================================================================
  // 4. Send Webhook Request
  // ==========================================================================
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '1sub-signature': signature,
        'User-Agent': '1sub-webhooks/1.0',
      },
      body: payloadString,
    });

    if (!response.ok) {
      console.error(
        `[Webhook] Failed to send to ${webhookUrl}:`,
        response.status,
        response.statusText
      );
      return false;
    }

    console.log(`[Webhook] Successfully sent ${eventType} to tool ${toolId}`);
    return true;
  } catch (error) {
    console.error(`[Webhook] Error sending to ${webhookUrl}:`, error);
    return false;
  }
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
): Promise<boolean> {
  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);
  
  return sendToolWebhook(toolId, 'subscription.activated', {
    oneSubUserId,
    userEmail,
    planId,
    status: 'active',
    currentPeriodEnd,
    quantity: 1,
    creditsRemaining,
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
): Promise<boolean> {
  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);
  
  return sendToolWebhook(toolId, 'purchase.completed', {
    oneSubUserId,
    userEmail,
    checkoutId,
    amount,
    creditsRemaining,
    purchaseType,
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
): Promise<boolean> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);

  return sendToolWebhook(toolId, 'subscription.canceled', {
    oneSubUserId,
    userEmail,
    planId,
    status: 'canceled',
    currentPeriodEnd,
    quantity: 1,
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
  status: WebhookPayload['data']['status'],
  currentPeriodEnd: string,
  creditsRemaining?: number
): Promise<boolean> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);

  return sendToolWebhook(toolId, 'subscription.updated', {
    oneSubUserId,
    userEmail,
    planId,
    status,
    currentPeriodEnd,
    quantity: 1,
    creditsRemaining,
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
): Promise<boolean> {
  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);
  
  return sendToolWebhook(toolId, 'user.credit_low', {
    oneSubUserId,
    userEmail,
    creditBalance,
    threshold,
  });
}

/**
 * Notify tool when user credits are depleted
 */
export async function notifyUserCreditDepleted(
  toolId: string,
  oneSubUserId: string
): Promise<boolean> {
  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);
  
  return sendToolWebhook(toolId, 'user.credit_depleted', {
    oneSubUserId,
    userEmail,
    creditBalance: 0,
  });
}

/**
 * Notify tool when tool status changes
 */
export async function notifyToolStatusChanged(
  toolId: string,
  toolStatus: boolean
): Promise<boolean> {
  return sendToolWebhook(toolId, 'tool.status_changed', {
    oneSubUserId: 'system', // System event, not user-specific
    toolId,
    toolStatus,
  });
}

// ============================================================================
// NEW VENDOR INTEGRATION WEBHOOKS
// ============================================================================

/**
 * Notify tool when a user's entitlement is granted (auth code exchanged)
 */
export async function notifyEntitlementGranted(
  toolId: string,
  oneSubUserId: string,
  grantId: string,
  planId: string,
  creditsRemaining?: number
): Promise<boolean> {
  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);
  
  return sendToolWebhook(toolId, 'entitlement.granted', {
    oneSubUserId,
    userEmail,
    grantId,
    planId,
    status: 'active',
    creditsRemaining,
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
): Promise<boolean> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);

  return sendToolWebhook(toolId, 'entitlement.revoked', {
    oneSubUserId,
    userEmail,
    reason,
    revokedAt,
    status: 'canceled',
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
): Promise<boolean> {
  // Invalidate cache FIRST for immediate effect
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);

  return sendToolWebhook(toolId, 'entitlement.changed', {
    oneSubUserId,
    userEmail,
    previousState,
    newState,
    planId: newState.planId,
    creditsRemaining,
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
): Promise<boolean> {
  // Invalidate cache to force fresh verification
  await invalidateCachedEntitlements(toolId, oneSubUserId);

  // Get user email
  const userEmail = await getUserEmail(oneSubUserId);

  return sendToolWebhook(toolId, 'verify.required', {
    oneSubUserId,
    userEmail,
    reason,
  });
}




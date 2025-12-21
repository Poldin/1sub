/**
 * Types for tool verification and webhooks
 *
 * IMPORTANT: This file contains types for the SINGLE vendor integration path:
 * Authorization Code Flow -> Token Exchange -> Periodic Verification
 */

// ===========================================================================
// Webhook Types
// ===========================================================================

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';

export type PaymentStatus = 'paid' | 'failed' | 'pending';

export type WebhookEventType =
  | 'subscription.activated'
  | 'subscription.canceled'
  | 'subscription.updated'
  | 'purchase.completed'
  | 'user.credit_low'
  | 'user.credit_depleted'
  | 'tool.status_changed'
  // Vendor integration events
  | 'entitlement.granted'
  | 'entitlement.revoked'
  | 'entitlement.changed'
  | 'verify.required';

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created: number;
  data: {
    oneSubUserId: string;
    planId?: string;
    productId?: string;
    status?: SubscriptionStatus;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    quantity?: number;
    creditsRemaining?: number;
    creditBalance?: number;
    threshold?: number;
    toolId?: string;
    toolStatus?: boolean;
    sessionExpiredAt?: string;
    checkoutId?: string;
    amount?: number;
    purchaseType?: string;
    // Entitlement event fields
    grantId?: string;
    reason?: string;
    revokedAt?: string;
    previousState?: {
      planId?: string;
      features?: string[];
    };
    newState?: {
      planId?: string;
      features?: string[];
    };
  };
}

// ===========================================================================
// Tool Credentials Metadata
// ===========================================================================

export interface ToolCredentialsMetadata {
  webhook_secret?: string;
  webhook_url?: string;
  redirect_uri?: string;
  allowed_origins?: string[];
  rate_limit?: number;
  custom_data?: Record<string, unknown>;
}

// ===========================================================================
// Error Types
// ===========================================================================

export interface APIError {
  error: string;
  message: string;
  details?: unknown;
}

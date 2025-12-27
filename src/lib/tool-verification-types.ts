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

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created: number;
  data: {
    oneSubUserId: string;
    userEmail?: string; // Email of the user (for user-specific events)
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
    // Subscription event fields
    subscriptionId?: string;
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
    // Credits event fields
    transactionId?: string;
    balanceRemaining?: number;
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

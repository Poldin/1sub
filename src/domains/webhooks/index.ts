/**
 * Webhooks Domain - Public API
 *
 * CANONICAL SOURCE: All webhook operations MUST use this module.
 */

// Stripe Webhooks (incoming)
export {
  verifyStripeWebhook,
  handleStripeWebhook,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
  type WebhookResult,
} from './stripe-webhooks';

// Outbound Webhooks (UNIFIED - replaces both tool-webhooks and vendor-webhooks)
export {
  // Event senders - User lifecycle
  notifyUserRegistered,
  // Event senders - Subscription lifecycle
  notifySubscriptionCreated,
  notifySubscriptionActivated,
  notifySubscriptionCanceled,
  notifySubscriptionUpdated,
  notifyPurchaseCompleted,
  notifyEntitlementGranted,
  notifyEntitlementRevoked,
  notifyEntitlementChanged,
  notifyCreditsConsumed,
  notifyUserCreditLow,
  notifyUserCreditDepleted,
  notifyToolStatusChanged,
  notifyVerifyRequired,
  // Security - Central Kill-Switch
  notifyForceLogout,
  notifyForceLogoutAllTools,
  // Low-level functions
  sendWebhook,
  getToolWebhookConfig,
  logWebhookDelivery,
  // Types
  type WebhookEventType,
  type WebhookPayload,
  type WebhookDeliveryResult,
  type WebhookConfig,
  type ForceLogoutReason,
} from './outbound-webhooks';

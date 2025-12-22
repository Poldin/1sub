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
  // Event senders
  notifySubscriptionCreated,
  notifySubscriptionActivated,
  notifySubscriptionRenewed,
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
  // Low-level functions
  sendWebhook,
  getToolWebhookConfig,
  logWebhookDelivery,
  // Types
  type WebhookEventType,
  type WebhookPayload,
  type WebhookDeliveryResult,
  type WebhookConfig,
} from './outbound-webhooks';

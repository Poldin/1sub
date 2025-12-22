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

// Vendor Webhooks (outgoing)
export {
  sendWebhook,
  getToolWebhookConfig,
  sendSubscriptionCreated,
  sendSubscriptionCancelled,
  sendAccessRevoked,
  sendCreditsConsumed,
  logWebhookDelivery,
  type WebhookEventType,
  type WebhookPayload,
  type WebhookDeliveryResult,
  type WebhookConfig,
} from './vendor-webhooks';

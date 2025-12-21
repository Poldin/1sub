/**
 * @1sub/sdk - Official 1Sub SDK for Node.js
 *
 * Vendor Integration Flow:
 * 1. User clicks "Launch Tool" on 1Sub -> redirected to your callback with auth code
 * 2. Exchange auth code for verification token: onesub.authorize.exchangeCode()
 * 3. Verify periodically (every 5 min): onesub.verify.verify()
 *
 * @example
 * ```typescript
 * import { OneSub } from '@1sub/sdk';
 *
 * const onesub = new OneSub({
 *   apiKey: process.env.ONESUB_API_KEY!,
 *   webhookSecret: process.env.ONESUB_WEBHOOK_SECRET,
 * });
 *
 * // In callback handler - exchange auth code for verification token
 * const result = await onesub.authorize.exchangeCode({
 *   code: req.query.code,
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 *
 * // Store in session
 * session.verificationToken = result.verificationToken;
 * session.entitlements = result.entitlements;
 *
 * // Verify every 5 minutes
 * const verified = await onesub.verify.verify({
 *   verificationToken: session.verificationToken,
 * });
 *
 * if (!verified.valid) {
 *   session.destroy();
 * }
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { OneSub } from './client.js';

// Types
export type {
  // Configuration
  OneSubConfig,

  // Credits types
  ConsumeCreditsRequest,
  ConsumeCreditsResponse,
  InsufficientCreditsError,

  // Authorization types (vendor integration)
  Entitlements,
  ExchangeAuthCodeRequest,
  ExchangeAuthCodeResponse,
  VerifyTokenRequest,
  VerifyTokenResponse,
  VerifyTokenSuccessResponse,
  VerifyTokenRevokedResponse,

  // Webhook types
  WebhookEventType,
  WebhookEvent,
  WebhookEventData,
  SubscriptionActivatedData,
  SubscriptionCanceledData,
  SubscriptionUpdatedData,
  PurchaseCompletedData,
  CreditLowData,
  CreditDepletedData,
  ToolStatusChangedData,
  // Vendor integration webhook events
  EntitlementGrantedData,
  EntitlementRevokedData,
  EntitlementChangedData,
  VerifyRequiredData,

  // Error types
  OneSubError,
  RateLimitError,
} from './types.js';

// Verification state type from verify API
export type { VerificationState } from './api/verify.js';

// Errors
export {
  OneSubSDKError,
  AuthenticationError,
  NotFoundError,
  RateLimitExceededError,
  InsufficientCreditsSDKError,
  ValidationError,
  InvalidCodeError,
  WebhookVerificationError,
  NetworkError,
  TimeoutError,
} from './utils/errors.js';

// Utilities
export { hashEmail } from './utils/crypto.js';

// Webhook utilities
export type { WebhookHandler, WebhookHandlers } from './webhooks/index.js';

// Re-export middleware types for convenience
export type {
  OneSubRequest,
  EntitlementMiddlewareOptions,
  WebhookMiddlewareOptions,
  ExpressMiddleware,
} from './middleware/express.js';

export type {
  NextEntitlementOptions,
  EntitlementCheckResult,
  NextMiddleware,
} from './middleware/nextjs.js';

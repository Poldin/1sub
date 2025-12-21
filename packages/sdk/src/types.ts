/**
 * 1Sub SDK Type Definitions
 * @packageDocumentation
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for the 1Sub client
 */
export interface OneSubConfig {
  /**
   * Your tool's API key (format: sk-tool-xxx)
   * Get this from the 1Sub vendor dashboard
   */
  apiKey: string;

  /**
   * Webhook secret for verifying webhook signatures (format: whsec-xxx)
   * Optional - only needed if you're receiving webhooks
   */
  webhookSecret?: string;

  /**
   * Base URL for the 1Sub API
   * @default "https://1sub.io/api/v1"
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Enable response caching for subscription verification
   * @default false
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds
   * @default 60000 (1 minute)
   */
  cacheTTL?: number;

  /**
   * Number of retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Subscription status values
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';

/**
 * Payment status values
 */
export type PaymentStatus = 'paid' | 'failed' | 'pending';

/**
 * Request parameters for subscription verification
 */
export interface VerifySubscriptionRequest {
  /**
   * The user's 1Sub ID (fastest lookup method)
   */
  oneSubUserId?: string;

  /**
   * Your tool's internal user ID (requires prior linking)
   */
  toolUserId?: string;

  /**
   * SHA-256 hash of user's email (lowercase, trimmed)
   * Slower than direct ID lookup, rate limited to 30/min
   */
  emailSha256?: string;
}

/**
 * Response from subscription verification
 */
export interface VerifySubscriptionResponse {
  /**
   * The user's 1Sub ID - cache this for future lookups
   */
  oneSubUserId?: string;

  /**
   * Whether the subscription is currently active
   */
  active: boolean;

  /**
   * Current subscription status
   */
  status: SubscriptionStatus;

  /**
   * Plan identifier (e.g., 'monthly', 'yearly')
   */
  planId: string;

  /**
   * Tool/product identifier
   */
  productId: string;

  /**
   * Start of current billing period (ISO 8601)
   */
  currentPeriodStart: string;

  /**
   * End of current billing period (ISO 8601)
   */
  currentPeriodEnd: string;

  /**
   * Whether subscription will cancel at period end
   */
  cancelAtPeriodEnd: boolean;

  /**
   * Number of seats (always 1 currently)
   */
  seats: number;

  /**
   * Quantity (always 1 currently)
   */
  quantity: number;

  /**
   * Trial end date if applicable (ISO 8601)
   */
  trialEndsAt?: string;

  /**
   * Status of last payment attempt
   */
  lastPaymentStatus?: PaymentStatus;

  /**
   * User's remaining credit balance
   */
  creditsRemaining?: number;
}

// ============================================================================
// Credits Types
// ============================================================================

/**
 * Request parameters for consuming credits
 */
export interface ConsumeCreditsRequest {
  /**
   * The user's 1Sub ID
   */
  userId: string;

  /**
   * Amount of credits to consume (1 - 1,000,000)
   */
  amount: number;

  /**
   * Reason for credit consumption (for audit logs)
   */
  reason: string;

  /**
   * Unique key for idempotent requests
   * Use the same key to safely retry failed requests
   */
  idempotencyKey: string;
}

/**
 * Response from credit consumption
 */
export interface ConsumeCreditsResponse {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * User's new credit balance after consumption
   */
  newBalance: number;

  /**
   * Unique transaction ID for this operation
   */
  transactionId: string;

  /**
   * True if this was a duplicate request (same idempotency key)
   */
  isDuplicate?: boolean;
}

/**
 * Error response when credits are insufficient
 */
export interface InsufficientCreditsError {
  /**
   * Error type identifier
   */
  error: 'INSUFFICIENT_CREDITS';

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * HTTP status code (always 400 for insufficient credits)
   */
  statusCode: number;

  /**
   * User's current credit balance
   */
  currentBalance: number;

  /**
   * Amount that was requested
   */
  required: number;

  /**
   * How many more credits are needed
   */
  shortfall: number;
}

// ============================================================================
// Link Types
// ============================================================================

/**
 * Request parameters for exchanging a link code
 */
export interface ExchangeCodeRequest {
  /**
   * The 6-character link code from 1Sub
   */
  code: string;

  /**
   * Your tool's internal user ID to link
   */
  toolUserId: string;
}

/**
 * Response from link code exchange
 */
export interface ExchangeCodeResponse {
  /**
   * Whether the linking succeeded
   */
  linked: boolean;

  /**
   * The user's 1Sub ID - store this for future API calls
   */
  oneSubUserId: string;

  /**
   * Your tool's user ID that was linked
   */
  toolUserId: string;

  /**
   * When the link was created (ISO 8601)
   */
  linkedAt: string;
}

// ============================================================================
// Authorization Types (Vendor Integration)
// ============================================================================

/**
 * Entitlements returned from authorization and verification
 */
export interface Entitlements {
  /**
   * The subscription plan ID (e.g., 'monthly', 'yearly', 'pro')
   */
  planId: string | null;

  /**
   * Credits remaining for this user
   */
  creditsRemaining: number | null;

  /**
   * Feature flags enabled for this user
   */
  features: string[];

  /**
   * Usage limits for this user
   */
  limits: Record<string, number>;
}

/**
 * Request parameters for exchanging an authorization code
 */
export interface ExchangeAuthCodeRequest {
  /**
   * The authorization code from the redirect
   */
  code: string;

  /**
   * The redirect URI (must match the one used to generate the code)
   */
  redirectUri?: string;
}

/**
 * Response from authorization code exchange
 */
export interface ExchangeAuthCodeResponse {
  /**
   * Whether the exchange succeeded
   */
  valid: true;

  /**
   * Unique grant ID for this authorization
   */
  grantId: string;

  /**
   * The user's 1Sub ID
   */
  onesubUserId: string;

  /**
   * User's entitlements
   */
  entitlements: Entitlements;

  /**
   * Verification token for periodic revalidation
   */
  verificationToken: string;

  /**
   * Unix timestamp when the token expires
   */
  expiresAt: number;
}

/**
 * Request parameters for token verification
 */
export interface VerifyTokenRequest {
  /**
   * The verification token from exchange or previous verify call
   */
  verificationToken: string;
}

/**
 * Successful response from token verification
 */
export interface VerifyTokenSuccessResponse {
  /**
   * Whether the token is valid
   */
  valid: true;

  /**
   * The user's 1Sub ID
   */
  onesubUserId: string;

  /**
   * Current entitlements
   */
  entitlements: Entitlements;

  /**
   * New verification token (tokens roll on each verify)
   */
  verificationToken: string;

  /**
   * Unix timestamp - safe to use cached data until this time
   */
  cacheUntil: number;

  /**
   * Unix timestamp - must verify again before this time
   */
  nextVerificationBefore: number;
}

/**
 * Response when verification fails (revoked, expired, etc.)
 */
export interface VerifyTokenRevokedResponse {
  /**
   * Token is not valid
   */
  valid: false;

  /**
   * Error code
   */
  error: string;

  /**
   * Reason for failure
   */
  reason: string;

  /**
   * Unix timestamp when access was revoked (if applicable)
   */
  revokedAt?: number;

  /**
   * What the vendor should do
   */
  action: 'terminate_session' | 'reauthenticate';
}

/**
 * Union type for verification response
 */
export type VerifyTokenResponse = VerifyTokenSuccessResponse | VerifyTokenRevokedResponse;

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'subscription.activated'
  | 'subscription.canceled'
  | 'subscription.updated'
  | 'purchase.completed'
  | 'user.credit_low'
  | 'user.credit_depleted'
  | 'tool.status_changed'
  // New vendor integration events
  | 'entitlement.granted'
  | 'entitlement.revoked'
  | 'entitlement.changed'
  | 'verify.required';

/**
 * Base webhook event structure
 */
export interface WebhookEvent<T = WebhookEventData> {
  /**
   * Unique event ID
   */
  id: string;

  /**
   * Event type
   */
  type: WebhookEventType;

  /**
   * Unix timestamp when event was created
   */
  created: number;

  /**
   * Event-specific data
   */
  data: T;
}

/**
 * Base webhook event data
 */
export interface WebhookEventData {
  /**
   * The user's 1Sub ID
   */
  oneSubUserId: string;
}

/**
 * Subscription activated event data
 */
export interface SubscriptionActivatedData extends WebhookEventData {
  planId: string;
  status: 'active' | 'trialing';
  currentPeriodEnd: string;
  quantity: number;
  creditsRemaining?: number;
}

/**
 * Subscription canceled event data
 */
export interface SubscriptionCanceledData extends WebhookEventData {
  planId: string;
  status: 'canceled';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/**
 * Subscription updated event data
 */
export interface SubscriptionUpdatedData extends WebhookEventData {
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  previousPlanId?: string;
  creditsRemaining?: number;
}

/**
 * Purchase completed event data
 */
export interface PurchaseCompletedData extends WebhookEventData {
  checkoutId: string;
  amount: number;
  currency: string;
  productType: 'credits' | 'one_time';
  creditsAdded?: number;
}

/**
 * Credit low event data
 */
export interface CreditLowData extends WebhookEventData {
  balance: number;
  threshold: number;
}

/**
 * Credit depleted event data
 */
export interface CreditDepletedData extends WebhookEventData {
  balance: 0;
}

/**
 * Tool status changed event data
 */
export interface ToolStatusChangedData {
  toolId: string;
  status: 'active' | 'suspended' | 'pending';
  reason?: string;
}

/**
 * Entitlement granted event data
 */
export interface EntitlementGrantedData extends WebhookEventData {
  grantId: string;
  planId: string;
  status: 'active';
  creditsRemaining?: number;
}

/**
 * Entitlement revoked event data
 */
export interface EntitlementRevokedData extends WebhookEventData {
  reason: string;
  revokedAt: string;
  status: 'canceled';
}

/**
 * Entitlement changed event data
 */
export interface EntitlementChangedData extends WebhookEventData {
  previousState: {
    planId?: string;
    features?: string[];
  };
  newState: {
    planId?: string;
    features?: string[];
  };
  planId?: string;
  creditsRemaining?: number;
}

/**
 * Verify required event data
 */
export interface VerifyRequiredData extends WebhookEventData {
  reason: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error response
 */
export interface OneSubError {
  /**
   * Error code
   */
  error: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;
}

/**
 * Rate limit error details
 */
export interface RateLimitError extends OneSubError {
  error: 'RATE_LIMIT_EXCEEDED';

  /**
   * Seconds until rate limit resets
   */
  retryAfter: number;

  /**
   * Request limit per window
   */
  limit: number;

  /**
   * Remaining requests in window
   */
  remaining: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request options for HTTP client
 */
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * Response from HTTP client
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

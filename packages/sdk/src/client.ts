import type { OneSubConfig } from './types.js';
import { HttpClient } from './utils/http.js';
import { CreditsApi } from './api/credits.js';
import { AuthorizeApi } from './api/authorize.js';
import { VerifyApi } from './api/verify.js';
import { WebhooksClient } from './webhooks/index.js';
import { createExpressMiddleware, type ExpressMiddleware } from './middleware/express.js';
import { createNextMiddleware, type NextMiddleware } from './middleware/nextjs.js';
import { ValidationError } from './utils/errors.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<OneSubConfig> = {
  baseUrl: 'https://1sub.io/api/v1',
  timeout: 30000,
  cache: false,
  cacheTTL: 60000,
  maxRetries: 3,
  debug: false,
};

/**
 * 1Sub SDK Client
 *
 * The main entry point for interacting with the 1Sub API.
 *
 * @example
 * ```typescript
 * import { OneSub } from '@1sub/sdk';
 *
 * const onesub = new OneSub({
 *   apiKey: process.env.ONESUB_API_KEY!,
 *   webhookSecret: process.env.ONESUB_WEBHOOK_SECRET,
 *   cache: true,
 * });
 *
 * // Verify subscription
 * const subscription = await onesub.subscriptions.verifyByEmail('user@example.com');
 *
 * // Consume credits
 * const result = await onesub.credits.consume({
 *   userId: subscription.oneSubUserId!,
 *   amount: 10,
 *   reason: 'Image generation',
 *   idempotencyKey: 'req-123',
 * });
 *
 * // Handle webhooks
 * onesub.webhooks.on('subscription.activated', async (event) => {
 *   console.log(`User ${event.data.oneSubUserId} subscribed!`);
 * });
 * ```
 */
export class OneSub {
  /**
   * SDK version
   */
  static readonly VERSION = '1.0.0';

  /**
   * SDK configuration
   */
  readonly config: Required<OneSubConfig>;

  /**
   * HTTP client for API requests
   */
  private readonly http: HttpClient;

  /**
   * Credits API
   *
   * @example
   * ```typescript
   * const result = await onesub.credits.consume({
   *   userId: 'uuid-123',
   *   amount: 10,
   *   reason: 'API call',
   *   idempotencyKey: 'req-abc',
   * });
   * ```
   */
  readonly credits: CreditsApi;

  /**
   * Authorization API (for vendor integration flow)
   *
   * Use this for the new vendor integration flow where users are
   * redirected from 1Sub to your app with an authorization code.
   *
   * @example
   * ```typescript
   * // In your callback handler
   * const result = await onesub.authorize.exchangeCode({
   *   code: req.query.code,
   *   redirectUri: 'https://yourapp.com/callback',
   * });
   *
   * // Store verification token for periodic checks
   * session.verificationToken = result.verificationToken;
   * ```
   */
  readonly authorize: AuthorizeApi;

  /**
   * Verification API (for periodic entitlement checks)
   *
   * Call verify() periodically (every 5 minutes) to ensure
   * user access is still valid. Tokens roll on each verify.
   *
   * @example
   * ```typescript
   * const result = await onesub.verify.verify({
   *   verificationToken: session.verificationToken,
   * });
   *
   * if (!result.valid) {
   *   session.destroy();
   *   return res.redirect('/login?reason=access_revoked');
   * }
   *
   * // Update session with new token
   * session.verificationToken = result.verificationToken;
   * ```
   */
  readonly verify: VerifyApi;

  /**
   * Webhooks client
   *
   * @example
   * ```typescript
   * // Verify webhook signature
   * const isValid = onesub.webhooks.verify(rawBody, signature);
   *
   * // Register event handlers
   * onesub.webhooks.on('subscription.activated', (event) => {
   *   console.log(`User ${event.data.oneSubUserId} subscribed!`);
   * });
   * ```
   */
  readonly webhooks: WebhooksClient;

  /**
   * Express middleware utilities
   *
   * @example
   * ```typescript
   * app.use('/premium', onesub.express.requireSubscription({
   *   getUserId: (req) => req.session.oneSubUserId,
   * }));
   * ```
   */
  readonly express: ExpressMiddleware;

  /**
   * Next.js middleware utilities
   *
   * @example
   * ```typescript
   * export const middleware = onesub.next.withSubscription({
   *   getUserId: (req) => req.cookies.get('oneSubUserId')?.value,
   *   noSubscriptionRedirect: '/subscribe',
   * });
   * ```
   */
  readonly next: NextMiddleware;

  /**
   * Create a new 1Sub client
   *
   * @param config - Client configuration
   * @throws {ValidationError} If API key is missing or invalid
   */
  constructor(config: OneSubConfig) {
    // Validate required config
    if (!config.apiKey) {
      throw new ValidationError('apiKey is required');
    }

    if (!config.apiKey.startsWith('sk-tool-')) {
      throw new ValidationError(
        'Invalid API key format. Expected format: sk-tool-xxx'
      );
    }

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<OneSubConfig>;

    // Initialize HTTP client
    this.http = new HttpClient(this.config);

    // Initialize API clients
    this.credits = new CreditsApi(this.http);
    this.authorize = new AuthorizeApi(this.http);
    this.verify = new VerifyApi(this.http);

    // Initialize webhooks client
    this.webhooks = new WebhooksClient(
      config.webhookSecret || '',
      300 // 5 minute tolerance
    );

    // Initialize middleware
    this.express = createExpressMiddleware(this);
    this.next = createNextMiddleware(this);
  }

  /**
   * Create a new client instance
   * Alternative to using `new OneSub(config)`
   *
   * @example
   * ```typescript
   * const onesub = OneSub.create({
   *   apiKey: process.env.ONESUB_API_KEY!,
   * });
   * ```
   */
  static create(config: OneSubConfig): OneSub {
    return new OneSub(config);
  }

  /**
   * Destroy the client and cleanup resources
   * Call this when you're done using the client to prevent memory leaks
   */
  destroy(): void {
    this.webhooks.clearProcessed();
  }
}

// Export types
export type { OneSubConfig };

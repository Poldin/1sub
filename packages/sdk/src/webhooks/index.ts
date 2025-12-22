import type {
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
  SubscriptionActivatedData,
  SubscriptionCanceledData,
  SubscriptionUpdatedData,
  PurchaseCompletedData,
  CreditLowData,
  CreditDepletedData,
  ToolStatusChangedData,
  EntitlementGrantedData,
  EntitlementRevokedData,
  EntitlementChangedData,
  VerifyRequiredData,
} from '../types.js';
import { verifySignature, generateSignature } from '../utils/crypto.js';
import { WebhookVerificationError } from '../utils/errors.js';

/**
 * Webhook event handler type
 */
export type WebhookHandler<T = WebhookEventData> = (
  event: WebhookEvent<T>
) => void | Promise<void>;

/**
 * Webhook event handlers map
 */
export interface WebhookHandlers {
  'subscription.activated'?: WebhookHandler<SubscriptionActivatedData>;
  'subscription.canceled'?: WebhookHandler<SubscriptionCanceledData>;
  'subscription.updated'?: WebhookHandler<SubscriptionUpdatedData>;
  'purchase.completed'?: WebhookHandler<PurchaseCompletedData>;
  'user.credit_low'?: WebhookHandler<CreditLowData>;
  'user.credit_depleted'?: WebhookHandler<CreditDepletedData>;
  'tool.status_changed'?: WebhookHandler<ToolStatusChangedData>;
  'entitlement.granted'?: WebhookHandler<EntitlementGrantedData>;
  'entitlement.revoked'?: WebhookHandler<EntitlementRevokedData>;
  'entitlement.changed'?: WebhookHandler<EntitlementChangedData>;
  'verify.required'?: WebhookHandler<VerifyRequiredData>;
}

/**
 * Webhooks client for verifying and handling webhook events
 */
export class WebhooksClient {
  private readonly secret: string;
  private readonly toleranceSeconds: number;
  private handlers: WebhookHandlers = {};
  private processedEvents = new Set<string>();
  private readonly maxProcessedEvents = 10000;

  constructor(secret: string, toleranceSeconds: number = 300) {
    this.secret = secret;
    this.toleranceSeconds = toleranceSeconds;
  }

  /**
   * Verify a webhook signature
   *
   * @param payload - Raw request body (string, not parsed JSON)
   * @param signature - Value of the X-1Sub-Signature header
   * @returns true if signature is valid
   *
   * @example
   * ```typescript
   * const isValid = onesub.webhooks.verify(rawBody, signature);
   * if (!isValid) {
   *   return res.status(401).send('Invalid signature');
   * }
   * ```
   */
  verify(payload: string, signature: string): boolean {
    if (!payload || !signature) {
      return false;
    }

    return verifySignature(payload, signature, this.secret, this.toleranceSeconds);
  }

  /**
   * Verify and throw if invalid
   *
   * @param payload - Raw request body
   * @param signature - Value of the X-1Sub-Signature header
   * @throws {WebhookVerificationError} If signature is invalid
   *
   * @example
   * ```typescript
   * try {
   *   onesub.webhooks.verifyOrThrow(rawBody, signature);
   * } catch (error) {
   *   return res.status(401).send('Invalid signature');
   * }
   * ```
   */
  verifyOrThrow(payload: string, signature: string): void {
    if (!this.verify(payload, signature)) {
      throw new WebhookVerificationError();
    }
  }

  /**
   * Parse and verify a webhook event
   *
   * @param payload - Raw request body
   * @param signature - Value of the X-1Sub-Signature header
   * @returns Parsed webhook event
   * @throws {WebhookVerificationError} If signature is invalid
   *
   * @example
   * ```typescript
   * const event = onesub.webhooks.constructEvent(rawBody, signature);
   * console.log(`Received event: ${event.type}`);
   * ```
   */
  constructEvent<T = WebhookEventData>(
    payload: string,
    signature: string
  ): WebhookEvent<T> {
    this.verifyOrThrow(payload, signature);

    try {
      const event = JSON.parse(payload) as WebhookEvent<T>;
      return event;
    } catch {
      throw new WebhookVerificationError('Invalid webhook payload');
    }
  }

  /**
   * Register a handler for a specific event type
   *
   * @example
   * ```typescript
   * onesub.webhooks.on('subscription.activated', async (event) => {
   *   console.log(`User ${event.data.oneSubUserId} subscribed!`);
   *   await sendWelcomeEmail(event.data.oneSubUserId);
   * });
   * ```
   */
  on<K extends WebhookEventType>(
    eventType: K,
    handler: WebhookHandlers[K]
  ): this {
    this.handlers[eventType] = handler as WebhookHandlers[K];
    return this;
  }

  /**
   * Remove a handler for a specific event type
   */
  off(eventType: WebhookEventType): this {
    delete this.handlers[eventType];
    return this;
  }

  /**
   * Handle a webhook event by dispatching to registered handlers
   *
   * @param event - The webhook event to handle
   * @returns true if event was handled, false if no handler registered
   *
   * @example
   * ```typescript
   * const event = onesub.webhooks.constructEvent(rawBody, signature);
   * const handled = await onesub.webhooks.handle(event);
   * ```
   */
  async handle(event: WebhookEvent): Promise<boolean> {
    // Check for duplicate events
    if (this.processedEvents.has(event.id)) {
      return true; // Already processed
    }

    const handler = this.handlers[event.type];
    if (!handler) {
      return false;
    }

    // Mark as processed before handling to prevent duplicate processing
    this.markProcessed(event.id);

    await handler(event as never);
    return true;
  }

  /**
   * Process a raw webhook request (verify, parse, and handle)
   *
   * @param payload - Raw request body
   * @param signature - Value of the X-1Sub-Signature header
   * @returns The parsed event after handling
   *
   * @example
   * ```typescript
   * app.post('/webhooks/1sub', async (req, res) => {
   *   try {
   *     await onesub.webhooks.process(req.body, req.headers['x-1sub-signature']);
   *     res.json({ received: true });
   *   } catch (error) {
   *     res.status(401).send('Invalid signature');
   *   }
   * });
   * ```
   */
  async process(payload: string, signature: string): Promise<WebhookEvent> {
    const event = this.constructEvent(payload, signature);
    await this.handle(event);
    return event;
  }

  /**
   * Check if an event has already been processed
   */
  isProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  /**
   * Mark an event as processed (for manual deduplication)
   */
  markProcessed(eventId: string): void {
    // Prevent memory leak by limiting stored event IDs
    if (this.processedEvents.size >= this.maxProcessedEvents) {
      const firstId = this.processedEvents.values().next().value;
      if (firstId) {
        this.processedEvents.delete(firstId);
      }
    }
    this.processedEvents.add(eventId);
  }

  /**
   * Clear all processed event IDs
   */
  clearProcessed(): void {
    this.processedEvents.clear();
  }

  /**
   * Generate a webhook signature (for testing purposes)
   *
   * @example
   * ```typescript
   * // In tests
   * const payload = JSON.stringify({ type: 'subscription.activated', ... });
   * const signature = onesub.webhooks.generateTestSignature(payload);
   * ```
   */
  generateTestSignature(payload: string): string {
    return generateSignature(payload, this.secret);
  }

  /**
   * Create a test event (for testing purposes)
   */
  createTestEvent<T extends WebhookEventType>(
    type: T,
    data: WebhookHandlers[T] extends WebhookHandler<infer D> ? D : never
  ): WebhookEvent<typeof data> {
    return {
      id: `evt_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      created: Math.floor(Date.now() / 1000),
      data,
    };
  }
}

// Re-export types for convenience
export type {
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
  SubscriptionActivatedData,
  SubscriptionCanceledData,
  SubscriptionUpdatedData,
  PurchaseCompletedData,
  CreditLowData,
  CreditDepletedData,
  ToolStatusChangedData,
  EntitlementGrantedData,
  EntitlementRevokedData,
  EntitlementChangedData,
  VerifyRequiredData,
};

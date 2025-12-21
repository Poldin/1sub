import type {
  ConsumeCreditsRequest,
  ConsumeCreditsResponse,
} from '../types.js';
import { HttpClient } from '../utils/http.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Credits API client
 */
export class CreditsApi {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /**
   * Consume credits from a user's balance
   *
   * @example
   * ```typescript
   * const result = await onesub.credits.consume({
   *   userId: 'uuid-123',
   *   amount: 10,
   *   reason: 'Image generation',
   *   idempotencyKey: 'req-abc-123'
   * });
   *
   * console.log(`New balance: ${result.newBalance}`);
   * ```
   *
   * @throws {InsufficientCreditsError} When user doesn't have enough credits
   */
  async consume(params: ConsumeCreditsRequest): Promise<ConsumeCreditsResponse> {
    // Validate required fields
    if (!params.userId || typeof params.userId !== 'string') {
      throw new ValidationError('userId must be a non-empty string');
    }

    if (typeof params.amount !== 'number' || params.amount <= 0) {
      throw new ValidationError('amount must be a positive number');
    }

    if (params.amount > 1000000) {
      throw new ValidationError('amount cannot exceed 1,000,000');
    }

    if (!params.reason || typeof params.reason !== 'string') {
      throw new ValidationError('reason must be a non-empty string');
    }

    if (params.reason.length > 500) {
      throw new ValidationError('reason cannot exceed 500 characters');
    }

    if (!params.idempotencyKey || typeof params.idempotencyKey !== 'string') {
      throw new ValidationError('idempotencyKey must be a non-empty string');
    }

    if (params.idempotencyKey.length > 255) {
      throw new ValidationError('idempotencyKey cannot exceed 255 characters');
    }

    // Make API request
    const response = await this.http.post<{
      success: boolean;
      new_balance: number;
      transaction_id: string;
      is_duplicate?: boolean;
    }>('/credits/consume', {
      user_id: params.userId,
      amount: params.amount,
      reason: params.reason,
      idempotency_key: params.idempotencyKey,
    });

    // Transform snake_case response to camelCase
    return {
      success: response.data.success,
      newBalance: response.data.new_balance,
      transactionId: response.data.transaction_id,
      isDuplicate: response.data.is_duplicate,
    };
  }

  /**
   * Try to consume credits, returning success/failure instead of throwing
   *
   * @example
   * ```typescript
   * const result = await onesub.credits.tryConsume({
   *   userId: 'uuid-123',
   *   amount: 10,
   *   reason: 'Image generation',
   *   idempotencyKey: 'req-abc-123'
   * });
   *
   * if (result.success) {
   *   console.log(`Credits consumed, new balance: ${result.newBalance}`);
   * } else {
   *   console.log(`Failed: ${result.error}`);
   * }
   * ```
   */
  async tryConsume(
    params: ConsumeCreditsRequest
  ): Promise<
    | { success: true; data: ConsumeCreditsResponse }
    | { success: false; error: string; shortfall?: number }
  > {
    try {
      const data = await this.consume(params);
      return { success: true, data };
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's an insufficient credits error
        if ('shortfall' in error) {
          return {
            success: false,
            error: error.message,
            shortfall: (error as { shortfall: number }).shortfall,
          };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Unknown error' };
    }
  }

  /**
   * Check if user has enough credits for an operation
   * Note: This doesn't reserve credits, so balance may change between check and consume
   *
   * @example
   * ```typescript
   * const hasCredits = await onesub.credits.hasEnough('uuid-123', 100);
   * if (hasCredits) {
   *   // Proceed with operation
   * }
   * ```
   */
  async hasEnough(userId: string, amount: number): Promise<boolean> {
    // NOTE: This method requires a verification token, which is not available in this context
    // It's recommended to check credits from the entitlements returned by the verify endpoint
    // This is a workaround that will be deprecated
    console.warn('hasEnough() is deprecated. Check credits from verify() entitlements instead.');

    // Return false as we can't check without a verification token in the new flow
    return false;
  }

  /**
   * Generate a unique idempotency key
   * Useful for creating request-specific keys
   *
   * @example
   * ```typescript
   * const key = onesub.credits.generateIdempotencyKey('image-gen', userId, requestId);
   * ```
   */
  generateIdempotencyKey(...parts: string[]): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return [...parts, timestamp, random].join('-');
  }
}

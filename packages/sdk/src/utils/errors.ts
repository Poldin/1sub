import type { OneSubError, RateLimitError, InsufficientCreditsError } from '../types.js';

/**
 * Base error class for 1Sub SDK errors
 */
export class OneSubSDKError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'OneSubSDKError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OneSubSDKError);
    }
  }

  /**
   * Convert error to plain object
   */
  toJSON(): OneSubError {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Error thrown when API key is invalid or missing
 */
export class AuthenticationError extends OneSubSDKError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when resource is not found
 */
export class NotFoundError extends OneSubSDKError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends OneSubSDKError {
  public readonly retryAfter: number;
  public readonly limit: number;
  public readonly remaining: number;

  constructor(retryAfter: number, limit: number, remaining: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
    this.name = 'RateLimitExceededError';
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
  }

  toJSON(): RateLimitError {
    return {
      error: 'RATE_LIMIT_EXCEEDED',
      message: this.message,
      statusCode: this.statusCode,
      retryAfter: this.retryAfter,
      limit: this.limit,
      remaining: this.remaining,
    };
  }
}

/**
 * Error thrown when user has insufficient credits
 */
export class InsufficientCreditsSDKError extends OneSubSDKError {
  public readonly currentBalance: number;
  public readonly required: number;
  public readonly shortfall: number;

  constructor(currentBalance: number, required: number) {
    super(
      `Insufficient credits. Current: ${currentBalance}, Required: ${required}`,
      'INSUFFICIENT_CREDITS',
      400
    );
    this.name = 'InsufficientCreditsError';
    this.currentBalance = currentBalance;
    this.required = required;
    this.shortfall = required - currentBalance;
  }

  toJSON(): InsufficientCreditsError {
    return {
      error: 'INSUFFICIENT_CREDITS',
      message: this.message,
      statusCode: this.statusCode,
      currentBalance: this.currentBalance,
      required: this.required,
      shortfall: this.shortfall,
    };
  }
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends OneSubSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when link code is invalid or expired
 */
export class InvalidCodeError extends OneSubSDKError {
  constructor(message: string = 'Invalid or expired link code') {
    super(message, 'INVALID_CODE', 400);
    this.name = 'InvalidCodeError';
  }
}

/**
 * Error thrown when webhook signature verification fails
 */
export class WebhookVerificationError extends OneSubSDKError {
  constructor(message: string = 'Invalid webhook signature') {
    super(message, 'WEBHOOK_VERIFICATION_FAILED', 401);
    this.name = 'WebhookVerificationError';
  }
}

/**
 * Error thrown for network/connection issues
 */
export class NetworkError extends OneSubSDKError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when request times out
 */
export class TimeoutError extends OneSubSDKError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT', 0);
    this.name = 'TimeoutError';
  }
}

/**
 * Parse API error response and throw appropriate error
 */
export function parseApiError(status: number, body: unknown): never {
  const errorBody = body as Record<string, unknown> | undefined;
  const message = (errorBody?.message as string) || (errorBody?.error as string) || 'Unknown error';

  switch (status) {
    case 401:
      throw new AuthenticationError(message);
    case 404:
      throw new NotFoundError(message);
    case 429: {
      const retryAfter = (errorBody?.retryAfter as number) || 60;
      const limit = (errorBody?.limit as number) || 100;
      const remaining = (errorBody?.remaining as number) || 0;
      throw new RateLimitExceededError(retryAfter, limit, remaining);
    }
    case 400: {
      if (errorBody?.error === 'INSUFFICIENT_CREDITS') {
        const current = (errorBody?.current_balance as number) || 0;
        const required = (errorBody?.required as number) || 0;
        throw new InsufficientCreditsSDKError(current, required);
      }
      throw new ValidationError(message, errorBody as Record<string, unknown>);
    }
    default:
      throw new OneSubSDKError(message, 'API_ERROR', status, errorBody as Record<string, unknown>);
  }
}

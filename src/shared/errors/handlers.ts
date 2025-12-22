/**
 * Error Handlers and Utilities
 *
 * Provides error handling, response creation, and recovery mechanisms.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ApplicationError, ExternalServiceError, ERROR_CODES, type ErrorCode } from './classes';

// ============================================================================
// API ERROR RESPONSE HANDLERS
// ============================================================================

/**
 * Handle errors and return appropriate NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);

  // Handle ApplicationError instances
  if (error instanceof ApplicationError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; message: string; details?: string };
    const statusCode = mapSupabaseErrorCode(dbError.code);

    return NextResponse.json(
      {
        error: 'DATABASE_ERROR',
        message: dbError.message || 'Database operation failed',
        details: dbError.details ? { supabaseError: dbError.details } : undefined,
      },
      { status: statusCode }
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    if (error.message.includes('JWT') || error.message.includes('token')) {
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR', message: error.message },
        { status: 401 }
      );
    }

    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return NextResponse.json(
        { error: 'AUTHORIZATION_ERROR', message: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' },
    { status: 500 }
  );
}

/**
 * Map Supabase error codes to HTTP status codes
 */
function mapSupabaseErrorCode(code: string): number {
  const errorMap: Record<string, number> = {
    '23505': 409, // unique_violation
    '23503': 400, // foreign_key_violation
    '23502': 400, // not_null_violation
    '22P02': 400, // invalid_text_representation
    '42501': 403, // insufficient_privilege
    '42P01': 500, // undefined_table
    'PGRST116': 404, // not_found
  };

  return errorMap[code] || 500;
}

/**
 * Create a standardized error response
 * Logs detailed error server-side, returns generic message to user
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  detailedError?: unknown,
  additionalData?: Record<string, unknown>
): NextResponse {
  const error = ERROR_CODES[errorCode];

  if (detailedError) {
    console.error(`[API Error] ${error.code}:`, detailedError);
  }

  const response: Record<string, unknown> = {
    error: error.code,
    message: error.message,
  };

  if (additionalData) {
    Object.assign(response, additionalData);
  }

  return NextResponse.json(response, { status: error.statusCode });
}

/**
 * Handle unexpected errors with safe fallback
 */
export function handleUnexpectedError(error: unknown): NextResponse {
  console.error('[API Error] Unexpected error:', error);
  return createErrorResponse('INTERNAL_ERROR');
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(data, { status: statusCode });
}

/**
 * Validation error with field-specific messages
 */
export function createValidationErrorResponse(fields: Record<string, string>): NextResponse {
  console.error('[API Error] Validation failed:', fields);

  return NextResponse.json(
    {
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      fields,
    },
    { status: 400 }
  );
}

/**
 * Rate limit error with retry information
 */
export function createRateLimitResponse(
  retryAfter: number,
  limit: number,
  remaining: number = 0
): NextResponse {
  return NextResponse.json(
    {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    }
  );
}

// ============================================================================
// ASYNC HANDLER WRAPPER
// ============================================================================

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ============================================================================
// RETRY & RECOVERY UTILITIES
// ============================================================================

/**
 * Retry mechanism for operations that might fail temporarily
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on operational errors (user errors)
      if (error instanceof ApplicationError && error.isOperational) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        console.log(`[Retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Safe async operation with fallback
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  onError?: (error: Error) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    console.error('[Fallback] Operation failed, using fallback value:', error);
    return fallback;
  }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker pattern for external services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000,
    private readonly resetTimeout: number = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new ExternalServiceError('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.error('[Circuit Breaker] Circuit opened after', this.failures, 'failures');
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

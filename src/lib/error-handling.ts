/**
 * Centralized Error Handling Utilities
 * 
 * Provides consistent error handling, logging, and recovery mechanisms
 * across the entire application.
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error types
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string = 'Database operation failed', details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, details, false);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, details?: Record<string, unknown>) {
    super(`External service error: ${service}`, 'EXTERNAL_SERVICE_ERROR', 502, details, false);
  }
}

/**
 * Handle errors and return appropriate NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error for monitoring
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
    
    // Map common Supabase error codes
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
    // Check for specific error patterns
    if (error.message.includes('JWT') || error.message.includes('token')) {
      return NextResponse.json(
        {
          error: 'AUTHENTICATION_ERROR',
          message: error.message,
        },
        { status: 401 }
      );
    }

    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return NextResponse.json(
        {
          error: 'AUTHORIZATION_ERROR',
          message: error.message,
        },
        { status: 403 }
      );
    }

    // Generic error response
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

  // Unknown error type
  return NextResponse.json(
    {
      error: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    },
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
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  handler: (request: any, context?: any) => Promise<NextResponse>
) {
  return async (request: any, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

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

/**
 * Circuit breaker pattern for external services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
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


/**
 * API Error Response Utility
 * 
 * Provides standardized error responses for API routes.
 * Uses generic user-facing messages while logging detailed errors server-side.
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Standard error codes and user-facing messages
 */
export const ERROR_CODES = {
  // Authentication errors (401)
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    statusCode: 401,
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid or expired authentication token',
    statusCode: 401,
  },
  INVALID_API_KEY: {
    code: 'INVALID_API_KEY',
    message: 'Invalid API key',
    statusCode: 401,
  },

  // Authorization errors (403)
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to access this resource',
    statusCode: 403,
  },
  ADMIN_ONLY: {
    code: 'ADMIN_ONLY',
    message: 'Admin access required',
    statusCode: 403,
  },

  // Not found errors (404)
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    statusCode: 404,
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    statusCode: 404,
  },
  TOOL_NOT_FOUND: {
    code: 'TOOL_NOT_FOUND',
    message: 'Tool not found',
    statusCode: 404,
  },

  // Validation errors (400)
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    message: 'Invalid request data',
    statusCode: 400,
  },
  MISSING_PARAMETER: {
    code: 'MISSING_PARAMETER',
    message: 'Required parameter missing',
    statusCode: 400,
  },
  INSUFFICIENT_CREDITS: {
    code: 'INSUFFICIENT_CREDITS',
    message: 'Insufficient credits for this operation',
    statusCode: 400,
  },

  // Rate limit errors (429)
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later',
    statusCode: 429,
  },

  // Server errors (500)
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'An internal error occurred. Please try again later',
    statusCode: 500,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed. Please try again later',
    statusCode: 500,
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: 'External service unavailable. Please try again later',
    statusCode: 500,
  },
} as const;

/**
 * Create a standardized error response
 * Logs detailed error server-side, returns generic message to user
 */
export function createErrorResponse(
  errorCode: keyof typeof ERROR_CODES,
  detailedError?: unknown,
  additionalData?: Record<string, unknown>
): NextResponse {
  const error = ERROR_CODES[errorCode];

  // Log detailed error server-side only
  if (detailedError) {
    console.error(`[API Error] ${error.code}:`, detailedError);
  }

  // Return generic message to user
  const response: Record<string, unknown> = {
    error: error.code,
    message: error.message,
  };

  // Include additional safe data if provided
  if (additionalData) {
    Object.assign(response, additionalData);
  }

  return NextResponse.json(response, { status: error.statusCode });
}

/**
 * Handle unexpected errors with safe fallback
 */
export function handleUnexpectedError(error: unknown): NextResponse {
  // Log the full error server-side
  console.error('[API Error] Unexpected error:', error);

  // Return generic error to user
  return createErrorResponse('INTERNAL_ERROR');
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(data, { status: statusCode });
}

/**
 * Validation error with field-specific messages
 */
export function createValidationErrorResponse(
  fields: Record<string, string>
): NextResponse {
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


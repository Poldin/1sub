/**
 * Centralized Error Classes
 *
 * CANONICAL SOURCE: All application error classes MUST be defined here.
 * DO NOT create error classes elsewhere in the codebase.
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

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

// ============================================================================
// AUTHENTICATION & AUTHORIZATION ERRORS (401, 403)
// ============================================================================

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

export class InvalidTokenError extends ApplicationError {
  constructor(message: string = 'Invalid or expired authentication token', details?: Record<string, unknown>) {
    super(message, 'INVALID_TOKEN', 401, details);
  }
}

export class InvalidApiKeyError extends ApplicationError {
  constructor(message: string = 'Invalid API key', details?: Record<string, unknown>) {
    super(message, 'INVALID_API_KEY', 401, details);
  }
}

// ============================================================================
// VALIDATION ERRORS (400)
// ============================================================================

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class MissingParameterError extends ApplicationError {
  constructor(parameter: string, details?: Record<string, unknown>) {
    super(`Required parameter missing: ${parameter}`, 'MISSING_PARAMETER', 400, details);
  }
}

export class InsufficientCreditsError extends ApplicationError {
  constructor(message: string = 'Insufficient credits for this operation', details?: Record<string, unknown>) {
    super(message, 'INSUFFICIENT_CREDITS', 400, details);
  }
}

// ============================================================================
// NOT FOUND ERRORS (404)
// ============================================================================

export class NotFoundError extends ApplicationError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
  }
}

export class UserNotFoundError extends ApplicationError {
  constructor(details?: Record<string, unknown>) {
    super('User not found', 'USER_NOT_FOUND', 404, details);
  }
}

export class ToolNotFoundError extends ApplicationError {
  constructor(details?: Record<string, unknown>) {
    super('Tool not found', 'TOOL_NOT_FOUND', 404, details);
  }
}

// ============================================================================
// CONFLICT ERRORS (409)
// ============================================================================

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
  }
}

// ============================================================================
// RATE LIMIT ERRORS (429)
// ============================================================================

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
  }
}

// ============================================================================
// SERVER ERRORS (500+)
// ============================================================================

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

// ============================================================================
// STANDARD ERROR CODES (for createErrorResponse)
// ============================================================================

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

export type ErrorCode = keyof typeof ERROR_CODES;

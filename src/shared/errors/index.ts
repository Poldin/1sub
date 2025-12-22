/**
 * Error Handling - Public API
 *
 * Re-exports all error classes and handlers from a single entry point.
 */

// Error classes
export {
  ApplicationError,
  AuthenticationError,
  AuthorizationError,
  InvalidTokenError,
  InvalidApiKeyError,
  ValidationError,
  MissingParameterError,
  InsufficientCreditsError,
  NotFoundError,
  UserNotFoundError,
  ToolNotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  ERROR_CODES,
  type ErrorCode,
} from './classes';

// Error handlers
export {
  handleApiError,
  createErrorResponse,
  handleUnexpectedError,
  createSuccessResponse,
  createValidationErrorResponse,
  createRateLimitResponse,
  asyncHandler,
  retryOperation,
  withFallback,
  CircuitBreaker,
} from './handlers';

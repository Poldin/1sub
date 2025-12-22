/**
 * Security Layer - Public API
 *
 * CANONICAL SOURCE: All security operations MUST import from this module.
 *
 * This module provides a unified API for:
 * - API Key management (generation, verification, storage)
 * - Token management (verification, rotation, revocation)
 * - HMAC Signatures (webhook signing/verification)
 * - Rate Limiting
 * - Input Validation (Zod schemas)
 * - Input Sanitization (XSS prevention)
 * - Audit Logging
 */

// ============================================================================
// API KEYS
// ============================================================================

export {
  // Generation
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
  isValidApiKeyFormat,
  // Verification
  verifyApiKeyHash,
  findToolByApiKey,
  isApiKeyActive,
  type ApiKeyVerificationResult,
  // Storage
  storeApiKey,
  regenerateApiKey,
  deactivateApiKey,
  getApiKeyUsage,
  type ApiKeyStorageResult,
  type ApiKeyRegenerationResult,
} from './api-keys';

// ============================================================================
// TOKENS
// ============================================================================

export {
  // Verification
  verifyAccessToken,
  verifyRefreshToken,
  getTokenByCheckoutId,
  hasActiveToken,
  type TokenVerificationResult,
  type TokenPayload,
  // Rotation
  generateTokenPair,
  createTokensForCheckout,
  refreshTokens,
  revokeToken,
  revokeAllTokensForUser,
  revokeTokensByCheckout,
  cleanupExpiredTokens,
  type TokenPair,
  type TokenRotationResult,
} from './tokens';

// ============================================================================
// SIGNATURES
// ============================================================================

export {
  generateWebhookSignature,
  verifyWebhookSignature,
  generateWebhookSecret,
  hmacSha256,
  generateSecureToken,
} from './signatures';

// ============================================================================
// RATE LIMITING
// ============================================================================

export {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  getClientIp,
  RATE_LIMITS,
} from './rate-limiting';

// ============================================================================
// VALIDATION (Zod Schemas)
// ============================================================================

export {
  // Schemas
  uuidSchema,
  emailSchema,
  urlSchema,
  creditAmountSchema,
  apiKeySchema,
  idempotencyKeySchema,
  externalToolUrlSchema,
  creditConsumeRequestSchema,
  tokenVerifyRequestSchema,
  // Validation functions
  isValidUUID,
  validateUUID,
  validateCheckoutId,
  validateToolId,
  validateUserId,
  validateCreditConsumeRequest,
  validateTokenVerifyRequest,
  safeValidate,
} from './validation';

// ============================================================================
// SANITIZATION
// ============================================================================

export {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeMarkdown,
  sanitizeToolDescription,
  sanitizeProductName,
  sanitizeEmail,
  sanitizeHtmlClient,
} from './sanitization';

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export {
  // API Key events
  logApiKeyAuth,
  logApiKeyRegeneration,
  // Credit events
  logCreditConsumption,
  logInsufficientCredits,
  // Token events
  logTokenVerification,
  logTokenRefresh,
  // Security events
  logRateLimitExceeded,
  logValidationError,
  logSuspiciousActivity,
  // Helpers
  sanitizeForLogging,
  secureLog,
} from './audit-logger';

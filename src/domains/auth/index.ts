/**
 * Authorization Domain - Public API
 *
 * CANONICAL SOURCE: All vendor authorization flows MUST use this module.
 */

export {
  // Authorization code
  createAuthorizationCode,
  exchangeAuthorizationCode,
  // Token verification
  validateTokenReadOnly,
  rotateToken,
  verifyToken,
  // Revocation
  revokeAccess,
  checkRevocation,
  clearRevocation,
  // Helpers
  validateRedirectUri,
  generateState,
  validateState,
  // Types
  type AuthorizationCodeResult,
  type ExchangeResult,
  type VerifyResult,
  type RevocationResult,
  type RevocationReason,
} from './service';

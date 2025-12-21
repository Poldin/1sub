/**
 * Verification API
 *
 * Handles periodic token verification for the vendor integration flow.
 * Vendors should call verify() every 5 minutes (or more frequently for
 * high-value actions) to ensure user access is still valid.
 */

import type { HttpClient } from '../utils/http.js';
import type {
  VerifyTokenRequest,
  VerifyTokenResponse,
  VerifyTokenSuccessResponse,
  Entitlements,
} from '../types.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Session state for tracking verification
 */
export interface VerificationState {
  /**
   * The user's 1Sub ID
   */
  onesubUserId: string;

  /**
   * Current verification token (rolls on each verify)
   */
  verificationToken: string;

  /**
   * Current entitlements
   */
  entitlements: Entitlements;

  /**
   * When the cached data expires (use Date.now() to compare)
   */
  cacheUntil: number;

  /**
   * When verification must happen (use Date.now() to compare)
   */
  nextVerificationBefore: number;

  /**
   * Last successful verification time
   */
  lastVerifiedAt: number;
}

/**
 * Verification API client
 */
export class VerifyApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Verifies a verification token and returns updated entitlements.
   *
   * IMPORTANT: The token ROLLS on every successful verification.
   * You must store the new token from the response for the next call.
   *
   * @example
   * ```typescript
   * // Middleware to verify on each request
   * async function requireEntitlement(req, res, next) {
   *   if (Date.now() > session.nextVerificationBefore) {
   *     const result = await onesub.verify.verify({
   *       verificationToken: session.verificationToken
   *     });
   *
   *     if (!result.valid) {
   *       session.destroy();
   *       return res.redirect('/login?reason=access_revoked');
   *     }
   *
   *     // Update session with new token
   *     session.verificationToken = result.verificationToken;
   *     session.entitlements = result.entitlements;
   *   }
   *   next();
   * }
   * ```
   *
   * @param params - Verification parameters
   * @returns Verification response (check .valid to determine success)
   * @throws ValidationError if token is missing
   * @throws AuthenticationError if API key is invalid
   */
  async verify(params: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    // Validate input
    if (!params.verificationToken || typeof params.verificationToken !== 'string') {
      throw new ValidationError('Verification token is required');
    }

    if (params.verificationToken.trim().length === 0) {
      throw new ValidationError('Verification token cannot be empty');
    }

    // Make API request
    const response = await this.http.post<VerifyTokenResponse>('/verify', {
      verificationToken: params.verificationToken.trim(),
    });

    return response.data;
  }

  /**
   * Verifies a token and returns a boolean indicating validity.
   *
   * Use this for simple access checks where you don't need the full response.
   * Note: This still rolls the token internally but you won't get the new token.
   *
   * @param params - Verification parameters
   * @returns True if the token is valid
   */
  async isValid(params: VerifyTokenRequest): Promise<boolean> {
    try {
      const result = await this.verify(params);
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * Checks if verification is needed based on the cached state.
   *
   * @param state - Current verification state
   * @returns True if you should call verify() now
   */
  needsVerification(state: VerificationState): boolean {
    return Date.now() >= state.nextVerificationBefore;
  }

  /**
   * Checks if the cached entitlements are still fresh.
   *
   * @param state - Current verification state
   * @returns True if cached data is still valid
   */
  isCacheValid(state: VerificationState): boolean {
    return Date.now() < state.cacheUntil;
  }

  /**
   * Updates the verification state from a successful verify response.
   *
   * @param currentState - Current state
   * @param response - Successful verify response
   * @returns Updated state
   */
  updateState(
    _currentState: VerificationState,
    response: VerifyTokenSuccessResponse
  ): VerificationState {
    return {
      onesubUserId: response.onesubUserId,
      verificationToken: response.verificationToken,
      entitlements: response.entitlements,
      cacheUntil: response.cacheUntil * 1000, // Convert to ms
      nextVerificationBefore: response.nextVerificationBefore * 1000, // Convert to ms
      lastVerifiedAt: Date.now(),
    };
  }

  /**
   * Creates initial verification state from an exchange response.
   *
   * @param exchangeResponse - Response from authorize.exchangeCode()
   * @returns Initial verification state
   */
  createInitialState(exchangeResponse: {
    onesubUserId: string;
    verificationToken: string;
    entitlements: Entitlements;
    expiresAt: number;
  }): VerificationState {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return {
      onesubUserId: exchangeResponse.onesubUserId,
      verificationToken: exchangeResponse.verificationToken,
      entitlements: exchangeResponse.entitlements,
      cacheUntil: now + fiveMinutes,
      nextVerificationBefore: now + fiveMinutes,
      lastVerifiedAt: now,
    };
  }

  /**
   * Validates that a token looks like a valid verification token.
   * This is a client-side check only.
   *
   * @param token - The token to validate
   * @returns True if the token format is valid
   */
  isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    // Verification tokens start with 'vt_'
    return /^vt_[A-Za-z0-9]{40,}$/.test(token.trim());
  }
}

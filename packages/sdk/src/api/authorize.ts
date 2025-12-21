/**
 * Authorization API
 *
 * Handles authorization code exchange for the vendor integration flow.
 */

import type { HttpClient } from '../utils/http.js';
import type {
  ExchangeAuthCodeRequest,
  ExchangeAuthCodeResponse,
} from '../types.js';
import { ValidationError, parseApiError } from '../utils/errors.js';

/**
 * Error response from exchange endpoint
 */
interface ExchangeErrorResponse {
  valid: false;
  error: string;
  message: string;
}

/**
 * API response type (success or error)
 */
type ExchangeApiResponse = ExchangeAuthCodeResponse | ExchangeErrorResponse;

/**
 * Authorization API client
 */
export class AuthorizeApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Exchanges an authorization code for a verification token and entitlements.
   *
   * Call this after receiving the authorization code from the redirect.
   * The response includes a verification token that should be stored
   * and used for periodic verification.
   *
   * @example
   * ```typescript
   * // In your callback handler
   * const result = await onesub.authorize.exchangeCode({
   *   code: req.query.code,
   *   redirectUri: 'https://yourapp.com/callback'
   * });
   *
   * if (result.valid) {
   *   // Store verification token in your session
   *   session.verificationToken = result.verificationToken;
   *   session.onesubUserId = result.onesubUserId;
   *   session.entitlements = result.entitlements;
   * }
   * ```
   *
   * @param params - Exchange parameters
   * @returns Exchange response with verification token
   * @throws ValidationError if code is missing
   * @throws AuthenticationError if API key is invalid
   */
  async exchangeCode(params: ExchangeAuthCodeRequest): Promise<ExchangeAuthCodeResponse> {
    // Validate input
    if (!params.code || typeof params.code !== 'string') {
      throw new ValidationError('Authorization code is required');
    }

    if (params.code.trim().length === 0) {
      throw new ValidationError('Authorization code cannot be empty');
    }

    // Make API request
    const response = await this.http.post<ExchangeApiResponse>('/authorize/exchange', {
      code: params.code.trim(),
      redirectUri: params.redirectUri,
    });

    const data = response.data;

    // Check for error response
    if (!data.valid) {
      const errorData = data as ExchangeErrorResponse;
      throw parseApiError(response.status, {
        error: errorData.error,
        message: errorData.message,
      });
    }

    return data as ExchangeAuthCodeResponse;
  }

  /**
   * Exchanges a code and returns null on failure instead of throwing.
   *
   * Useful for cases where you want to handle errors inline.
   *
   * @example
   * ```typescript
   * const result = await onesub.authorize.tryExchangeCode({ code });
   * if (!result) {
   *   return res.redirect('/error?reason=invalid_code');
   * }
   * ```
   *
   * @param params - Exchange parameters
   * @returns Exchange response or null on failure
   */
  async tryExchangeCode(
    params: ExchangeAuthCodeRequest
  ): Promise<ExchangeAuthCodeResponse | null> {
    try {
      return await this.exchangeCode(params);
    } catch {
      return null;
    }
  }

  /**
   * Validates that a code looks like a valid authorization code.
   * This is a client-side check only - the actual validation happens on the server.
   *
   * @param code - The code to validate
   * @returns True if the code format is valid
   */
  isValidCodeFormat(code: string): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }
    // Authorization codes start with 'ac_' and are followed by random chars
    return /^ac_[A-Za-z0-9]{20,}$/.test(code.trim());
  }
}

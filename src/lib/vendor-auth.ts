/**
 * Vendor Authorization Library
 *
 * Handles authorization code generation, exchange, and verification
 * for the vendor integration flow.
 *
 * Flow:
 * 1. User clicks "Launch Tool" -> createAuthorizationCode() -> redirect to vendor
 * 2. Vendor calls /exchange -> exchangeAuthorizationCode() -> gets verification token
 * 3. Vendor calls /verify periodically -> verifyToken() -> gets entitlements
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client with service role for backend operations
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// TYPES
// ============================================================================

export interface AuthorizationCodeResult {
  code: string;
  expiresAt: Date;
  authorizationUrl: string;
}

export interface ExchangeResult {
  success: boolean;
  userId?: string;
  grantId?: string;
  verificationToken?: string;
  tokenExpiresAt?: Date;
  error?: string;
  message?: string;
}

export interface VerifyResult {
  valid: boolean;
  userId?: string;
  grantId?: string;
  verificationToken?: string;
  tokenExpiresAt?: Date;
  cacheUntil?: Date;
  nextVerificationBefore?: Date;
  error?: string;
  reason?: string;
  action?: 'terminate_session' | 'reauthenticate';
}

export interface RevocationResult {
  success: boolean;
  revocationId?: string;
  tokensRevoked?: number;
  error?: string;
  message?: string;
}

export interface RevocationCheck {
  revoked: boolean;
  reason?: string;
  revokedAt?: Date;
}

export type RevocationReason =
  | 'subscription_cancelled'
  | 'payment_failed'
  | 'bundle_changed'
  | 'manual'
  | 'fraud'
  | 'tool_deactivated';

// ============================================================================
// AUTHORIZATION CODE FUNCTIONS
// ============================================================================

/**
 * Creates an authorization code for the vendor redirect flow.
 * The code is single-use and expires in 60 seconds.
 *
 * @param toolId - The tool to authorize
 * @param userId - The user requesting authorization
 * @param redirectUri - The vendor's callback URL
 * @param state - Optional CSRF token from vendor
 * @returns Authorization code and URL
 */
export async function createAuthorizationCode(
  toolId: string,
  userId: string,
  redirectUri: string,
  state?: string
): Promise<AuthorizationCodeResult> {
  const supabase = getServiceClient();

  // Validate tool exists and has redirect_uri configured
  const { data: apiKey, error: apiKeyError } = await supabase
    .from('api_keys')
    .select('metadata')
    .eq('tool_id', toolId)
    .eq('is_active', true)
    .single();

  if (apiKeyError || !apiKey) {
    throw new Error('Tool not found or not active');
  }

  const metadata = apiKey.metadata as Record<string, unknown> || {};
  const configuredRedirectUri = metadata.redirect_uri as string;

  // Validate redirect_uri matches configured value
  if (configuredRedirectUri && configuredRedirectUri !== redirectUri) {
    throw new Error('Redirect URI does not match configured value');
  }

  // Call RPC to create authorization code
  const { data, error } = await supabase.rpc('create_authorization_code', {
    p_tool_id: toolId,
    p_user_id: userId,
    p_redirect_uri: redirectUri,
    p_state: state || null,
  });

  if (error) {
    console.error('[VendorAuth] Failed to create authorization code:', error);
    throw new Error('Failed to create authorization code');
  }

  const result = data as { code: string; expires_at: string }[];
  if (!result || result.length === 0) {
    throw new Error('Failed to create authorization code');
  }

  const { code, expires_at } = result[0];

  // Build authorization URL
  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) {
    url.searchParams.set('state', state);
  }

  return {
    code,
    expiresAt: new Date(expires_at),
    authorizationUrl: url.toString(),
  };
}

/**
 * Exchanges an authorization code for a verification token.
 * Called by vendors server-to-server.
 *
 * @param code - The authorization code from redirect
 * @param toolId - The tool ID (from API key lookup)
 * @param redirectUri - Optional redirect URI for validation
 * @returns Exchange result with verification token
 */
export async function exchangeAuthorizationCode(
  code: string,
  toolId: string,
  redirectUri?: string
): Promise<ExchangeResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('exchange_authorization_code', {
    p_code: code,
    p_tool_id: toolId,
    p_redirect_uri: redirectUri || null,
  });

  if (error) {
    console.error('[VendorAuth] Failed to exchange authorization code:', error);
    return {
      success: false,
      error: 'EXCHANGE_FAILED',
      message: 'Failed to exchange authorization code',
    };
  }

  const result = data as Record<string, unknown>;

  if (!result.success) {
    return {
      success: false,
      error: result.error as string,
      message: result.message as string,
    };
  }

  return {
    success: true,
    userId: result.user_id as string,
    grantId: result.grant_id as string,
    verificationToken: result.verification_token as string,
    tokenExpiresAt: new Date(result.token_expires_at as string),
  };
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Verifies a verification token and returns updated entitlements.
 * Rolls the token on each successful verification.
 *
 * @param token - The verification token
 * @param toolId - The tool ID (from API key lookup)
 * @returns Verification result with new token
 */
export async function verifyToken(
  token: string,
  toolId: string
): Promise<VerifyResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('verify_token', {
    p_token: token,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[VendorAuth] Failed to verify token:', error);
    return {
      valid: false,
      error: 'VERIFICATION_FAILED',
      reason: 'Failed to verify token',
      action: 'terminate_session',
    };
  }

  const result = data as Record<string, unknown>;

  if (!result.valid) {
    return {
      valid: false,
      error: result.error as string,
      reason: result.reason as string,
      action: result.action as 'terminate_session' | 'reauthenticate',
    };
  }

  return {
    valid: true,
    userId: result.user_id as string,
    grantId: result.grant_id as string,
    verificationToken: result.verification_token as string,
    tokenExpiresAt: new Date(result.token_expires_at as string),
    cacheUntil: new Date(result.cache_until as string),
    nextVerificationBefore: new Date(result.next_verification_before as string),
  };
}

// ============================================================================
// OPTIMIZED VERIFICATION FUNCTIONS (STATE-OF-THE-ART)
// ============================================================================

/**
 * Result of validating a token without rotation
 */
export interface ValidateTokenResult {
  valid: boolean;
  userId?: string;
  grantId?: string;
  tokenExpiresAt?: Date;
  needsRotation?: boolean; // True if token expires within 2 hours
  error?: string;
  reason?: string;
  action?: 'terminate_session' | 'reauthenticate';
}

/**
 * Result of rotating a token
 */
export interface RotateTokenResult {
  success: boolean;
  verificationToken?: string;
  tokenExpiresAt?: Date;
  error?: string;
  message?: string;
}

/**
 * Validates a token WITHOUT rotating it.
 * This is the primary function for the read-only /verify hot path.
 *
 * READ-ONLY: No database writes, no row locks.
 *
 * When to use:
 * - Every /verify call (replaces verifyToken for hot path)
 *
 * When NOT to use:
 * - When token needs rotation (expires within 2 hours)
 *
 * @param token - The verification token
 * @param toolId - The tool ID
 * @returns Validation result (no new token)
 */
export async function validateTokenReadOnly(
  token: string,
  toolId: string
): Promise<ValidateTokenResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('validate_token_readonly', {
    p_token: token,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[VendorAuth] Failed to validate token:', error);
    return {
      valid: false,
      error: 'VERIFICATION_FAILED',
      reason: 'Failed to validate token',
      action: 'terminate_session',
    };
  }

  const result = data as Record<string, unknown>;

  if (!result.valid) {
    return {
      valid: false,
      error: result.error as string,
      reason: result.reason as string,
      action: result.action as 'terminate_session' | 'reauthenticate',
    };
  }

  // Calculate if rotation is needed (expires within 2 hours)
  const tokenExpiresAt = new Date(result.token_expires_at as string);
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const needsRotation = tokenExpiresAt <= twoHoursFromNow;

  return {
    valid: true,
    userId: result.user_id as string,
    grantId: result.grant_id as string,
    tokenExpiresAt,
    needsRotation,
  };
}

/**
 * Rotates a token to a new one.
 * Only called when:
 * - Token is valid but expires within 2 hours
 * - Explicit rotation is requested
 *
 * This is the ONLY verification path that writes to the database.
 *
 * @param token - The current verification token
 * @param toolId - The tool ID
 * @returns New token or error
 */
export async function rotateTokenIfNeeded(
  token: string,
  toolId: string
): Promise<RotateTokenResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('rotate_token', {
    p_token: token,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[VendorAuth] Failed to rotate token:', error);
    return {
      success: false,
      error: 'ROTATION_FAILED',
      message: 'Failed to rotate token',
    };
  }

  const result = data as Record<string, unknown>;

  if (!result.success) {
    return {
      success: false,
      error: result.error as string,
      message: result.message as string,
    };
  }

  return {
    success: true,
    verificationToken: result.verification_token as string,
    tokenExpiresAt: new Date(result.token_expires_at as string),
  };
}

/**
 * Combined validate + conditional rotate.
 * Convenience function that:
 * 1. Validates token (read-only)
 * 2. Rotates only if needed (near expiry)
 *
 * Use this for backward compatibility with existing code.
 *
 * @param token - The verification token
 * @param toolId - The tool ID
 * @returns Full verification result
 */
export async function verifyTokenOptimized(
  token: string,
  toolId: string
): Promise<VerifyResult> {
  // 1. Validate token (read-only)
  const validateResult = await validateTokenReadOnly(token, toolId);

  if (!validateResult.valid) {
    return {
      valid: false,
      error: validateResult.error,
      reason: validateResult.reason,
      action: validateResult.action,
    };
  }

  // 2. Rotate only if needed
  let verificationToken = token;
  let tokenExpiresAt = validateResult.tokenExpiresAt;

  if (validateResult.needsRotation) {
    const rotateResult = await rotateTokenIfNeeded(token, toolId);
    if (rotateResult.success && rotateResult.verificationToken) {
      verificationToken = rotateResult.verificationToken;
      tokenExpiresAt = rotateResult.tokenExpiresAt;
    }
    // If rotation fails, continue with old token (still valid)
  }

  // Cache hints: 15 minutes for authority, token expiry for re-auth
  const now = new Date();
  const cacheUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const nextVerificationBefore = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  return {
    valid: true,
    userId: validateResult.userId,
    grantId: validateResult.grantId,
    verificationToken,
    tokenExpiresAt,
    cacheUntil,
    nextVerificationBefore,
  };
}

// ============================================================================
// REVOCATION FUNCTIONS
// ============================================================================

/**
 * Revokes a user's access to a tool.
 * Creates a revocation record and invalidates all verification tokens.
 *
 * @param userId - The user to revoke
 * @param toolId - The tool to revoke access to
 * @param reason - The reason for revocation
 * @param revokedBy - Optional admin who initiated revocation
 * @param metadata - Optional metadata for the revocation
 * @returns Revocation result
 */
export async function revokeAccess(
  userId: string,
  toolId: string,
  reason: RevocationReason,
  revokedBy?: string,
  metadata?: Record<string, unknown>
): Promise<RevocationResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('revoke_access', {
    p_user_id: userId,
    p_tool_id: toolId,
    p_reason: reason,
    p_revoked_by: revokedBy || null,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error('[VendorAuth] Failed to revoke access:', error);
    return {
      success: false,
      error: 'REVOCATION_FAILED',
      message: 'Failed to revoke access',
    };
  }

  const result = data as Record<string, unknown>;

  if (!result.success) {
    return {
      success: false,
      error: result.error as string,
      message: result.message as string,
    };
  }

  return {
    success: true,
    revocationId: result.revocation_id as string,
    tokensRevoked: result.tokens_revoked as number,
  };
}

/**
 * Checks if a user's access to a tool has been revoked.
 *
 * @param userId - The user to check
 * @param toolId - The tool to check
 * @returns Revocation status
 */
export async function checkRevocation(
  userId: string,
  toolId: string
): Promise<RevocationCheck> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('check_revocation', {
    p_user_id: userId,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[VendorAuth] Failed to check revocation:', error);
    // Fail closed - treat errors as revoked
    return {
      revoked: true,
      reason: 'verification_error',
    };
  }

  const result = data as Record<string, unknown>;

  return {
    revoked: result.revoked as boolean,
    reason: result.reason as string | undefined,
    revokedAt: result.revoked_at ? new Date(result.revoked_at as string) : undefined,
  };
}

/**
 * Clears a revocation record to allow reactivation.
 *
 * @param userId - The user to clear
 * @param toolId - The tool to clear
 * @returns Whether the revocation was cleared
 */
export async function clearRevocation(
  userId: string,
  toolId: string
): Promise<boolean> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('clear_revocation', {
    p_user_id: userId,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[VendorAuth] Failed to clear revocation:', error);
    return false;
  }

  const result = data as Record<string, unknown>;
  return result.cleared as boolean;
}

/**
 * Marks a revocation as propagated (webhook sent).
 *
 * @param userId - The user
 * @param toolId - The tool
 */
export async function markRevocationPropagated(
  userId: string,
  toolId: string
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.rpc('mark_revocation_propagated', {
    p_user_id: userId,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[VendorAuth] Failed to mark revocation propagated:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that a redirect URI is allowed for a tool.
 *
 * @param toolId - The tool to check
 * @param redirectUri - The redirect URI to validate
 * @returns Whether the redirect URI is valid
 */
export async function validateRedirectUri(
  toolId: string,
  redirectUri: string
): Promise<boolean> {
  const supabase = getServiceClient();

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('metadata')
    .eq('tool_id', toolId)
    .eq('is_active', true)
    .single();

  if (error || !apiKey) {
    return false;
  }

  const metadata = apiKey.metadata as Record<string, unknown> || {};
  const configuredUri = metadata.redirect_uri as string;

  // If no redirect_uri is configured, allow any
  if (!configuredUri) {
    return true;
  }

  // Exact match required
  return configuredUri === redirectUri;
}

/**
 * Gets the configured redirect URI for a tool.
 *
 * @param toolId - The tool to check
 * @returns The configured redirect URI or null
 */
export async function getToolRedirectUri(toolId: string): Promise<string | null> {
  const supabase = getServiceClient();

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('metadata')
    .eq('tool_id', toolId)
    .eq('is_active', true)
    .single();

  if (error || !apiKey) {
    return null;
  }

  const metadata = apiKey.metadata as Record<string, unknown> || {};
  return (metadata.redirect_uri as string) || null;
}

/**
 * Generates a secure state parameter for CSRF protection.
 *
 * @returns A random state string
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Validates a state parameter (basic format check).
 *
 * @param state - The state to validate
 * @returns Whether the state is valid
 */
export function validateState(state: string): boolean {
  // State should be a non-empty base64url string
  return /^[A-Za-z0-9_-]+$/.test(state) && state.length >= 16;
}

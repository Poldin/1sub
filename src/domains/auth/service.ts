/**
 * Authorization Domain Service
 *
 * CANONICAL SOURCE: All vendor authorization flows MUST use this service.
 *
 * Handles the OAuth-like vendor integration flow:
 * 1. User clicks "Launch Tool" → createAuthorizationCode() → redirect to vendor
 * 2. Vendor calls /exchange → exchangeAuthorizationCode() → gets tokens
 * 3. Vendor calls /verify periodically → verifyToken() → gets entitlements
 */

import { createServiceClient } from '@/infrastructure/database/client';
import { generateSecureToken } from '@/security';

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
 */
export async function createAuthorizationCode(
  toolId: string,
  userId: string,
  redirectUri: string,
  state?: string
): Promise<AuthorizationCodeResult> {
  const supabase = createServiceClient();

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

  const metadata = (apiKey.metadata as Record<string, unknown>) || {};
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
    console.error('[Auth] Failed to create authorization code:', error);
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
 */
export async function exchangeAuthorizationCode(
  code: string,
  toolId: string,
  redirectUri?: string
): Promise<ExchangeResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('exchange_authorization_code', {
    p_code: code,
    p_tool_id: toolId,
    p_redirect_uri: redirectUri || null,
  });

  if (error) {
    console.error('[Auth] Failed to exchange authorization code:', error);
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
 * Validates a token WITHOUT rotating it (read-only).
 * Primary function for the /verify hot path.
 */
export async function validateTokenReadOnly(
  token: string,
  toolId: string
): Promise<{
  valid: boolean;
  userId?: string;
  grantId?: string;
  tokenExpiresAt?: Date;
  needsRotation?: boolean;
  error?: string;
  reason?: string;
  action?: 'terminate_session' | 'reauthenticate';
}> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('validate_token_readonly', {
    p_token: token,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[Auth] Failed to validate token:', error);
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
 * Only called when token is valid but expires within 2 hours.
 */
export async function rotateToken(
  token: string,
  toolId: string
): Promise<{
  success: boolean;
  verificationToken?: string;
  tokenExpiresAt?: Date;
  error?: string;
  message?: string;
}> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('rotate_token', {
    p_token: token,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[Auth] Failed to rotate token:', error);
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
 * Backward-compatible convenience function.
 */
export async function verifyToken(token: string, toolId: string): Promise<VerifyResult> {
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
    const rotateResult = await rotateToken(token, toolId);
    if (rotateResult.success && rotateResult.verificationToken) {
      verificationToken = rotateResult.verificationToken;
      tokenExpiresAt = rotateResult.tokenExpiresAt;
    }
  }

  // Cache hints
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
 */
export async function revokeAccess(
  userId: string,
  toolId: string,
  reason: RevocationReason,
  revokedBy?: string,
  metadata?: Record<string, unknown>
): Promise<RevocationResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('revoke_access', {
    p_user_id: userId,
    p_tool_id: toolId,
    p_reason: reason,
    p_revoked_by: revokedBy || null,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error('[Auth] Failed to revoke access:', error);
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
 */
export async function checkRevocation(
  userId: string,
  toolId: string
): Promise<{ revoked: boolean; reason?: string; revokedAt?: Date }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('check_revocation', {
    p_user_id: userId,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[Auth] Failed to check revocation:', error);
    return { revoked: true, reason: 'verification_error' };
  }

  const result = data as Record<string, unknown>;

  return {
    revoked: result.revoked as boolean,
    reason: result.reason as string | undefined,
    revokedAt: result.revoked_at ? new Date(result.revoked_at as string) : undefined,
  };
}

/**
 * Clears a revocation to allow reactivation.
 */
export async function clearRevocation(userId: string, toolId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('clear_revocation', {
    p_user_id: userId,
    p_tool_id: toolId,
  });

  if (error) {
    console.error('[Auth] Failed to clear revocation:', error);
    return false;
  }

  const result = data as Record<string, unknown>;
  return result.cleared as boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that a redirect URI is allowed for a tool.
 */
export async function validateRedirectUri(
  toolId: string,
  redirectUri: string
): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('metadata')
    .eq('tool_id', toolId)
    .eq('is_active', true)
    .single();

  if (error || !apiKey) {
    return false;
  }

  const metadata = (apiKey.metadata as Record<string, unknown>) || {};
  const configuredUri = metadata.redirect_uri as string;

  if (!configuredUri) {
    return true;
  }

  return configuredUri === redirectUri;
}

/**
 * Generates a secure state parameter for CSRF protection.
 */
export function generateState(): string {
  return generateSecureToken(32);
}

/**
 * Validates a state parameter format.
 */
export function validateState(state: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(state) && state.length >= 16;
}

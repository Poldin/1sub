/**
 * Token Verification
 *
 * CANONICAL SOURCE: All token verification MUST use this module.
 *
 * Handles verification of access tokens and refresh tokens for vendor integrations.
 */

import { createServiceClient } from '@/infrastructure/database/client';
import { logTokenVerification } from '../audit-logger';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenVerificationResult {
  valid: boolean;
  userId?: string;
  toolId?: string;
  checkoutId?: string;
  expiresAt?: Date;
  error?: string;
}

export interface TokenPayload {
  userId: string;
  toolId: string;
  checkoutId: string;
  expiresAt: Date;
  createdAt: Date;
}

// ============================================================================
// ACCESS TOKEN VERIFICATION
// ============================================================================

/**
 * Verify an access token and return associated data
 */
export async function verifyAccessToken(
  token: string,
  options?: { ip?: string }
): Promise<TokenVerificationResult> {
  if (!token || typeof token !== 'string') {
    logTokenVerification({
      success: false,
      reason: 'Invalid token format',
      ip: options?.ip,
    });
    return { valid: false, error: 'Invalid token format' };
  }

  try {
    const supabase = createServiceClient();

    // Look up the token in the database
    const { data: tokenData, error } = await supabase
      .from('authorization_tokens')
      .select('user_id, tool_id, checkout_id, access_token_expires_at, revoked')
      .eq('access_token', token)
      .single();

    if (error || !tokenData) {
      logTokenVerification({
        success: false,
        reason: 'Token not found',
        ip: options?.ip,
      });
      return { valid: false, error: 'Token not found' };
    }

    // Check if token is revoked
    if (tokenData.revoked) {
      logTokenVerification({
        success: false,
        userId: tokenData.user_id,
        toolId: tokenData.tool_id,
        checkoutId: tokenData.checkout_id,
        reason: 'Token revoked',
        ip: options?.ip,
      });
      return { valid: false, error: 'Token has been revoked' };
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.access_token_expires_at);
    if (expiresAt < new Date()) {
      logTokenVerification({
        success: false,
        userId: tokenData.user_id,
        toolId: tokenData.tool_id,
        checkoutId: tokenData.checkout_id,
        reason: 'Token expired',
        ip: options?.ip,
      });
      return { valid: false, error: 'Token has expired' };
    }

    logTokenVerification({
      success: true,
      userId: tokenData.user_id,
      toolId: tokenData.tool_id,
      checkoutId: tokenData.checkout_id,
      ip: options?.ip,
    });

    return {
      valid: true,
      userId: tokenData.user_id,
      toolId: tokenData.tool_id,
      checkoutId: tokenData.checkout_id,
      expiresAt,
    };
  } catch (error) {
    logTokenVerification({
      success: false,
      reason: `Verification error: ${error instanceof Error ? error.message : 'Unknown'}`,
      ip: options?.ip,
    });
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Verify a refresh token and return associated data
 */
export async function verifyRefreshToken(
  refreshToken: string,
  options?: { ip?: string }
): Promise<TokenVerificationResult> {
  if (!refreshToken || typeof refreshToken !== 'string') {
    return { valid: false, error: 'Invalid refresh token format' };
  }

  try {
    const supabase = createServiceClient();

    const { data: tokenData, error } = await supabase
      .from('authorization_tokens')
      .select('user_id, tool_id, checkout_id, refresh_token_expires_at, revoked')
      .eq('refresh_token', refreshToken)
      .single();

    if (error || !tokenData) {
      return { valid: false, error: 'Refresh token not found' };
    }

    if (tokenData.revoked) {
      return { valid: false, error: 'Refresh token has been revoked' };
    }

    const expiresAt = new Date(tokenData.refresh_token_expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'Refresh token has expired' };
    }

    return {
      valid: true,
      userId: tokenData.user_id,
      toolId: tokenData.tool_id,
      checkoutId: tokenData.checkout_id,
      expiresAt,
    };
  } catch {
    return { valid: false, error: 'Refresh token verification failed' };
  }
}

// ============================================================================
// TOKEN LOOKUP
// ============================================================================

/**
 * Get token payload by checkout ID
 */
export async function getTokenByCheckoutId(
  checkoutId: string
): Promise<TokenPayload | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('authorization_tokens')
      .select('user_id, tool_id, checkout_id, access_token_expires_at, created_at, revoked')
      .eq('checkout_id', checkoutId)
      .eq('revoked', false)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      toolId: data.tool_id,
      checkoutId: data.checkout_id,
      expiresAt: new Date(data.access_token_expires_at),
      createdAt: new Date(data.created_at),
    };
  } catch {
    return null;
  }
}

/**
 * Check if a user has an active token for a tool
 */
export async function hasActiveToken(
  userId: string,
  toolId: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('authorization_tokens')
      .select('id, access_token_expires_at')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .eq('revoked', false)
      .gt('access_token_expires_at', new Date().toISOString())
      .limit(1);

    if (error) {
      return false;
    }

    return data && data.length > 0;
  } catch {
    return false;
  }
}

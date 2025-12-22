/**
 * Token Rotation
 *
 * CANONICAL SOURCE: All token rotation/refresh MUST use this module.
 *
 * Handles token generation, refresh, and revocation.
 */

import { createServiceClient } from '@/infrastructure/database/client';
import { generateSecureToken } from '../signatures';
import { logTokenRefresh } from '../audit-logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOKEN_CONFIG = {
  // Access token expires in 1 hour
  accessTokenExpiryMs: 60 * 60 * 1000,
  // Refresh token expires in 30 days
  refreshTokenExpiryMs: 30 * 24 * 60 * 60 * 1000,
  // Token length in bytes (will be hex encoded)
  tokenLength: 32,
};

// ============================================================================
// TYPES
// ============================================================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface TokenRotationResult {
  success: boolean;
  tokens?: TokenPair;
  error?: string;
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a new token pair (access + refresh)
 */
export function generateTokenPair(): TokenPair {
  const now = new Date();

  return {
    accessToken: generateSecureToken(TOKEN_CONFIG.tokenLength),
    refreshToken: generateSecureToken(TOKEN_CONFIG.tokenLength),
    accessTokenExpiresAt: new Date(now.getTime() + TOKEN_CONFIG.accessTokenExpiryMs),
    refreshTokenExpiresAt: new Date(now.getTime() + TOKEN_CONFIG.refreshTokenExpiryMs),
  };
}

/**
 * Create and store a new token pair for a checkout
 */
export async function createTokensForCheckout(params: {
  userId: string;
  toolId: string;
  checkoutId: string;
}): Promise<TokenRotationResult> {
  const { userId, toolId, checkoutId } = params;

  try {
    const supabase = createServiceClient();
    const tokenPair = generateTokenPair();

    const { error } = await supabase.from('authorization_tokens').insert({
      user_id: userId,
      tool_id: toolId,
      checkout_id: checkoutId,
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      access_token_expires_at: tokenPair.accessTokenExpiresAt.toISOString(),
      refresh_token_expires_at: tokenPair.refreshTokenExpiresAt.toISOString(),
      revoked: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, error: `Failed to store tokens: ${error.message}` };
    }

    return { success: true, tokens: tokenPair };
  } catch (error) {
    return {
      success: false,
      error: `Token creation failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Refresh tokens using a valid refresh token
 * This rotates both access and refresh tokens (refresh token rotation)
 */
export async function refreshTokens(
  refreshToken: string,
  options?: { ip?: string }
): Promise<TokenRotationResult> {
  try {
    const supabase = createServiceClient();

    // Find the existing token record
    const { data: existingToken, error: findError } = await supabase
      .from('authorization_tokens')
      .select('id, user_id, tool_id, checkout_id, refresh_token_expires_at, revoked')
      .eq('refresh_token', refreshToken)
      .single();

    if (findError || !existingToken) {
      logTokenRefresh({
        success: false,
        reason: 'Refresh token not found',
        ip: options?.ip,
      });
      return { success: false, error: 'Invalid refresh token' };
    }

    if (existingToken.revoked) {
      logTokenRefresh({
        success: false,
        userId: existingToken.user_id,
        toolId: existingToken.tool_id,
        reason: 'Refresh token revoked',
        ip: options?.ip,
      });
      return { success: false, error: 'Refresh token has been revoked' };
    }

    const refreshExpiry = new Date(existingToken.refresh_token_expires_at);
    if (refreshExpiry < new Date()) {
      logTokenRefresh({
        success: false,
        userId: existingToken.user_id,
        toolId: existingToken.tool_id,
        reason: 'Refresh token expired',
        ip: options?.ip,
      });
      return { success: false, error: 'Refresh token has expired' };
    }

    // Generate new token pair
    const newTokenPair = generateTokenPair();

    // Update the existing record with new tokens (token rotation)
    const { error: updateError } = await supabase
      .from('authorization_tokens')
      .update({
        access_token: newTokenPair.accessToken,
        refresh_token: newTokenPair.refreshToken,
        access_token_expires_at: newTokenPair.accessTokenExpiresAt.toISOString(),
        refresh_token_expires_at: newTokenPair.refreshTokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingToken.id);

    if (updateError) {
      logTokenRefresh({
        success: false,
        userId: existingToken.user_id,
        toolId: existingToken.tool_id,
        reason: `Update failed: ${updateError.message}`,
        ip: options?.ip,
      });
      return { success: false, error: 'Failed to refresh tokens' };
    }

    logTokenRefresh({
      success: true,
      userId: existingToken.user_id,
      toolId: existingToken.tool_id,
      checkoutId: existingToken.checkout_id,
      ip: options?.ip,
    });

    return { success: true, tokens: newTokenPair };
  } catch (error) {
    logTokenRefresh({
      success: false,
      reason: `Refresh error: ${error instanceof Error ? error.message : 'Unknown'}`,
      ip: options?.ip,
    });
    return { success: false, error: 'Token refresh failed' };
  }
}

// ============================================================================
// TOKEN REVOCATION
// ============================================================================

/**
 * Revoke a specific token (by access token)
 */
export async function revokeToken(accessToken: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('authorization_tokens')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('access_token', accessToken);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Revoke all tokens for a user-tool combination
 */
export async function revokeAllTokensForUser(
  userId: string,
  toolId: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('authorization_tokens')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .eq('revoked', false);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Revoke all tokens for a checkout
 */
export async function revokeTokensByCheckout(checkoutId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('authorization_tokens')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('checkout_id', checkoutId);

    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// TOKEN CLEANUP
// ============================================================================

/**
 * Clean up expired tokens (for scheduled jobs)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Delete tokens where both access and refresh tokens are expired
    const { data, error } = await supabase
      .from('authorization_tokens')
      .delete()
      .lt('refresh_token_expires_at', now)
      .select('id');

    if (error) {
      console.error('[Token Cleanup] Error:', error);
      return 0;
    }

    return data?.length ?? 0;
  } catch {
    return 0;
  }
}

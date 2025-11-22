/**
 * Tool JWT Generation and Verification
 * 
 * Handles JWT creation for the redirect flow where users are redirected
 * from 1sub to external tools with a signed token.
 */

import { SignJWT, importPKCS8 } from 'jose';
import { createClient } from '@/lib/supabase/server';
import type { ToolAccessJWTClaims } from '@/lib/tool-verification-types';
import crypto from 'crypto';

// JWT Configuration
const JWT_ISSUER = '1sub';
const JWT_EXPIRATION = '10m'; // 10 minutes

/**
 * Generate a JWT token for tool access after purchase/subscription
 * 
 * @param oneSubUserId - The 1sub user ID
 * @param toolId - The tool ID
 * @param email - User's email
 * @param nonce - Optional nonce from the initial request
 * @returns Signed JWT token
 */
export async function generateToolAccessJWT(
  oneSubUserId: string,
  toolId: string,
  email: string,
  nonce?: string
): Promise<string> {
  const supabase = await createClient();

  // ==========================================================================
  // 1. Get Primary Signing Key
  // ==========================================================================
  const { data: signingKey, error: keyError } = await supabase
    .from('jwks_keys')
    .select('kid, algorithm, private_key_ref, metadata')
    .eq('is_active', true)
    .eq('is_primary', true)
    .single();

  if (keyError || !signingKey) {
    console.error('[Tool JWT] No primary signing key found:', keyError);
    throw new Error('No signing key available');
  }

  // ==========================================================================
  // 2. Get Private Key from Environment (not stored in DB directly)
  // ==========================================================================
  // In production, private keys should be stored in a secure vault
  // For now, we'll use an environment variable
  const privateKeyPEM = process.env.JWT_TOOL_PRIVATE_KEY;
  
  if (!privateKeyPEM) {
    console.error('[Tool JWT] JWT_TOOL_PRIVATE_KEY not configured');
    throw new Error('JWT signing not configured');
  }

  // ==========================================================================
  // 3. Build JWT Claims
  // ==========================================================================
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const claims: Omit<ToolAccessJWTClaims, 'iss' | 'aud' | 'iat' | 'exp'> & {
    sub: string;
    email: string;
    jti: string;
    nonce?: string;
  } = {
    sub: oneSubUserId,
    email: email,
    jti: jti,
  };

  if (nonce) {
    claims.nonce = nonce;
  }

  // ==========================================================================
  // 4. Sign JWT
  // ==========================================================================
  try {
    const privateKey = await importPKCS8(privateKeyPEM, signingKey.algorithm);

    const jwt = await new SignJWT(claims)
      .setProtectedHeader({ 
        alg: signingKey.algorithm, 
        kid: signingKey.kid,
        typ: 'JWT' 
      })
      .setIssuer(JWT_ISSUER)
      .setAudience(toolId)
      .setIssuedAt(now)
      .setExpirationTime(JWT_EXPIRATION)
      .sign(privateKey);

    return jwt;
  } catch (error) {
    console.error('[Tool JWT] Error signing JWT:', error);
    throw new Error('Failed to sign JWT');
  }
}

/**
 * Build redirect URL with JWT token for tool access
 * 
 * @param redirectUri - The tool's configured redirect URI
 * @param token - The signed JWT token
 * @param state - Optional state parameter for CSRF protection
 * @returns Complete redirect URL
 */
export function buildToolRedirectUrl(
  redirectUri: string,
  token: string,
  state?: string
): string {
  const url = new URL(redirectUri);
  url.searchParams.set('token', token);
  
  if (state) {
    url.searchParams.set('state', state);
  }

  return url.toString();
}

/**
 * Get redirect URI for a tool from its API key metadata
 * 
 * @param toolId - The tool ID
 * @returns Redirect URI or null if not configured
 */
export async function getToolRedirectUri(toolId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('metadata')
    .eq('tool_id', toolId)
    .single();

  if (error || !apiKey) {
    console.error('[Tool JWT] Error fetching API key metadata:', error);
    return null;
  }

  const metadata = apiKey.metadata as Record<string, unknown> || {};
  return metadata.redirect_uri as string || null;
}




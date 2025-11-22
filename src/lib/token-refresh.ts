/**
 * Token Refresh Utilities
 * 
 * Handles refresh token generation, validation, and access token renewal
 * to prevent user sessions from expiring after 1 hour.
 */

import jwt from 'jsonwebtoken';
import { generateToolAccessToken } from './jwt';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;

if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_TOKEN_SECRET environment variables are required');
}

// Type assertion: after the check above, we know these are strings
const REFRESH_TOKEN_SECRET_SAFE: string = REFRESH_TOKEN_SECRET;

export interface RefreshTokenPayload {
  userId: string;
  toolId: string;
  checkoutId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

/**
 * Generate a refresh token for long-term session management
 * @param userId - The user ID
 * @param toolId - The tool ID
 * @param checkoutId - The checkout ID
 * @returns Refresh token string
 */
export function generateRefreshToken(
  userId: string,
  toolId: string,
  checkoutId: string
): string {
  const payload: RefreshTokenPayload = {
    userId,
    toolId,
    checkoutId,
    type: 'refresh',
  };

  const token = jwt.sign(payload, REFRESH_TOKEN_SECRET_SAFE, {
    expiresIn: '7d', // Refresh token lasts 7 days
    algorithm: 'HS256',
  });

  return token;
}

/**
 * Verify and decode a refresh token
 * @param token - The refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyRefreshToken(
  token: string
): RefreshTokenPayload & { exp: number } {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET_SAFE, {
      algorithms: ['HS256'],
    }) as RefreshTokenPayload & { exp: number; iat: number };

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Token is not a refresh token');
    }

    // Ensure required fields are present
    if (!decoded.userId || !decoded.toolId || !decoded.checkoutId) {
      throw new Error('Token payload is missing required fields');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Generate both access and refresh tokens
 * @param userId - The user ID
 * @param toolId - The tool ID
 * @param checkoutId - The checkout ID
 * @returns Token pair with expiration times
 */
export function generateTokenPair(
  userId: string,
  toolId: string,
  checkoutId: string
): TokenPair {
  const accessToken = generateToolAccessToken(userId, toolId, checkoutId);
  const refreshToken = generateRefreshToken(userId, toolId, checkoutId);

  // Calculate expiration times
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshTokenExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
  };
}

/**
 * Refresh an access token using a valid refresh token
 * @param refreshToken - The refresh token
 * @returns New access token with expiration time
 * @throws Error if refresh token is invalid or expired
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: string;
}> {
  // Verify the refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Generate new access token
  const accessToken = generateToolAccessToken(
    decoded.userId,
    decoded.toolId,
    decoded.checkoutId
  );

  // Calculate new expiration time
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return {
    accessToken,
    expiresAt,
  };
}

/**
 * Check if a token is about to expire (within 5 minutes)
 * @param token - The JWT token to check
 * @returns True if token expires soon
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded || !decoded.exp) return false;

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

    return expirationTime < fiveMinutesFromNow;
  } catch {
    return true; // If we can't decode, assume it needs refresh
  }
}

/**
 * Validate token pair for consistency
 * @param accessToken - The access token
 * @param refreshToken - The refresh token
 * @returns True if tokens are valid and match
 */
interface DecodedTokenPayload {
  userId?: string;
  toolId?: string;
  checkoutId?: string;
  type?: string;
}

export function validateTokenPair(
  accessToken: string,
  refreshToken: string
): boolean {
  try {
    const accessDecoded = jwt.decode(accessToken) as DecodedTokenPayload | null;
    const refreshDecoded = jwt.decode(refreshToken) as DecodedTokenPayload | null;

    if (!accessDecoded || !refreshDecoded) return false;

    // Verify tokens are for the same user, tool, and checkout
    return (
      accessDecoded.userId === refreshDecoded.userId &&
      accessDecoded.toolId === refreshDecoded.toolId &&
      accessDecoded.checkoutId === refreshDecoded.checkoutId &&
      refreshDecoded.type === 'refresh'
    );
  } catch {
    return false;
  }
}


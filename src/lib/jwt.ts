/**
 * JWT Token Utilities for Tool Access
 * 
 * Handles generation and verification of JWT tokens for external tool access.
 * Tokens are short-lived (1 hour) and used to authenticate users with external tools.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Token generation will fail.');
}

export interface ToolAccessTokenPayload {
  userId: string;
  toolId: string;
  checkoutId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for tool access
 * @param userId - The user ID
 * @param toolId - The tool ID
 * @param checkoutId - The checkout ID
 * @returns JWT token string
 */
export function generateToolAccessToken(
  userId: string,
  toolId: string,
  checkoutId: string
): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload: ToolAccessTokenPayload = {
    userId,
    toolId,
    checkoutId,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h', // Token expires in 1 hour
    algorithm: 'HS256',
  });

  return token;
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns Decoded token payload with expiration info
 * @throws Error if token is invalid or expired
 */
export function verifyToolAccessToken(
  token: string
): ToolAccessTokenPayload & { exp: number } {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as ToolAccessTokenPayload & { exp: number; iat: number };

    // Ensure required fields are present
    if (!decoded.userId || !decoded.toolId || !decoded.checkoutId) {
      throw new Error('Token payload is missing required fields');
    }

    return {
      userId: decoded.userId,
      toolId: decoded.toolId,
      checkoutId: decoded.checkoutId,
      exp: decoded.exp,
      iat: decoded.iat,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}



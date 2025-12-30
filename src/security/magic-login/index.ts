/**
 * Magic Login Security Module
 *
 * CANONICAL SOURCE: All Magic Login cryptographic operations MUST use this module.
 *
 * Provides:
 * - Signed URL generation with nonce-based replay protection
 * - Timestamp validation with configurable TTL
 * - URL validation for Magic Login endpoints
 * - Nonce tracking to prevent replay attacks
 */

import crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const MAGIC_LOGIN_CONFIG = {
  /** Time-to-live for Magic Login URLs in seconds */
  TTL_SECONDS: 300, // 5 minutes (industry standard)

  /** Maximum allowed clock skew in seconds (to handle minor time differences) */
  MAX_CLOCK_SKEW_SECONDS: 30,

  /** Nonce length in bytes (will produce 32 hex characters) */
  NONCE_LENGTH: 16,

  /** Rate limit: requests per minute per user */
  RATE_LIMIT_PER_USER: 10,

  /** Rate limit: requests per minute per tool */
  RATE_LIMIT_PER_TOOL: 100,
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface MagicLoginSignatureData {
  userId: string;
  timestamp: number;
  nonce: string;
}

export interface MagicLoginValidationResult {
  valid: boolean;
  error?: string;
  data?: MagicLoginSignatureData;
}

export interface MagicLoginUrlValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

// ============================================================================
// NONCE TRACKING (In-Memory with TTL)
// For production with multiple servers, replace with Redis
// ============================================================================

interface NonceEntry {
  timestamp: number;
  toolId: string;
}

class NonceTracker {
  private usedNonces = new Map<string, NonceEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired nonces every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  private cleanup(): void {
    const cutoff = Date.now() - (MAGIC_LOGIN_CONFIG.TTL_SECONDS * 1000) - 60000; // TTL + 1 minute buffer
    for (const [nonce, entry] of this.usedNonces.entries()) {
      if (entry.timestamp < cutoff) {
        this.usedNonces.delete(nonce);
      }
    }
  }

  /**
   * Check if nonce has been used and mark it as used
   * @returns true if nonce is fresh (not used before), false if already used
   */
  checkAndMark(nonce: string, toolId: string): boolean {
    const key = `${toolId}:${nonce}`;

    if (this.usedNonces.has(key)) {
      return false; // Already used
    }

    this.usedNonces.set(key, {
      timestamp: Date.now(),
      toolId,
    });

    return true; // Fresh nonce
  }

  /**
   * Check if nonce exists without marking (for validation only)
   */
  exists(nonce: string, toolId: string): boolean {
    return this.usedNonces.has(`${toolId}:${nonce}`);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.usedNonces.clear();
  }
}

// Singleton instance
const nonceTracker = new NonceTracker();

// ============================================================================
// SIGNATURE GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(MAGIC_LOGIN_CONFIG.NONCE_LENGTH).toString('hex');
}

/**
 * Generate Magic Login signature
 *
 * Signature = HMAC-SHA256(userId + timestamp + nonce, secret)
 *
 * The nonce ensures each URL is unique even for the same user/timestamp
 */
export function generateMagicLoginSignature(
  userId: string,
  timestamp: number,
  nonce: string,
  secret: string
): string {
  const data = `${userId}${timestamp}${nonce}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Generate complete signed Magic Login URL parameters
 */
export function generateSignedMagicLoginParams(
  userId: string,
  secret: string
): { timestamp: number; nonce: string; signature: string } {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const signature = generateMagicLoginSignature(userId, timestamp, nonce, secret);

  return { timestamp, nonce, signature };
}

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

/**
 * Validate Magic Login signature (for documentation/SDK purposes)
 *
 * This validates:
 * 1. Timestamp is within TTL window
 * 2. Timestamp is not in the future (clock skew tolerance)
 * 3. Signature matches expected value
 * 4. Nonce has not been used before
 */
export function validateMagicLoginSignature(
  userId: string,
  timestamp: number,
  nonce: string,
  signature: string,
  secret: string,
  toolId: string
): MagicLoginValidationResult {
  const now = Math.floor(Date.now() / 1000);

  // Check timestamp is not too old (TTL)
  const age = now - timestamp;
  if (age > MAGIC_LOGIN_CONFIG.TTL_SECONDS) {
    return {
      valid: false,
      error: `Link expired. Links are valid for ${MAGIC_LOGIN_CONFIG.TTL_SECONDS} seconds.`,
    };
  }

  // Check timestamp is not in the future (clock skew)
  if (age < -MAGIC_LOGIN_CONFIG.MAX_CLOCK_SKEW_SECONDS) {
    return {
      valid: false,
      error: 'Invalid timestamp (future date detected)',
    };
  }

  // Verify signature using timing-safe comparison
  const expectedSignature = generateMagicLoginSignature(userId, timestamp, nonce, secret);

  try {
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!signaturesMatch) {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }
  } catch {
    // Buffer length mismatch
    return {
      valid: false,
      error: 'Invalid signature format',
    };
  }

  // Check nonce has not been used (replay protection)
  const nonceIsValid = nonceTracker.checkAndMark(nonce, toolId);
  if (!nonceIsValid) {
    return {
      valid: false,
      error: 'Link has already been used (replay detected)',
    };
  }

  return {
    valid: true,
    data: { userId, timestamp, nonce },
  };
}

// ============================================================================
// URL VALIDATION
// ============================================================================

// List of blocked private IP ranges and special addresses
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
];

const PRIVATE_IP_PATTERNS = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16
  /^169\.254\./,                    // Link-local
  /^fc00:/i,                        // IPv6 private
  /^fe80:/i,                        // IPv6 link-local
];

/**
 * Check if a hostname is a private/local address
 */
function isPrivateHost(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  // Check blocked hosts
  if (BLOCKED_HOSTS.includes(lowerHostname)) {
    return true;
  }

  // Check private IP patterns
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate Magic Login URL
 *
 * Requirements:
 * - Must be HTTPS (security requirement)
 * - Must not point to private/local addresses (SSRF protection)
 * - Must be a valid URL
 */
export function validateMagicLoginUrl(
  url: string,
  allowLocalhost: boolean = false
): MagicLoginUrlValidationResult {
  try {
    const parsed = new URL(url);

    // Must be HTTPS (allow HTTP only for localhost in development)
    if (parsed.protocol !== 'https:') {
      if (parsed.protocol === 'http:' && allowLocalhost && parsed.hostname === 'localhost') {
        // Allow HTTP localhost for development
      } else {
        return {
          valid: false,
          error: 'Magic Login URL must use HTTPS',
        };
      }
    }

    // Block private/local addresses (SSRF protection)
    if (!allowLocalhost && isPrivateHost(parsed.hostname)) {
      return {
        valid: false,
        error: 'Magic Login URL cannot point to private or local addresses',
      };
    }

    // Normalize the URL
    const normalizedUrl = parsed.toString();

    return {
      valid: true,
      normalizedUrl,
    };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Generate a Magic Login secret
 */
export function generateMagicLoginSecret(): string {
  return 'mlsec_' + crypto.randomBytes(32).toString('hex');
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export const _internal = {
  nonceTracker,
  isPrivateHost,
};

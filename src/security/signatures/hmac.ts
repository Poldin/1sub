/**
 * HMAC Signature Utilities
 *
 * CANONICAL SOURCE: All webhook signature operations MUST use this module.
 *
 * Used for:
 * - Generating webhook signatures (outgoing)
 * - Verifying webhook signatures (incoming)
 */

import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * @param payload - The payload string
 * @param secret - The shared secret
 * @returns Signature in format "t=timestamp,v1=signature"
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify webhook signature
 *
 * @param payload - The raw payload string
 * @param signature - The signature header value
 * @param secret - The shared secret
 * @param toleranceSeconds - Allowed time drift (default 5 minutes)
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  try {
    // Parse signature header: "t=timestamp,v1=signature"
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = parseInt(timestampPart.split('=')[1]);
    const expectedSignature = signaturePart.split('=')[1];

    // Check timestamp is within tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[HMAC Verification] Error:', error);
    return false;
  }
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Simple HMAC-SHA256 hash (for non-webhook use)
 */
export function hmacSha256(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Generate a random token (cryptographically secure)
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

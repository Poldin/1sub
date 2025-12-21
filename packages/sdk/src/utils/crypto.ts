import { createHash, createHmac, timingSafeEqual } from 'crypto';

/**
 * Hash an email address using SHA-256
 * Normalizes email to lowercase and trims whitespace
 */
export function hashEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Create HMAC-SHA256 signature
 */
export function createHmacSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by always comparing in constant time
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare with itself to maintain constant time
    timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }

  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Parse 1Sub signature header
 * Format: t=timestamp,v1=signature
 */
export function parseSignatureHeader(header: string): {
  timestamp: string | null;
  signature: string | null;
} {
  const result: { timestamp: string | null; signature: string | null } = {
    timestamp: null,
    signature: null,
  };

  const parts = header.split(',');

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      result.timestamp = value || null;
    } else if (key === 'v1') {
      result.signature = value || null;
    }
  }

  return result;
}

/**
 * Verify 1Sub webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  const { timestamp, signature: sig } = parseSignatureHeader(signature);

  if (!timestamp || !sig) {
    return false;
  }

  // Check timestamp tolerance (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const signatureTimestamp = parseInt(timestamp, 10);

  if (isNaN(signatureTimestamp)) {
    return false;
  }

  if (Math.abs(now - signatureTimestamp) > toleranceSeconds) {
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmacSignature(signedPayload, secret);

  // Timing-safe comparison
  return secureCompare(expectedSignature, sig);
}

/**
 * Generate a webhook signature (for testing purposes)
 */
export function generateSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmacSignature(signedPayload, secret);
  return `t=${timestamp},v1=${signature}`;
}

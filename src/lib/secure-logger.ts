/**
 * Secure Logging Utility
 * 
 * Masks sensitive data in logs to prevent accidental exposure.
 * Use this instead of console.log/error/warn for production logging.
 */

/**
 * Mask sensitive data fields
 */
function maskSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'apiKey',
    'api_key',
    'secret',
    'token',
    'authorization',
    'sessionToken',
    'refreshToken',
    'accessToken',
  ];

  const partialMaskFields = [
    'userId',
    'user_id',
    'email',
    'checkoutId',
    'checkout_id',
    'transactionId',
    'transaction_id',
  ];

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Completely mask sensitive fields
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      masked[key] = '***REDACTED***';
      continue;
    }

    // Partially mask fields (show first 8 chars)
    if (partialMaskFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (typeof value === 'string' && value.length > 8) {
        masked[key] = value.substring(0, 8) + '...';
      } else {
        masked[key] = value;
      }
      continue;
    }

    // Recursively mask nested objects
    if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Secure logger that masks sensitive data
 */
export const secureLog = {
  /**
   * Log with sensitive data masking
   */
  log: (...args: unknown[]) => {
    const masked = args.map(arg => maskSensitiveData(arg));
    console.log(...masked);
  },

  /**
   * Error log with sensitive data masking
   */
  error: (...args: unknown[]) => {
    const masked = args.map(arg => maskSensitiveData(arg));
    console.error(...masked);
  },

  /**
   * Warn log with sensitive data masking
   */
  warn: (...args: unknown[]) => {
    const masked = args.map(arg => maskSensitiveData(arg));
    console.warn(...masked);
  },

  /**
   * Debug log (only in development)
   */
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      const masked = args.map(arg => maskSensitiveData(arg));
      console.log('[DEBUG]', ...masked);
    }
  },
};

/**
 * Mask user ID to show only first 8 characters
 */
export function maskUserId(userId: string): string {
  if (!userId || userId.length <= 8) {
    return userId;
  }
  return userId.substring(0, 8) + '...';
}

/**
 * Mask email to show only domain
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***@***';
  }
  const [, domain] = email.split('@');
  return `***@${domain}`;
}

/**
 * Mask API key to show only prefix
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 8) {
    return '***';
  }
  return apiKey.substring(0, 8) + '...';
}


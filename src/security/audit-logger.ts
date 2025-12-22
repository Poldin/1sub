/**
 * Security Audit Logger
 *
 * CANONICAL SOURCE: All security audit logging MUST use this module.
 *
 * Logs security-relevant events for monitoring and compliance.
 * Currently logs to console; extend to external services in production.
 */

// ============================================================================
// TYPES
// ============================================================================

type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

interface AuditLogEntry {
  timestamp: string;
  event: string;
  severity: AuditSeverity;
  details: Record<string, unknown>;
  ip?: string;
  userId?: string;
  toolId?: string;
}

// ============================================================================
// CORE LOGGING FUNCTION
// ============================================================================

/**
 * Log security audit event
 *
 * For production, extend to send to:
 * - Dedicated logging service (Datadog, New Relic, etc.)
 * - SIEM system
 * - Database table for audit trail
 */
function logAuditEvent(entry: AuditLogEntry) {
  const logEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  const prefix = `[AUDIT ${entry.severity.toUpperCase()}]`;

  switch (entry.severity) {
    case 'critical':
    case 'error':
      console.error(prefix, logEntry);
      break;
    case 'warning':
      console.warn(prefix, logEntry);
      break;
    default:
      console.log(prefix, logEntry);
  }

  // TODO: In production, send to external service
  // Example:
  // await fetch('https://logging-service.com/api/logs', {
  //   method: 'POST',
  //   body: JSON.stringify(logEntry)
  // });
}

// ============================================================================
// API KEY EVENTS
// ============================================================================

/**
 * Log API key authentication attempt
 */
export function logApiKeyAuth(params: {
  success: boolean;
  apiKey?: string;
  toolId?: string;
  toolName?: string;
  ip?: string;
  reason?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'api_key_authentication',
    severity: params.success ? 'info' : 'warning',
    details: {
      success: params.success,
      apiKeyPrefix: params.apiKey ? params.apiKey.substring(0, 10) + '...' : undefined,
      toolId: params.toolId,
      toolName: params.toolName,
      reason: params.reason,
    },
    ip: params.ip,
    toolId: params.toolId,
  });
}

/**
 * Log API key regeneration
 */
export function logApiKeyRegeneration(params: {
  toolId: string;
  toolName?: string;
  userId: string;
  ip?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'api_key_regeneration',
    severity: 'warning',
    details: {
      toolId: params.toolId,
      toolName: params.toolName,
      userId: params.userId,
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId,
  });
}

// ============================================================================
// CREDIT EVENTS
// ============================================================================

/**
 * Log credit consumption
 */
export function logCreditConsumption(params: {
  userId: string;
  toolId: string;
  toolName?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  transactionId?: string;
  ip?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'credit_consumption',
    severity: 'info',
    details: {
      userId: params.userId,
      toolId: params.toolId,
      toolName: params.toolName,
      amount: params.amount,
      balanceBefore: params.balanceBefore,
      balanceAfter: params.balanceAfter,
      reason: params.reason,
      transactionId: params.transactionId,
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId,
  });
}

/**
 * Log insufficient credits attempt
 */
export function logInsufficientCredits(params: {
  userId: string;
  toolId: string;
  required: number;
  available: number;
  ip?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'insufficient_credits',
    severity: 'info',
    details: {
      userId: params.userId,
      toolId: params.toolId,
      required: params.required,
      available: params.available,
      shortfall: params.required - params.available,
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId,
  });
}

// ============================================================================
// TOKEN EVENTS
// ============================================================================

/**
 * Log token verification
 */
export function logTokenVerification(params: {
  success: boolean;
  userId?: string;
  toolId?: string;
  checkoutId?: string;
  ip?: string;
  reason?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'token_verification',
    severity: params.success ? 'info' : 'warning',
    details: {
      success: params.success,
      userId: params.userId,
      toolId: params.toolId,
      checkoutId: params.checkoutId,
      reason: params.reason,
    },
    ip: params.ip,
    userId: params.userId,
  });
}

/**
 * Log token refresh
 */
export function logTokenRefresh(params: {
  success: boolean;
  userId?: string;
  toolId?: string;
  checkoutId?: string;
  ip?: string;
  reason?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'token_refresh',
    severity: params.success ? 'info' : 'warning',
    details: {
      success: params.success,
      userId: params.userId,
      toolId: params.toolId,
      checkoutId: params.checkoutId,
      reason: params.reason,
    },
    ip: params.ip,
    userId: params.userId,
  });
}

// ============================================================================
// SECURITY EVENTS
// ============================================================================

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(params: {
  endpoint: string;
  identifier: string;
  limit: number;
  ip?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'rate_limit_exceeded',
    severity: 'warning',
    details: {
      endpoint: params.endpoint,
      identifier: params.identifier,
      limit: params.limit,
    },
    ip: params.ip,
  });
}

/**
 * Log validation error
 */
export function logValidationError(params: {
  endpoint: string;
  error: string;
  input?: Record<string, unknown>;
  ip?: string;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'validation_error',
    severity: 'warning',
    details: {
      endpoint: params.endpoint,
      error: params.error,
      input: params.input,
    },
    ip: params.ip,
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(params: {
  type: string;
  description: string;
  userId?: string;
  toolId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}) {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'suspicious_activity',
    severity: 'critical',
    details: {
      type: params.type,
      description: params.description,
      metadata: params.metadata,
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId,
  });
}

// ============================================================================
// SECURE LOGGING HELPERS
// ============================================================================

const SENSITIVE_KEYS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'sessionToken',
  'refreshToken',
];

/**
 * Sanitize object for safe logging (removes sensitive fields)
 */
export function sanitizeForLogging(obj: unknown, depth: number = 3): unknown {
  if (depth <= 0) {
    return '[Max Depth Reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, depth - 1));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, depth - 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Secure log function that automatically sanitizes sensitive data
 */
export const secureLog = {
  debug: (message: string, data?: unknown) => {
    console.debug(`[DEBUG] ${message}`, data ? sanitizeForLogging(data) : '');
  },
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? sanitizeForLogging(data) : '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data ? sanitizeForLogging(data) : '');
  },
  error: (message: string, data?: unknown) => {
    console.error(`[ERROR] ${message}`, data ? sanitizeForLogging(data) : '');
  },
};

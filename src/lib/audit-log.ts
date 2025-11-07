/**
 * Security Audit Logging
 * 
 * Logs security-relevant events for monitoring and compliance.
 * Currently logs to console and can be extended to send to external services.
 */

interface AuditLogEntry {
  timestamp: string;
  event: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, unknown>;
  ip?: string;
  userId?: string;
  toolId?: string;
}

/**
 * Log security event
 * 
 * For production, consider sending to:
 * - Dedicated logging service (Datadog, New Relic, etc.)
 * - SIEM system
 * - Database table for audit trail
 */
function logAuditEvent(entry: AuditLogEntry) {
  const logEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString()
  };

  // Console logging with color coding
  const prefix = `[AUDIT ${entry.severity.toUpperCase()}]`;
  
  switch (entry.severity) {
    case 'critical':
      console.error(prefix, logEntry);
      break;
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

/**
 * Log API key authentication attempt
 */
export function logApiKeyAuth(params: {
  success: boolean;
  apiKey?: string; // Only log prefix for security
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
      reason: params.reason
    },
    ip: params.ip,
    toolId: params.toolId
  });
}

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
      transactionId: params.transactionId
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId
  });
}

/**
 * Log JWT token verification
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
    event: 'jwt_token_verification',
    severity: params.success ? 'info' : 'warning',
    details: {
      success: params.success,
      userId: params.userId,
      toolId: params.toolId,
      checkoutId: params.checkoutId,
      reason: params.reason
    },
    ip: params.ip,
    userId: params.userId
  });
}

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
      limit: params.limit
    },
    ip: params.ip
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
      metadata: params.metadata
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId
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
      input: params.input
    },
    ip: params.ip
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
      userId: params.userId
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId
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
      shortfall: params.required - params.available
    },
    ip: params.ip,
    userId: params.userId,
    toolId: params.toolId
  });
}



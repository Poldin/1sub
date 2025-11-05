/**
 * Input Validation Utilities
 * 
 * Provides validation functions for common input types.
 * Uses Zod for schema validation.
 */

import { z } from 'zod';

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid({
  message: 'Invalid UUID format'
});

/**
 * Validate UUID format
 * @param value - Value to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: unknown): value is string {
  try {
    uuidSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and parse UUID
 * @param value - Value to validate
 * @returns UUID string if valid
 * @throws ZodError if invalid
 */
export function validateUUID(value: unknown): string {
  return uuidSchema.parse(value);
}

/**
 * Credit amount validation
 */
export const creditAmountSchema = z.number()
  .positive({ message: 'Amount must be positive' })
  .finite({ message: 'Amount must be finite' })
  .max(1000000, { message: 'Amount exceeds maximum allowed' });

/**
 * API key format validation (sk-tool-...)
 */
export const apiKeySchema = z.string()
  .regex(/^sk-tool-[a-z0-9]{32,}$/, {
    message: 'Invalid API key format'
  });

/**
 * Idempotency key validation
 */
export const idempotencyKeySchema = z.string()
  .min(1, { message: 'Idempotency key is required' })
  .max(255, { message: 'Idempotency key too long' });

/**
 * Credit consumption request schema
 */
export const creditConsumeRequestSchema = z.object({
  user_id: uuidSchema,
  amount: creditAmountSchema,
  reason: z.string().min(1).max(500),
  idempotency_key: idempotencyKeySchema
});

/**
 * Token verification request schema
 */
export const tokenVerifyRequestSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' })
});

/**
 * Validate credit consumption request
 */
export function validateCreditConsumeRequest(data: unknown) {
  return creditConsumeRequestSchema.parse(data);
}

/**
 * Validate token verification request
 */
export function validateTokenVerifyRequest(data: unknown) {
  return tokenVerifyRequestSchema.parse(data);
}

/**
 * Safe parse with detailed error messages
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Email validation (basic)
 */
export const emailSchema = z.string().email({
  message: 'Invalid email format'
});

/**
 * URL validation
 */
export const urlSchema = z.string().url({
  message: 'Invalid URL format'
});

/**
 * Validate external tool URL
 */
export const externalToolUrlSchema = z.string()
  .url({ message: 'Invalid URL format' })
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    { message: 'URL must use HTTP or HTTPS protocol' }
  )
  .refine(
    (url) => !url.includes('example.com'),
    { message: 'Please provide a real tool URL, not an example' }
  );

/**
 * Validate checkout ID
 */
export function validateCheckoutId(value: unknown): string {
  return uuidSchema.parse(value);
}

/**
 * Validate tool ID
 */
export function validateToolId(value: unknown): string {
  return uuidSchema.parse(value);
}

/**
 * Validate user ID
 */
export function validateUserId(value: unknown): string {
  return uuidSchema.parse(value);
}


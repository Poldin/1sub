/**
 * Unit Tests for Validation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  apiKeySchema,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('UUID Validation', () => {
    it('should validate correct UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key format', () => {
      const validKey = 'sk-tool-' + 'a'.repeat(32);
      expect(() => apiKeySchema.parse(validKey)).not.toThrow();
    });

    it('should reject invalid API key format', () => {
      expect(() => apiKeySchema.parse('invalid-key')).toThrow();
      expect(() => apiKeySchema.parse('sk-tool-short')).toThrow();
      expect(() => apiKeySchema.parse('sk-wrong-prefix')).toThrow();
    });
  });
});

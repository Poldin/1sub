/**
 * Security Tests: API Error Responses
 * 
 * Tests that error responses don't leak sensitive information
 */

import { describe, it, expect } from '@jest/globals';
import { createErrorResponse, ERROR_CODES } from '@/lib/api-errors';

describe('API Error Security', () => {
  describe('Error Response Format', () => {
    it('should return generic error messages', () => {
      const response = createErrorResponse('INTERNAL_ERROR');
      const json = response.json();
      
      // Response should not contain stack traces or detailed error info
      expect(json).toHaveProperty('error');
      expect(json).toHaveProperty('message');
      expect(json).not.toHaveProperty('stack');
      expect(json).not.toHaveProperty('stackTrace');
    });

    it('should use predefined error codes', () => {
      Object.keys(ERROR_CODES).forEach(code => {
        const errorCode = code as keyof typeof ERROR_CODES;
        const response = createErrorResponse(errorCode);
        
        expect(response.status).toBe(ERROR_CODES[errorCode].statusCode);
      });
    });

    it('should not expose internal details in error messages', () => {
      const detailedError = new Error('Database connection failed at host 192.168.1.1');
      const response = createErrorResponse('DATABASE_ERROR', detailedError);
      const json = response.json();
      
      // Should not contain IP addresses, hostnames, or stack traces
      expect(JSON.stringify(json)).not.toContain('192.168.1.1');
      expect(JSON.stringify(json)).not.toContain('Database connection failed');
    });
  });

  describe('Status Codes', () => {
    it('should use correct HTTP status codes', () => {
      expect(ERROR_CODES.UNAUTHORIZED.statusCode).toBe(401);
      expect(ERROR_CODES.FORBIDDEN.statusCode).toBe(403);
      expect(ERROR_CODES.NOT_FOUND.statusCode).toBe(404);
      expect(ERROR_CODES.RATE_LIMIT_EXCEEDED.statusCode).toBe(429);
      expect(ERROR_CODES.INTERNAL_ERROR.statusCode).toBe(500);
    });
  });

  describe('Additional Data', () => {
    it('should allow safe additional data', () => {
      const additionalData = {
        retryAfter: 60,
        limit: 100,
      };
      
      const response = createErrorResponse('RATE_LIMIT_EXCEEDED', null, additionalData);
      const json = response.json();
      
      expect(json).toHaveProperty('retryAfter', 60);
      expect(json).toHaveProperty('limit', 100);
    });
  });
});


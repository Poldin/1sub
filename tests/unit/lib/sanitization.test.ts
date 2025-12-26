/**
 * Unit Tests for Sanitization Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeUrl,
  sanitizeForLogging,
} from '@/security';

describe('Sanitization Utilities', () => {
  describe('HTML Sanitization', () => {
    it('should remove script tags', () => {
      const dirty = '<p>Hello</p><script>alert("XSS")</script>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const dirty = '<div onclick="alert()">Click</div>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const dirty = '<a href="javascript:alert()">Link</a>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('should remove iframes', () => {
      const dirty = '<p>Safe</p><iframe src="evil.com"></iframe>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('iframe');
    });
  });

  describe('URL Sanitization', () => {
    it('should allow valid HTTP URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert()')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert()</script>')).toBe('');
    });

    it('should block file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:alert()')).toBe('');
    });
  });

  describe('Logging Sanitization', () => {
    it('should redact sensitive fields', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        api_key: 'sk-tool-abc123',
        data: { token: 'bearer-token' },
      };

      const sanitized = sanitizeForLogging(obj);
      expect(sanitized).toEqual({
        username: 'john',
        password: '***REDACTED***',
        api_key: '***REDACTED***',
        data: { token: '***REDACTED***' },
      });
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          email: 'test@example.com',
          password: 'secret',
          profile: {
            apiKey: 'key123',
          },
        },
      };

      const sanitized = sanitizeForLogging(obj);
      expect((sanitized as any).user.password).toBe('***REDACTED***');
      expect((sanitized as any).user.profile.apiKey).toBe('***REDACTED***');
    });
  });
});

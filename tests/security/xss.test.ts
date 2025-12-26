/**
 * XSS (Cross-Site Scripting) Security Tests
 *
 * Tests to ensure the application is protected against XSS attacks.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeUrl } from '@/security';

describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<iframe src="javascript:alert()">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<body onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<marquee onstart=alert("XSS")>',
    '<video><source onerror="alert(\'XSS\')">',
  ];

  describe('HTML Sanitization', () => {
    xssPayloads.forEach((payload) => {
      it(`should sanitize XSS payload: ${payload}`, () => {
        const sanitized = sanitizeHtml(payload);

        // Should not contain dangerous patterns
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onfocus');
        expect(sanitized).not.toContain('onstart');
      });
    });

    it('should preserve safe HTML', () => {
      const safeHtml = '<p>Hello <strong>World</strong></p>';
      const sanitized = sanitizeHtml(safeHtml);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });
  });

  describe('URL Sanitization', () => {
    it('should block dangerous protocols', () => {
      expect(sanitizeUrl('javascript:alert()')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>alert()</script>')).toBe('');
      expect(sanitizeUrl('vbscript:alert()')).toBe('');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should allow safe URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('/relative/path')).toBe('/relative/path');
    });

    it('should handle edge cases', () => {
      expect(sanitizeUrl('JAVASCRIPT:alert()')).toBe('');
      expect(sanitizeUrl('  javascript:alert()  ')).toBe('');
      expect(sanitizeUrl('jAvAsCrIpT:alert()')).toBe('');
    });
  });
});

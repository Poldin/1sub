/**
 * Security Tests: Input Validation
 * 
 * Tests input validation and sanitization
 */

import { describe, it, expect } from '@jest/globals';
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeEmail,
  sanitizeProductName,
  sanitizeToolDescription,
} from '@/lib/sanitization';
import { isValidUUID } from '@/lib/validation';

describe('Input Validation Security', () => {
  describe('UUID Validation', () => {
    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '123e4567-e89b-12d3-a456-426614174000',
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '',
        'xxx-xxx-xxx-xxx-xxx',
        '550e8400-e29b-41d4-a716-44665544000', // too short
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('Text Sanitization', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeText(input);
      
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('should escape special characters', () => {
      const input = '&<>"\'';
      const output = sanitizeText(input);
      
      expect(output).toBe('&amp;&lt;&gt;&quot;&#x27;');
    });
  });

  describe('URL Sanitization', () => {
    it('should allow valid HTTP/HTTPS URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        '/relative/path',
      ];

      validUrls.forEach(url => {
        const sanitized = sanitizeUrl(url);
        expect(sanitized).toBe(url);
      });
    });

    it('should block dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
      ];

      dangerousUrls.forEach(url => {
        const sanitized = sanitizeUrl(url);
        expect(sanitized).toBe('');
      });
    });
  });

  describe('Email Sanitization', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach(email => {
        expect(() => sanitizeEmail(email)).not.toThrow();
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(() => sanitizeEmail(email)).toThrow();
      });
    });

    it('should normalize email format', () => {
      const input = '  USER@EXAMPLE.COM  ';
      const output = sanitizeEmail(input);
      
      expect(output).toBe('user@example.com');
    });
  });

  describe('Product Name Sanitization', () => {
    it('should remove HTML tags', () => {
      const input = '<b>Product</b> Name';
      const output = sanitizeProductName(input);
      
      expect(output).toBe('Product Name');
    });

    it('should limit length', () => {
      const input = 'a'.repeat(300);
      const output = sanitizeProductName(input);
      
      expect(output.length).toBeLessThanOrEqual(200);
    });

    it('should remove dangerous characters', () => {
      const input = 'Product<>"\' Name';
      const output = sanitizeProductName(input);
      
      expect(output).toBe('Product Name');
    });
  });

  describe('Tool Description Sanitization', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Description with <script>alert(1)</script> tags</p>';
      const output = sanitizeToolDescription(input);
      
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('<p>');
    });

    it('should limit length', () => {
      const input = 'a'.repeat(10000);
      const output = sanitizeToolDescription(input);
      
      expect(output.length).toBeLessThanOrEqual(5000);
    });

    it('should remove null bytes', () => {
      const input = 'Description\x00with\x00nulls';
      const output = sanitizeToolDescription(input);
      
      expect(output).not.toContain('\x00');
    });
  });
});


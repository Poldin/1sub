/**
 * Unit Tests for Magic Login Security Module
 *
 * Tests the cryptographic operations, nonce tracking, and URL validation
 * for the Magic Login system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MAGIC_LOGIN_CONFIG,
  generateNonce,
  generateMagicLoginSignature,
  generateSignedMagicLoginParams,
  generateMagicLoginSecret,
  validateMagicLoginSignature,
  validateMagicLoginUrl,
  _internal,
} from '@/security/magic-login';

describe('Magic Login Security Module', () => {
  describe('Configuration', () => {
    it('should have correct TTL (5 minutes)', () => {
      expect(MAGIC_LOGIN_CONFIG.TTL_SECONDS).toBe(300);
    });

    it('should have reasonable clock skew tolerance', () => {
      expect(MAGIC_LOGIN_CONFIG.MAX_CLOCK_SKEW_SECONDS).toBe(30);
    });

    it('should have appropriate rate limits', () => {
      expect(MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_USER).toBe(10);
      expect(MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_TOOL).toBe(100);
    });
  });

  describe('Nonce Generation', () => {
    it('should generate a nonce of correct length', () => {
      const nonce = generateNonce();
      // 16 bytes = 32 hex characters
      expect(nonce).toHaveLength(32);
    });

    it('should generate unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      expect(nonces.size).toBe(100);
    });

    it('should generate hex-only characters', () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('Secret Generation', () => {
    it('should generate secret with correct prefix', () => {
      const secret = generateMagicLoginSecret();
      expect(secret.startsWith('mlsec_')).toBe(true);
    });

    it('should generate secret of correct length', () => {
      const secret = generateMagicLoginSecret();
      // 'mlsec_' (6) + 32 bytes (64 hex chars) = 70
      expect(secret).toHaveLength(70);
    });

    it('should generate unique secrets', () => {
      const secrets = new Set<string>();
      for (let i = 0; i < 10; i++) {
        secrets.add(generateMagicLoginSecret());
      }
      expect(secrets.size).toBe(10);
    });
  });

  describe('Signature Generation', () => {
    const testSecret = 'mlsec_test_secret_12345678901234567890123456789012';
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    const testTimestamp = 1703001234;
    const testNonce = 'a1b2c3d4e5f6g7h8a1b2c3d4e5f6g7h8';

    it('should generate consistent signatures for same inputs', () => {
      const sig1 = generateMagicLoginSignature(testUserId, testTimestamp, testNonce, testSecret);
      const sig2 = generateMagicLoginSignature(testUserId, testTimestamp, testNonce, testSecret);
      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different users', () => {
      const sig1 = generateMagicLoginSignature('user-1', testTimestamp, testNonce, testSecret);
      const sig2 = generateMagicLoginSignature('user-2', testTimestamp, testNonce, testSecret);
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const sig1 = generateMagicLoginSignature(testUserId, 1000, testNonce, testSecret);
      const sig2 = generateMagicLoginSignature(testUserId, 2000, testNonce, testSecret);
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different nonces', () => {
      const sig1 = generateMagicLoginSignature(testUserId, testTimestamp, 'nonce1', testSecret);
      const sig2 = generateMagicLoginSignature(testUserId, testTimestamp, 'nonce2', testSecret);
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const sig1 = generateMagicLoginSignature(testUserId, testTimestamp, testNonce, 'secret1');
      const sig2 = generateMagicLoginSignature(testUserId, testTimestamp, testNonce, 'secret2');
      expect(sig1).not.toBe(sig2);
    });

    it('should generate hex signature of 64 characters (SHA-256)', () => {
      const sig = generateMagicLoginSignature(testUserId, testTimestamp, testNonce, testSecret);
      expect(sig).toHaveLength(64);
      expect(sig).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateSignedMagicLoginParams', () => {
    const testSecret = 'mlsec_test_secret';

    it('should return timestamp, nonce, and signature', () => {
      const params = generateSignedMagicLoginParams('user-123', testSecret);

      expect(params).toHaveProperty('timestamp');
      expect(params).toHaveProperty('nonce');
      expect(params).toHaveProperty('signature');
    });

    it('should use current timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const params = generateSignedMagicLoginParams('user-123', testSecret);
      const after = Math.floor(Date.now() / 1000);

      expect(params.timestamp).toBeGreaterThanOrEqual(before);
      expect(params.timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate unique nonces each time', () => {
      const params1 = generateSignedMagicLoginParams('user-123', testSecret);
      const params2 = generateSignedMagicLoginParams('user-123', testSecret);

      expect(params1.nonce).not.toBe(params2.nonce);
    });
  });

  describe('Signature Validation', () => {
    const testSecret = 'mlsec_test_secret_12345678901234567890123456789012';
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    const testToolId = 'tool-123';

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
      // Reset nonce tracker between tests
      _internal.nonceTracker['usedNonces'].clear();
    });

    it('should validate a fresh, correctly signed request', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      const result = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ userId: testUserId, timestamp, nonce });
    });

    it('should reject expired timestamps (> 5 minutes old)', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 301; // 301 seconds ago
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      const result = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should accept timestamps within TTL window', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 299; // 299 seconds ago (within 5 min)
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      const result = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );

      expect(result.valid).toBe(true);
    });

    it('should reject future timestamps (clock skew attack)', () => {
      const timestamp = Math.floor(Date.now() / 1000) + 60; // 60 seconds in future
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      const result = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should allow small clock skew (30 seconds)', () => {
      const timestamp = Math.floor(Date.now() / 1000) + 25; // 25 seconds in future
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      const result = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );

      expect(result.valid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();

      const result = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        'invalid_signature_that_is_64_characters_long_for_sha256_hash_xx',
        testSecret,
        testToolId
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('signature');
    });

    it('should reject tampered user IDs', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      const result = validateMagicLoginSignature(
        'different-user-id', // Tampered
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );

      expect(result.valid).toBe(false);
    });

    it('should reject reused nonces (replay attack)', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      // First use should succeed
      const result1 = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );
      expect(result1.valid).toBe(true);

      // Second use with same nonce should fail
      const result2 = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        testToolId
      );
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('replay');
    });

    it('should allow same nonce for different tools', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();
      const signature = generateMagicLoginSignature(testUserId, timestamp, nonce, testSecret);

      // Use with tool-1
      const result1 = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        'tool-1'
      );
      expect(result1.valid).toBe(true);

      // Same nonce with tool-2 should succeed (different scope)
      const result2 = validateMagicLoginSignature(
        testUserId,
        timestamp,
        nonce,
        signature,
        testSecret,
        'tool-2'
      );
      expect(result2.valid).toBe(true);
    });
  });

  describe('URL Validation', () => {
    it('should accept valid HTTPS URLs', () => {
      const result = validateMagicLoginUrl('https://example.com/auth/magic');
      expect(result.valid).toBe(true);
      expect(result.normalizedUrl).toBe('https://example.com/auth/magic');
    });

    it('should reject HTTP URLs', () => {
      const result = validateMagicLoginUrl('http://example.com/auth/magic');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('should allow HTTP localhost in development mode', () => {
      const result = validateMagicLoginUrl('http://localhost:3000/auth/magic', true);
      expect(result.valid).toBe(true);
    });

    it('should reject localhost in production mode', () => {
      const result = validateMagicLoginUrl('https://localhost:3000/auth/magic', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    it('should reject private IP addresses (SSRF protection)', () => {
      const privateIps = [
        'https://192.168.1.1/auth',
        'https://10.0.0.1/auth',
        'https://172.16.0.1/auth',
        'https://127.0.0.1/auth',
      ];

      for (const url of privateIps) {
        const result = validateMagicLoginUrl(url, false);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('private');
      }
    });

    it('should reject invalid URLs', () => {
      const result = validateMagicLoginUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should normalize URLs', () => {
      const result = validateMagicLoginUrl('https://EXAMPLE.COM/Auth/Magic');
      expect(result.valid).toBe(true);
      // URL normalization converts hostname to lowercase
      expect(result.normalizedUrl).toBe('https://example.com/Auth/Magic');
    });

    it('should preserve query parameters', () => {
      const result = validateMagicLoginUrl('https://example.com/auth?app=myapp');
      expect(result.valid).toBe(true);
      expect(result.normalizedUrl).toContain('app=myapp');
    });
  });

  describe('Private Host Detection', () => {
    const { isPrivateHost } = _internal;

    it('should detect localhost variants', () => {
      expect(isPrivateHost('localhost')).toBe(true);
      expect(isPrivateHost('LOCALHOST')).toBe(true);
      expect(isPrivateHost('127.0.0.1')).toBe(true);
      expect(isPrivateHost('0.0.0.0')).toBe(true);
    });

    it('should detect private IPv4 ranges', () => {
      expect(isPrivateHost('10.0.0.1')).toBe(true);
      expect(isPrivateHost('10.255.255.255')).toBe(true);
      expect(isPrivateHost('172.16.0.1')).toBe(true);
      expect(isPrivateHost('172.31.255.255')).toBe(true);
      expect(isPrivateHost('192.168.0.1')).toBe(true);
      expect(isPrivateHost('192.168.255.255')).toBe(true);
    });

    it('should not flag public IP addresses', () => {
      expect(isPrivateHost('8.8.8.8')).toBe(false);
      expect(isPrivateHost('1.1.1.1')).toBe(false);
      expect(isPrivateHost('203.0.113.1')).toBe(false);
    });

    it('should not flag domain names', () => {
      expect(isPrivateHost('example.com')).toBe(false);
      expect(isPrivateHost('api.myapp.io')).toBe(false);
    });
  });
});

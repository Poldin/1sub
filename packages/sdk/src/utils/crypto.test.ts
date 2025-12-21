import { describe, it, expect } from 'vitest';
import {
  hashEmail,
  createHmacSignature,
  secureCompare,
  verifySignature,
  generateSignature,
  parseSignatureHeader,
} from './crypto.js';

describe('hashEmail', () => {
  it('hashes email correctly', () => {
    const hash = hashEmail('test@example.com');
    expect(hash).toBe('973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b');
  });

  it('normalizes email to lowercase', () => {
    const hash1 = hashEmail('TEST@EXAMPLE.COM');
    const hash2 = hashEmail('test@example.com');
    expect(hash1).toBe(hash2);
  });

  it('trims whitespace', () => {
    const hash1 = hashEmail('  test@example.com  ');
    const hash2 = hashEmail('test@example.com');
    expect(hash1).toBe(hash2);
  });
});

describe('createHmacSignature', () => {
  it('creates consistent signatures', () => {
    const sig1 = createHmacSignature('payload', 'secret');
    const sig2 = createHmacSignature('payload', 'secret');
    expect(sig1).toBe(sig2);
  });

  it('creates different signatures for different payloads', () => {
    const sig1 = createHmacSignature('payload1', 'secret');
    const sig2 = createHmacSignature('payload2', 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('creates different signatures for different secrets', () => {
    const sig1 = createHmacSignature('payload', 'secret1');
    const sig2 = createHmacSignature('payload', 'secret2');
    expect(sig1).not.toBe(sig2);
  });
});

describe('secureCompare', () => {
  it('returns true for equal strings', () => {
    expect(secureCompare('abc', 'abc')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(secureCompare('abc', 'def')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(secureCompare('abc', 'abcd')).toBe(false);
  });
});

describe('parseSignatureHeader', () => {
  it('parses valid signature header', () => {
    const result = parseSignatureHeader('t=1234567890,v1=abc123');
    expect(result.timestamp).toBe('1234567890');
    expect(result.signature).toBe('abc123');
  });

  it('returns nulls for invalid header', () => {
    const result = parseSignatureHeader('invalid');
    expect(result.timestamp).toBeNull();
    expect(result.signature).toBeNull();
  });

  it('handles missing parts', () => {
    const result = parseSignatureHeader('t=1234567890');
    expect(result.timestamp).toBe('1234567890');
    expect(result.signature).toBeNull();
  });
});

describe('generateSignature and verifySignature', () => {
  const secret = 'whsec-test-secret';
  const payload = JSON.stringify({ type: 'test', data: {} });

  it('generates valid signature that can be verified', () => {
    const signature = generateSignature(payload, secret);
    const isValid = verifySignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('rejects tampered payload', () => {
    const signature = generateSignature(payload, secret);
    const isValid = verifySignature('tampered', signature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects wrong secret', () => {
    const signature = generateSignature(payload, secret);
    const isValid = verifySignature(payload, signature, 'wrong-secret');
    expect(isValid).toBe(false);
  });

  it('rejects expired signatures', () => {
    // Create a signature with old timestamp
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const signedPayload = `${oldTimestamp}.${payload}`;
    const sig = createHmacSignature(signedPayload, secret);
    const header = `t=${oldTimestamp},v1=${sig}`;

    const isValid = verifySignature(payload, header, secret, 300);
    expect(isValid).toBe(false);
  });
});

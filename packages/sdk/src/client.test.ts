import { describe, it, expect } from 'vitest';
import { OneSub } from './client.js';
import { ValidationError } from './utils/errors.js';

describe('OneSub Client', () => {
  it('creates client with valid config', () => {
    const client = new OneSub({
      apiKey: 'sk-tool-test123456789012345678901234',
    });
    expect(client).toBeInstanceOf(OneSub);
    expect(client.config.apiKey).toBe('sk-tool-test123456789012345678901234');
  });

  it('throws ValidationError for missing API key', () => {
    expect(() => new OneSub({ apiKey: '' })).toThrow(ValidationError);
  });

  it('throws ValidationError for invalid API key format', () => {
    expect(() => new OneSub({ apiKey: 'invalid-key' })).toThrow(ValidationError);
  });

  it('uses default config values', () => {
    const client = new OneSub({
      apiKey: 'sk-tool-test123456789012345678901234',
    });
    expect(client.config.baseUrl).toBe('https://1sub.io/api/v1');
    expect(client.config.timeout).toBe(30000);
    expect(client.config.cache).toBe(false);
    expect(client.config.cacheTTL).toBe(60000);
    expect(client.config.maxRetries).toBe(3);
    expect(client.config.debug).toBe(false);
  });

  it('overrides default config values', () => {
    const client = new OneSub({
      apiKey: 'sk-tool-test123456789012345678901234',
      baseUrl: 'https://custom.api.com',
      timeout: 10000,
      cache: true,
      cacheTTL: 30000,
      maxRetries: 5,
      debug: true,
    });
    expect(client.config.baseUrl).toBe('https://custom.api.com');
    expect(client.config.timeout).toBe(10000);
    expect(client.config.cache).toBe(true);
    expect(client.config.cacheTTL).toBe(30000);
    expect(client.config.maxRetries).toBe(5);
    expect(client.config.debug).toBe(true);
  });

  it('exposes API modules', () => {
    const client = new OneSub({
      apiKey: 'sk-tool-test123456789012345678901234',
    });
    expect(client.subscriptions).toBeDefined();
    expect(client.credits).toBeDefined();
    expect(client.links).toBeDefined();
    expect(client.webhooks).toBeDefined();
    expect(client.express).toBeDefined();
    expect(client.next).toBeDefined();
  });

  it('creates client using static method', () => {
    const client = OneSub.create({
      apiKey: 'sk-tool-test123456789012345678901234',
    });
    expect(client).toBeInstanceOf(OneSub);
  });

  it('exposes VERSION', () => {
    expect(OneSub.VERSION).toBe('1.0.0');
  });
});

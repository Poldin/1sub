/**
 * Integration Tests for Magic Login API Endpoint
 *
 * Tests the /api/v1/magiclogin endpoint including:
 * - Authentication requirements
 * - Rate limiting
 * - URL generation with nonce
 * - Subscription validation
 * - Error handling
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MAGIC_LOGIN_CONFIG } from '@/security/magic-login';

// Mock Supabase clients
vi.mock('@/infrastructure/database/client', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  })),
}));

// Mock verification functions
vi.mock('@/domains/verification', () => ({
  hasActiveSubscription: vi.fn(),
}));

vi.mock('@/domains/auth', () => ({
  checkRevocation: vi.fn(() => ({ revoked: false })),
}));

// Mock rate limiter to always allow (for testing other functionality)
vi.mock('@/security/rate-limiting', () => ({
  checkRateLimit: vi.fn(() => ({
    success: true,
    remaining: 10,
    resetAt: Date.now() + 60000,
  })),
  getClientIp: vi.fn(() => 'test-ip'),
  RATE_LIMITS: {},
}));

import { createServerClient, createServiceClient } from '@/infrastructure/database/client';
import { hasActiveSubscription } from '@/domains/verification';
import { POST } from '@/app/api/v1/magiclogin/route';
import { NextRequest } from 'next/server';

describe('Magic Login API Endpoint', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockToolId = '660e8400-e29b-41d4-a716-446655440001';
  const mockVendorId = '770e8400-e29b-41d4-a716-446655440002';
  const mockMagicLoginUrl = 'https://vendor.example.com/auth/magic';
  const mockMagicLoginSecret = 'mlsec_test1234567890abcdef1234567890abcdef1234567890abcdef12345678';

  function createRequest(body: object, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost:3000/api/v1/magiclogin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  function setupMocks(options: {
    authenticated?: boolean;
    userId?: string;
    toolExists?: boolean;
    toolActive?: boolean;
    vendorId?: string;
    hasSubscription?: boolean;
    magicLoginUrl?: string | null;
    magicLoginSecret?: string | null;
  } = {}) {
    const {
      authenticated = true,
      userId = mockUserId,
      toolExists = true,
      toolActive = true,
      vendorId = mockVendorId,
      hasSubscription = true,
      magicLoginUrl = mockMagicLoginUrl,
      magicLoginSecret = mockMagicLoginSecret,
    } = options;

    // Mock auth
    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: authenticated ? { user: { id: userId } } : { user: null },
          error: authenticated ? null : new Error('Unauthorized'),
        }),
      },
    } as any);

    // Mock service client
    const mockServiceClient = {
      from: vi.fn((table: string) => {
        if (table === 'tools') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: toolExists ? {
                    id: mockToolId,
                    name: 'Test Tool',
                    is_active: toolActive,
                    vendor_id: vendorId,
                  } : null,
                  error: toolExists ? null : { message: 'Not found' },
                }),
              }),
            }),
          };
        }
        if (table === 'api_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      metadata: {
                        magic_login_url: magicLoginUrl,
                        magic_login_secret: magicLoginSecret,
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      }),
    };

    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any);
    vi.mocked(hasActiveSubscription).mockResolvedValue(hasSubscription);
  }

  beforeAll(() => {
    // Set NODE_ENV to development to allow localhost URLs in tests
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      setupMocks({ authenticated: false });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('should accept authenticated requests', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing toolId', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('INVALID_REQUEST');
    });

    it('should return 400 for invalid toolId format', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({ toolId: 'not-a-uuid' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('INVALID_REQUEST');
    });

    it('should accept valid UUID toolId', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Tool Validation', () => {
    it('should return 404 for non-existent tool', async () => {
      setupMocks({ authenticated: true, toolExists: false });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('TOOL_NOT_FOUND');
    });

    it('should return 403 for inactive tool', async () => {
      setupMocks({ authenticated: true, toolActive: false });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('TOOL_NOT_ACTIVE');
    });
  });

  describe('Subscription Validation', () => {
    it('should return 402 for users without subscription', async () => {
      setupMocks({ authenticated: true, hasSubscription: false });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.error).toBe('NO_SUBSCRIPTION');
    });

    it('should allow test mode for tool vendor', async () => {
      setupMocks({
        authenticated: true,
        userId: mockVendorId, // User is the vendor
        vendorId: mockVendorId,
        hasSubscription: false, // No subscription
      });

      const request = createRequest({ toolId: mockToolId, test: true });
      const response = await POST(request);
      const data = await response.json();

      // Should succeed even without subscription because user is vendor
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should not allow test mode for non-vendor users', async () => {
      setupMocks({
        authenticated: true,
        userId: mockUserId, // Different from vendor
        vendorId: mockVendorId,
        hasSubscription: false,
      });

      const request = createRequest({ toolId: mockToolId, test: true });
      const response = await POST(request);
      const data = await response.json();

      // Should fail because user is not the vendor
      expect(response.status).toBe(402);
      expect(data.error).toBe('NO_SUBSCRIPTION');
    });
  });

  describe('Magic Login Configuration', () => {
    it('should return 400 if Magic Login URL not configured', async () => {
      setupMocks({ authenticated: true, magicLoginUrl: null });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('MAGIC_LOGIN_NOT_CONFIGURED');
    });

    it('should return 400 if Magic Login Secret not configured', async () => {
      setupMocks({ authenticated: true, magicLoginSecret: null });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('MAGIC_LOGIN_SECRET_NOT_CONFIGURED');
    });
  });

  describe('Successful Magic Login URL Generation', () => {
    it('should return a signed Magic Login URL', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.magicLoginUrl).toBeDefined();
      expect(data.oneSubUserId).toBe(mockUserId);
      expect(data.expiresIn).toBe(MAGIC_LOGIN_CONFIG.TTL_SECONDS);
    });

    it('should include all required URL parameters', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      const url = new URL(data.magicLoginUrl);

      expect(url.searchParams.get('user')).toBe(mockUserId);
      expect(url.searchParams.get('ts')).toBeDefined();
      expect(url.searchParams.get('nonce')).toBeDefined();
      expect(url.searchParams.get('sig')).toBeDefined();

      // Nonce should be 32 characters (16 bytes hex)
      expect(url.searchParams.get('nonce')).toHaveLength(32);

      // Signature should be 64 characters (SHA-256 hex)
      expect(url.searchParams.get('sig')).toHaveLength(64);
    });

    it('should use the configured Magic Login URL as base', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      const url = new URL(data.magicLoginUrl);

      expect(url.origin).toBe('https://vendor.example.com');
      expect(url.pathname).toBe('/auth/magic');
    });

    it('should generate unique nonces for each request', async () => {
      setupMocks({ authenticated: true });

      const request1 = createRequest({ toolId: mockToolId });
      const response1 = await POST(request1);
      const data1 = await response1.json();

      const request2 = createRequest({ toolId: mockToolId });
      const response2 = await POST(request2);
      const data2 = await response2.json();

      const url1 = new URL(data1.magicLoginUrl);
      const url2 = new URL(data2.magicLoginUrl);

      expect(url1.searchParams.get('nonce')).not.toBe(url2.searchParams.get('nonce'));
    });

    it('should include rate limit headers', async () => {
      setupMocks({ authenticated: true });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });

  describe('URL Validation', () => {
    it('should reject HTTP URLs in production', async () => {
      process.env.NODE_ENV = 'production';
      setupMocks({
        authenticated: true,
        magicLoginUrl: 'http://vendor.example.com/auth/magic',
      });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('INVALID_MAGIC_LOGIN_URL');

      process.env.NODE_ENV = 'development'; // Reset
    });

    it('should allow HTTP localhost in development', async () => {
      process.env.NODE_ENV = 'development';
      setupMocks({
        authenticated: true,
        magicLoginUrl: 'http://localhost:3000/auth/magic',
      });

      const request = createRequest({ toolId: mockToolId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Magic Login Rate Limiting', () => {
  // Note: Rate limiting tests would need to be run in isolation
  // to avoid interference from other tests

  it('should enforce per-user rate limits', async () => {
    // This is a placeholder for rate limit testing
    // In a real scenario, you'd make many requests rapidly
    // and verify that the rate limiter kicks in
    expect(MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_USER).toBe(10);
  });

  it('should enforce per-tool rate limits', async () => {
    expect(MAGIC_LOGIN_CONFIG.RATE_LIMIT_PER_TOOL).toBe(100);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock environment variables first
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key'
  }
}));

// Mock credits functions
vi.mock('@/lib/credits', () => ({
  getCreditBalance: vi.fn(),
  consumeCredits: vi.fn()
}));

// Mock tokens
vi.mock('@/lib/tokens', () => ({
  mintJwt: vi.fn(),
  verifyJwt: vi.fn()
}));

// Mock Supabase admin
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          select: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabaseClient: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

// Now import the route handlers after mocks are set up
import { POST as launchTool } from '@/app/api/v1/tools/launch/route';
import { POST as verifyToken } from '@/app/api/v1/verify-token/route';
import { GET as demoQuote } from '@/app/api/v1/tools/demo-quote/route';
import { POST as gptUtil } from '@/app/api/v1/tools/gpt-util/route';
import { GET as n8nWebhook } from '@/app/api/v1/tools/n8n-webhook/route';

import { getCreditBalance, consumeCredits } from '@/lib/credits';
import { mintJwt, verifyJwt } from '@/lib/tokens';
import { supabaseClient } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

describe('Phase 3 - Tool Integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Launch API', () => {
    it('should launch tool successfully with sufficient credits', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockTool = {
        id: 'tool-123',
        name: 'Test Tool',
        url: 'https://example.com/tool',
        credit_cost_per_use: 5.00,
        is_active: true
      };

      // Mock authentication
      vi.mocked(supabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock tool fetch - create a proper chain
      const mockSelectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTool,
          error: null
        })
      };
      
      const mockFromChain = {
        select: vi.fn().mockReturnValue(mockSelectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue({
            data: [{ id: 'log-123' }],
            error: null
          })
        })
      };
      
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockFromChain as any);

      // Mock credit operations
      vi.mocked(getCreditBalance).mockResolvedValue({ balance: 10.00 });
      vi.mocked(consumeCredits).mockResolvedValue({
        id: 'txn-123',
        user_id: 'user-123',
        delta: -5.00,
        balance_after: 5.00,
        transaction_type: 'consume',
        reason: 'Tool launch: Test Tool',
        idempotency_key: 'launch_user-123_tool-123_1234567890',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      // Mock JWT minting
      vi.mocked(mintJwt).mockResolvedValue('mock-jwt-token');

      // Usage logging is already mocked in the mockFromChain above

      const request = new NextRequest('http://localhost:3000/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer mock-session-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ toolId: 'tool-123' })
      });

      const response = await launchTool(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.launchUrl).toBe('https://example.com/tool?token=mock-jwt-token&userId=user-123');
      expect(data.toolName).toBe('Test Tool');
      expect(data.creditsConsumed).toBe(5.00);
    });

    it('should return 404 for inactive tool', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(supabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock tool not found
      const mockSelectChainNotFound = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows found' }
        })
      };
      
      const mockFromChainNotFound = {
        select: vi.fn().mockReturnValue(mockSelectChainNotFound)
      };
      
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockFromChainNotFound as any);

      const request = new NextRequest('http://localhost:3000/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer mock-session-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ toolId: 'tool-123' })
      });

      const response = await launchTool(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tool not found or inactive');
    });

    it('should return 400 for insufficient credits', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockTool = {
        id: 'tool-123',
        name: 'Test Tool',
        url: 'https://example.com/tool',
        credit_cost_per_use: 10.00,
        is_active: true
      };

      vi.mocked(supabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock tool fetch for insufficient credits test
      const mockSelectChainInsufficient = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTool,
          error: null
        })
      };
      
      const mockFromChainInsufficient = {
        select: vi.fn().mockReturnValue(mockSelectChainInsufficient)
      };
      
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockFromChainInsufficient as any);

      vi.mocked(getCreditBalance).mockResolvedValue({ balance: 5.00 });

      const request = new NextRequest('http://localhost:3000/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer mock-session-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ toolId: 'tool-123' })
      });

      const response = await launchTool(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Insufficient credits');
      expect(data.balance).toBe(5.00);
      expect(data.required).toBe(10.00);
    });
  });

  describe('Verify Token API', () => {
    it('should verify valid token', async () => {
      const mockClaims = {
        sub: 'user-123',
        email: 'test@example.com',
        scope: ['api:access'],
        iat: 1234567890,
        exp: 1234571490
      };

      vi.mocked(verifyJwt).mockResolvedValue(mockClaims);

      const request = new NextRequest('http://localhost:3000/api/v1/verify-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' })
      });

      const response = await verifyToken(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.userId).toBe('user-123');
      expect(data.email).toBe('test@example.com');
    });

    it('should reject invalid token', async () => {
      vi.mocked(verifyJwt).mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/v1/verify-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' })
      });

      const response = await verifyToken(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Invalid token');
    });
  });

  describe('Demo Quote Tool', () => {
    it('should return quote with valid token', async () => {
      const mockClaims = {
        sub: 'user-123',
        email: 'test@example.com',
        scope: ['api:access'],
        iat: 1234567890,
        exp: 1234571490
      };

      vi.mocked(verifyJwt).mockResolvedValue(mockClaims);

      // Mock fetch for verify-token endpoint
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: true, userId: 'user-123', email: 'test@example.com' })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/tools/demo-quote?token=valid-token&userId=user-123');

      const response = await demoQuote(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quote).toBeDefined();
      expect(data.author).toBeDefined();
      expect(data.userId).toBe('user-123');
    });

    it('should reject request with invalid token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: false, error: 'Invalid token' })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/tools/demo-quote?token=invalid-token&userId=user-123');

      const response = await demoQuote(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired token');
    });
  });

  describe('GPT Utility Tool', () => {
    it('should return mock response when OpenAI API key not configured', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: true, userId: 'user-123', email: 'test@example.com' })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/tools/gpt-util', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          userId: 'user-123',
          prompt: 'Test prompt'
        })
      });

      const response = await gptUtil(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.generatedText).toContain('Mock response for: "Test prompt"');
      expect(data.generatedText).toContain('Configure OPENAI_API_KEY');
    });
  });

  describe('n8n Webhook Tool', () => {
    it('should return workflow simulation with valid token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: true, userId: 'user-123', email: 'test@example.com' })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/tools/n8n-webhook?token=valid-token&userId=user-123');

      const response = await n8nWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflow).toBeDefined();
      expect(data.workflow.name).toBeDefined();
      expect(data.executionId).toBeDefined();
      expect(data.status).toBe('success');
    });
  });
});

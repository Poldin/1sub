import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock environment variables first
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key'
  }
}));

// Mock auth-server functions
vi.mock('@/lib/auth-server', () => ({
  checkAdminAccess: vi.fn()
}));

// Mock Supabase admin with proper factory function
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock credits functions
vi.mock('@/lib/credits', () => ({
  grantCredits: vi.fn()
}));

// Mock audit functions
vi.mock('@/lib/audit', () => ({
  auditToolOperation: vi.fn(),
  auditUserOperation: vi.fn(),
  auditCreditOperation: vi.fn()
}));

// Mock alerts functions
vi.mock('@/lib/alerts', () => ({
  checkLowBalances: vi.fn(),
  processLowBalanceAlerts: vi.fn()
}));

// Now import the route handlers after mocks are set up
import { GET as getTools, POST as createTool } from '@/app/api/v1/admin/tools/route';
import { GET as getTool, PATCH as updateTool, DELETE as deleteTool } from '@/app/api/v1/admin/tools/[id]/route';
import { GET as getUsers } from '@/app/api/v1/admin/users/route';
import { GET as getUser, PATCH as updateUser } from '@/app/api/v1/admin/users/[id]/route';
import { GET as getCredits, POST as adjustCredits } from '@/app/api/v1/admin/credits/route';
import { GET as getUsageLogs } from '@/app/api/v1/admin/usage-logs/route';
import { GET as getAlerts, POST as processAlerts } from '@/app/api/v1/admin/alerts/route';

import { checkAdminAccess } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { grantCredits } from '@/lib/credits';
import { auditToolOperation, auditCreditOperation } from '@/lib/audit';
import { checkLowBalances, processLowBalanceAlerts } from '@/lib/alerts';

describe('Phase 4 - Admin API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Authentication', () => {
    it('should reject non-admin users', async () => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ error: 'Admin access required' });

      const req = new NextRequest('http://localhost:3000/api/v1/admin/tools');
      const response = await getTools(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should allow admin users', async () => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });

      const mockTools = [
        { id: '1', name: 'Test Tool', description: 'Test', url: 'http://test.com', credit_cost_per_use: 1, is_active: true }
      ];

      // Create a proper mock chain for the tools query
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTools, error: null, count: 1 })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/tools');
      const response = await getTools(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tools).toEqual(mockTools);
    });
  });

  describe('Tools Management API', () => {
    beforeEach(() => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });
    });

    it('should create a new tool', async () => {
      const newTool = {
        name: 'New Tool',
        description: 'A new tool',
        url: 'http://newtool.com',
        credit_cost_per_use: 5,
        is_active: true
      };

      const mockCreatedTool = { id: 'new-id', ...newTool };

      // Mock the insert chain
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedTool, error: null })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockInsertQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/tools', {
        method: 'POST',
        body: JSON.stringify(newTool),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createTool(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tool.name).toBe(newTool.name);
    });

    it('should update an existing tool', async () => {
      const updateData = { name: 'Updated Tool', credit_cost_per_use: 10 };

      const mockUpdatedTool = { id: 'tool-id', ...updateData };

      // Mock the update chain
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedTool, error: null })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockUpdateQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/tools/tool-id', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateTool(req, { params: { id: 'tool-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tool.name).toBe(updateData.name);
    });

    it('should deactivate a tool', async () => {
      const mockDeactivatedTool = { id: 'tool-id', is_active: false };

      // Mock the update chain for deletion
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDeactivatedTool, error: null })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockUpdateQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/tools/tool-id', {
        method: 'DELETE'
      });

      const response = await deleteTool(req, { params: { id: 'tool-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Tool deactivated successfully');
    });
  });

  describe('Users Management API', () => {
    beforeEach(() => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });
    });

    it('should list users with filters', async () => {
      const mockUsers = [
        { 
          id: '1', 
          email: 'user@test.com', 
          full_name: 'Test User', 
          role: 'user', 
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          credit_balances: [{ balance: 50 }]
        }
      ];

      // Mock the users query with proper chaining
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockUsers, error: null, count: 1 })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/users?search=test&role=user');
      const response = await getUsers(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].balance).toBe(50);
    });

    it('should get user details with transactions', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'user',
        credit_balances: [{ balance: 50 }]
      };

      const mockTransactions = [];
      const mockUsageLogs = [];

      // Mock multiple queries
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
      };

      const mockTransactionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockTransactions, error: null })
      };

      const mockUsageQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockUsageLogs, error: null })
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(mockUserQuery as any)
        .mockReturnValueOnce(mockTransactionsQuery as any)
        .mockReturnValueOnce(mockUsageQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/users/user-id');
      const response = await getUser(req, { params: { id: 'user-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.balance).toBe(50);
    });
  });

  describe('Credit Management API', () => {
    beforeEach(() => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });
    });

    it('should get credit statistics', async () => {
      const mockCredits = [{ balance: 100 }, { balance: 50 }];
      const mockTransactions = [
        { id: '1', delta: 10, transaction_type: 'grant', reason: 'Test', created_at: '2024-01-01' }
      ];

      // Mock the credits query
      const mockCreditsQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockCredits, error: null })
      };

      // Mock the transactions query
      const mockTransactionsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockTransactions, error: null })
      };

      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(mockCreditsQuery as any)
        .mockReturnValueOnce(mockTransactionsQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/credits');
      const response = await getCredits(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalBalance).toBe(150);
      expect(data.recentTransactions).toEqual(mockTransactions);
    });

    it('should adjust user credits', async () => {
      const mockTransaction = { id: 'tx-id', delta: 50, reason: 'Admin adjustment' };
      vi.mocked(grantCredits).mockResolvedValue(mockTransaction);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/credits', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-id',
          amount: 50,
          reason: 'Test adjustment'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await adjustCredits(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Credit adjustment successful');
      expect(grantCredits).toHaveBeenCalledWith(
        'user-id',
        50,
        'Admin adjustment: Test adjustment',
        expect.stringContaining('admin_adjustment_user-id_')
      );
    });
  });

  describe('Usage Logs API', () => {
    beforeEach(() => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });
    });

    it('should fetch usage logs with filters', async () => {
      const mockLogs = [
        {
          id: '1',
          credits_consumed: 5,
          status: 'success',
          created_at: '2024-01-01',
          users: { email: 'user@test.com', full_name: 'Test User' },
          tools: { name: 'Test Tool' }
        }
      ];

      // Mock the usage logs query
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLogs, error: null, count: 1 })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/usage-logs?status=success');
      const response = await getUsageLogs(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(1);
      expect(data.logs[0].user.email).toBe('user@test.com');
    });
  });

  describe('Alerts API', () => {
    beforeEach(() => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });
    });

    it('should get alert statistics', async () => {
      const mockStats = { total_alerts: 5, low_balance_alerts: 3, recent_alerts: 2 };
      const mockAlerts = [
        { id: '1', user_id: 'user-1', metadata: { alert_type: 'low_balance' } }
      ];

      // Mock RPC call
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: [mockStats], error: null });

      // Mock the alerts query
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockAlerts, error: null })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/alerts');
      const response = await getAlerts(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statistics).toEqual(mockStats);
    });

    it('should process alerts', async () => {
      vi.mocked(processLowBalanceAlerts).mockResolvedValue();

      const req = new NextRequest('http://localhost:3000/api/v1/admin/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'process_alerts' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await processAlerts(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Alerts processed successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });

      // Mock database error
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        })
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/tools');
      const response = await getTools(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch tools');
    });

    it('should validate required fields', async () => {
      vi.mocked(checkAdminAccess).mockResolvedValue({ 
        user: { id: 'admin-id', email: 'admin@test.com', fullName: 'Admin User', role: 'admin' }
      });

      const req = new NextRequest('http://localhost:3000/api/v1/admin/credits', {
        method: 'POST',
        body: JSON.stringify({ user_id: 'user-id' }), // Missing amount and reason
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await adjustCredits(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: user_id, amount, reason');
    });
  });
});
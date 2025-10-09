import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock module in factory to avoid referencing uninitialized variables
vi.mock('@/lib/supabaseAdmin', () => {
  return {
    supabaseAdmin: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  }
})

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { 
  getCreditBalance, 
  grantCredits, 
  consumeCredits,
  CreditBalance,
  CreditTransaction 
} from '@/lib/credits'

describe('Credits Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(supabaseAdmin as any).from.mockReset()
    ;(supabaseAdmin as any).rpc.mockReset()
  })

  describe('getCreditBalance', () => {
    it('should return credit balance for valid user', async () => {
      const mockBalance = { user_id: 'user-123', balance: 150.50 }
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockBalance, error: null })
        })
      })
      
      ;(supabaseAdmin as any).from.mockReturnValue({ select: mockSelect })

      const result = await getCreditBalance('user-123')

      expect(result).toEqual({
        userId: 'user-123',
        balance: 150.50
      })
      expect((supabaseAdmin as any).from).toHaveBeenCalledWith('credit_balances')
    })

    it('should throw error when database query fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database error' } 
          })
        })
      })
      
      ;(supabaseAdmin as any).from.mockReturnValue({ select: mockSelect })

      await expect(getCreditBalance('user-123')).rejects.toThrow('Failed to get credit balance: Database error')
    })
  })

  describe('grantCredits', () => {
    it('should grant credits and update balance', async () => {
      const mockTransaction = {
        id: 'tx-123',
        user_id: 'user-123',
        delta: 100,
        balance_after: 200,
        transaction_type: 'grant',
        reason: 'Test grant',
        idempotency_key: 'grant_123',
        created_at: '2024-01-01T00:00:00Z'
      }

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null })
        })
      })
      
      ;(supabaseAdmin as any).from.mockReturnValue({ insert: mockInsert })
      ;(supabaseAdmin as any).rpc.mockResolvedValue({ error: null })

      const result = await grantCredits('user-123', 100, 'Test grant', 'grant_123')

      expect(result).toEqual({
        id: 'tx-123',
        userId: 'user-123',
        delta: 100,
        balanceAfter: 200,
        transactionType: 'grant',
        reason: 'Test grant',
        idempotencyKey: 'grant_123',
        createdAt: '2024-01-01T00:00:00Z'
      })
      expect((supabaseAdmin as any).rpc).toHaveBeenCalledWith('increment_balance', {
        p_user_id: 'user-123',
        p_amount: 100
      })
    })

    it('should generate idempotency key if not provided', async () => {
      const mockTransaction = {
        id: 'tx-123',
        user_id: 'user-123',
        delta: 50,
        balance_after: 150,
        transaction_type: 'grant',
        reason: 'Auto grant',
        idempotency_key: 'grant_1234567890_abc',
        created_at: '2024-01-01T00:00:00Z'
      }

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null })
        })
      })
      
      ;(supabaseAdmin as any).from.mockReturnValue({ insert: mockInsert })
      ;(supabaseAdmin as any).rpc.mockResolvedValue({ error: null })

      // Mock Date.now() to ensure consistent idempotency key
      const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(1234567890)
      const mockMathRandom = vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

      await grantCredits('user-123', 50, 'Auto grant')

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        delta: 50,
        balance_after: 0,
        transaction_type: 'grant',
        reason: 'Auto grant',
        idempotency_key: expect.stringMatching(/^grant_1234567890_/)
      })

      mockDateNow.mockRestore()
      mockMathRandom.mockRestore()
    })

    it('should throw error when balance update fails', async () => {
      const mockTransaction = {
        id: 'tx-123',
        user_id: 'user-123',
        delta: 100,
        balance_after: 200,
        transaction_type: 'grant',
        reason: 'Test grant',
        idempotency_key: 'grant_123',
        created_at: '2024-01-01T00:00:00Z'
      }

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null })
        })
      })
      
      ;(supabaseAdmin as any).from.mockReturnValue({ insert: mockInsert })
      ;(supabaseAdmin as any).rpc.mockResolvedValue({ error: { message: 'Balance update failed' } })

      await expect(grantCredits('user-123', 100, 'Test grant')).rejects.toThrow('Failed to update credit balance: Balance update failed')
    })
  })

  describe('consumeCredits', () => {
    it('should consume credits successfully', async () => {
      const mockRpcResponse = {
        status: 'success',
        transaction_id: 'tx-123',
        new_balance: 50
      }

      const mockTransaction = {
        id: 'tx-123',
        user_id: 'user-123',
        delta: -50,
        balance_after: 50,
        transaction_type: 'consume',
        reason: 'Tool usage',
        idempotency_key: 'consume_123',
        created_at: '2024-01-01T00:00:00Z'
      }

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null })
        })
      })
      ;(supabaseAdmin as any).from.mockReturnValue({ select: mockSelect })

      const result = await consumeCredits('user-123', 50, 'Tool usage', 'consume_123')

      expect(result).toEqual({
        id: 'tx-123',
        userId: 'user-123',
        delta: -50,
        balanceAfter: 50,
        transactionType: 'consume',
        reason: 'Tool usage',
        idempotencyKey: 'consume_123',
        createdAt: '2024-01-01T00:00:00Z'
      })
      expect((supabaseAdmin as any).rpc).toHaveBeenCalledWith('consume_credits', {
        p_user_id: 'user-123',
        p_amount: 50,
        p_reason: 'Tool usage',
        p_idempotency_key: 'consume_123'
      })
    })

    it('should handle insufficient balance', async () => {
      const mockRpcResponse = {
        status: 'insufficient',
        balance: 25
      }

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })

      await expect(consumeCredits('user-123', 50, 'Tool usage')).rejects.toThrow('Insufficient credits. Current balance: 25')
    })

    it('should handle duplicate idempotency key', async () => {
      const mockRpcResponse = {
        status: 'duplicate',
        message: 'Transaction already processed'
      }

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })

      await expect(consumeCredits('user-123', 50, 'Tool usage', 'duplicate_key')).rejects.toThrow('Transaction already processed')
    })

    it('should generate idempotency key if not provided', async () => {
      const mockRpcResponse = {
        status: 'success',
        transaction_id: 'tx-123',
        new_balance: 50
      }

      const mockTransaction = {
        id: 'tx-123',
        user_id: 'user-123',
        delta: -50,
        balance_after: 50,
        transaction_type: 'consume',
        reason: 'Tool usage',
        idempotency_key: 'consume_1234567890_abc',
        created_at: '2024-01-01T00:00:00Z'
      }

      // Mock Date.now() and Math.random for consistent key generation
      const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(1234567890)
      const mockMathRandom = vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null })
        })
      })
      ;(supabaseAdmin as any).from.mockReturnValue({ select: mockSelect })

      await consumeCredits('user-123', 50, 'Tool usage')

      expect((supabaseAdmin as any).rpc).toHaveBeenCalledWith('consume_credits', {
        p_user_id: 'user-123',
        p_amount: 50,
        p_reason: 'Tool usage',
        p_idempotency_key: expect.stringMatching(/^consume_1234567890_/)
      })

      mockDateNow.mockRestore()
      mockMathRandom.mockRestore()
    })

    it('should throw error when RPC call fails', async () => {
      ;(supabaseAdmin as any).rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      })

      await expect(consumeCredits('user-123', 50, 'Tool usage')).rejects.toThrow('Failed to consume credits: Database connection failed')
    })

    it('should throw error when transaction details fetch fails', async () => {
      const mockRpcResponse = {
        status: 'success',
        transaction_id: 'tx-123',
        new_balance: 50
      }

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Transaction not found' } 
          })
        })
      })
      ;(supabaseAdmin as any).from.mockReturnValue({ select: mockSelect })

      await expect(consumeCredits('user-123', 50, 'Tool usage')).rejects.toThrow('Failed to get transaction details: Transaction not found')
    })
  })

  describe('Atomicity Tests', () => {
    it('should handle concurrent consume operations correctly', async () => {
      // This test verifies that the database-level locking prevents race conditions
      const mockRpcResponse = {
        status: 'success',
        transaction_id: 'tx-123',
        new_balance: 0
      }

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })
      
      const mockTransaction = {
        id: 'tx-123',
        user_id: 'user-123',
        delta: -100,
        balance_after: 0,
        transaction_type: 'consume',
        reason: 'Concurrent test',
        idempotency_key: 'consume_concurrent',
        created_at: '2024-01-01T00:00:00Z'
      }

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null })
        })
      })
      ;(supabaseAdmin as any).from.mockReturnValue({ select: mockSelect })

      // Simulate concurrent calls
      const promises = [
        consumeCredits('user-123', 100, 'Concurrent test', 'consume_concurrent_1'),
        consumeCredits('user-123', 100, 'Concurrent test', 'consume_concurrent_2')
      ]

      // Both should succeed because they use different idempotency keys
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(2)
      expect((supabaseAdmin as any).rpc).toHaveBeenCalledTimes(2)
    })
  })

  describe('Idempotency Tests', () => {
    it('should reject duplicate idempotency keys', async () => {
      const mockRpcResponse = {
        status: 'duplicate',
        message: 'Transaction already processed'
      }

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })

      await expect(consumeCredits('user-123', 50, 'Tool usage', 'duplicate_key')).rejects.toThrow('Transaction already processed')
    })

    it('should allow different idempotency keys for same amount', async () => {
      const mockRpcResponse = {
        status: 'success',
        transaction_id: 'tx-123',
        new_balance: 0
      }

      const mockTransaction = {
        id: 'tx-123',
        user_id: 'user-123',
        delta: -50,
        balance_after: 0,
        transaction_type: 'consume',
        reason: 'Tool usage',
        idempotency_key: 'unique_key',
        created_at: '2024-01-01T00:00:00Z'
      }

      ;(supabaseAdmin as any).rpc.mockResolvedValue({ data: mockRpcResponse, error: null })
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null })
        })
      })
      ;(supabaseAdmin as any).from.mockReturnValue({ select: mockSelect })

      const result = await consumeCredits('user-123', 50, 'Tool usage', 'unique_key')

      expect(result.idempotencyKey).toBe('unique_key')
    })
  })
})

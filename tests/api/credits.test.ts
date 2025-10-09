import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the credits library
const mockGrantCredits = vi.fn()
const mockConsumeCredits = vi.fn()
const mockGetCreditBalance = vi.fn()

vi.mock('@/lib/credits', () => ({
  grantCredits: mockGrantCredits,
  consumeCredits: mockConsumeCredits,
  getCreditBalance: mockGetCreditBalance,
}))

// Mock Supabase admin
const mockSupabaseAdmin = {
  from: vi.fn(),
}

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}))

describe('Credits API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/credits/grant', () => {
    it('should grant credits successfully', async () => {
      const mockTransaction = {
        id: 'tx-123',
        userId: 'user-123',
        delta: 100,
        balanceAfter: 200,
        transactionType: 'grant' as const,
        reason: 'Test grant',
        idempotencyKey: 'grant_123',
        createdAt: '2024-01-01T00:00:00Z'
      }

      mockGrantCredits.mockResolvedValue(mockTransaction)

      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          amount: 100,
          reason: 'Test grant'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        ok: true,
        data: { entry: mockTransaction }
      })
      expect(mockGrantCredits).toHaveBeenCalledWith('user-123', 100, 'Test grant')
    })

    it('should return 400 for missing userId', async () => {
      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          reason: 'Test grant'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'userId and amount required' }
      })
      expect(mockGrantCredits).not.toHaveBeenCalled()
    })

    it('should return 400 for missing amount', async () => {
      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          reason: 'Test grant'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'userId and amount required' }
      })
      expect(mockGrantCredits).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid amount type', async () => {
      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          amount: 'invalid',
          reason: 'Test grant'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'userId and amount required' }
      })
      expect(mockGrantCredits).not.toHaveBeenCalled()
    })

    it('should handle grantCredits errors', async () => {
      mockGrantCredits.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          amount: 100,
          reason: 'Test grant'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Database error' }
      })
    })

    it('should handle malformed JSON', async () => {
      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'userId and amount required' }
      })
    })
  })

  describe('POST /api/v1/credits/consume', () => {
    it('should consume credits successfully', async () => {
      const mockTransaction = {
        id: 'tx-123',
        userId: 'user-123',
        delta: -50,
        balanceAfter: 150,
        transactionType: 'consume' as const,
        reason: 'Tool usage',
        idempotencyKey: 'consume_123',
        createdAt: '2024-01-01T00:00:00Z'
      }

      mockConsumeCredits.mockResolvedValue(mockTransaction)

      const { POST } = await import('@/app/api/v1/credits/consume/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/consume', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          amount: 50,
          reason: 'Tool usage'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        ok: true,
        data: { entry: mockTransaction }
      })
      expect(mockConsumeCredits).toHaveBeenCalledWith('user-123', 50, 'Tool usage')
    })

    it('should return 400 for missing userId', async () => {
      const { POST } = await import('@/app/api/v1/credits/consume/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/consume', {
        method: 'POST',
        body: JSON.stringify({
          amount: 50,
          reason: 'Tool usage'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'userId and amount required' }
      })
      expect(mockConsumeCredits).not.toHaveBeenCalled()
    })

    it('should handle insufficient credits error', async () => {
      mockConsumeCredits.mockRejectedValue(new Error('Insufficient credits. Current balance: 25'))

      const { POST } = await import('@/app/api/v1/credits/consume/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/consume', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          amount: 50,
          reason: 'Tool usage'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits. Current balance: 25' }
      })
    })

    it('should handle idempotency error', async () => {
      mockConsumeCredits.mockRejectedValue(new Error('Transaction already processed'))

      const { POST } = await import('@/app/api/v1/credits/consume/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/consume', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          amount: 50,
          reason: 'Tool usage'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toEqual({
        ok: false,
        error: { code: 'DUPLICATE_TRANSACTION', message: 'Transaction already processed' }
      })
    })
  })

  describe('GET /api/v1/credits/balance', () => {
    it('should return credit balance successfully', async () => {
      const mockBalance = { balance: 150.50 }
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockBalance, error: null })
        })
      })
      
      mockSupabaseAdmin.from.mockReturnValue({ select: mockSelect })

      const { GET } = await import('@/app/api/v1/credits/balance/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/balance?userId=user-123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ balance: 150.50 })
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('credit_balances')
    })

    it('should return 400 for missing userId parameter', async () => {
      const { GET } = await import('@/app/api/v1/credits/balance/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/balance')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'User ID is required' })
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled()
    })

    it('should return 500 for database error', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database connection failed' } 
          })
        })
      })
      
      mockSupabaseAdmin.from.mockReturnValue({ select: mockSelect })

      const { GET } = await import('@/app/api/v1/credits/balance/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/balance?userId=user-123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch credit balance' })
    })

    it('should return 0 balance for user with no balance record', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116', message: 'No rows found' } 
          })
        })
      })
      
      mockSupabaseAdmin.from.mockReturnValue({ select: mockSelect })

      const { GET } = await import('@/app/api/v1/credits/balance/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/balance?userId=user-123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ balance: 0 })
    })

    it('should handle unexpected errors', async () => {
      mockSupabaseAdmin.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { GET } = await import('@/app/api/v1/credits/balance/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/balance?userId=user-123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })

  describe('API Contract Validation', () => {
    it('should maintain consistent error response format', async () => {
      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify error response structure
      expect(data).toHaveProperty('ok', false)
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
    })

    it('should maintain consistent success response format', async () => {
      const mockTransaction = {
        id: 'tx-123',
        userId: 'user-123',
        delta: 100,
        balanceAfter: 200,
        transactionType: 'grant' as const,
        reason: 'Test grant',
        idempotencyKey: 'grant_123',
        createdAt: '2024-01-01T00:00:00Z'
      }

      mockGrantCredits.mockResolvedValue(mockTransaction)

      const { POST } = await import('@/app/api/v1/credits/grant/route')
      const request = new NextRequest('http://localhost:3000/api/v1/credits/grant', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          amount: 100,
          reason: 'Test grant'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify success response structure
      expect(data).toHaveProperty('ok', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('entry')
    })
  })
})

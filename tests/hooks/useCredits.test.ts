import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCredits } from '@/hooks/useCredits'
import { mockCreditBalance } from '../fixtures/credits'

// Mock fetch
global.fetch = vi.fn()

describe('useCredits Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 0 balance and loading true initially when no userId', () => {
    const { result } = renderHook(() => useCredits())

    expect(result.current.balance).toBe(0)
    expect(result.current.loading).toBe(true)
  })

  it('should fetch credit balance when userId is provided', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        balance: mockCreditBalance.balance,
      }),
    }

    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    const { result } = renderHook(() => useCredits('test-user-id'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.balance).toBe(mockCreditBalance.balance)
    expect(fetch).toHaveBeenCalledWith('/api/v1/credits/balance?userId=test-user-id')
  })

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCredits('test-user-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.balance).toBe(0)
  })

  it('should handle API errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    }

    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

    const { result } = renderHook(() => useCredits('test-user-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.balance).toBe(0)
  })

  it('should refetch when userId changes', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        balance: 100,
      }),
    }

    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    const { result, rerender } = renderHook(
      ({ userId }) => useCredits(userId),
      { initialProps: { userId: 'user-1' } }
    )

    await waitFor(() => {
      expect(result.current.balance).toBe(100)
    })

    // Change userId
    rerender({ userId: 'user-2' })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/credits/balance?userId=user-1')
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/credits/balance?userId=user-2')
  })

  it('should not fetch when userId is undefined', () => {
    renderHook(() => useCredits(undefined))

    expect(fetch).not.toHaveBeenCalled()
  })
})

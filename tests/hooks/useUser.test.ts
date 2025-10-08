import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { mockUser, mockSession } from '../fixtures/user'
import { mockSupabaseClient } from '../mocks/supabase'

// Mock the supabase client before importing
vi.mock('@/lib/supabaseClient', () => ({
  supabaseClient: mockSupabaseClient,
}))

import { useUser } from '@/hooks/useUser'

describe('useUser Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null and loading true initially', () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const { result } = renderHook(() => useUser())

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('should return user data when authenticated', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      fullName: mockUser.fullName,
    })
  })

  it('should handle auth state changes', async () => {
    let authStateCallback: any = null

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const { result } = renderHook(() => useUser())

    // Simulate auth state change
    if (authStateCallback) {
      act(() => {
        authStateCallback('SIGNED_IN', mockSession)
      })
    }

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
      })
    })
  })

  it('should handle sign out', async () => {
    let authStateCallback: any = null

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    const { result } = renderHook(() => useUser())

    // Simulate sign out
    if (authStateCallback) {
      act(() => {
        authStateCallback('SIGNED_OUT', null)
      })
    }

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  it('should handle session errors', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Session error'),
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })

  it('should cleanup subscription on unmount', () => {
    const mockUnsubscribe = vi.fn()
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })

    const { unmount } = renderHook(() => useUser())

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})

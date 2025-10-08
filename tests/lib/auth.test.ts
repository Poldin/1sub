import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUserProfile } from '@/lib/auth'
import { mockUser } from '../fixtures/user'

// Mock fetch
global.fetch = vi.fn()

describe('Auth Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUserProfile', () => {
    it('should create user profile successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          full_name: mockUser.fullName,
        }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await createUserProfile(
        mockUser.id,
        mockUser.email,
        mockUser.fullName
      )

      expect(fetch).toHaveBeenCalledWith('/api/v1/create-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
        }),
      })

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.fullName,
      })
    })

    it('should handle profile creation errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await createUserProfile(
        mockUser.id,
        mockUser.email,
        mockUser.fullName
      )

      expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await createUserProfile(
        mockUser.id,
        mockUser.email,
        mockUser.fullName
      )

      expect(result).toBeNull()
    })

    it('should handle missing fullName', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          full_name: null,
        }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await createUserProfile(mockUser.id, mockUser.email)

      expect(fetch).toHaveBeenCalledWith('/api/v1/create-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: mockUser.id,
          email: mockUser.email,
          fullName: undefined,
        }),
      })

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        full_name: null,
      })
    })
  })
})

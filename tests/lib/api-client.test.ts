import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSession, mockUser } from '../fixtures/user'
import { mockLaunchResponse, mockTokenResponse } from '../fixtures/tokens'
import { mockSupabaseClient } from '../mocks/supabase'

// Mock the supabase client before importing
vi.mock('@/lib/supabaseClient', () => ({
  supabaseClient: mockSupabaseClient,
}))

import { launchTool, verifyUser, copyToClipboard } from '@/lib/api-client'

// Mock fetch
global.fetch = vi.fn()

describe('API Client Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('launchTool', () => {
    it('should launch tool with valid session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockLaunchResponse),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await launchTool(1)

      expect(fetch).toHaveBeenCalledWith('/api/v1/tools/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockSession.access_token}`,
        },
        body: JSON.stringify({ toolId: 1 }),
      })

      expect(result).toEqual(mockLaunchResponse)
    })

    it('should throw error without session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      await expect(launchTool(1)).rejects.toThrow('No active session found')
    })

    it('should throw error with session error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      })

      await expect(launchTool(1)).rejects.toThrow('No active session found')
    })

    it('should handle API errors', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Tool not found',
          message: 'The requested tool does not exist',
        }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(launchTool(999)).rejects.toThrow('The requested tool does not exist')
    })

    it('should handle network errors', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      await expect(launchTool(1)).rejects.toThrow('Network error')
    })

    it('should handle API errors with only error.error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Tool not found', // Only error.error, no error.message
        }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(launchTool(999)).rejects.toThrow('Tool not found')
    })

    it('should handle API errors with empty response', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({}), // Empty response
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(launchTool(999)).rejects.toThrow('Failed to launch tool')
    })
  })

  describe('verifyUser', () => {
    it('should verify user with valid token', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          userId: mockUser.id,
          email: mockUser.email,
          verified: true,
        }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await verifyUser('valid-token')

      expect(fetch).toHaveBeenCalledWith('/api/v1/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
      })

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        verified: true,
      })
    })

    it('should handle invalid token', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Invalid token',
        }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await verifyUser('invalid-token')

      expect(result).toEqual({
        userId: '',
        email: '',
        verified: false,
        error: 'Invalid token',
      })
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await verifyUser('token')

      expect(result).toEqual({
        userId: '',
        email: '',
        verified: false,
        error: 'Network error',
      })
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(fetch).mockRejectedValueOnce('String error') // Non-Error

      const result = await verifyUser('token')

      expect(result).toEqual({
        userId: '',
        email: '',
        verified: false,
        error: 'Unknown error',
      })
    })
  })

  describe('copyToClipboard', () => {
    beforeEach(() => {
      // Reset DOM
      document.body.innerHTML = ''
    })

    it('should copy text using modern clipboard API', async () => {
      // Mock navigator.clipboard
      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
      })

      const result = await copyToClipboard('test text')

      expect(mockWriteText).toHaveBeenCalledWith('test text')
      expect(result).toBe(true)
    })

    it('should fallback to execCommand when clipboard API fails', async () => {
      // Mock navigator.clipboard to throw error
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard API not available')),
        },
        writable: true,
      })

      // Mock document.execCommand
      const mockExecCommand = vi.fn().mockReturnValue(true)
      Object.defineProperty(document, 'execCommand', {
        value: mockExecCommand,
        writable: true,
      })

      // Spy on document.createElement and appendChild to verify textarea creation
      const createElementSpy = vi.spyOn(document, 'createElement')
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')

      const result = await copyToClipboard('test text')

      expect(mockExecCommand).toHaveBeenCalledWith('copy')
      expect(result).toBe(true)
      
      // Verify textarea was created and manipulated
      expect(createElementSpy).toHaveBeenCalledWith('textarea')
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
    })

    it('should return false when both methods fail', async () => {
      // Mock navigator.clipboard to throw error
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard API not available')),
        },
        writable: true,
      })

      // Mock document.execCommand to return false
      Object.defineProperty(document, 'execCommand', {
        value: vi.fn().mockReturnValue(false),
        writable: true,
      })

      const result = await copyToClipboard('test text')

      expect(result).toBe(false)
    })

    it('should handle non-Error exceptions', async () => {
      // Mock navigator.clipboard to throw non-Error
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue('String error'),
        },
        writable: true,
      })

      // Mock document.execCommand to return false
      Object.defineProperty(document, 'execCommand', {
        value: vi.fn().mockReturnValue(false),
        writable: true,
      })

      const result = await copyToClipboard('test text')

      expect(result).toBe(false)
    })
  })
})

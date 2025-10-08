import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockTokenClaims } from '../fixtures/tokens'

// Mock jose before importing the module
vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: mockTokenClaims,
  }),
  JWTPayload: vi.fn(),
}))

import { mintJwt, verifyJwt, TokenClaims } from '@/lib/tokens'

describe('JWT Token Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('mintJwt', () => {
    it('should mint valid JWT token with correct claims', async () => {
      const claims: TokenClaims = {
        sub: 'test-user-id',
        email: 'test@example.com',
        scope: ['api:access'],
      }

      const token = await mintJwt(claims)

      expect(token).toBe('mock-jwt-token')
    })

    it('should include all required claims', async () => {
      const claims: TokenClaims = {
        sub: 'test-user-id',
        email: 'test@example.com',
        scope: ['api:access'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }

      await mintJwt(claims)

      // Verify that SignJWT was called with the claims
      const { SignJWT } = await import('jose')
      expect(SignJWT).toHaveBeenCalledWith(claims)
    })

    it('should set correct expiration time', async () => {
      const claims: TokenClaims = {
        sub: 'test-user-id',
        email: 'test@example.com',
        scope: ['api:access'],
      }

      await mintJwt(claims)

      const { SignJWT } = await import('jose')
      const mockSignJWT = SignJWT as any
      const instance = mockSignJWT.mock.results[0].value
      
      expect(instance.setExpirationTime).toHaveBeenCalledWith('1h')
    })
  })

  describe('verifyJwt', () => {
    it('should verify valid token and return claims', async () => {
      const token = 'valid-jwt-token'
      const claims = await verifyJwt(token)

      expect(claims).toEqual(mockTokenClaims)
    })

    it('should throw error for invalid token', async () => {
      const { jwtVerify } = await import('jose')
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('Invalid token'))

      await expect(verifyJwt('invalid-token')).rejects.toThrow('Invalid token')
    })

    it('should throw error for expired token', async () => {
      const { jwtVerify } = await import('jose')
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('Token expired'))

      await expect(verifyJwt('expired-token')).rejects.toThrow('Token expired')
    })
  })
})

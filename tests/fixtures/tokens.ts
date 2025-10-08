export const mockTokenClaims = {
  sub: 'test-user-id-123',
  email: 'test@example.com',
  scope: ['api:access'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
}

export const mockTokenResponse = {
  token: 'mock-jwt-token-123',
  expiresAt: new Date(Date.now() + (60 * 60 * 1000)).toISOString(),
  userId: 'test-user-id-123',
}

export const mockLaunchResponse = {
  launchUrl: 'https://example-tool-1.com?token=mock-jwt-token-123&userId=test-user-id-123',
  accessToken: 'mock-jwt-token-123',
  expiresAt: new Date(Date.now() + (60 * 60 * 1000)).toISOString(),
  userId: 'test-user-id-123',
  toolId: 1,
}

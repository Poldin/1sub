export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  fullName: 'Test User',
}

export const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  user: {
    id: mockUser.id,
    email: mockUser.email,
    user_metadata: {
      full_name: mockUser.fullName,
    },
  },
}

export const mockUserProfile = {
  id: mockUser.id,
  email: mockUser.email,
  full_name: mockUser.fullName,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}


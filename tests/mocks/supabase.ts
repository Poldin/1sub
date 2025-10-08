import { vi } from 'vitest'
import { mockUser, mockSession } from '../fixtures/user'

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    setSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  rpc: vi.fn(),
}

// Default mock implementations
mockSupabaseClient.auth.getSession.mockResolvedValue({
  data: { session: mockSession },
  error: null,
})

mockSupabaseClient.auth.getUser.mockResolvedValue({
  data: { user: mockSession.user },
  error: null,
})

mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
  data: { user: mockSession.user, session: mockSession },
  error: null,
})

mockSupabaseClient.auth.signUp.mockResolvedValue({
  data: { user: mockSession.user, session: mockSession },
  error: null,
})

mockSupabaseClient.auth.signOut.mockResolvedValue({
  error: null,
})

mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
})

export default mockSupabaseClient

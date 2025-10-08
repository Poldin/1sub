export const mockCreditBalance = {
  id: 'balance-id-123',
  user_id: 'test-user-id-123',
  balance: 100.50,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockCreditTransaction = {
  id: 'transaction-id-123',
  user_id: 'test-user-id-123',
  delta: 10.0,
  balance_after: 110.50,
  transaction_type: 'grant' as const,
  reason: 'Test credit grant',
  metadata: {},
  idempotency_key: 'test-key-123',
  created_at: '2024-01-01T00:00:00Z',
}

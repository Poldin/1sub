export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditBalanceRow {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransactionRow {
  id: string;
  user_id: string;
  delta: number;
  balance_after: number;
  transaction_type: 'grant' | 'consume' | 'refund' | 'adjustment';
  reason: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  created_at: string;
}

export interface ToolRow {
  id: string;
  name: string;
  description: string | null;
  url: string;
  api_endpoint: string | null;
  credit_cost_per_use: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UsageLogRow {
  id: string;
  user_id: string;
  tool_id: string | null;
  credits_consumed: number;
  status: 'success' | 'failed' | 'insufficient_credits';
  metadata: Record<string, unknown>;
  created_at: string;
}



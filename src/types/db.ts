export interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

export interface CreditLedgerRow {
  id: string;
  user_id: string;
  delta: number;
  reason: string | null;
  created_at: string;
}



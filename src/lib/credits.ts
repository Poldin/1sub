import { supabaseAdmin } from './supabaseAdmin';

/**
 * Credit Balance Interface
 * Represents a user's current credit balance
 */
export interface CreditBalance {
  userId: string;
  balance: number;
}

/**
 * Credit Transaction Interface
 * Represents a single credit transaction in the ledger
 */
export interface CreditTransaction {
  id: string;
  userId: string;
  delta: number; // Positive for grants, negative for consumption
  balanceAfter: number; // Balance after this transaction
  transactionType: 'grant' | 'consume' | 'refund' | 'adjustment';
  reason?: string; // Optional description of the transaction
  idempotencyKey?: string; // Prevents duplicate processing
  createdAt: string;
}

/**
 * Retrieves the current credit balance for a user
 * @param userId - The user's UUID
 * @returns Promise<CreditBalance> - User's current balance
 * @throws Error if database query fails
 */
export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  const { data, error } = await supabaseAdmin
    .from('credit_balances')
    .select('user_id, balance')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get credit balance: ${error.message}`);
  }

  return {
    userId: data.user_id,
    balance: Number(data.balance)
  };
}

/**
 * Grants credits to a user account
 * This operation is idempotent - duplicate idempotency keys are rejected
 * @param userId - The user's UUID
 * @param amount - Number of credits to grant (must be positive)
 * @param reason - Optional description of why credits are being granted
 * @param idempotencyKey - Optional key to prevent duplicate processing (auto-generated if not provided)
 * @returns Promise<CreditTransaction> - The created transaction record
 * @throws Error if database operations fail
 */
export async function grantCredits(
  userId: string, 
  amount: number, 
  reason?: string,
  idempotencyKey?: string
): Promise<CreditTransaction> {
  // Generate idempotency key if not provided
  // Format: grant_${timestamp}_${randomString} ensures uniqueness
  const key = idempotencyKey || `grant_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Insert transaction record first
  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: userId,
      delta: amount,
      balance_after: 0, // Will be calculated by trigger
      transaction_type: 'grant',
      reason,
      idempotency_key: key
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

  // Update balance using atomic RPC function
  // This ensures the balance update is atomic and prevents race conditions
  const { error: updateError } = await supabaseAdmin
    .rpc('increment_balance', {
      p_user_id: userId,
      p_amount: amount
    });

  if (updateError) {
    throw new Error(`Failed to update credit balance: ${updateError.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    delta: Number(data.delta),
    balanceAfter: Number(data.balance_after),
    transactionType: data.transaction_type as 'grant' | 'consume' | 'refund' | 'adjustment',
    reason: data.reason,
    idempotencyKey: data.idempotency_key,
    createdAt: data.created_at
  };
}

/**
 * Consumes credits from a user account
 * This operation is atomic and idempotent - uses database-level locking to prevent race conditions
 * @param userId - The user's UUID
 * @param amount - Number of credits to consume (must be positive)
 * @param reason - Optional description of why credits are being consumed
 * @param idempotencyKey - Optional key to prevent duplicate processing (auto-generated if not provided)
 * @returns Promise<CreditTransaction> - The created transaction record
 * @throws Error if insufficient balance, duplicate transaction, or database operations fail
 */
export async function consumeCredits(
  userId: string, 
  amount: number, 
  reason?: string,
  idempotencyKey?: string
): Promise<CreditTransaction> {
  // Generate idempotency key if not provided
  // Format: consume_${timestamp}_${randomString} ensures uniqueness
  const key = idempotencyKey || `consume_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  // Call atomic database function that handles:
  // 1. Row-level locking to prevent race conditions
  // 2. Idempotency check to prevent duplicate processing
  // 3. Sufficient balance validation
  // 4. Atomic balance update and transaction insertion
  const { data, error } = await supabaseAdmin
    .rpc('consume_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_idempotency_key: key
    });

  if (error) {
    throw new Error(`Failed to consume credits: ${error.message}`);
  }

  // Handle specific error cases from the database function
  if (data.status === 'insufficient') {
    throw new Error(`Insufficient credits. Current balance: ${data.balance}`);
  }

  if (data.status === 'duplicate') {
    throw new Error('Transaction already processed');
  }

  // Fetch the complete transaction details for return
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('credit_transactions')
    .select('*')
    .eq('idempotency_key', key)
    .single();

  if (txError) {
    throw new Error(`Failed to get transaction details: ${txError.message}`);
  }

  return {
    id: transaction.id,
    userId: transaction.user_id,
    delta: Number(transaction.delta),
    balanceAfter: Number(transaction.balance_after),
    transactionType: transaction.transaction_type as 'grant' | 'consume' | 'refund' | 'adjustment',
    reason: transaction.reason,
    idempotencyKey: transaction.idempotency_key,
    createdAt: transaction.created_at
  };
}



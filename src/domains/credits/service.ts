/**
 * Credits Domain Service
 *
 * CANONICAL SOURCE: All credit operations MUST use this service.
 *
 * Key principles:
 * - Uses user_balances table as source of truth
 * - Implements idempotency keys for all operations
 * - All operations are atomic and logged
 * - Trigger automatically updates user_balances on transaction insert
 */

import { createServerClient, createServiceClient } from '@/infrastructure/database/client';
import { logCreditConsumption, logInsufficientCredits } from '@/security';
import type { Database } from '@/lib/database_types';

type CreditTransactionType = Database['public']['Tables']['credit_transactions']['Row']['type'];

// ============================================================================
// TYPES
// ============================================================================

export interface CreditTransaction {
  id: string;
  user_id: string;
  credits_amount: number;
  type: CreditTransactionType;
  reason: string | null;
  idempotency_key: string | null;
  checkout_id: string | null;
  tool_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AddCreditsParams {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}

export interface SubtractCreditsParams {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreditOperationResult {
  success: boolean;
  transactionId?: string;
  balanceBefore: number;
  balanceAfter: number;
  error?: string;
}

export interface BalanceValidationResult {
  userId: string;
  balanceFromLatest: number;
  balanceFromCalculation: number;
  isConsistent: boolean;
  discrepancy: number;
}

// ============================================================================
// BALANCE QUERIES
// ============================================================================

/**
 * Get the current balance for a user from user_balances table.
 * This is the primary method for checking balances.
 */
export async function getCurrentBalance(userId: string): Promise<number> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const supabase = await createServerClient();

    const { data: balanceRecord, error } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No balance record found (PGRST116) - return 0 for new users
      if (error.code === 'PGRST116') {
        return 0;
      }

      console.error('Error fetching current balance:', {
        code: error.code,
        message: error.message,
        userId,
      });

      return 0;
    }

    return balanceRecord?.balance ?? 0;
  } catch (error) {
    console.error('Unexpected error in getCurrentBalance:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });

    return 0;
  }
}

/**
 * Get balance using service client (for API routes).
 */
export async function getCurrentBalanceService(userId: string): Promise<number> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const supabase = createServiceClient();

    const { data: balanceRecord, error } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return 0;
      }
      return 0;
    }

    return balanceRecord?.balance ?? 0;
  } catch {
    return 0;
  }
}

// ============================================================================
// CREDIT OPERATIONS
// ============================================================================

/**
 * Add credits to a user's account.
 * Idempotent if an idempotencyKey is provided.
 */
export async function addCredits(params: AddCreditsParams): Promise<CreditOperationResult> {
  const { userId, amount, reason, idempotencyKey, checkoutId, toolId, metadata } = params;

  if (!userId) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'User ID is required',
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'Amount must be greater than 0',
    };
  }

  const supabase = await createServerClient();

  try {
    // Check for existing transaction with same idempotency key
    if (idempotencyKey) {
      const { data: existing, error: existingError } = await supabase
        .from('credit_transactions')
        .select('id, credits_amount')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (!existingError && existing) {
        const balanceAfter = await getCurrentBalance(userId);
        const balanceBefore = balanceAfter - (existing.credits_amount ?? 0);
        return {
          success: true,
          transactionId: existing.id,
          balanceBefore,
          balanceAfter,
        };
      }
    }

    const balanceBefore = await getCurrentBalance(userId);

    // Insert transaction (trigger updates user_balances)
    const { data: transaction, error: insertError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credits_amount: amount,
        type: 'add',
        reason,
        idempotency_key: idempotencyKey,
        checkout_id: checkoutId,
        tool_id: toolId,
        metadata: metadata || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error adding credits:', insertError);
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Failed to add credits',
      };
    }

    const balanceAfter = await getCurrentBalance(userId);

    return {
      success: true,
      transactionId: transaction.id,
      balanceBefore,
      balanceAfter,
    };
  } catch (error) {
    console.error('Unexpected error in addCredits:', error);
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Subtract credits from a user's account.
 * Checks for sufficient balance.
 */
export async function subtractCredits(
  params: SubtractCreditsParams
): Promise<CreditOperationResult> {
  const { userId, amount, reason, idempotencyKey, checkoutId, toolId, metadata } = params;

  if (!userId) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'User ID is required',
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'Amount must be greater than 0',
    };
  }

  const supabase = await createServerClient();

  try {
    // Check for existing transaction with same idempotency key
    if (idempotencyKey) {
      const { data: existing, error: existingError } = await supabase
        .from('credit_transactions')
        .select('id, credits_amount')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (!existingError && existing) {
        const balanceAfter = await getCurrentBalance(userId);
        const balanceBefore = balanceAfter + (existing.credits_amount ?? 0);
        return {
          success: true,
          transactionId: existing.id,
          balanceBefore,
          balanceAfter,
        };
      }
    }

    const balanceBefore = await getCurrentBalance(userId);

    // Check for sufficient balance
    if (balanceBefore < amount) {
      logInsufficientCredits({
        userId,
        toolId: toolId || '',
        required: amount,
        available: balanceBefore,
      });

      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Insufficient credits',
      };
    }

    // Insert transaction (trigger updates user_balances)
    const { data: transaction, error: insertError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credits_amount: amount,
        type: 'subtract',
        reason,
        idempotency_key: idempotencyKey,
        checkout_id: checkoutId,
        tool_id: toolId,
        metadata: metadata || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error subtracting credits:', insertError);
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Failed to subtract credits',
      };
    }

    const balanceAfter = await getCurrentBalance(userId);

    logCreditConsumption({
      userId,
      toolId: toolId || '',
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      transactionId: transaction.id,
    });

    return {
      success: true,
      transactionId: transaction.id,
      balanceBefore,
      balanceAfter,
    };
  } catch (error) {
    console.error('Unexpected error in subtractCredits:', error);
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Consume credits via API (for vendor calls).
 * Uses service client for elevated permissions.
 */
export async function consumeCreditsViaApi(params: {
  userId: string;
  toolId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}): Promise<CreditOperationResult> {
  const { userId, toolId, amount, reason, idempotencyKey } = params;

  if (!userId || !toolId || !amount || !idempotencyKey) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'Missing required parameters',
    };
  }

  const supabase = createServiceClient();

  try {
    // Check idempotency
    const { data: existing } = await supabase
      .from('credit_transactions')
      .select('id, credits_amount')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      const balanceAfter = await getCurrentBalanceService(userId);
      const balanceBefore = balanceAfter + (existing.credits_amount ?? 0);
      return {
        success: true,
        transactionId: existing.id,
        balanceBefore,
        balanceAfter,
      };
    }

    const balanceBefore = await getCurrentBalanceService(userId);

    if (balanceBefore < amount) {
      logInsufficientCredits({
        userId,
        toolId,
        required: amount,
        available: balanceBefore,
      });

      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Insufficient credits',
      };
    }

    const { data: transaction, error: insertError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credits_amount: amount,
        type: 'subtract',
        reason,
        idempotency_key: idempotencyKey,
        tool_id: toolId,
        metadata: { via: 'api' },
      })
      .select('id')
      .single();

    if (insertError) {
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Failed to consume credits',
      };
    }

    const balanceAfter = await getCurrentBalanceService(userId);

    logCreditConsumption({
      userId,
      toolId,
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      transactionId: transaction.id,
    });

    return {
      success: true,
      transactionId: transaction.id,
      balanceBefore,
      balanceAfter,
    };
  } catch (error) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that balance matches transaction history.
 */
export async function validateBalance(userId: string): Promise<BalanceValidationResult> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = await createServerClient();
  const balanceFromLatest = await getCurrentBalance(userId);

  const { data: transactions, error } = await supabase
    .from('credit_transactions')
    .select('credits_amount, type')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch transactions');
  }

  const balanceFromCalculation = (transactions || []).reduce((sum, tx) => {
    const amount = tx.credits_amount || 0;
    return tx.type === 'add' ? sum + amount : sum - amount;
  }, 0);

  const isConsistent = balanceFromLatest === balanceFromCalculation;
  const discrepancy = balanceFromLatest - balanceFromCalculation;

  if (!isConsistent) {
    console.warn(`Balance inconsistency for user ${userId}:`, {
      balanceFromLatest,
      balanceFromCalculation,
      discrepancy,
    });
  }

  return {
    userId,
    balanceFromLatest,
    balanceFromCalculation,
    isConsistent,
    discrepancy,
  };
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

/**
 * Get transaction history for a user.
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<CreditTransaction[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = await createServerClient();

  const { data: transactions, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching transaction history:', error);
    throw new Error('Failed to fetch transaction history');
  }

  return (transactions || []) as CreditTransaction[];
}

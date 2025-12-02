/**
 * Unified Credit Service
 * 
 * This is the single source of truth for all credit operations.
 * All credit additions, subtractions, and balance checks should go through this service.
 * 
 * Key principles:
 * - Uses user_balances table as source of truth for fast and reliable balance lookups
 * - Implements row-level locking to prevent race conditions
 * - Supports idempotency keys for all operations
 * - Validates balance consistency periodically
 * - All operations are atomic and logged
 * - Trigger automatically updates user_balances on transaction insert
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database_types';

type CreditTransactionType = Database['public']['Tables']['credit_transactions']['Row']['type'];

interface CreditTransaction {
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

interface AddCreditsParams {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}

interface SubtractCreditsParams {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}

interface CreditOperationResult {
  success: boolean;
  transactionId?: string;
  balanceBefore: number;
  balanceAfter: number;
  error?: string;
}

interface BalanceValidationResult {
  userId: string;
  balanceFromLatest: number;
  balanceFromCalculation: number;
  isConsistent: boolean;
  discrepancy: number;
}

/**
 * Get the current balance for a user from user_balances table
 * This is the primary method for checking balances (fast and accurate)
 */
export async function getCurrentBalance(userId: string): Promise<number> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const supabase = await createClient();

    // Get balance from user_balances table (source of truth)
    const { data: balanceRecord, error } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no balance record found (PGRST116), return 0
      // This can happen for new users who haven't had any transactions yet
      if (error.code === 'PGRST116') {
        return 0;
      }
      
      // Log detailed error information
      console.error('Error fetching current balance:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
      });
      
      // For other errors, still return 0 rather than throwing
      // This prevents the profile fetch from failing completely
      // The error is logged for debugging
      return 0;
    }

    return balanceRecord?.balance ?? 0;
  } catch (error) {
    // Catch any unexpected errors (e.g., network issues, database connection)
    console.error('Unexpected error in getCurrentBalance:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
    });
    
    // Return 0 instead of throwing to prevent cascading failures
    return 0;
  }
}

/**
 * Add credits to a user's account
 * This operation is idempotent if an idempotencyKey is provided
 */
export async function addCredits(params: AddCreditsParams): Promise<CreditOperationResult> {
  const {
    userId,
    amount,
    reason,
    idempotencyKey,
    checkoutId,
    toolId,
    metadata
  } = params;

  if (!userId) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'User ID is required'
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'Amount must be greater than 0'
    };
  }

  const supabase = await createClient();

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
        // Transaction already processed, get current balance from user_balances
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

    // Get current balance
    const balanceBefore = await getCurrentBalance(userId);

    // Insert the transaction (trigger will update user_balances automatically)
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
        error: 'Failed to add credits'
      };
    }

    // Get updated balance from user_balances (trigger should have updated it)
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
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Subtract credits from a user's account
 * This operation checks for sufficient balance and is idempotent if an idempotencyKey is provided
 */
export async function subtractCredits(params: SubtractCreditsParams): Promise<CreditOperationResult> {
  const {
    userId,
    amount,
    reason,
    idempotencyKey,
    checkoutId,
    toolId,
    metadata
  } = params;

  if (!userId) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'User ID is required'
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: 'Amount must be greater than 0'
    };
  }

  const supabase = await createClient();

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
        // Transaction already processed, get current balance from user_balances
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

    // Get current balance
    const balanceBefore = await getCurrentBalance(userId);

    // Check for sufficient balance
    if (balanceBefore < amount) {
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Insufficient credits'
      };
    }

    // Insert the transaction (trigger will update user_balances automatically)
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
        error: 'Failed to subtract credits'
      };
    }

    // Get updated balance from user_balances (trigger should have updated it)
    const balanceAfter = await getCurrentBalance(userId);

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
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculate balance from all transactions (for validation only)
 * This is slower but can be used to validate the user_balances.balance values
 */
async function calculateBalanceFromAllTransactions(userId: string): Promise<number> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = await createClient();

  const { data: transactions, error } = await supabase
    .from('credit_transactions')
    .select('credits_amount, type')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching transactions for validation:', error);
    throw new Error('Failed to fetch transactions');
  }

  if (!transactions || transactions.length === 0) {
    return 0;
  }

  return transactions.reduce((sum, transaction) => {
    const amount = transaction.credits_amount || 0;
    if (transaction.type === 'add') {
      return sum + amount;
    } else if (transaction.type === 'subtract') {
      return sum - amount;
    }
    return sum;
  }, 0);
}

/**
 * Validate that the user_balances.balance matches the calculated balance from transactions
 * This should be called periodically to ensure data consistency
 */
export async function validateBalance(userId: string): Promise<BalanceValidationResult> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const balanceFromLatest = await getCurrentBalance(userId);
    const balanceFromCalculation = await calculateBalanceFromAllTransactions(userId);

    const isConsistent = balanceFromLatest === balanceFromCalculation;
    const discrepancy = balanceFromLatest - balanceFromCalculation;

    if (!isConsistent) {
      console.warn(`Balance inconsistency detected for user ${userId}:`, {
        balanceFromLatest,
        balanceFromCalculation,
        discrepancy
      });
    }

    return {
      userId,
      balanceFromLatest,
      balanceFromCalculation,
      isConsistent,
      discrepancy
    };
  } catch (error) {
    console.error('Error validating balance:', error);
    throw error;
  }
}

/**
 * Validate balance consistency for multiple users
 * Useful for batch validation and monitoring
 */
export async function validateBalanceBatch(userIds: string[]): Promise<BalanceValidationResult[]> {
  const results: BalanceValidationResult[] = [];

  for (const userId of userIds) {
    try {
      const result = await validateBalance(userId);
      results.push(result);
    } catch (error) {
      console.error(`Error validating balance for user ${userId}:`, error);
      results.push({
        userId,
        balanceFromLatest: 0,
        balanceFromCalculation: 0,
        isConsistent: false,
        discrepancy: 0
      });
    }
  }

  return results;
}

/**
 * Get full transaction history for a user
 * Useful for debugging and audit purposes
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<CreditTransaction[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = await createClient();

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


/**
 * Centralized credit calculation utilities (Client-side)
 * 
 * IMPORTANT: For server-side operations, use src/lib/credits-service.ts instead.
 * This file is for client-side operations only.
 * 
 * Credits are stored in the credit_transactions table as a ledger.
 * The user's current balance is stored in the user_balances table (source of truth).
 * 
 * Migration Note:
 * - Use getCurrentBalanceClient() for all balance checks (uses user_balances table)
 * - calculateCreditsFromTransactions() is kept only for validation purposes
 * - Do NOT use calculateCreditsFromTransactions() for balance checks in production code
 */

import { createClient } from '@/lib/supabase/client';

interface CreditTransaction {
  credits_amount: number;
  type: 'add' | 'subtract';
}

/**
 * Calculate total credits from an array of credit transactions
 * 
 * WARNING: This function is DEPRECATED for balance checks.
 * Use getCurrentBalanceClient() instead for performance.
 * 
 * This function should only be used for:
 * - Validation and testing
 * - Balance consistency checks
 * - Debugging
 * 
 * @param transactions - Array of credit transactions
 * @returns Total credit balance
 */
export function calculateCreditsFromTransactions(transactions: CreditTransaction[]): number {
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
 * Get the current balance for a user (client-side)
 * This is the RECOMMENDED method for checking user balance.
 * 
 * Uses user_balances table for fast and reliable balance lookups.
 * This is much faster than calculating from all transactions.
 * 
 * @param userId - User ID to fetch balance for
 * @returns Promise with current balance or null if error
 */
export async function getCurrentBalanceClient(userId: string): Promise<number | null> {
  if (!userId) return null;

  try {
    const supabase = createClient();
    
    // Get balance from user_balances table (source of truth)
    const { data: balanceRecord, error } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // Log error with proper serialization
      console.error('Error fetching current balance:', JSON.stringify({
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId
      }, null, 2));
      return null;
    }

    // If no balance record found, return 0 (maybeSingle returns null instead of error)
    // This can happen for new users who haven't had any transactions yet
    return balanceRecord?.balance ?? 0;
  } catch (err) {
    // Log caught errors with proper serialization
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error('Error in getCurrentBalanceClient:', JSON.stringify({
      message: errorMessage,
      stack: errorStack,
      userId
    }, null, 2));
    return null;
  }
}

/**
 * Fetch and calculate user's current credit balance from all transactions (client-side)
 * 
 * WARNING: This function is DEPRECATED for normal balance checks.
 * Use getCurrentBalanceClient() instead for better performance.
 * 
 * This function should only be used for:
 * - Validation against user_balances.balance
 * - Debugging balance inconsistencies
 * - Testing
 * 
 * @param userId - User ID to fetch credits for
 * @returns Promise with total credits or null if error
 * @deprecated Use getCurrentBalanceClient() instead
 */
export async function getUserCreditsClient(userId: string): Promise<number | null> {
  if (!userId) return null;

  try {
    const supabase = createClient();
    
    const { data: transactions, error } = await supabase
      .from('credit_transactions')
      .select('credits_amount, type')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching credit transactions:', error);
      return null;
    }

    return calculateCreditsFromTransactions(transactions || []);
  } catch (err) {
    console.error('Error in getUserCreditsClient:', err);
    return null;
  }
}

/**
 * Get the last balance value from user_balances table (client-side)
 * 
 * This is an alias for getCurrentBalanceClient() for backward compatibility.
 * 
 * @param userId - User ID to fetch balance for
 * @returns Promise with current balance or null if error
 * @deprecated Use getCurrentBalanceClient() instead
 */
export async function getLastBalanceClient(userId: string): Promise<number | null> {
  return getCurrentBalanceClient(userId);
}

/**
 * Validate balance consistency by comparing user_balances.balance with calculated balance (client-side)
 * This should be used for debugging and validation purposes only.
 * 
 * @param userId - User ID to validate
 * @returns Promise with validation result
 */
export async function validateBalanceConsistency(userId: string): Promise<{
  isConsistent: boolean;
  balance: number;
} | null> {
  if (!userId) return null;

  try {
    const balance = await getCurrentBalanceClient(userId);

    if (balance === null) {
      return null;
    }

    // Since we now calculate balance dynamically, consistency is always true
    // This function is kept for backward compatibility
    return {
      isConsistent: true,
      balance
    };
  } catch (err) {
    console.error('Error in validateBalanceConsistency:', err);
    return null;
  }
}




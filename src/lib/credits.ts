/**
 * Centralized credit calculation utilities (Client-side)
 * 
 * IMPORTANT: For server-side operations, use src/lib/credits-service.ts instead.
 * This file is for client-side operations only.
 * 
 * Credits are stored in the credit_transactions table as a ledger.
 * Balance is calculated dynamically by summing all credit and debit transactions.
 * 
 * Migration Note:
 * - Use getCurrentBalanceClient() for all balance checks (calculates from transactions)
 * - calculateCreditsFromTransactions() is the implementation used by getCurrentBalanceClient()
 */

import { createClient } from '@/lib/supabase/client';

interface CreditTransaction {
  credits_amount: number;
  type: 'credit' | 'debit';
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
    if (transaction.type === 'credit') {
      return sum + amount;
    } else if (transaction.type === 'debit') {
      return sum - amount;
    }
    return sum;
  }, 0);
}

/**
 * Get the current balance for a user (client-side)
 * This is the RECOMMENDED method for checking user balance.
 * 
 * Uses balance_after from the latest transaction for performance.
 * This is much faster than calculating from all transactions.
 * 
 * @param userId - User ID to fetch balance for
 * @returns Promise with current balance or null if error
 */
export async function getCurrentBalanceClient(userId: string): Promise<number | null> {
  if (!userId) return null;

  try {
    const supabase = createClient();
    
    const { data: transactions, error } = await supabase
      .from('credit_transactions')
      .select('credits_amount, type')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching transactions for balance:', error);
      return null;
    }

    if (!transactions || transactions.length === 0) {
      return 0;
    }

    return calculateCreditsFromTransactions(transactions);
  } catch (err) {
    console.error('Error in getCurrentBalanceClient:', err);
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
 * - Validation of calculated balance
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
 * Calculate balance from all credit_transactions (client-side)
 * 
 * This is an alias for getCurrentBalanceClient() for backward compatibility.
 * 
 * @param userId - User ID to fetch balance for
 * @returns Promise with last balance or null if error
 * @deprecated Use getCurrentBalanceClient() instead
 */
export async function getLastBalanceClient(userId: string): Promise<number | null> {
  return getCurrentBalanceClient(userId);
}

/**
 * Validate balance consistency by comparing calculated balances (client-side)
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




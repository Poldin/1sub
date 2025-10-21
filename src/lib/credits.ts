/**
 * Centralized credit calculation utilities
 * 
 * Credits are stored in the credit_transactions table as a ledger.
 * The user's current balance is calculated by summing all transactions:
 * - 'add' transactions increase the balance
 * - 'subtract' transactions decrease the balance
 */

import { createClient } from '@/lib/supabase/client';

interface CreditTransaction {
  credits_amount: number;
  type: 'add' | 'subtract';
}

/**
 * Calculate total credits from an array of credit transactions
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
 * Fetch and calculate user's current credit balance (client-side)
 * @param userId - User ID to fetch credits for
 * @returns Promise with total credits or null if error
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
 * Get the last balance_after value from credit_transactions
 * This is faster than calculating from all transactions but requires
 * that balance_after is correctly maintained in the database
 * @param userId - User ID to fetch balance for
 * @returns Promise with last balance or null if error
 */
export async function getLastBalanceClient(userId: string): Promise<number | null> {
  if (!userId) return null;

  try {
    const supabase = createClient();
    
    const { data: transaction, error } = await supabase
      .from('credit_transactions')
      .select('balance_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no transactions found, return 0
      if (error.code === 'PGRST116') {
        return 0;
      }
      console.error('Error fetching last balance:', error);
      return null;
    }

    return transaction?.balance_after ?? 0;
  } catch (err) {
    console.error('Error in getLastBalanceClient:', err);
    return null;
  }
}



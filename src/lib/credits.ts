/**
 * Centralized credit balance utilities (Client-side)
 *
 * IMPORTANT: For server-side operations, use @/domains/credits instead.
 * This file is for client-side operations only.
 *
 * Credits are stored in the credit_transactions table as a ledger.
 * The user's current balance is stored in the user_balances table (source of truth).
 *
 * Best Practice:
 * - Use getCurrentBalanceClient() for all balance checks (uses user_balances table)
 * - Balance is always fetched fresh from the database (no client-side caching)
 */

import { createClient } from '@/lib/supabase/client';


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






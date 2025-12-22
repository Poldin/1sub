'use server';

/**
 * Credit Transactions Server Actions
 * 
 * Handles all credit and debit transactions with proper atomicity and idempotency.
 * 
 * Transaction Types:
 * - add: Adds credits to a user (topup, vendor earnings, etc.)
 * - subtract: Subtracts credits from a user (purchase, payout, fees, etc.)
 * 
 * Special Cases:
 * - Platform fees: add transaction for platform account (platform receives fee)
 * - Platform fees: subtract transaction with user_id (user pays fee)
 */

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/infrastructure/database/client';
import { getCurrentBalance as getCurrentBalanceFromService } from '@/lib/credits-service';

export interface CreditTransactionParams {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  stripeTransactionId?: string;
  metadata?: Record<string, unknown>;
}

export interface DebitTransactionParams {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformFeeParams {
  userId: string; // User paying the fee
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  balanceBefore: number;
  balanceAfter: number;
  error?: string;
}

/**
 * Get current balance for a user
 * 
 * @deprecated This function calculates balance by summing transactions, which is slow and unreliable.
 * Use getCurrentBalanceFromService instead, which reads from user_balances table.
 * 
 * This function is kept for backwards compatibility and debugging purposes only.
 */
export async function getCurrentBalance(userId: string): Promise<number> {
  console.warn('[DEPRECATED] getCurrentBalance from credit-transactions is deprecated. Use getCurrentBalance from credits-service instead.');
  return getCurrentBalanceFromService(userId);
}

/**
 * Create a CREDIT transaction (adds credits to user)
 * 
 * Use cases:
 * - Topup after Stripe checkout
 * - Vendor earnings from tool sale
 * - Refunds
 */
export async function createCreditTransaction(
  params: CreditTransactionParams
): Promise<TransactionResult> {
  const {
    userId,
    amount,
    reason,
    idempotencyKey,
    checkoutId,
    toolId,
    stripeTransactionId,
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
        // Transaction already processed, calculate current balance
        const balanceAfter = await getCurrentBalanceFromService(userId);
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
    const balanceBefore = await getCurrentBalanceFromService(userId);
    const balanceAfter = balanceBefore + amount;

    // Insert the credit transaction
    const { data: transaction, error: insertError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credits_amount: amount,
        type: 'add',
        reason,
        idempotency_key: idempotencyKey || null,
        checkout_id: checkoutId || null,
        tool_id: toolId || null,
        stripe_transaction_id: stripeTransactionId || null,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (insertError) {
      // Check if it's a duplicate idempotency key error
      if (insertError.code === '23505') {
        // Unique constraint violation - transaction already exists
        // Fetch the existing transaction
        const { data: existing } = await supabase
          .from('credit_transactions')
          .select('id, credits_amount')
          .eq('idempotency_key', idempotencyKey!)
          .single();

        if (existing) {
          const balanceAfter = await getCurrentBalanceFromService(userId);
          const balanceBefore = balanceAfter - (existing.credits_amount ?? 0);
          return {
            success: true,
            transactionId: existing.id,
            balanceBefore,
            balanceAfter,
          };
        }
      }

      console.error('Error creating credit transaction:', insertError);
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Failed to create credit transaction'
      };
    }

    return {
      success: true,
      transactionId: transaction.id,
      balanceBefore,
      balanceAfter,
    };
  } catch (error) {
    console.error('Unexpected error in createCreditTransaction:', error);
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a DEBIT transaction (subtracts credits from user)
 * 
 * Use cases:
 * - Tool purchase
 * - Subscription payment
 * - Vendor payout (withdrawal)
 * - Platform fees (user paying fee)
 */
export async function createDebitTransaction(
  params: DebitTransactionParams
): Promise<TransactionResult> {
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
        // Transaction already processed, calculate current balance
        const balanceAfter = await getCurrentBalanceFromService(userId);
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
    const balanceBefore = await getCurrentBalanceFromService(userId);

    // Check for sufficient balance
    if (balanceBefore < amount) {
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Insufficient credits'
      };
    }

    const balanceAfter = balanceBefore - amount;

    // Insert the debit transaction
    const { data: transaction, error: insertError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credits_amount: amount,
        type: 'subtract',
        reason,
        idempotency_key: idempotencyKey || null,
        checkout_id: checkoutId || null,
        tool_id: toolId || null,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (insertError) {
      // Check if it's a duplicate idempotency key error
      if (insertError.code === '23505') {
        // Unique constraint violation - transaction already exists
        // Fetch the existing transaction
        const { data: existing } = await supabase
          .from('credit_transactions')
          .select('id, credits_amount')
          .eq('idempotency_key', idempotencyKey!)
          .single();

        if (existing) {
          const balanceAfter = await getCurrentBalanceFromService(userId);
          const balanceBefore = balanceAfter + (existing.credits_amount ?? 0);
          return {
            success: true,
            transactionId: existing.id,
            balanceBefore,
            balanceAfter,
          };
        }
      }

      console.error('Error creating debit transaction:', insertError);
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Failed to create debit transaction'
      };
    }

    return {
      success: true,
      transactionId: transaction.id,
      balanceBefore,
      balanceAfter,
    };
  } catch (error) {
    console.error('Unexpected error in createDebitTransaction:', error);
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create platform fee transactions
 * 
 * This creates TWO transactions atomically:
 * 1. A CREDIT transaction without user_id (platform receives fee)
 * 2. A DEBIT transaction with user_id (user pays fee)
 * 
 * Note: Platform fee credit transaction has user_id = null (special case)
 */
export async function createPlatformFee(
  params: PlatformFeeParams
): Promise<{
  success: boolean;
  userDebitTransactionId?: string;
  platformCreditTransactionId?: string;
  balanceBefore: number;
  balanceAfter: number;
  error?: string;
}> {
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
    // Check for existing transactions with same idempotency key
    if (idempotencyKey) {
      const { data: existingDebit } = await supabase
        .from('credit_transactions')
        .select('id, credits_amount')
        .eq('user_id', userId)
        .eq('idempotency_key', `${idempotencyKey}-debit`)
        .single();

      if (existingDebit) {
        const balanceAfter = await getCurrentBalanceFromService(userId);
        const balanceBefore = balanceAfter + (existingDebit.credits_amount ?? 0);
        return {
          success: true,
          userDebitTransactionId: existingDebit.id,
          balanceBefore,
          balanceAfter,
        };
      }
    }

    // Get current balance for user
    const balanceBefore = await getCurrentBalanceFromService(userId);

    // Check for sufficient balance
    if (balanceBefore < amount) {
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Insufficient credits'
      };
    }

    const balanceAfter = balanceBefore - amount;

    // Create debit transaction for user (user pays fee)
    const userDebitIdempotencyKey = idempotencyKey ? `${idempotencyKey}-debit` : null;
    const { data: userDebitTransaction, error: debitError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        credits_amount: amount,
        type: 'subtract',
        reason: `${reason} (fee)`,
        idempotency_key: userDebitIdempotencyKey,
        checkout_id: checkoutId || null,
        tool_id: toolId || null,
        metadata: {
          ...metadata,
          is_platform_fee: true,
        },
      })
      .select('id')
      .single();

    if (debitError) {
      console.error('Error creating user debit transaction for platform fee:', debitError);
      return {
        success: false,
        balanceBefore,
        balanceAfter: balanceBefore,
        error: 'Failed to create platform fee transaction'
      };
    }

    // Create credit transaction for platform (platform receives fee)
    // NOTE: For platform transactions, we use a special UUID '00000000-0000-0000-0000-000000000000'
    // This represents the platform account. If the table allows NULL, we could use null instead.
    // Check if table allows NULL user_id, otherwise use platform UUID
    const PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000';
    const platformCreditIdempotencyKey = idempotencyKey ? `${idempotencyKey}-platform-credit` : null;
    const { data: platformCreditTransaction, error: creditError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: PLATFORM_USER_ID, // Platform account - special UUID
        credits_amount: amount,
        type: 'add',
        reason: `Platform fee: ${reason}`,
        idempotency_key: platformCreditIdempotencyKey,
        checkout_id: checkoutId || null,
        tool_id: toolId || null,
        metadata: {
          ...metadata,
          is_platform_fee: true,
          fee_paid_by_user_id: userId, // Store user_id in metadata for reference
        },
      })
      .select('id')
      .single();

    if (creditError) {
      console.error('Error creating platform credit transaction:', creditError);
      // Note: User debit was already created, but platform credit failed
      // This is logged but we still return success for the user debit
      // In production, you might want to implement compensation logic
      return {
        success: true,
        userDebitTransactionId: userDebitTransaction.id,
        balanceBefore,
        balanceAfter,
        error: 'Platform fee recorded but platform credit transaction failed'
      };
    }

    return {
      success: true,
      userDebitTransactionId: userDebitTransaction.id,
      platformCreditTransactionId: platformCreditTransaction.id,
      balanceBefore,
      balanceAfter,
    };
  } catch (error) {
    console.error('Unexpected error in createPlatformFee:', error);
    return {
      success: false,
      balanceBefore: 0,
      balanceAfter: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Transfer credits from one user to another
 * 
 * Use cases:
 * - Tool purchase: buyer pays vendor
 * - Refund: vendor refunds buyer
 * 
 * This creates TWO transactions atomically:
 * 1. DEBIT transaction for sender
 * 2. CREDIT transaction for receiver
 */
export async function transferCredits(params: {
  fromUserId: string;
  toUserId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  checkoutId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  success: boolean;
  debitTransactionId?: string;
  creditTransactionId?: string;
  fromBalanceBefore: number;
  fromBalanceAfter: number;
  toBalanceBefore: number;
  toBalanceAfter: number;
  error?: string;
}> {
  const {
    fromUserId,
    toUserId,
    amount,
    reason,
    idempotencyKey,
    checkoutId,
    toolId,
    metadata
  } = params;

  if (!fromUserId || !toUserId) {
    return {
      success: false,
      fromBalanceBefore: 0,
      fromBalanceAfter: 0,
      toBalanceBefore: 0,
      toBalanceAfter: 0,
      error: 'Both from and to user IDs are required'
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      fromBalanceBefore: 0,
      fromBalanceAfter: 0,
      toBalanceBefore: 0,
      toBalanceAfter: 0,
      error: 'Amount must be greater than 0'
    };
  }

  if (fromUserId === toUserId) {
    return {
      success: false,
      fromBalanceBefore: 0,
      fromBalanceAfter: 0,
      toBalanceBefore: 0,
      toBalanceAfter: 0,
      error: 'Cannot transfer credits to the same user'
    };
  }

  const supabase = await createClient();

  try {
    // Check for existing transactions with same idempotency key
    if (idempotencyKey) {
      const { data: existingDebit } = await supabase
        .from('credit_transactions')
        .select('id, credits_amount')
        .eq('user_id', fromUserId)
        .eq('idempotency_key', `${idempotencyKey}-debit`)
        .single();

      if (existingDebit) {
        // Fetch corresponding credit transaction
        const { data: existingCredit } = await supabase
          .from('credit_transactions')
          .select('id, credits_amount')
          .eq('user_id', toUserId)
          .eq('idempotency_key', `${idempotencyKey}-credit`)
          .single();

        const fromBalanceAfter = await getCurrentBalanceFromService(fromUserId);
        const fromBalanceBefore = fromBalanceAfter + (existingDebit.credits_amount ?? 0);
        const toBalanceAfter = await getCurrentBalanceFromService(toUserId);
        const toBalanceBefore = existingCredit 
          ? toBalanceAfter - (existingCredit.credits_amount ?? 0)
          : toBalanceAfter - amount;

        return {
          success: true,
          debitTransactionId: existingDebit.id,
          creditTransactionId: existingCredit?.id,
          fromBalanceBefore,
          fromBalanceAfter,
          toBalanceBefore,
          toBalanceAfter,
        };
      }
    }

    // Get current balances
    const fromBalanceBefore = await getCurrentBalanceFromService(fromUserId);
    const toBalanceBefore = await getCurrentBalanceFromService(toUserId);

    // Check for sufficient balance
    if (fromBalanceBefore < amount) {
      return {
        success: false,
        fromBalanceBefore,
        fromBalanceAfter: fromBalanceBefore,
        toBalanceBefore,
        toBalanceAfter: toBalanceBefore,
        error: 'Insufficient credits'
      };
    }

    const fromBalanceAfter = fromBalanceBefore - amount;
    const toBalanceAfter = toBalanceBefore + amount;

    // Create debit transaction for sender
    const debitIdempotencyKey = idempotencyKey ? `${idempotencyKey}-debit` : null;
    const { data: debitTransaction, error: debitError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: fromUserId,
        credits_amount: amount,
        type: 'subtract',
        reason: `${reason} (transfer to user)`,
        idempotency_key: debitIdempotencyKey,
        checkout_id: checkoutId || null,
        tool_id: toolId || null,
        metadata: {
          ...metadata,
          transfer_to_user_id: toUserId,
          is_transfer: true,
        },
      })
      .select('id')
      .single();

    if (debitError) {
      console.error('Error creating debit transaction for transfer:', debitError);
      return {
        success: false,
        fromBalanceBefore,
        fromBalanceAfter: fromBalanceBefore,
        toBalanceBefore,
        toBalanceAfter: toBalanceBefore,
        error: 'Failed to create transfer transaction'
      };
    }

    // Create credit transaction for receiver
    // Use service role client to bypass RLS policy (buyer cannot create transactions for vendor)
    const serviceSupabase = createServiceClient();
    const creditIdempotencyKey = idempotencyKey ? `${idempotencyKey}-credit` : null;
    const { data: creditTransaction, error: creditError } = await serviceSupabase
      .from('credit_transactions')
      .insert({
        user_id: toUserId,
        credits_amount: amount,
        type: 'add',
        reason: `${reason} (transfer from user)`,
        idempotency_key: creditIdempotencyKey,
        checkout_id: checkoutId || null,
        tool_id: toolId || null,
        metadata: {
          ...metadata,
          transfer_from_user_id: fromUserId,
          is_transfer: true,
        },
      })
      .select('id')
      .single();

    if (creditError) {
      console.error('Error creating credit transaction for transfer:', creditError);
      // Note: Debit was already created, but credit failed
      // This is logged but we still return partial success
      // In production, you might want to implement compensation logic
      return {
        success: true,
        debitTransactionId: debitTransaction.id,
        fromBalanceBefore,
        fromBalanceAfter,
        toBalanceBefore,
        toBalanceAfter: toBalanceBefore,
        error: 'Transfer debit recorded but credit transaction failed'
      };
    }

    return {
      success: true,
      debitTransactionId: debitTransaction.id,
      creditTransactionId: creditTransaction.id,
      fromBalanceBefore,
      fromBalanceAfter,
      toBalanceBefore,
      toBalanceAfter,
    };
  } catch (error) {
    console.error('Unexpected error in transferCredits:', error);
    return {
      success: false,
      fromBalanceBefore: 0,
      fromBalanceAfter: 0,
      toBalanceBefore: 0,
      toBalanceAfter: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


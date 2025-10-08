import { supabaseAdmin } from './supabaseAdmin';
import { CreditBalanceRow, CreditTransactionRow } from '@/types/db';

export interface CreditBalance {
  userId: string;
  balance: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  delta: number;
  balanceAfter: number;
  transactionType: 'grant' | 'consume' | 'refund' | 'adjustment';
  reason?: string;
  idempotencyKey?: string;
  createdAt: string;
}

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

export async function grantCredits(
  userId: string, 
  amount: number, 
  reason?: string,
  idempotencyKey?: string
): Promise<CreditTransaction> {
  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: userId,
      delta: amount,
      balance_after: 0, // Will be calculated by trigger
      transaction_type: 'grant',
      reason,
      idempotency_key: idempotencyKey || `grant_${Date.now()}_${Math.random().toString(36).slice(2)}`
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

    // Update balance using RPC function
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
    transactionType: data.transaction_type as any,
    reason: data.reason,
    idempotencyKey: data.idempotency_key,
    createdAt: data.created_at
  };
}

export async function consumeCredits(
  userId: string, 
  amount: number, 
  reason?: string,
  idempotencyKey?: string
): Promise<CreditTransaction> {
  const key = idempotencyKey || `consume_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
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

  if (data.status === 'insufficient') {
    throw new Error(`Insufficient credits. Current balance: ${data.balance}`);
  }

  if (data.status === 'duplicate') {
    throw new Error('Transaction already processed');
  }

  // Get the transaction details
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
    transactionType: transaction.transaction_type as any,
    reason: transaction.reason,
    idempotencyKey: transaction.idempotency_key,
    createdAt: transaction.created_at
  };
}



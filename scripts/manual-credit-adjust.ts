/**
 * One-off script to credit a user manually.
 *
 * Usage:
 * NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/manual-credit-adjust.ts
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const targetEmail = 'daroldalberto@gmail.com';
  const amount = 1000;
  const reason = 'Manual admin credit adjustment';
  const idempotencyKey = `manual-adjust-${crypto.randomUUID()}`;

  const { data: userList, error: userError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (userError) {
    throw new Error(`Failed to look up user: ${userError.message}`);
  }
  const user = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
  const userId = user?.id;
  if (!userId) {
    throw new Error(`User not found for ${targetEmail}`);
  }

  const { data: latestTransaction, error: balanceError } = await supabase
    .from('credit_transactions')
    .select('balance_after')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (balanceError && balanceError.code !== 'PGRST116') {
    throw balanceError;
  }

  const currentBalance = latestTransaction?.balance_after ?? 0;
  const newBalance = currentBalance + amount;

  const { error: insertError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      type: 'add',
      credits_amount: amount,
      reason,
      idempotency_key: idempotencyKey,
      balance_after: newBalance,
      metadata: {
        source: 'manual_script',
        admin_action: 'add_credits',
        amount,
        previous_balance: currentBalance,
        idempotency_key: idempotencyKey,
      },
    });

  if (insertError) {
    throw insertError;
  }

  console.log(`Successfully added ${amount} credits to ${targetEmail}. New balance: ${newBalance}`);
}

main().catch((err) => {
  console.error('Credit adjustment failed:', err);
  process.exit(1);
});


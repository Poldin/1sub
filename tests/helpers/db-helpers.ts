/**
 * Database Test Helpers
 *
 * Utilities for creating test data, cleaning up, and interacting with the test database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

let supabase: SupabaseClient | null = null;

export function getTestSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}

export async function createTestUser(email?: string) {
  const supabase = getTestSupabase();
  const testEmail = email || `test-${randomUUID()}@example.com`;

  const { data: user, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (error) throw error;

  return user.user;
}

export async function createTestUserWithBalance(balance: number = 100) {
  const user = await createTestUser();

  const supabase = getTestSupabase();
  await supabase.from('user_balances').upsert({
    user_id: user.id,
    balance: balance,
  });

  return user;
}

export async function createTestVendor() {
  const user = await createTestUser();

  const supabase = getTestSupabase();
  await supabase
    .from('user_profiles')
    .update({ is_vendor: true })
    .eq('id', user.id);

  return user;
}

export async function createTestTool(vendorId: string) {
  const supabase = getTestSupabase();

  const { data: tool, error } = await supabase
    .from('tools')
    .insert({
      name: 'Test Tool',
      description: 'Test tool for automated testing',
      url: 'https://test-tool.example.com',
      category: 'AI',
      user_profile_id: vendorId,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return tool;
}

export async function cleanupTestUser(userId: string) {
  if (!userId) return;

  const supabase = getTestSupabase();

  // Delete user's data (cascading deletes should handle most)
  await supabase.from('user_balances').delete().eq('user_id', userId);
  await supabase.from('credit_transactions').delete().eq('user_id', userId);
  await supabase.from('checkouts').delete().eq('user_id', userId);

  // Delete auth user
  await supabase.auth.admin.deleteUser(userId);
}

export async function getBalance(userId: string): Promise<number> {
  const supabase = getTestSupabase();

  const { data, error } = await supabase
    .from('user_balances')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error) return 0;
  return data?.balance || 0;
}

export async function addTestCredits(userId: string, amount: number) {
  const supabase = getTestSupabase();

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    credits_amount: amount,
    type: 'add',
    reason: 'Test credit addition',
  });
}

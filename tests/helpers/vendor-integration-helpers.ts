/**
 * Vendor Integration Test Helpers
 *
 * Utilities for creating test vendor tools, subscriptions, and webhook configurations
 * for automated vendor integration testing.
 */

import { getTestSupabase } from './db-helpers';
import { generateApiKey } from '@/lib/api-keys-client';
import { hashApiKey } from '@/lib/api-keys-client';
import { generateWebhookSecret } from '@/security';

export interface TestVendorTool {
  tool: {
    id: string;
    name: string;
    user_profile_id: string;
  };
  apiKey: string;
  webhookSecret: string;
}

/**
 * Create a test vendor tool with API key and webhook configuration
 */
export async function createTestVendorTool(
  vendorId: string,
  callbackUrl: string,
  webhookUrl: string
): Promise<TestVendorTool> {
  const supabase = getTestSupabase();

  // Generate webhook secret
  const webhookSecret = generateWebhookSecret();

  // Create tool
  const { data: tool, error: toolError } = await supabase
    .from('tools')
    .insert({
      name: `Test Tool ${Date.now()}`,
      description: 'Test tool for vendor integration tests',
      url: 'https://test-tool.example.com',
      user_profile_id: vendorId,
      is_active: true,
      metadata: {
        callback_url: callbackUrl,
      },
    })
    .select()
    .single();

  if (toolError) {
    throw new Error(`Failed to create test tool: ${toolError.message}`);
  }

  // Generate API key
  const rawApiKey = generateApiKey();
  const keyHash = await hashApiKey(rawApiKey);
  const keyPrefix = rawApiKey.substring(0, 8);

  // Create API key with webhook configuration in metadata
  const { error: apiKeyError } = await supabase.from('api_keys').insert({
    tool_id: tool.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    is_active: true,
    metadata: {
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
      redirect_uri: callbackUrl,
    },
  });

  if (apiKeyError) {
    // Cleanup tool if API key creation fails
    await supabase.from('tools').delete().eq('id', tool.id);
    throw new Error(`Failed to create API key: ${apiKeyError.message}`);
  }

  return {
    tool,
    apiKey: rawApiKey,
    webhookSecret,
  };
}

/**
 * Create a test subscription for a user and tool
 */
export async function createTestSubscription(
  userId: string,
  toolId: string,
  options?: {
    planId?: string;
    creditsPerPeriod?: number;
    period?: 'month' | 'year';
  }
) {
  const supabase = getTestSupabase();

  const nextBillingDate = new Date();
  if (options?.period === 'year') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  const { data: subscription, error } = await supabase
    .from('tool_subscriptions')
    .insert({
      user_id: userId,
      tool_id: toolId,
      status: 'active',
      plan_id: options?.planId || 'test-plan',
      credits_per_period: options?.creditsPerPeriod || 100,
      period: options?.period || 'month',
      next_billing_date: nextBillingDate.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test subscription: ${error.message}`);
  }

  return subscription;
}

/**
 * Cancel a test subscription
 */
export async function cancelTestSubscription(
  userId: string,
  toolId: string
): Promise<void> {
  const supabase = getTestSupabase();

  const { error } = await supabase
    .from('tool_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('tool_id', toolId)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

/**
 * Verify webhook was logged in database
 */
export async function verifyWebhookInDatabase(
  toolId: string,
  eventType: string,
  maxWait: number = 10000
): Promise<boolean> {
  const supabase = getTestSupabase();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('tool_id', toolId)
      .eq('event_type', eventType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      return true;
    }

    // Wait 200ms before next check
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return false;
}

/**
 * Get the latest webhook log entry for a tool
 */
export async function getLatestWebhookLog(
  toolId: string,
  eventType?: string
) {
  const supabase = getTestSupabase();

  let query = supabase
    .from('webhook_logs')
    .select('*')
    .eq('tool_id', toolId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get webhook log: ${error.message}`);
  }

  return data;
}

/**
 * Wait for webhook delivery (polls database until webhook appears)
 */
export async function waitForWebhookDelivery(
  toolId: string,
  eventType: string,
  timeout: number = 10000
): Promise<boolean> {
  return verifyWebhookInDatabase(toolId, eventType, timeout);
}

/**
 * Clean up test vendor tool and related data
 */
export async function cleanupTestVendorTool(toolId: string): Promise<void> {
  const supabase = getTestSupabase();

  // Delete in reverse dependency order
  await supabase.from('webhook_logs').delete().eq('tool_id', toolId);
  await supabase.from('webhook_retry_queue').delete().eq('tool_id', toolId);
  await supabase.from('webhook_dead_letter_queue').delete().eq('tool_id', toolId);
  await supabase.from('tool_subscriptions').delete().eq('tool_id', toolId);
  await supabase.from('api_keys').delete().eq('tool_id', toolId);
  await supabase.from('tools').delete().eq('id', toolId);
}


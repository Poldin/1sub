/**
 * API Key Verification
 *
 * CANONICAL SOURCE: All API key verification MUST use this module.
 */

import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/infrastructure/database';
import { isValidApiKeyFormat } from './generation';

export interface ApiKeyVerificationResult {
  success: boolean;
  toolId?: string;
  toolName?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Verify an API key against a stored hash
 */
export async function verifyApiKeyHash(
  inputKey: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) {
    return false;
  }
  return bcrypt.compare(inputKey, storedHash);
}

/**
 * Find tool by API key
 * Uses optimized prefix-based lookup
 */
export async function findToolByApiKey(
  apiKey: string
): Promise<ApiKeyVerificationResult> {
  // Validate format first
  if (!isValidApiKeyFormat(apiKey)) {
    return { success: false, error: 'Invalid API key format' };
  }

  const keyPrefix = apiKey.substring(0, 8);
  const supabase = createServiceClient();

  try {
    // Use optimized RPC function for prefix-based lookup
    const { data, error } = await supabase.rpc('validate_api_key_hash', {
      p_key_prefix: keyPrefix,
    });

    if (error) {
      console.error('[API Key Verification] RPC error:', error);
      return { success: false, error: 'Database error during verification' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'API key not found' };
    }

    // Verify hash for matching prefix(es)
    for (const record of data) {
      const isValid = await verifyApiKeyHash(apiKey, record.key_hash);
      if (isValid) {
        // Update last used timestamp
        await updateApiKeyLastUsed(record.tool_id);

        return {
          success: true,
          toolId: record.tool_id,
          toolName: record.tool_name,
          isActive: record.is_active ?? true,
          metadata: (record.metadata as Record<string, unknown>) || {},
        };
      }
    }

    return { success: false, error: 'Invalid API key' };
  } catch (error) {
    console.error('[API Key Verification] Error:', error);
    return { success: false, error: 'Verification failed' };
  }
}

/**
 * Update API key last used timestamp
 */
async function updateApiKeyLastUsed(toolId: string): Promise<void> {
  const supabase = createServiceClient();

  try {
    await supabase.rpc('update_api_key_usage', {
      p_tool_id: toolId,
    });
  } catch (error) {
    // Non-critical, just log
    console.warn('[API Key] Failed to update last used timestamp:', error);
  }
}

/**
 * Check if API key is active
 */
export async function isApiKeyActive(toolId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('is_active')
    .eq('tool_id', toolId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_active;
}

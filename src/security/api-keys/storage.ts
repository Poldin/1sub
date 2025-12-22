/**
 * API Key Storage and Rotation
 *
 * CANONICAL SOURCE: All API key storage/rotation MUST use this module.
 */

import { createServerClient, createServiceClient } from '@/infrastructure/database';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from './generation';
import { logApiKeyRegeneration } from '../audit-logger';

export interface ApiKeyStorageResult {
  success: boolean;
  error?: string;
}

export interface ApiKeyRegenerationResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}

/**
 * Store API key for a tool
 */
export async function storeApiKey(
  toolId: string,
  apiKey: string
): Promise<ApiKeyStorageResult> {
  try {
    const supabase = await createServerClient();

    // Hash the API key
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    // Get tool and verify ownership
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('name, user_profile_id')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return { success: false, error: 'Tool not found' };
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication error' };
    }

    // Check vendor status
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_vendor')
      .eq('id', user.id)
      .single();

    if (!profile?.is_vendor) {
      return { success: false, error: 'User is not a vendor' };
    }

    // Verify tool ownership
    if (tool.user_profile_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if API key already exists
    const { data: existing } = await supabase
      .from('api_keys')
      .select('id')
      .eq('tool_id', toolId)
      .maybeSingle();

    if (existing) {
      // Update existing key
      const { error } = await supabase
        .from('api_keys')
        .update({
          key_hash: keyHash,
          key_prefix: keyPrefix,
          created_at: new Date().toISOString(),
          last_used_at: null,
          is_active: true,
        })
        .eq('tool_id', toolId);

      if (error) {
        console.error('Error updating API key:', error);
        return { success: false, error: `Failed to update API key: ${error.message}` };
      }
    } else {
      // Insert new key
      const { error } = await supabase
        .from('api_keys')
        .insert({
          tool_id: toolId,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          is_active: true,
        });

      if (error) {
        console.error('Error inserting API key:', error);
        return { success: false, error: `Failed to store API key: ${error.message}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in storeApiKey:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Regenerate API key for a tool
 */
export async function regenerateApiKey(
  toolId: string,
  userId: string
): Promise<ApiKeyRegenerationResult> {
  try {
    const supabase = await createServerClient();

    // Verify tool belongs to user
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('name, user_profile_id')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return { success: false, error: 'Tool not found' };
    }

    if (tool.user_profile_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Generate new API key
    const newApiKey = generateApiKey();

    // Store the new key
    const storeResult = await storeApiKey(toolId, newApiKey);

    if (!storeResult.success) {
      return { success: false, error: storeResult.error };
    }

    // Log the regeneration
    logApiKeyRegeneration({
      toolId,
      toolName: tool.name,
      userId,
    });

    return {
      success: true,
      apiKey: newApiKey,
    };
  } catch (error) {
    console.error('Error in regenerateApiKey:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Deactivate an API key
 */
export async function deactivateApiKey(
  toolId: string,
  userId: string
): Promise<ApiKeyStorageResult> {
  try {
    const supabase = await createServerClient();

    // Verify tool belongs to user
    const { data: tool } = await supabase
      .from('tools')
      .select('user_profile_id')
      .eq('id', toolId)
      .single();

    if (!tool || tool.user_profile_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Deactivate the key
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('tool_id', toolId);

    if (error) {
      console.error('Error deactivating API key:', error);
      return { success: false, error: 'Failed to deactivate API key' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deactivateApiKey:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyUsage(
  toolId: string,
  userId: string
): Promise<{
  success: boolean;
  data?: {
    lastUsedAt: string | null;
    createdAt: string;
    isActive: boolean;
    usageCount?: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    // Verify tool belongs to user
    const { data: tool } = await supabase
      .from('tools')
      .select('user_profile_id')
      .eq('id', toolId)
      .single();

    if (!tool || tool.user_profile_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get API key info
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select('last_used_at, created_at, is_active')
      .eq('tool_id', toolId)
      .single();

    if (error || !apiKey) {
      return { success: false, error: 'API key not found' };
    }

    // Get usage count
    const { count } = await supabase
      .from('credit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('tool_id', toolId);

    return {
      success: true,
      data: {
        lastUsedAt: apiKey.last_used_at,
        createdAt: apiKey.created_at,
        isActive: apiKey.is_active,
        usageCount: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getApiKeyUsage:', error);
    return { success: false, error: 'Internal server error' };
  }
}

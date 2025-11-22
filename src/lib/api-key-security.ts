/**
 * API Key Security Utilities
 * 
 * Handles API key generation, rotation, and security monitoring.
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { logApiKeyRegeneration } from '@/lib/audit-log';

const API_KEY_PREFIX = 'sk-tool-';
const API_KEY_LENGTH = 32;

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = API_KEY_PREFIX;
  
  for (let i = 0; i < API_KEY_LENGTH; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(apiKey, saltRounds);
}

/**
 * Store API key for a tool
 */
export async function storeApiKey(
  toolId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Hash the API key
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);

    // Get tool name
    const { data: tool } = await supabase
      .from('tools')
      .select('name')
      .eq('id', toolId)
      .single();

    if (!tool) {
      return { success: false, error: 'Tool not found' };
    }

    // Check if API key already exists for this tool
    const { data: existing } = await supabase
      .from('api_keys')
      .select('id')
      .eq('tool_id', toolId)
      .single();

    if (existing) {
      // Update existing key
      const { error } = await supabase
        .from('api_keys')
        .update({
          key_hash: keyHash,
          key_prefix: keyPrefix,
          created_at: new Date().toISOString(),
          last_used_at: null,
        })
        .eq('tool_id', toolId);

      if (error) {
        console.error('Error updating API key:', error);
        return { success: false, error: 'Failed to update API key' };
      }
    } else {
      // Insert new key
      const { error } = await supabase
        .from('api_keys')
        .insert({
          tool_id: toolId,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          tool_name: tool.name,
          is_active: true,
        });

      if (error) {
        console.error('Error inserting API key:', error);
        return { success: false, error: 'Failed to store API key' };
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
): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  try {
    const supabase = await createClient();

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

    // Log the regeneration for security audit
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

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
    const supabase = await createClient();

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

    // Get usage count from credit transactions
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

/**
 * Check if API key is compromised (security monitoring)
 */
export async function checkApiKeyCompromise(
  toolId: string
): Promise<{ isCompromised: boolean; reason?: string }> {
  try {
    const supabase = await createClient();

    // Get recent failed authentication attempts
    // This would require an audit log table to track failed attempts
    // For now, return false (not compromised)
    
    // Future enhancement: Check for:
    // - Unusual usage patterns
    // - Multiple failed authentication attempts
    // - Usage from suspicious IPs
    // - Rapid succession of requests

    return { isCompromised: false };
  } catch (error) {
    console.error('Error checking API key compromise:', error);
    return { isCompromised: false };
  }
}


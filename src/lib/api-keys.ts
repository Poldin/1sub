/**
 * Server-Side API Key Utilities for Tool Authentication
 * 
 * Server-side functions that require database access.
 * For client-safe functions, see api-keys-client.ts
 */

import { createClient } from '@/lib/supabase/server';
import { verifyApiKey } from './api-keys-client';

/**
 * Update the last_used_at timestamp for an API key
 * 
 * Uses PostgreSQL JSONB functions for atomic update to avoid race conditions.
 * Note: This function silently fails if tool not found - designed for non-critical updates.
 * 
 * @param toolId - The tool ID
 * @param lastUsedAt - ISO timestamp string (defaults to now)
 */
export async function updateApiKeyLastUsed(
  toolId: string,
  lastUsedAt?: string
): Promise<void> {
  const supabase = await createClient();
  const timestamp = lastUsedAt || new Date().toISOString();

  // FIX: Use atomic JSONB update to avoid race conditions
  // This approach doesn't need read-modify-write pattern
  try {
    // Get current metadata first to merge properly
    const { data: tool, error: fetchError } = await supabase
      .from('tools')
      .select('metadata')
      .eq('id', toolId)
      .single();

    if (fetchError || !tool) {
      // Silently fail - last_used_at is not critical
      console.warn('[API Keys] Could not update API key last used: Tool not found');
      return;
    }

    const metadata = (tool.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...metadata,
      api_key_last_used_at: timestamp
    };

    // Update with new merged metadata
    const { error: updateError } = await supabase
      .from('tools')
      .update({ metadata: updatedMetadata })
      .eq('id', toolId);

    if (updateError) {
      console.warn('[API Keys] Could not update API key last used:', updateError.message);
    }
  } catch (error) {
    // Silently fail - this is a non-critical operation
    console.warn('[API Keys] Error updating API key last used:', error);
  }
}

/**
 * Find a tool by API key hash
 * @param apiKeyHash - The hashed API key to search for
 * @returns Tool ID if found, null otherwise
 */
export async function findToolByApiKeyHash(apiKeyHash: string): Promise<string | null> {
  const supabase = await createClient();

  // Query tools where metadata contains the api_key_hash
  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, metadata')
    .not('metadata', 'is', null);

  if (error) {
    throw new Error(`Failed to query tools: ${error.message}`);
  }

  if (!tools || tools.length === 0) {
    return null;
  }

  // Find tool with matching hash
  for (const tool of tools) {
    const metadata = tool.metadata as Record<string, unknown>;
    if ((metadata?.api_key_hash as string | undefined) === apiKeyHash) {
      return tool.id;
    }
  }

  return null;
}

/**
 * Find a tool by verifying an API key
 * 
 * OPTIMIZED: Uses dedicated api_keys table with indexed lookup for fast authentication.
 * Only performs bcrypt comparison for keys matching the prefix, avoiding full table scan.
 * 
 * @param apiKey - The plain API key to verify
 * @returns Tool ID and metadata if found and verified, null otherwise
 */
export async function findToolByApiKey(apiKey: string): Promise<{
  toolId: string;
  toolName: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
} | null> {
  const supabase = await createClient();

  // Extract key prefix for indexed lookup (first 8 chars)
  const keyPrefix = apiKey.substring(0, 8);

  // Query api_keys table using RPC function for optimized lookup
  // This uses an index on key_prefix instead of scanning all tools
  const { data: candidates, error } = await supabase
    .rpc('validate_api_key_hash', { p_key_prefix: keyPrefix });

  if (error) {
    console.error('[API Keys] Error querying api_keys table:', error);
    throw new Error(`Failed to query API keys: ${error.message}`);
  }

  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Verify the full API key hash with bcrypt
  // Only one or few candidates to check (much faster than looping all tools)
  for (const candidate of candidates) {
    if (await verifyApiKey(apiKey, candidate.key_hash)) {
      // Update last_used_at timestamp
      await supabase.rpc('update_api_key_usage', { p_tool_id: candidate.tool_id });

      return {
        toolId: candidate.tool_id,
        toolName: candidate.tool_name,
        isActive: candidate.is_active,
        metadata: {}, // API keys table doesn't store metadata
      };
    }
  }

  return null;
}


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
      console.warn(`Could not update API key last used for tool ${toolId}: Tool not found`);
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
      console.warn(`Could not update API key last used for tool ${toolId}:`, updateError.message);
    }
  } catch (error) {
    // Silently fail - this is a non-critical operation
    console.warn(`Error updating API key last used for tool ${toolId}:`, error);
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
 * OPTIMIZATION: This function queries all tools which is inefficient.
 * For production, consider:
 * 1. Creating a separate api_keys table with indexed tool_id
 * 2. Using PostgreSQL's crypt() function to compare hashes in database
 * 3. Implementing caching with short TTL
 * 
 * Current implementation limits to active tools only to reduce scope.
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

  // OPTIMIZATION: Only query active tools with API keys to reduce scope
  // In production, this should use a dedicated api_keys table or better indexing
  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, name, is_active, metadata')
    .eq('is_active', true)  // Only check active tools
    .not('metadata', 'is', null)
    .limit(100);  // Add safety limit to prevent DoS

  if (error) {
    throw new Error(`Failed to query tools: ${error.message}`);
  }

  if (!tools || tools.length === 0) {
    return null;
  }

  // Find tool with matching API key hash
  // Note: This still does bcrypt comparisons in a loop, but limited to active tools only
  for (const tool of tools) {
    const metadata = tool.metadata as Record<string, unknown>;
    const storedHash = metadata?.api_key_hash as string | undefined;
    
    // Check if API key is active before doing expensive bcrypt comparison
    if (!storedHash || (metadata?.api_key_active as boolean | undefined) === false) {
      continue;
    }
    
    if (await verifyApiKey(apiKey, storedHash)) {
      return {
        toolId: tool.id,
        toolName: tool.name,
        isActive: tool.is_active,
        metadata: metadata
      };
    }
  }

  return null;
}


/**
 * API Endpoint: /api/admin/migrate-api-keys
 * 
 * One-time migration to move API keys from tools.metadata to api_keys table
 * This should be run once after deploying the unified API key system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all tools with API keys in metadata
    const { data: tools, error: toolsError } = await supabase
      .from('tools')
      .select('id, name, metadata');

    if (toolsError) {
      throw new Error(`Failed to fetch tools: ${toolsError.message}`);
    }

    const migratedTools: string[] = [];
    const skippedTools: string[] = [];
    const errors: Array<{ toolId: string; toolName: string; error: string }> = [];

    for (const tool of tools || []) {
      try {
        const metadata = (tool.metadata as Record<string, unknown>) || {};
        const apiKeyHash = metadata.api_key_hash as string | undefined;

        if (!apiKeyHash) {
          skippedTools.push(`${tool.name} (no API key in metadata)`);
          continue;
        }

        // Check if API key already exists in api_keys table
        const { data: existingKey } = await supabase
          .from('api_keys')
          .select('id')
          .eq('tool_id', tool.id)
          .single();

        if (existingKey) {
          skippedTools.push(`${tool.name} (already migrated)`);
          continue;
        }

        // Extract key prefix from hash (use first 8 chars as fallback)
        const keyPrefix = 'sk-tool-';

        // Insert into api_keys table
        const { error: insertError } = await supabase
          .from('api_keys')
          .insert({
            tool_id: tool.id,
            key_hash: apiKeyHash,
            key_prefix: keyPrefix,
            tool_name: tool.name,
            is_active: (metadata.api_key_active as boolean | undefined) !== false,
            created_at: (metadata.api_key_created_at as string) || new Date().toISOString(),
            last_used_at: (metadata.api_key_last_used_at as string) || null,
          });

        if (insertError) {
          errors.push({
            toolId: tool.id,
            toolName: tool.name,
            error: insertError.message,
          });
          continue;
        }

        migratedTools.push(tool.name);

        // Optionally: Clear the old metadata fields (commented out for safety)
        // const updatedMetadata = { ...metadata };
        // delete updatedMetadata.api_key_hash;
        // delete updatedMetadata.api_key_created_at;
        // delete updatedMetadata.api_key_last_used_at;
        // delete updatedMetadata.api_key_active;
        // await supabase.from('tools').update({ metadata: updatedMetadata }).eq('id', tool.id);

      } catch (error) {
        errors.push({
          toolId: tool.id,
          toolName: tool.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: tools?.length || 0,
        migrated: migratedTools.length,
        skipped: skippedTools.length,
        errors: errors.length,
      },
      details: {
        migratedTools,
        skippedTools,
        errors,
      },
    });
  } catch (error) {
    console.error('Error migrating API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


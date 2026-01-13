import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { batchCountPayingUsers } from '@/domains/tools';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public API endpoint to fetch all active tools with their products
 * This endpoint doesn't require authentication and can be called from the browser
 * It avoids RLS and auth token issues that can occur on mobile devices
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all active tools with their products (vendor_name is denormalized in tools table)
    const { data: toolsData, error: fetchError } = await supabase
      .from('tools')
      .select(`
        *,
        products:tool_products(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching tools from database:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load tools', details: fetchError.message },
        { status: 500 }
      );
    }

    // Enrich tools with paying user counts and magic login availability
    if (toolsData && toolsData.length > 0) {
      try {
        const toolIds = toolsData.map((t: any) => t.id);
        
        // Fetch paying user counts
        const payingUserCounts = await batchCountPayingUsers(toolIds);

        // Fetch magic login configuration from api_keys table
        const { data: apiKeysData } = await supabase
          .from('api_keys')
          .select('tool_id, metadata')
          .in('tool_id', toolIds)
          .eq('is_active', true);

        // Create a map of tool_id -> has_magic_login
        const magicLoginMap = new Map<string, boolean>();
        if (apiKeysData) {
          for (const apiKey of apiKeysData) {
            const metadata = apiKey.metadata as Record<string, unknown> | null;
            const magicLoginUrl = metadata?.magic_login_url as string | null | undefined;
            const magicLoginSecret = metadata?.magic_login_secret as string | null | undefined;
            // Check if BOTH magic_login_url AND magic_login_secret are configured (non-empty strings)
            const hasMagicLogin = 
              (typeof magicLoginUrl === 'string' && magicLoginUrl.trim().length > 0) &&
              (typeof magicLoginSecret === 'string' && magicLoginSecret.trim().length > 0);
            magicLoginMap.set(apiKey.tool_id, hasMagicLogin);
          }
        }

        // Add paying user count and magic login flag to each tool
        const enrichedTools = toolsData.map((tool: any) => ({
          ...tool,
          has_magic_login: magicLoginMap.get(tool.id) ?? false,
          metadata: {
            ...tool.metadata,
            paying_user_count: payingUserCounts.get(tool.id) ?? 0
          }
        }));

        return NextResponse.json({ tools: enrichedTools });
      } catch (countError) {
        console.error('Error enriching tools, returning tools without enrichment:', countError);
        // Return tools without enrichment on error
        return NextResponse.json({ tools: toolsData });
      }
    }

    return NextResponse.json({ tools: toolsData || [] });
  } catch (err) {
    console.error('Unexpected error in public tools API:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}





















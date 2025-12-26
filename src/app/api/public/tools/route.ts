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

    // Fetch all active tools with their products and vendor info
    const { data: toolsData, error: fetchError } = await supabase
      .from('tools')
      .select(`
        *,
        products:tool_products(*),
        vendor:user_profiles!tools_user_profile_id_fkey(
          id,
          full_name
        )
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

    // Enrich tools with paying user counts for dynamic phase calculation
    if (toolsData && toolsData.length > 0) {
      try {
        const toolIds = toolsData.map((t: any) => t.id);
        const payingUserCounts = await batchCountPayingUsers(toolIds);

        // Add paying user count to each tool's metadata
        const enrichedTools = toolsData.map((tool: any) => ({
          ...tool,
          metadata: {
            ...tool.metadata,
            paying_user_count: payingUserCounts.get(tool.id) ?? 0
          }
        }));

        return NextResponse.json({ tools: enrichedTools });
      } catch (countError) {
        console.error('Error counting paying users, returning tools without counts:', countError);
        // Return tools without counts on error (will default to Alpha phase)
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





















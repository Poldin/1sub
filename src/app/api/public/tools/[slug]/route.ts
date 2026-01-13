import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { countPayingUsers } from '@/domains/tools';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public API endpoint to fetch a single tool by slug with its products
 * This endpoint doesn't require authentication
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the tool by slug with its products
    const { data: toolData, error: fetchError } = await supabase
      .from('tools')
      .select(`
        *,
        products:tool_products(*)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { error: 'Tool not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching tool from database:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load tool', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!toolData) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Enrich tool with paying user count and magic login availability
    try {
      // Fetch paying user count
      const payingUserCount = await countPayingUsers(toolData.id);

      // Fetch magic login configuration from api_keys table
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('metadata')
        .eq('tool_id', toolData.id)
        .eq('is_active', true)
        .maybeSingle();

      // Check if BOTH magic_login_url AND magic_login_secret are configured
      const metadata = apiKeyData?.metadata as Record<string, unknown> | null;
      const magicLoginUrl = metadata?.magic_login_url as string | null | undefined;
      const magicLoginSecret = metadata?.magic_login_secret as string | null | undefined;
      const hasMagicLogin = 
        (typeof magicLoginUrl === 'string' && magicLoginUrl.trim().length > 0) &&
        (typeof magicLoginSecret === 'string' && magicLoginSecret.trim().length > 0);

      // Add paying user count and magic login flag to tool
      const enrichedTool = {
        ...toolData,
        has_magic_login: hasMagicLogin,
        metadata: {
          ...toolData.metadata,
          paying_user_count: payingUserCount
        }
      };

      return NextResponse.json({ tool: enrichedTool });
    } catch (enrichError) {
      console.error('Error enriching tool, returning tool without enrichment:', enrichError);
      // Return tool without enrichment on error
      return NextResponse.json({ tool: toolData });
    }
  } catch (err) {
    console.error('Unexpected error in public tool API:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

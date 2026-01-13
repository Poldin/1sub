import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/infrastructure/database/client';
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

      // Fetch magic login configuration from api_keys table (use service client to bypass RLS)
      const serviceClient = createServiceClient();
      const { data: apiKeyData, error: apiKeyError } = await serviceClient
        .from('api_keys')
        .select('metadata')
        .eq('tool_id', toolData.id)
        .maybeSingle();

      if (apiKeyError) {
        console.log('[API /api/public/tools/[slug]] Error fetching api_keys:', apiKeyError);
      }

      // Check if BOTH magic_login_url AND magic_login_secret are configured
      const metadata = apiKeyData?.metadata as Record<string, unknown> | null;
      const magicLoginUrl = metadata?.magic_login_url as string | null | undefined;
      const magicLoginSecret = metadata?.magic_login_secret as string | null | undefined;
      const hasMagicLogin = 
        (typeof magicLoginUrl === 'string' && magicLoginUrl.trim().length > 0) &&
        (typeof magicLoginSecret === 'string' && magicLoginSecret.trim().length > 0);

      // Log magic login check
      console.log('[API /api/public/tools/[slug]] Magic login check:', {
        toolId: toolData.id,
        toolName: toolData.name,
        hasApiKey: !!apiKeyData,
        hasMetadata: !!metadata,
        magicLoginUrl: magicLoginUrl ? 'present' : 'missing',
        magicLoginSecret: magicLoginSecret ? 'present' : 'missing',
        hasUrl: typeof magicLoginUrl === 'string' && magicLoginUrl.trim().length > 0,
        hasSecret: typeof magicLoginSecret === 'string' && magicLoginSecret.trim().length > 0,
        hasMagicLogin,
      });

      // Fetch review statistics
      const { data: reviews, error: reviewsError } = await serviceClient
        .from('tool_reviews')
        .select('stars')
        .eq('tool_id', toolData.id);

      let reviewCount = 0;
      let reviewAverage = 0;

      if (!reviewsError && reviews && reviews.length > 0) {
        reviewCount = reviews.length;
        const totalStars = reviews.reduce((sum, review) => sum + Number(review.stars), 0);
        reviewAverage = Math.round((totalStars / reviewCount) * 10) / 10; // Round to 1 decimal
      }

      // Fetch magic login usage statistics
      const { count: magicLoginCount, error: magicLoginCountError } = await serviceClient
        .from('magic_link_usage')
        .select('*', { count: 'exact', head: true })
        .eq('tool_id', toolData.id);

      if (magicLoginCountError) {
        console.log('[API /api/public/tools/[slug]] Error fetching magic login count:', magicLoginCountError);
      }

      // Fetch unique users who used magic login
      const { data: uniqueUsers, error: uniqueUsersError } = await serviceClient
        .from('magic_link_usage')
        .select('user_id')
        .eq('tool_id', toolData.id);

      if (uniqueUsersError) {
        console.log('[API /api/public/tools/[slug]] Error fetching unique magic login users:', uniqueUsersError);
      }

      // Count unique user_ids
      const uniqueUserIds = new Set(uniqueUsers?.map(u => u.user_id) || []);
      const uniqueMagicLoginUsers = uniqueUserIds.size;

      // Add paying user count and magic login flag to tool
      const enrichedTool = {
        ...toolData,
        has_magic_login: hasMagicLogin,
        review_count: reviewCount,
        review_average: reviewAverage,
        magic_login_count: magicLoginCount || 0,
        magic_login_users: uniqueMagicLoginUsers,
        metadata: {
          ...toolData.metadata,
          paying_user_count: payingUserCount
        }
      };

      // Log enriched tool
      console.log('[API /api/public/tools/[slug]] Tool enriched:', {
        id: enrichedTool.id,
        name: enrichedTool.name,
        slug: enrichedTool.slug,
        has_magic_login: enrichedTool.has_magic_login,
      });

      return NextResponse.json({ tool: enrichedTool });
    } catch (enrichError) {
      console.error('Error enriching tool, returning tool without enrichment:', enrichError);
      // Return tool without enrichment on error, but ensure has_magic_login is present
      const fallbackTool = {
        ...toolData,
        has_magic_login: false, // Ensure field is present even on error
      };
      
      console.log('[API /api/public/tools/[slug]] Tool returned (error case):', {
        id: fallbackTool.id,
        name: fallbackTool.name,
        has_magic_login: fallbackTool.has_magic_login,
      });
      
      return NextResponse.json({ tool: fallbackTool });
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

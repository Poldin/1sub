import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/infrastructure/database/client';
import { batchCountPayingUsers } from '@/domains/tools';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public API endpoint to fetch all active tools with their products
 * This endpoint doesn't require authentication and can be called from the browser
 * It avoids RLS and auth token issues that can occur on mobile devices
 * 
 * Query Parameters:
 * - is_seo: 'true' | 'false' - Filter tools by is_seo field
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const isSeoParam = searchParams.get('is_seo');
    
    // Log query parameters
    console.log('[API /api/public/tools] Query params:', { is_seo: isSeoParam });

    // Build query
    let query = supabase
      .from('tools')
      .select(`
        *,
        products:tool_products(*)
      `)
      .eq('is_active', true);
    
    // Apply is_seo filter if specified
    if (isSeoParam === 'true') {
      query = query.eq('is_SEO', true);
    } else if (isSeoParam === 'false') {
      query = query.eq('is_SEO', false);
    }
    
    // Order by created_at
    query = query.order('created_at', { ascending: false });

    // Execute query
    const { data: toolsData, error: fetchError } = await query;

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

        // Fetch magic login configuration from api_keys table (use service client to bypass RLS)
        const serviceClient = createServiceClient();
        const { data: apiKeysData, error: apiKeysError } = await serviceClient
          .from('api_keys')
          .select('tool_id, metadata')
          .in('tool_id', toolIds);

        if (apiKeysError) {
          console.log('[API /api/public/tools] Error fetching api_keys:', apiKeysError);
        }

        console.log('[API /api/public/tools] Found api_keys:', apiKeysData?.length || 0);

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
            
            // Log each check
            console.log('[API /api/public/tools] Magic login check for tool:', {
              tool_id: apiKey.tool_id,
              hasUrl: typeof magicLoginUrl === 'string' && magicLoginUrl.trim().length > 0,
              hasSecret: typeof magicLoginSecret === 'string' && magicLoginSecret.trim().length > 0,
              hasMagicLogin
            });
          }
        }

        // Fetch review statistics for all tools
        const { data: allReviews, error: reviewsError } = await serviceClient
          .from('tool_reviews')
          .select('tool_id, stars')
          .in('tool_id', toolIds);

        if (reviewsError) {
          console.log('[API /api/public/tools] Error fetching reviews:', reviewsError);
        }

        // Create maps for review statistics
        const reviewCountMap = new Map<string, number>();
        const reviewAverageMap = new Map<string, number>();

        if (allReviews && allReviews.length > 0) {
          // Group reviews by tool_id
          const reviewsByTool = new Map<string, number[]>();
          for (const review of allReviews) {
            if (!reviewsByTool.has(review.tool_id)) {
              reviewsByTool.set(review.tool_id, []);
            }
            reviewsByTool.get(review.tool_id)!.push(Number(review.stars));
          }

          // Calculate count and average for each tool
          for (const [toolId, stars] of reviewsByTool.entries()) {
            reviewCountMap.set(toolId, stars.length);
            const average = stars.reduce((sum, s) => sum + s, 0) / stars.length;
            reviewAverageMap.set(toolId, Math.round(average * 10) / 10);
          }
        }

        // Fetch magic login usage counts for all tools
        const { data: magicLoginUsages, error: magicLoginUsageError } = await serviceClient
          .from('magic_link_usage')
          .select('tool_id, user_id')
          .in('tool_id', toolIds);

        if (magicLoginUsageError) {
          console.log('[API /api/public/tools] Error fetching magic login usage:', magicLoginUsageError);
        }

        // Count magic logins per tool and unique users per tool
        const magicLoginCountMap = new Map<string, number>();
        const magicLoginUsersMap = new Map<string, Set<string>>();

        if (magicLoginUsages && magicLoginUsages.length > 0) {
          for (const usage of magicLoginUsages) {
            // Count total logins
            const currentCount = magicLoginCountMap.get(usage.tool_id) || 0;
            magicLoginCountMap.set(usage.tool_id, currentCount + 1);

            // Track unique users
            if (!magicLoginUsersMap.has(usage.tool_id)) {
              magicLoginUsersMap.set(usage.tool_id, new Set());
            }
            magicLoginUsersMap.get(usage.tool_id)!.add(usage.user_id);
          }
        }

        // Add paying user count and magic login flag to each tool
        const enrichedTools = toolsData.map((tool: any) => ({
          ...tool,
          has_magic_login: magicLoginMap.get(tool.id) ?? false,
          review_count: reviewCountMap.get(tool.id) || 0,
          review_average: reviewAverageMap.get(tool.id) || 0,
          magic_login_count: magicLoginCountMap.get(tool.id) || 0,
          magic_login_users: magicLoginUsersMap.get(tool.id)?.size || 0,
          metadata: {
            ...tool.metadata,
            paying_user_count: payingUserCounts.get(tool.id) ?? 0
          }
        }));

        // Log response data
        console.log('[API /api/public/tools] Returning tools:', {
          count: enrichedTools.length,
          tools: enrichedTools.map((t: any) => ({ 
            id: t.id, 
            name: t.name, 
            is_SEO: t.is_SEO,
            is_active: t.is_active,
            has_magic_login: t.has_magic_login
          }))
        });

        return NextResponse.json({ tools: enrichedTools });
      } catch (countError) {
        console.error('Error enriching tools, returning tools without enrichment:', countError);
        // Return tools without enrichment on error
        
        // Log response data (without enrichment)
        console.log('[API /api/public/tools] Returning tools without enrichment:', {
          count: toolsData.length,
          tools: toolsData.map((t: any) => ({ 
            id: t.id, 
            name: t.name, 
            is_SEO: t.is_SEO,
            is_active: t.is_active 
          }))
        });
        
        return NextResponse.json({ tools: toolsData });
      }
    }

    // Log empty response (no tools found)
    console.log('[API /api/public/tools] Returning empty tools array');

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





















import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a vendor
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profile?.role !== 'vendor') {
      return NextResponse.json(
        { error: 'Forbidden - Vendor access required' },
        { status: 403 }
      );
    }

    // Get user IDs from request body
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    // Fetch user emails from auth.users using service role
    const emailMap: Record<string, string> = {};

    // Create admin client with service role key
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {}
      }
    );

    // Fetch emails from auth.users using admin access
    // Note: We need to use Supabase Admin API or list users
    // For now, return user ID prefixes as placeholder
    // TODO: Implement proper email fetching from auth.users
    userIds.forEach((userId: string) => {
      emailMap[userId] = `user-${userId.slice(0, 8)}`; // Placeholder until proper implementation
    });

    return NextResponse.json({ emails: emailMap });
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


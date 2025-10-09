import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // For debugging - get user ID from query parameter
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user profile with role using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role || 'user'
    });
  } catch (error) {
    console.error('Error in user profile GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

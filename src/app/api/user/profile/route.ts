import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getCurrentBalance } from '@/lib/credits-service';

export async function GET() {
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

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, role, is_vendor')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Get current balance using unified credit service
    // This uses balance_after from latest transaction for consistency and performance
    const totalCredits = await getCurrentBalance(authUser.id);
    
    // Sensitive user data removed from logs

    return NextResponse.json({
      id: authUser.id,
      email: authUser.email,
      fullName: profile.full_name,
      role: profile.role,
      isVendor: profile.is_vendor,
      credits: totalCredits,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


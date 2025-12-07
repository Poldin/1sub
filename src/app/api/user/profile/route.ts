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
    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, role, is_vendor')
      .eq('id', authUser.id)
      .single();

    // If profile doesn't exist, create a default one
    // PostgREST returns PGRST116 code when no rows are found with .single()
    const isProfileNotFound = profileError && (
      profileError.code === 'PGRST116' ||
      profileError.message?.includes('No rows') ||
      profileError.message?.includes('not found')
    );

    if (isProfileNotFound) {
      // Profile doesn't exist, create a default one
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || null,
          role: 'user',
          is_vendor: false,
        })
        .select('full_name, role, is_vendor')
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        return NextResponse.json(
          { error: 'Failed to create user profile', details: createError.message },
          { status: 500 }
        );
      }

      profile = newProfile;
    } else if (profileError) {
      // Other database errors
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Ensure profile exists (TypeScript guard)
    if (!profile) {
      console.error('Profile is null after fetch/create');
      return NextResponse.json(
        { error: 'User profile not available' },
        { status: 500 }
      );
    }

    // Get current balance using unified credit service
    // This uses user_balances table for consistency and performance
    let totalCredits = 0;
    try {
      totalCredits = await getCurrentBalance(authUser.id);
    } catch (balanceError) {
      // Log the error but don't fail the entire request
      // Return 0 credits if balance fetch fails
      console.error('Error fetching user balance:', balanceError);
      // Continue with 0 credits rather than failing the entire profile fetch
    }
    
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
    // Log detailed error information for debugging
    const errorInfo: Record<string, unknown> = {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
    };
    
    if (error instanceof Error) {
      errorInfo.stack = error.stack;
    }
    
    console.error('Get user profile error:', errorInfo);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}


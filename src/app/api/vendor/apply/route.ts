import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    // Get user profile to fetch full name
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    const body = await request.json();
    const { company, website, description } = body;

    // Validate required fields
    if (!company || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store vendor application in database
    const { createVendorApplication } = await import('@/lib/vendor-management');
    
    const result = await createVendorApplication({
      userId: authUser.id,
      company,
      website,
      description,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    console.log('Vendor application created and approved:', {
      applicationId: result.application?.id,
      userId: authUser.id,
      company,
    });

    return NextResponse.json({
      success: true,
      message: 'You are now a vendor! You can access the vendor dashboard immediately.',
    });
  } catch (error) {
    console.error('Vendor apply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


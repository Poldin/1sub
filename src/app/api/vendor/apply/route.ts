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

    console.log('Vendor application created:', {
      applicationId: result.application?.id,
      userId: authUser.id,
      company,
    });

    // Application successfully created and stored in database
    // 1. Store the application in a database table (vendor_applications)
    // 2. Send a notification email to administrators
    // 3. Send a confirmation email to the applicant
    // 4. Create a review/approval workflow

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
    });
  } catch (error) {
    console.error('Vendor apply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


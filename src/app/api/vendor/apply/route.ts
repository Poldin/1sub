import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, website, description } = body;

    // Validate required fields
    if (!name || !email || !company || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: Store vendor application in database
    // For now, we'll just log it and return success
    console.log('Vendor application received:', {
      name,
      email,
      company,
      website,
      description,
      timestamp: new Date().toISOString(),
    });

    // In a production environment, you would:
    // 1. Store the application in a database table (e.g., vendor_applications)
    // 2. Send a notification email to administrators
    // 3. Send a confirmation email to the applicant

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


/**
 * API Endpoint: /api/vendor/applications
 * 
 * CRUD operations for vendor applications
 * - GET: Retrieve user's application status
 * - POST: Create new vendor application
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createVendorApplication,
  getVendorApplicationByUserId,
} from '@/lib/vendor-management';

/**
 * GET - Retrieve user's vendor application
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's application
    const application = await getVendorApplicationByUserId(user.id);

    if (!application) {
      return NextResponse.json(
        { error: 'No application found', has_application: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      has_application: true,
      application,
    });
  } catch (error) {
    console.error('Error fetching vendor application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new vendor application
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { company, website, description } = body;

    // Validate required fields
    if (!company || !description) {
      return NextResponse.json(
        { error: 'Company and description are required' },
        { status: 400 }
      );
    }

    // Create application
    const result = await createVendorApplication({
      userId: user.id,
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

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: result.application,
    });
  } catch (error) {
    console.error('Error creating vendor application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


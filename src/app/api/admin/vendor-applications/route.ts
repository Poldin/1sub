/**
 * API Endpoint: /api/admin/vendor-applications
 * 
 * Admin endpoints for managing vendor applications
 * - GET: List all vendor applications with filters
 * - PATCH: Process application (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAllVendorApplications,
  processVendorApplication,
} from '@/lib/vendor-management';

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}

/**
 * GET - List all vendor applications (admin only)
 */
export async function GET(request: NextRequest) {
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

    // Check if user is admin
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch applications
    const result = await getAllVendorApplications({
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      applications: result.applications,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching vendor applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Process vendor application (admin only)
 */
export async function PATCH(request: NextRequest) {
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

    // Check if user is admin
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { application_id, new_status, rejection_reason } = body;

    // Validate required fields
    if (!application_id || !new_status) {
      return NextResponse.json(
        { error: 'Application ID and new status are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['approved', 'rejected', 'under_review'].includes(new_status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: approved, rejected, or under_review' },
        { status: 400 }
      );
    }

    // If rejecting, require rejection reason
    if (new_status === 'rejected' && !rejection_reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting an application' },
        { status: 400 }
      );
    }

    // Process application
    const result = await processVendorApplication({
      applicationId: application_id,
      newStatus: new_status,
      reviewerId: user.id,
      rejectionReason: rejection_reason,
    });

    if (!result.success) {
      console.error('Failed to process vendor application:', {
        applicationId: application_id,
        newStatus: new_status,
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error || 'Failed to process application' },
        { status: 400 }
      );
    }

    console.log('Successfully processed vendor application:', {
      applicationId: application_id,
      newStatus: new_status,
      message: result.message,
    });

    return NextResponse.json({
      success: true,
      message: result.message || 'Application processed successfully',
    });
  } catch (error) {
    console.error('Error processing vendor application:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'An unexpected error occurred while processing the application'
      },
      { status: 500 }
    );
  }
}


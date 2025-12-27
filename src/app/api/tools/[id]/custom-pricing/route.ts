/**
 * API Endpoint: /api/tools/[id]/custom-pricing
 *
 * Handle custom pricing requests from users to vendors
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/infrastructure/database';
import { sendCustomPricingRequest } from '@/lib/email-service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: toolId } = await context.params;
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, message } = await request.json();

    // Get tool and vendor info
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id, name, vendor_id, metadata')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Get vendor profile
    const { data: vendorProfile, error: vendorError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', tool.vendor_id)
      .single();

    if (vendorError || !vendorProfile) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Save request to database
    const { data: pricingRequest, error: insertError } = await supabase
      .from('custom_pricing_requests')
      .insert({
        tool_id: toolId,
        product_id: productId,
        user_id: user.id,
        vendor_id: tool.vendor_id,
        message,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating pricing request:', insertError);
      return NextResponse.json(
        { error: `Failed to create request: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Send email notification to vendor
    const customPricingEmail =
      (tool.metadata as Record<string, unknown>)?.custom_pricing_email ||
      vendorProfile.email;

    const emailResult = await sendCustomPricingRequest({
      vendorEmail: customPricingEmail as string,
      vendorName: vendorProfile.full_name || 'there',
      toolName: tool.name,
      userName: userProfile.full_name || 'A user',
      userEmail: userProfile.email!,
      userMessage: message,
    });

    if (!emailResult.success) {
      console.warn('Failed to send email notification:', emailResult.error);
      // Don't fail the request if email fails - request was still created
    }

    return NextResponse.json({
      success: true,
      message: 'Your request has been sent to the vendor',
      request: pricingRequest,
    });
  } catch (error) {
    console.error('Error handling custom pricing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

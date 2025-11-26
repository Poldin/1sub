import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@1sub.io';

/**
 * Generate a 6-digit OTP and send it via email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkout_id } = body;

    if (!checkout_id) {
      return NextResponse.json(
        { error: 'Checkout ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch checkout record
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('id', checkout_id)
      .single();

    if (checkoutError || !checkout) {
      return NextResponse.json(
        { error: 'Checkout not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (checkout.user_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to process this checkout' },
        { status: 403 }
      );
    }

    // Check if checkout is already completed
    const metadata = checkout.metadata as Record<string, unknown>;
    if (metadata?.status === 'completed') {
      return NextResponse.json(
        { error: 'Checkout already completed' },
        { status: 400 }
      );
    }

    // Get user email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to checkout record
    const { error: updateError } = await supabase
      .from('checkouts')
      .update({ otp })
      .eq('id', checkout_id);

    if (updateError) {
      console.error('Error saving OTP:', updateError);
      return NextResponse.json(
        { error: 'Failed to save OTP' },
        { status: 500 }
      );
    }

    // Send OTP via email
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      // In development, return OTP in response for testing
      return NextResponse.json({
        success: true,
        message: 'OTP generated (email not configured)',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    }

    const toolName = (metadata.tool_name as string) || 'tool';
    const creditAmount = checkout.credit_amount || 0;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [user.email],
      subject: 'Your checkout verification code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Checkout Verification Code</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3ecf8e 0%, #2dd4bf 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Verification Code</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-top: 0;">Hi there,</p>
              
              <p style="font-size: 16px;">You're completing a purchase for <strong>${toolName}</strong> (${creditAmount} credits).</p>
              
              <p style="font-size: 16px;">Please use the following verification code to confirm your payment:</p>
              
              <div style="background: #f3f4f6; border: 2px dashed #3ecf8e; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3ecf8e; font-family: monospace;">
                  ${otp}
                </div>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Best regards,<br>
                The 1sub Team
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Error sending OTP email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send OTP email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    });

  } catch (error) {
    console.error('Generate OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


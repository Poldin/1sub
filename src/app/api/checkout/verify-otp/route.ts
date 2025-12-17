import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// OTP expiration time (must match generate-otp route)
const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Verify OTP for checkout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkout_id, otp } = body;

    if (!checkout_id || !otp) {
      return NextResponse.json(
        { error: 'Checkout ID and OTP are required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits', code: 'INVALID_OTP_FORMAT' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
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
        { error: 'Checkout not found', code: 'CHECKOUT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (checkout.user_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to process this checkout', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }

    // Check if checkout is already completed
    const metadata = (checkout.metadata as Record<string, unknown>) || {};
    if (metadata?.status === 'completed') {
      return NextResponse.json(
        { error: 'Checkout already completed', code: 'CHECKOUT_COMPLETED' },
        { status: 400 }
      );
    }

    // Verify OTP exists
    if (!checkout.otp) {
      return NextResponse.json(
        { error: 'No OTP found for this checkout. Please generate a new one.', code: 'NO_OTP' },
        { status: 400 }
      );
    }

    // Check OTP expiration
    const otpCreatedAt = metadata?.otp_created_at as number | undefined;
    if (otpCreatedAt) {
      const now = Date.now();
      const otpAge = now - otpCreatedAt;

      if (otpAge > OTP_EXPIRATION_MS) {
        console.warn('OTP expired:', {
          checkoutId: checkout_id,
          userId: authUser.id,
          otpAge: Math.round(otpAge / 1000),
          expirationSeconds: OTP_EXPIRATION_MS / 1000,
        });

        // Clear expired OTP from database
        await supabase
          .from('checkouts')
          .update({
            otp: null,
            metadata: {
              ...metadata,
              otp_created_at: null,
            },
          })
          .eq('id', checkout_id);

        return NextResponse.json(
          {
            error: 'OTP has expired. Please request a new verification code.',
            code: 'OTP_EXPIRED',
          },
          { status: 400 }
        );
      }
    }

    // Verify OTP matches
    if (checkout.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP. Please try again.', code: 'INVALID_OTP' },
        { status: 400 }
      );
    }

    // OTP verified successfully - clear it from database for security
    await supabase
      .from('checkouts')
      .update({
        otp: null,
        metadata: {
          ...metadata,
          otp_created_at: null,
          otp_verified_at: Date.now(),
        },
      })
      .eq('id', checkout_id);

    console.log('OTP verified successfully:', {
      checkoutId: checkout_id,
      userId: authUser.id,
    });

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


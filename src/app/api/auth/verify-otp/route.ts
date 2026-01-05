import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { notifyUserRegistered } from '@/domains/webhooks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, fullName, toolId, registrationToken } = body;

    if (!email || !token || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User verification failed' },
        { status: 400 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        full_name: fullName,
        role: 'user',
        is_vendor: false,
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // If this is a co-branded registration (has toolId), send webhook to vendor
    if (toolId && registrationToken) {
      // Validate that the registration token matches the tool
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('tool_id, metadata')
        .eq('tool_id', toolId)
        .eq('is_active', true)
        .single();

      if (apiKeyData) {
        const metadata = apiKeyData.metadata as Record<string, unknown> | null;
        if (metadata?.registration_token === registrationToken) {
          // Send user.registered webhook (non-blocking)
          notifyUserRegistered(toolId, data.user.id, email, fullName);
          console.log(`[Auth] Sent user.registered webhook for tool ${toolId}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified and profile created successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


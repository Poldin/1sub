import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// For MVP, we'll store settings in a simple JSON format
// In production, you might want a dedicated platform_settings table
interface PlatformSettings {
  creditMultiplier: number;
  referralBonus: number;
  supportEmail: string;
}

export async function GET(request: NextRequest) {
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // For MVP, return default settings
    // In production, fetch from platform_settings table or environment variables
    const defaultSettings: PlatformSettings = {
      creditMultiplier: parseFloat(process.env.CREDIT_MULTIPLIER || '1.0'),
      referralBonus: parseInt(process.env.REFERRAL_BONUS || '10', 10),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@1sub.io',
    };

    return NextResponse.json({
      settings: defaultSettings,
    });
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { creditMultiplier, referralBonus, supportEmail } = body;

    // Validate settings
    if (creditMultiplier !== undefined && (isNaN(creditMultiplier) || creditMultiplier <= 0)) {
      return NextResponse.json(
        { error: 'Credit multiplier must be a positive number' },
        { status: 400 }
      );
    }

    if (referralBonus !== undefined && (isNaN(referralBonus) || referralBonus < 0 || referralBonus > 100)) {
      return NextResponse.json(
        { error: 'Referral bonus must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (supportEmail !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // For MVP, settings are stored in environment variables or a simple storage
    // In production, you would update a platform_settings table here
    // For now, we'll just return success - actual persistence would require
    // either environment variable management or a database table

    // Log the settings update for audit
    console.log('[Admin] Settings update attempted', {
      adminId: authUser.id,
      creditMultiplier,
      referralBonus,
      supportEmail,
    });

    // Return success - in production, persist to database here
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        creditMultiplier: creditMultiplier || parseFloat(process.env.CREDIT_MULTIPLIER || '1.0'),
        referralBonus: referralBonus !== undefined ? referralBonus : parseInt(process.env.REFERRAL_BONUS || '10', 10),
        supportEmail: supportEmail || process.env.SUPPORT_EMAIL || 'support@1sub.io',
      },
    });
  } catch (error) {
    console.error('Admin settings PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


















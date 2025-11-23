import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { addCredits, subtractCredits } from '@/lib/credits-service';

/**
 * Create a Supabase client with service role permissions for admin operations
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
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
    const { email, amount, reason } = body;

    // Validate required fields
    if (!email || amount === undefined || !reason) {
      return NextResponse.json(
        { error: 'Email, amount, and reason are required' },
        { status: 400 }
      );
    }

    // Get user by email (case-insensitive, trimmed)
    const normalizedEmail = email.trim().toLowerCase();
    
    let targetUser;
    try {
      // Use service role client for admin operations
      const adminClient = createAdminClient();
      const { data: authUsers, error: listUsersError } = await adminClient.auth.admin.listUsers();
      
      if (listUsersError) {
        console.error('Error listing users:', listUsersError);
        return NextResponse.json(
          { error: 'Failed to lookup user. Please check service role configuration.' },
          { status: 500 }
        );
      }

      targetUser = authUsers?.users.find(u => 
        u.email?.toLowerCase().trim() === normalizedEmail
      );

      if (!targetUser) {
        console.error('User not found by email:', {
          searchedEmail: normalizedEmail,
          availableEmails: authUsers?.users.map(u => u.email).filter(Boolean).slice(0, 5), // Log first 5 for debugging
          totalUsers: authUsers?.users.length,
        });
        return NextResponse.json(
          { error: `User not found with email: ${email}` },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('Error in user lookup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { error: `Failed to lookup user: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Create idempotency key
    const idempotencyKey = `admin_adjust_${authUser.id}_${targetUser.id}_${Date.now()}`;

    let result;
    if (amount > 0) {
      // Add credits
      result = await addCredits({
        userId: targetUser.id,
        amount: Math.abs(amount),
        reason: `Admin adjustment: ${reason}`,
        idempotencyKey,
        metadata: {
          admin_id: authUser.id,
          admin_email: authUser.email || null,
          adjustment_type: 'admin_manual',
          reason,
        },
      });
    } else if (amount < 0) {
      // Subtract credits
      result = await subtractCredits({
        userId: targetUser.id,
        amount: Math.abs(amount),
        reason: `Admin adjustment: ${reason}`,
        idempotencyKey,
        metadata: {
          admin_id: authUser.id,
          admin_email: authUser.email || null,
          adjustment_type: 'admin_manual',
          reason,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Amount cannot be zero' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to adjust credits' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Credits ${amount > 0 ? 'added' : 'subtracted'} successfully`,
      transactionId: result.transactionId,
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
    });
  } catch (error) {
    console.error('Admin credits adjust error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


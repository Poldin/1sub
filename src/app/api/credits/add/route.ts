/**
 * Credit Addition API
 * 
 * This endpoint allows adding credits to user accounts.
 * It's used for:
 * - Manual credit additions by admins
 * - Stripe webhook credit additions after successful payment
 * - Promotional credit grants
 * 
 * Features:
 * - Admin-only access (checks user role)
 * - Idempotency support for Stripe webhooks
 * - Audit logging for all credit additions
 * - Uses unified credit service for atomic operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { addCredits } from '@/domains/credits';
import { createClient } from '@/lib/supabase/server';

interface AddCreditsRequest {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
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

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only admins can manually add credits
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: AddCreditsRequest = await request.json();
    const { userId, amount, reason, idempotencyKey, metadata } = body;

    // Validate required fields
    if (!userId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount, reason' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Add credits using unified credit service
    const result = await addCredits({
      userId,
      amount,
      reason,
      idempotencyKey: idempotencyKey || `admin-add-${userId}-${Date.now()}`,
      metadata: {
        ...metadata,
        added_by_admin: authUser.id,
        added_by_email: authUser.email,
        target_user_email: targetUser.email,
        timestamp: new Date().toISOString()
      }
    });

    if (!result.success) {
      console.error('Failed to add credits:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to add credits' },
        { status: 500 }
      );
    }

    // Log to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        action: 'credits_add',
        resource_type: 'credit_transactions',
        resource_id: result.transactionId,
        metadata: {
          target_user_id: userId,
          target_user_email: targetUser.email,
          amount,
          reason,
          balance_before: result.balanceBefore,
          balance_after: result.balanceAfter,
          idempotency_key: idempotencyKey
        }
      });

    console.log('[ADMIN] Credits added:', {
      adminId: authUser.id,
      adminEmail: authUser.email,
      targetUserId: userId,
      targetUserEmail: targetUser.email,
      amount,
      transactionId: result.transactionId,
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter
    });

    return NextResponse.json({
      success: true,
      message: 'Credits added successfully',
      transactionId: result.transactionId,
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.full_name
      }
    });

  } catch (error) {
    console.error('Error in /api/credits/add:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


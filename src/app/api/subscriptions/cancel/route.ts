/**
 * Subscription Cancellation API
 * 
 * Allows users to cancel their active subscriptions.
 * Subscriptions are marked as cancelled rather than deleted to preserve history.
 * 
 * Features:
 * - User authentication required
 * - Verifies subscription ownership
 * - Preserves subscription history (soft delete)
 * - Comprehensive audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySubscriptionCanceled } from '@/domains/webhooks';
import { revokeAccess } from '@/domains/auth';

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

    // Parse request body
    const body = await request.json();
    // Support both camelCase (subscriptionId) and snake_case (subscription_id) for compatibility
    const subscription_id = body.subscription_id || body.subscriptionId;

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Fetch subscription to verify ownership
    const { data: subscription, error: subscriptionError } = await supabase
      .from('tool_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single();

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Verify user owns this subscription
    if (subscription.user_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this subscription' },
        { status: 403 }
      );
    }

    // Check if subscription is already cancelled
    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { 
          error: 'Subscription already cancelled',
          cancelled_at: subscription.cancelled_at
        },
        { status: 400 }
      );
    }

    // Cancel subscription (soft delete - preserve history)
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('tool_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', subscription_id);

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    // Log cancellation to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        action: 'subscription_cancel',
        resource_type: 'tool_subscriptions',
        resource_id: subscription_id,
        metadata: {
          tool_id: subscription.tool_id,
          vendor_id: (subscription.metadata as Record<string, unknown>)?.vendor_id || null,
          credits_per_period: subscription.credits_per_period,
          period: subscription.period,
          cancelled_at: now,
        }
      });

    console.log('[Subscription] Cancelled subscription', {
      subscriptionId: subscription_id,
      userId: authUser.id,
      toolId: subscription.tool_id,
      cancelledAt: now,
    });

    // CRITICAL: Revoke access immediately to prevent continued access
    // This ensures tokens are invalidated and /verify will fail
    await revokeAccess(
      authUser.id,
      subscription.tool_id,
      'subscription_cancelled'
    );

    // Send webhook notification for subscription cancellation (NON-BLOCKING)
    notifySubscriptionCanceled(
      subscription.tool_id,
      authUser.id,
      subscription.period || 'monthly',
      subscription.next_billing_date || now
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription_id,
        status: 'cancelled',
        cancelled_at: now,
      }
    });

  } catch (error) {
    console.error('Error in /api/subscriptions/cancel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method not supported
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST to cancel a subscription'
    },
    { status: 405 }
  );
}

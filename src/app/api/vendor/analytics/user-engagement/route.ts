/**
 * API Endpoint: /api/vendor/analytics/user-engagement
 * 
 * Get user engagement metrics for a tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserEngagementMetrics } from '@/lib/analytics-engine';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a vendor
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_vendor')
      .eq('id', user.id)
      .single();

    if (!profile?.is_vendor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!toolId) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 });
    }

    // Verify tool belongs to user
    const { data: tool } = await supabase
      .from('tools')
      .select('user_profile_id')
      .eq('id', toolId)
      .single();

    if (!tool || tool.user_profile_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse dates or use defaults (last 30 days)
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get engagement metrics
    const metrics = await getUserEngagementMetrics(toolId, startDate, endDate);

    return NextResponse.json({
      success: true,
      metrics,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  } catch (error) {
    console.error('User engagement analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


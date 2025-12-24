import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    if (profileError) {
      console.error('Error fetching user profile for admin check:', profileError);
      return NextResponse.json(
        { error: 'Forbidden', details: profileError.message },
        { status: 403 }
      );
    }

    if (!profile || profile.role !== 'admin') {
      console.error('User is not admin:', { userId: authUser.id, role: profile?.role });
      return NextResponse.json(
        { error: 'Forbidden', details: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch webhook stats for last 24 hours
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: logs, error: logsError } = await supabase
      .from('webhook_logs')
      .select('success, delivery_time_ms')
      .gte('created_at', twentyFourHoursAgo);

    if (logsError) {
      console.error('Error fetching webhook logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch webhook logs' },
        { status: 500 }
      );
    }

    const totalSent = logs?.length || 0;
    const successful = logs?.filter((l) => l.success).length || 0;
    const failed = totalSent - successful;
    const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 100;
    const avgDeliveryTime =
      logs && logs.length > 0
        ? logs.reduce((sum, l) => sum + (l.delivery_time_ms || 0), 0) / logs.length
        : 0;

    // Fetch retry queue count
    const { count: pendingRetries, error: retryCountError } = await supabase
      .from('webhook_retry_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'retrying']);

    if (retryCountError) {
      console.error('Error fetching retry queue count:', retryCountError);
    }

    // Fetch dead letter queue count
    const { count: deadLetterCount, error: deadLetterCountError } = await supabase
      .from('webhook_dead_letter_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unresolved');

    if (deadLetterCountError) {
      console.error('Error fetching dead letter queue count:', deadLetterCountError);
    }

    // Fetch active tools with webhooks
    const { data: toolsWithWebhooks, error: toolsError } = await supabase
      .from('api_keys')
      .select('tool_id')
      .not('metadata->webhook_url', 'is', null);

    if (toolsError) {
      console.error('Error fetching active tools:', toolsError);
    }

    // Fetch retry queue items (metadata only - no secrets, no payloads)
    const { data: retries, error: retriesError } = await supabase
      .from('webhook_retry_queue')
      .select('id, tool_id, event_type, retry_count, max_retries, next_retry_at, last_error, url')
      .in('status', ['pending', 'retrying'])
      .order('next_retry_at', { ascending: true })
      .limit(10);

    if (retriesError) {
      console.error('Error fetching retry queue items:', retriesError);
    }

    // Fetch dead letter queue items (metadata only - no secrets, no payloads)
    const { data: deadLetters, error: deadLettersError } = await supabase
      .from('webhook_dead_letter_queue')
      .select('id, tool_id, event_type, total_attempts, last_error, created_at, status')
      .eq('status', 'unresolved')
      .order('created_at', { ascending: false })
      .limit(10);

    if (deadLettersError) {
      console.error('Error fetching dead letter queue items:', deadLettersError);
    }

    return NextResponse.json({
      stats: {
        total_sent_24h: totalSent,
        successful_24h: successful,
        failed_24h: failed,
        success_rate_24h: successRate,
        avg_delivery_time_ms: Math.round(avgDeliveryTime),
        pending_retries: pendingRetries || 0,
        dead_letter_count: deadLetterCount || 0,
        active_tools: toolsWithWebhooks?.length || 0,
      },
      retryQueue: retries || [],
      deadLetterQueue: deadLetters || [],
    });
  } catch (error) {
    console.error('Admin webhooks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkLowBalances, processLowBalanceAlerts } from '@/lib/alerts';

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const threshold = parseFloat(searchParams.get('threshold') || '10');

    // Get low balance alerts
    const alerts = await checkLowBalances(threshold);

    // Get alert statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_alert_stats');

    if (statsError) {
      console.error('Error fetching alert stats:', statsError);
    }

    // Get recent alerts from usage_logs
    const { data: recentAlerts, error: alertsError } = await supabaseAdmin
      .from('usage_logs')
      .select(`
        id,
        user_id,
        created_at,
        metadata,
        users!inner(email, full_name)
      `)
      .not('metadata->alert_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (alertsError) {
      console.error('Error fetching recent alerts:', alertsError);
    }

    return NextResponse.json({
      currentAlerts: alerts,
      statistics: stats?.[0] || { total_alerts: 0, low_balance_alerts: 0, recent_alerts: 0 },
      recentAlerts: recentAlerts || []
    });
  } catch (error) {
    console.error('Error in alerts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { action, threshold } = body;

    if (action === 'process_alerts') {
      await processLowBalanceAlerts();
      return NextResponse.json({ message: 'Alerts processed successfully' });
    }

    if (action === 'check_low_balances') {
      const checkThreshold = threshold || 10;
      const alerts = await checkLowBalances(checkThreshold);
      return NextResponse.json({ 
        message: `Found ${alerts.length} users with low balances`,
        alerts 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in alerts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Analytics Engine
 * 
 * Core analytics processing for vendor dashboards and reporting.
 */

import { createClient } from '@/lib/supabase/server';

export interface TimeseriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface AnalyticsSummary {
  totalUses: number;
  totalCreditsConsumed: number;
  uniqueUsers: number;
  successRate: number;
  avgCreditsPerUse: number;
}

/**
 * Get timeseries data for tool usage
 */
export async function getToolUsageTimeseries(
  toolId: string,
  startDate: Date,
  endDate: Date,
  interval: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<TimeseriesDataPoint[]> {
  try {
    const supabase = await createClient();

    // Determine the date truncation based on interval
    const truncFunction = {
      hour: 'hour',
      day: 'day',
      week: 'week',
      month: 'month',
    }[interval];

    // Query usage logs with time bucketing
    const { data, error } = await supabase
      .from('usage_logs')
      .select('created_at, credits_consumed, status')
      .eq('tool_id', toolId)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching usage timeseries:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group data by time interval
    const grouped = new Map<string, { count: number; credits: number }>();

    data.forEach((log) => {
      const date = new Date(log.created_at);
      let key: string;

      switch (interval) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString();
      }

      const existing = grouped.get(key) || { count: 0, credits: 0 };
      grouped.set(key, {
        count: existing.count + 1,
        credits: existing.credits + (log.credits_consumed || 0),
      });
    });

    // Convert to array and sort
    return Array.from(grouped.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        value: data.count,
        label: `${data.count} uses, ${data.credits} credits`,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch (error) {
    console.error('Error in getToolUsageTimeseries:', error);
    return [];
  }
}

/**
 * Get analytics summary for a tool
 */
export async function getToolAnalyticsSummary(
  toolId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsSummary> {
  try {
    const supabase = await createClient();

    // Use the RPC function for optimized analytics
    const { data, error } = await supabase.rpc('get_tool_analytics', {
      p_tool_id: toolId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error || !data || data.length === 0) {
      console.error('Error fetching analytics summary:', error);
      return {
        totalUses: 0,
        totalCreditsConsumed: 0,
        uniqueUsers: 0,
        successRate: 0,
        avgCreditsPerUse: 0,
      };
    }

    const result = data[0];
    return {
      totalUses: result.total_uses || 0,
      totalCreditsConsumed: result.total_credits_consumed || 0,
      uniqueUsers: result.unique_users || 0,
      successRate: result.success_rate || 0,
      avgCreditsPerUse: result.avg_credits_per_use || 0,
    };
  } catch (error) {
    console.error('Error in getToolAnalyticsSummary:', error);
    return {
      totalUses: 0,
      totalCreditsConsumed: 0,
      uniqueUsers: 0,
      successRate: 0,
      avgCreditsPerUse: 0,
    };
  }
}

/**
 * Get user engagement metrics
 */
export async function getUserEngagementMetrics(
  toolId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  avgUsesPerUser: number;
}> {
  try {
    const supabase = await createClient();

    // Get unique users in period
    const { data: activeUsersData } = await supabase
      .from('usage_logs')
      .select('user_id')
      .eq('tool_id', toolId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const activeUsers = new Set(activeUsersData?.map(u => u.user_id) || []).size;

    // Get new users (first usage in period)
    const { data: allUsersData } = await supabase
      .from('usage_logs')
      .select('user_id, created_at')
      .eq('tool_id', toolId)
      .order('created_at', { ascending: true });

    const firstUsageMap = new Map<string, Date>();
    allUsersData?.forEach(log => {
      const userId = log.user_id;
      const date = new Date(log.created_at);
      if (!firstUsageMap.has(userId) || date < firstUsageMap.get(userId)!) {
        firstUsageMap.set(userId, date);
      }
    });

    let newUsers = 0;
    firstUsageMap.forEach((firstUsage) => {
      if (firstUsage >= startDate && firstUsage <= endDate) {
        newUsers++;
      }
    });

    const returningUsers = activeUsers - newUsers;

    // Calculate average uses per user
    const totalUses = activeUsersData?.length || 0;
    const avgUsesPerUser = activeUsers > 0 ? totalUses / activeUsers : 0;

    return {
      activeUsers,
      newUsers,
      returningUsers: Math.max(0, returningUsers),
      avgUsesPerUser: Math.round(avgUsesPerUser * 100) / 100,
    };
  } catch (error) {
    console.error('Error in getUserEngagementMetrics:', error);
    return {
      activeUsers: 0,
      newUsers: 0,
      returningUsers: 0,
      avgUsesPerUser: 0,
    };
  }
}

/**
 * Get revenue metrics for a tool
 */
export async function getToolRevenueMetrics(
  toolId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
}> {
  try {
    const supabase = await createClient();

    // Get tool owner's credit transactions
    const { data: tool } = await supabase
      .from('tools')
      .select('user_profile_id')
      .eq('id', toolId)
      .single();

    if (!tool) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        avgTransactionValue: 0,
      };
    }

    // Get credit transactions for this vendor from this tool
    // Vendor earnings are recorded as type='add' with reason containing 'Tool sale:'
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('credits_amount')
      .eq('user_id', tool.user_profile_id)
      .eq('tool_id', toolId)
      .eq('type', 'add')
      .ilike('reason', 'Tool sale:%')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalRevenue = transactions?.reduce((sum, t) => sum + (t.credits_amount || 0), 0) || 0;
    const totalTransactions = transactions?.length || 0;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalTransactions,
      avgTransactionValue: Math.round(avgTransactionValue * 100) / 100,
    };
  } catch (error) {
    console.error('Error in getToolRevenueMetrics:', error);
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      avgTransactionValue: 0,
    };
  }
}


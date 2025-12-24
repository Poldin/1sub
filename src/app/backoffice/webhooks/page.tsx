'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  TrendingUp,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface WebhookStats {
  total_sent_24h: number;
  successful_24h: number;
  failed_24h: number;
  success_rate_24h: number;
  avg_delivery_time_ms: number;
  pending_retries: number;
  dead_letter_count: number;
  active_tools: number;
}

interface RetryQueueItem {
  id: string;
  tool_id: string;
  event_type: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  last_error: string;
  url: string;
}

interface DeadLetterItem {
  id: string;
  tool_id: string;
  event_type: string;
  total_attempts: number;
  last_error: string;
  created_at: string;
  status: string;
}

interface WebhookLog {
  success: boolean;
  delivery_time_ms: number | null;
}

export default function WebhookHealthDashboard() {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [retryQueue, setRetryQueue] = useState<RetryQueueItem[]>([]);
  const [deadLetterQueue, setDeadLetterQueue] = useState<DeadLetterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch webhook stats for last 24 hours
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: logs, error: logsError } = await supabase
        .from('webhook_logs')
        .select('success, delivery_time_ms')
        .gte('created_at', twentyFourHoursAgo);

      if (logsError) throw logsError;

      const totalSent = logs?.length || 0;
      const successful = logs?.filter((l: WebhookLog) => l.success).length || 0;
      const failed = totalSent - successful;
      const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 100;
      const avgDeliveryTime =
        logs && logs.length > 0
          ? logs.reduce((sum: number, l: WebhookLog) => sum + (l.delivery_time_ms || 0), 0) /
            logs.length
          : 0;

      // Fetch retry queue count
      const { count: pendingRetries } = await supabase
        .from('webhook_retry_queue')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'retrying']);

      // Fetch dead letter queue count
      const { count: deadLetterCount } = await supabase
        .from('webhook_dead_letter_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unresolved');

      // Fetch active tools with webhooks
      const { data: toolsWithWebhooks } = await supabase
        .from('api_keys')
        .select('tool_id')
        .not('metadata->webhook_url', 'is', null);

      setStats({
        total_sent_24h: totalSent,
        successful_24h: successful,
        failed_24h: failed,
        success_rate_24h: successRate,
        avg_delivery_time_ms: Math.round(avgDeliveryTime),
        pending_retries: pendingRetries || 0,
        dead_letter_count: deadLetterCount || 0,
        active_tools: toolsWithWebhooks?.length || 0,
      });

      // Fetch retry queue items
      const { data: retries } = await supabase
        .from('webhook_retry_queue')
        .select('*')
        .in('status', ['pending', 'retrying'])
        .order('next_retry_at', { ascending: true })
        .limit(10);

      setRetryQueue(retries || []);

      // Fetch dead letter queue items
      const { data: deadLetters } = await supabase
        .from('webhook_dead_letter_queue')
        .select('*')
        .eq('status', 'unresolved')
        .order('created_at', { ascending: false })
        .limit(10);

      setDeadLetterQueue(deadLetters || []);
    } catch (err) {
      console.error('Failed to fetch webhook dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000
    );

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/backoffice"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Backoffice
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Webhook Health Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor webhook delivery and retry status
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error loading data</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Success Rate (24h)
              </h3>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.success_rate_24h.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.successful_24h} / {stats?.total_sent_24h} delivered
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Pending Retries
              </h3>
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.pending_retries}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting retry</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Dead Letter Queue
              </h3>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.dead_letter_count}
            </div>
            <p className="text-xs text-gray-500 mt-1">Permanently failed</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Avg Delivery Time
              </h3>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.avg_delivery_time_ms}ms
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.active_tools} active tools
            </p>
          </div>
        </div>

        {/* Retry Queue */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Retry Queue
            </h2>
            <p className="text-sm text-gray-600">
              Webhooks scheduled for retry with exponential backoff
            </p>
          </div>
          <div className="p-6">
            {retryQueue.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-gray-500">No pending retries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {retryQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {item.event_type}
                        </span>
                        <span className="text-sm text-gray-600">
                          Attempt {item.retry_count + 1} / {item.max_retries}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1 truncate">
                        {item.url}
                      </p>
                      <p className="text-xs text-red-600">{item.last_error}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500">Next retry</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatTimeAgo(item.next_retry_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dead Letter Queue */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Dead Letter Queue
            </h2>
            <p className="text-sm text-gray-600">
              Webhooks that failed after all retry attempts
            </p>
          </div>
          <div className="p-6">
            {deadLetterQueue.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-gray-500">No failed webhooks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deadLetterQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          {item.event_type}
                        </span>
                        <span className="text-sm text-gray-600">
                          {item.total_attempts} attempts
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        Tool: {item.tool_id.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-red-600">{item.last_error}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500">Failed</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatTimeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

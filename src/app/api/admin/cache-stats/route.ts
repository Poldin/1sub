/**
 * Cache Statistics Endpoint
 *
 * Returns cache performance metrics for monitoring.
 *
 * GET /api/admin/cache-stats
 *
 * Response:
 * {
 *   hits: number,
 *   misses: number,
 *   errors: number,
 *   hitRate: number,
 *   hitRatePercentage: string,
 *   timestamp: string
 * }
 */

import { NextResponse } from 'next/server';
import { getCacheStats } from '@/infrastructure/cache/redis';

export async function GET() {
  try {
    const stats = getCacheStats();

    return NextResponse.json({
      ...stats,
      hitRatePercentage: (stats.hitRate * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CacheStats] Error fetching stats:', error);
    return NextResponse.json(
      {
        error: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch cache statistics',
      },
      { status: 500 }
    );
  }
}

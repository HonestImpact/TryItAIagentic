/**
 * Analytics Health Check Endpoint
 *
 * Provides visibility into analytics system status
 * Helps detect database connection issues and silent failures
 */

import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';
import { createLogger } from '@/lib/logger';

const logger = createLogger('analytics-health');

export async function GET() {
  try {
    const health = await analyticsService.healthCheck();

    const status = health.healthy ? 200 : 503;

    logger.info('Analytics health check', {
      healthy: health.healthy,
      message: health.message
    });

    return NextResponse.json({
      healthy: health.healthy,
      message: health.message,
      timestamp: new Date().toISOString(),
      service: 'analytics'
    }, { status });

  } catch (error) {
    logger.error('Analytics health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      healthy: false,
      message: 'Health check error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      service: 'analytics'
    }, { status: 503 });
  }
}

/**
 * Analytics API Endpoint
 *
 * Exposes metrics from agentic services for dashboard visualization:
 * - Learning service statistics
 * - Security metrics
 * - Quality trends
 */

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getAgenticServices } from '@/app/api/chat/route';
import { performanceTracker } from '@/lib/services/agentic';

const logger = createLogger('analytics-api');

export async function GET() {
  try {
    logger.info('📊 Analytics request received');

    // Get reference to the shared agentic services
    const services = getAgenticServices();

    if (!services) {
      return NextResponse.json({
        error: 'Agentic services not initialized',
        learning: null,
        security: null,
        performance: null
      }, { status: 503 });
    }

    // Gather learning statistics
    const learningStats = services.learning?.getStatistics() || {
      totalSuccesses: 0,
      averageConfidence: 0,
      averageIterations: 0,
      averageTime: 0,
      topPatterns: []
    };

    // Security metrics (we'll need to add a method to SecurityService for this)
    // For now, return placeholder data
    const securityMetrics = {
      totalValidations: 0,
      blocked: 0,
      warned: 0,
      allowed: 0,
      averageTrustScore: 1.0
    };

    // Performance metrics
    const performanceMetrics = performanceTracker.getMetrics();
    const performanceSummary = performanceTracker.getSummary();

    logger.info('✅ Analytics data retrieved', {
      learningSuccesses: learningStats.totalSuccesses,
      avgConfidence: learningStats.averageConfidence,
      performanceCalls: performanceSummary.totalCalls
    });

    return NextResponse.json({
      learning: learningStats,
      security: securityMetrics,
      performance: {
        summary: performanceSummary,
        metrics: performanceMetrics
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('💥 Analytics request failed', { error });
    return NextResponse.json({
      error: 'Failed to retrieve analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

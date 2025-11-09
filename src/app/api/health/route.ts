// Health check endpoint for deployment platforms (Koyeb, etc.)
import { NextResponse } from 'next/server';
import { analyticsDb } from '@/lib/analytics/database';

export async function GET() {
  try {
    // Basic health check - app is running
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'TryItAI - Noah',
      version: '2.0.0'
    };

    // Optional: Check database connectivity (won't fail if DB is down)
    try {
      const dbHealthy = await analyticsDb.healthCheck();
      health.database = dbHealthy ? 'connected' : 'disconnected';
    } catch (dbError) {
      // Database check is optional - don't fail health check
      health.database = 'unavailable';
    }

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

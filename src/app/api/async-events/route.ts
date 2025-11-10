/**
 * Async Events API (Server-Sent Events)
 *
 * Provides real-time updates for async work via SSE:
 * - Work started/completed/failed/cancelled
 * - Progress updates (stage, percentage, message)
 * - New messages from async work
 * - Notifications
 *
 * Part of Phase 9: Real-Time Updates
 *
 * Usage:
 * ```javascript
 * const eventSource = new EventSource('/api/async-events?sessionId=xxx');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Async event:', data);
 * };
 * ```
 */

import { NextRequest } from 'next/server';
import { asyncEventEmitter, type AsyncEvent } from '@/lib/services/async-event-emitter.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('async-events-api');

/**
 * GET /api/async-events?sessionId=xxx
 *
 * Establish SSE connection for real-time async work updates
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'sessionId parameter required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  logger.info('SSE connection established', { sessionId });

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        timestamp: Date.now()
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Subscribe to async events
      const unsubscribe = asyncEventEmitter.subscribe(sessionId, (event: AsyncEvent) => {
        try {
          const sseData = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseData));

          logger.debug('SSE event sent', {
            sessionId,
            eventType: event.type,
            workId: event.workId
          });
        } catch (error) {
          logger.error('Failed to send SSE event', { error, sessionId });
        }
      });

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `:heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          logger.warn('Heartbeat failed, connection likely closed', { sessionId });
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on connection close
      req.signal.addEventListener('abort', () => {
        logger.info('SSE connection closed', { sessionId });
        clearInterval(heartbeatInterval);
        unsubscribe();
        controller.close();
      });
    },

    cancel() {
      logger.info('SSE stream cancelled', { sessionId });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable buffering in nginx
    }
  });
}

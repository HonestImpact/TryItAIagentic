/**
 * Async Work Cancellation API
 *
 * Allows users to cancel ongoing async work:
 * - Cancel individual work items
 * - Cancel all work for a session
 * - Graceful cleanup of in-progress work
 *
 * Part of Phase 7: Work Cancellation
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/lib/services/session-state.service';
import { asyncWorkQueue } from '@/lib/services/async-work-queue.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('async-cancel');

interface CancelResponse {
  success: boolean;
  cancelled: string[];
  message: string;
}

/**
 * POST /api/async-cancel
 *
 * Cancel async work by work ID or session ID
 *
 * Body:
 * - { workId: string } - Cancel specific work item
 * - { sessionId: string, cancelAll: true } - Cancel all work for session
 */
export async function POST(req: NextRequest): Promise<NextResponse<CancelResponse | { error: string }>> {
  try {
    const body = await req.json();
    const { workId, sessionId, cancelAll } = body;

    if (!workId && !sessionId) {
      return NextResponse.json(
        { error: 'Either workId or sessionId required' },
        { status: 400 }
      );
    }

    const cancelled: string[] = [];

    // Cancel specific work item
    if (workId) {
      logger.info('Cancelling work item', { workId });

      // Update work status to cancelled
      sessionStateManager.updateAsyncWork(workId, {
        status: 'cancelled' as any,
        completedAt: Date.now(),
        error: 'Cancelled by user'
      });

      // Remove from queue if queued
      const queueCancelled = await asyncWorkQueue.cancelWork(workId);

      if (queueCancelled) {
        logger.info('Work cancelled from queue', { workId });
      } else {
        logger.info('Work cancelled (not in queue, may be in progress)', { workId });
      }

      cancelled.push(workId);

      return NextResponse.json({
        success: true,
        cancelled,
        message: 'Work cancelled successfully'
      });
    }

    // Cancel all work for session
    if (sessionId && cancelAll) {
      logger.info('Cancelling all work for session', { sessionId });

      const activeWork = sessionStateManager.getActiveWork(sessionId);
      const pendingOffers = sessionStateManager.getPendingOffers(sessionId);

      // Cancel all active work
      for (const work of activeWork) {
        sessionStateManager.updateAsyncWork(work.id, {
          status: 'cancelled' as any,
          completedAt: Date.now(),
          error: 'Cancelled by user'
        });

        await asyncWorkQueue.cancelWork(work.id);
        cancelled.push(work.id);
      }

      // Cancel all pending offers
      for (const work of pendingOffers) {
        sessionStateManager.updateAsyncWork(work.id, {
          status: 'cancelled' as any,
          completedAt: Date.now(),
          error: 'Cancelled by user'
        });

        cancelled.push(work.id);
      }

      logger.info('All work cancelled for session', {
        sessionId,
        count: cancelled.length
      });

      return NextResponse.json({
        success: true,
        cancelled,
        message: `Cancelled ${cancelled.length} work item(s)`
      });
    }

    return NextResponse.json(
      { error: 'Invalid request: specify workId or sessionId with cancelAll' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Cancellation failed', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

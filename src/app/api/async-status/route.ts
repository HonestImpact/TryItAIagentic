/**
 * Async Work Status API
 *
 * Provides endpoints for checking:
 * - Active async work status
 * - Pending notifications
 * - Progress updates
 *
 * Used by frontend to poll for async work updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/lib/services/session-state.service';
import { resultNotificationService } from '@/lib/services/result-notification.service';
import { asyncWorkQueue } from '@/lib/services/async-work-queue.service';
import { progressRegistry } from '@/lib/services/progress-tracker.service';

interface StatusResponse {
  sessionId: string;
  activeWork: Array<{
    id: string;
    type: string;
    status: string;
    estimatedDuration: number;
    startedAt?: number;
    elapsedSeconds?: number;
  }>;
  pendingNotifications: Array<{
    id: string;
    workId: string;
    type: string;
    message: string;
    timestamp: number;
  }>;
  queueStatus: {
    queued: number;
    executing: number;
  };
}

/**
 * GET /api/async-status?sessionId=xxx
 *
 * Check status of async work and notifications
 */
export async function GET(req: NextRequest): Promise<NextResponse<StatusResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter required' },
        { status: 400 }
      );
    }

    // Get active work
    const activeWorkItems = sessionStateManager.getActiveWork(sessionId);
    const activeWork = activeWorkItems.map((work) => ({
      id: work.id,
      type: work.type,
      status: work.status,
      estimatedDuration: work.estimatedDuration,
      startedAt: work.startedAt,
      elapsedSeconds: work.startedAt
        ? Math.floor((Date.now() - work.startedAt) / 1000)
        : undefined,
    }));

    // Get pending notifications
    const notifications = resultNotificationService.getPendingNotifications(sessionId);
    const pendingNotifications = notifications.map((n) => ({
      id: n.id,
      workId: n.workId,
      type: n.type,
      message: n.message,
      timestamp: n.timestamp,
    }));

    // Get queue status
    const queueStatus = asyncWorkQueue.getStatus();

    const response: StatusResponse = {
      sessionId,
      activeWork,
      pendingNotifications,
      queueStatus: {
        queued: queueStatus.queued,
        executing: queueStatus.executing,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[AsyncStatusAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/async-status/acknowledge
 *
 * Acknowledge/clear a notification
 */
export async function POST(req: NextRequest): Promise<NextResponse<{ success: boolean }>> {
  try {
    const { sessionId, notificationId } = await req.json();

    if (!sessionId || !notificationId) {
      return NextResponse.json(
        { success: false },
        { status: 400 }
      );
    }

    resultNotificationService.clearNotification(sessionId, notificationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AsyncStatusAPI] Acknowledge error:', error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}

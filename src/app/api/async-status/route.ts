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
import { asyncMessageService } from '@/lib/services/async-message.service';

interface StatusResponse {
  sessionId: string;
  activeWork: Array<{
    id: string;
    type: string;
    status: string;
    estimatedDuration: number;
    startedAt?: number;
    elapsedSeconds?: number;
    progress?: {
      stage: string;
      percentage: number;
      message: string;
    };
  }>;
  pendingNotifications: Array<{
    id: string;
    workId: string;
    type: string;
    message: string;
    timestamp: number;
  }>;
  pendingQuestions: Array<{
    id: string;
    workId: string;
    content: string;
    timestamp: number;
  }>;
  unreadMessageCount: number;
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

    // Get active work with progress information
    const activeWorkItems = sessionStateManager.getActiveWork(sessionId);
    const activeWork = activeWorkItems.map((work) => {
      const tracker = progressRegistry.get(work.id);

      return {
        id: work.id,
        type: work.type,
        status: work.status,
        estimatedDuration: work.estimatedDuration,
        startedAt: work.startedAt,
        elapsedSeconds: work.startedAt
          ? Math.floor((Date.now() - work.startedAt) / 1000)
          : undefined,
        progress: tracker ? {
          stage: tracker.currentStage,
          percentage: tracker.progress,
          message: tracker.statusMessage
        } : undefined
      };
    });

    // Get pending notifications
    const notifications = resultNotificationService.getPendingNotifications(sessionId);
    const pendingNotifications = notifications.map((n) => ({
      id: n.id,
      workId: n.workId,
      type: n.type,
      message: n.message,
      timestamp: n.timestamp,
    }));

    // Get pending questions from async messages
    const questions = asyncMessageService.getPendingQuestions(sessionId);
    const pendingQuestions = questions.map((q) => ({
      id: q.id,
      workId: q.workId,
      content: q.content,
      timestamp: q.timestamp
    }));

    // Get unread message count
    const unreadMessageCount = asyncMessageService.getUnreadMessages(sessionId).length;

    // Get queue status
    const queueStatus = asyncWorkQueue.getStatus();

    const response: StatusResponse = {
      sessionId,
      activeWork,
      pendingNotifications,
      pendingQuestions,
      unreadMessageCount,
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

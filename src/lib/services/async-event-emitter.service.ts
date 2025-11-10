/**
 * Async Event Emitter Service
 *
 * Enables real-time updates for async work:
 * - Progress updates
 * - Status changes
 * - Completion notifications
 * - New messages
 * - Work cancellations
 *
 * Used by SSE endpoint to push updates to clients
 *
 * Part of Phase 9: Real-Time Updates
 */

import { EventEmitter } from 'events';
import { createLogger } from '@/lib/logger';
import type { AsyncWorkItem } from './session-state.service';
import type { AsyncMessage } from './async-message.service';

const logger = createLogger('async-event-emitter');

export type AsyncEventType =
  | 'work_started'
  | 'work_progress'
  | 'work_completed'
  | 'work_failed'
  | 'work_cancelled'
  | 'message_received'
  | 'notification_received';

export interface AsyncEvent {
  type: AsyncEventType;
  sessionId: string;
  workId: string;
  timestamp: number;
  data: any;
}

export class AsyncEventEmitterService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many concurrent SSE connections
  }

  /**
   * Emit work started event
   */
  emitWorkStarted(sessionId: string, workId: string, work: AsyncWorkItem): void {
    const event: AsyncEvent = {
      type: 'work_started',
      sessionId,
      workId,
      timestamp: Date.now(),
      data: {
        type: work.type,
        request: work.request,
        estimatedDuration: work.estimatedDuration
      }
    };

    this.emit(`session:${sessionId}`, event);
    logger.debug('Work started event emitted', { sessionId, workId });
  }

  /**
   * Emit work progress event
   */
  emitWorkProgress(
    sessionId: string,
    workId: string,
    stage: string,
    percentage: number,
    message: string
  ): void {
    const event: AsyncEvent = {
      type: 'work_progress',
      sessionId,
      workId,
      timestamp: Date.now(),
      data: {
        stage,
        percentage,
        message
      }
    };

    this.emit(`session:${sessionId}`, event);
    logger.debug('Work progress event emitted', { sessionId, workId, percentage });
  }

  /**
   * Emit work completed event
   */
  emitWorkCompleted(sessionId: string, workId: string, result: any): void {
    const event: AsyncEvent = {
      type: 'work_completed',
      sessionId,
      workId,
      timestamp: Date.now(),
      data: { result }
    };

    this.emit(`session:${sessionId}`, event);
    logger.info('Work completed event emitted', { sessionId, workId });
  }

  /**
   * Emit work failed event
   */
  emitWorkFailed(sessionId: string, workId: string, error: string): void {
    const event: AsyncEvent = {
      type: 'work_failed',
      sessionId,
      workId,
      timestamp: Date.now(),
      data: { error }
    };

    this.emit(`session:${sessionId}`, event);
    logger.warn('Work failed event emitted', { sessionId, workId, error });
  }

  /**
   * Emit work cancelled event
   */
  emitWorkCancelled(sessionId: string, workId: string): void {
    const event: AsyncEvent = {
      type: 'work_cancelled',
      sessionId,
      workId,
      timestamp: Date.now(),
      data: {}
    };

    this.emit(`session:${sessionId}`, event);
    logger.info('Work cancelled event emitted', { sessionId, workId });
  }

  /**
   * Emit message received event
   */
  emitMessageReceived(sessionId: string, workId: string, message: AsyncMessage): void {
    const event: AsyncEvent = {
      type: 'message_received',
      sessionId,
      workId,
      timestamp: Date.now(),
      data: {
        messageId: message.id,
        type: message.type,
        content: message.content,
        requiresResponse: message.requiresResponse
      }
    };

    this.emit(`session:${sessionId}`, event);
    logger.debug('Message received event emitted', { sessionId, workId, messageId: message.id });
  }

  /**
   * Emit notification received event
   */
  emitNotificationReceived(sessionId: string, workId: string, notificationType: string, message: string): void {
    const event: AsyncEvent = {
      type: 'notification_received',
      sessionId,
      workId,
      timestamp: Date.now(),
      data: {
        notificationType,
        message
      }
    };

    this.emit(`session:${sessionId}`, event);
    logger.debug('Notification received event emitted', { sessionId, workId });
  }

  /**
   * Subscribe to session events
   */
  subscribe(sessionId: string, handler: (event: AsyncEvent) => void): () => void {
    const eventName = `session:${sessionId}`;

    this.on(eventName, handler);

    logger.debug('Client subscribed to session events', { sessionId });

    // Return unsubscribe function
    return () => {
      this.off(eventName, handler);
      logger.debug('Client unsubscribed from session events', { sessionId });
    };
  }

  /**
   * Get active listener count for a session
   */
  getListenerCount(sessionId: string): number {
    return this.listenerCount(`session:${sessionId}`);
  }
}

// Export singleton instance
export const asyncEventEmitter = new AsyncEventEmitterService();

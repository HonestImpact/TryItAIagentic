/**
 * Result Notification Service
 *
 * Notifies users when async work completes:
 * - Real-time notifications via SSE
 * - Polling endpoint for notification check
 * - Natural notification messages in Noah's voice
 * - Graceful handling of multiple completions
 *
 * Part of Phase 8: Result Notification
 */

import { sessionStateManager, type AsyncWorkItem } from './session-state.service';

export interface NotificationMessage {
  id: string;
  workId: string;
  type: 'completion' | 'failure';
  message: string;
  timestamp: number;
  result?: any;
  error?: string;
}

/**
 * Result Notification Service
 */
export class ResultNotificationService {
  private pendingNotifications: Map<string, NotificationMessage[]>;
  private notificationCallbacks: Map<string, Set<(notification: NotificationMessage) => void>>;

  constructor() {
    this.pendingNotifications = new Map();
    this.notificationCallbacks = new Map();
  }

  /**
   * Subscribe to notifications for a session
   */
  subscribe(
    sessionId: string,
    callback: (notification: NotificationMessage) => void
  ): () => void {
    if (!this.notificationCallbacks.has(sessionId)) {
      this.notificationCallbacks.set(sessionId, new Set());
    }

    this.notificationCallbacks.get(sessionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.notificationCallbacks.get(sessionId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.notificationCallbacks.delete(sessionId);
        }
      }
    };
  }

  /**
   * Notify completion of async work
   */
  notifyCompletion(workId: string, result: any): void {
    const work = this.findWork(workId);
    if (!work) {
      console.warn(`[ResultNotification] Work ${workId} not found`);
      return;
    }

    const notification: NotificationMessage = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workId,
      type: 'completion',
      message: this.generateCompletionMessage(work, result),
      timestamp: Date.now(),
      result,
    };

    this.addNotification(work.sessionId, notification);
  }

  /**
   * Notify failure of async work
   */
  notifyFailure(workId: string, error: string): void {
    const work = this.findWork(workId);
    if (!work) {
      console.warn(`[ResultNotification] Work ${workId} not found`);
      return;
    }

    const notification: NotificationMessage = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workId,
      type: 'failure',
      message: this.generateFailureMessage(work, error),
      timestamp: Date.now(),
      error,
    };

    this.addNotification(work.sessionId, notification);
  }

  /**
   * Get pending notifications for session
   */
  getPendingNotifications(sessionId: string): NotificationMessage[] {
    return this.pendingNotifications.get(sessionId) || [];
  }

  /**
   * Clear notification
   */
  clearNotification(sessionId: string, notificationId: string): void {
    const notifications = this.pendingNotifications.get(sessionId);
    if (notifications) {
      const index = notifications.findIndex((n) => n.id === notificationId);
      if (index >= 0) {
        notifications.splice(index, 1);
      }

      if (notifications.length === 0) {
        this.pendingNotifications.delete(sessionId);
      }
    }
  }

  /**
   * Clear all notifications for session
   */
  clearAllNotifications(sessionId: string): void {
    this.pendingNotifications.delete(sessionId);
  }

  /**
   * Add notification and trigger callbacks
   */
  private addNotification(sessionId: string, notification: NotificationMessage): void {
    // Add to pending notifications
    if (!this.pendingNotifications.has(sessionId)) {
      this.pendingNotifications.set(sessionId, []);
    }
    this.pendingNotifications.get(sessionId)!.push(notification);

    // Trigger callbacks
    const callbacks = this.notificationCallbacks.get(sessionId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(notification);
        } catch (error) {
          console.error('[ResultNotification] Callback error:', error);
        }
      }
    }
  }

  /**
   * Find work item by ID
   */
  private findWork(workId: string): AsyncWorkItem | null {
    for (const session of sessionStateManager.getAllSessions()) {
      const work = session.asyncWork.find((w) => w.id === workId);
      if (work) return work;
    }
    return null;
  }

  /**
   * Generate completion message in Noah's voice
   */
  private generateCompletionMessage(work: AsyncWorkItem, result: any): string {
    if (work.type === 'tool') {
      return `Your tool is ready! I've added it to the toolbox.`;
    }

    if (work.type === 'research') {
      return `Research complete! I've got what you asked for.`;
    }

    return 'Work complete!';
  }

  /**
   * Generate failure message in Noah's voice
   */
  private generateFailureMessage(work: AsyncWorkItem, error: string): string {
    if (work.type === 'tool') {
      return `Ran into an issue building that tool. Want to try a different approach?`;
    }

    if (work.type === 'research') {
      return `Couldn't complete the research. Hit a snag: ${error}`;
    }

    return `Something went wrong: ${error}`;
  }

  /**
   * Check for new completions since last check
   */
  checkForNewCompletions(sessionId: string, lastCheckTime: number): NotificationMessage[] {
    const notifications = this.getPendingNotifications(sessionId);
    return notifications.filter((n) => n.timestamp > lastCheckTime);
  }

  /**
   * Get notification statistics
   */
  getStats(sessionId: string) {
    const notifications = this.getPendingNotifications(sessionId);
    return {
      total: notifications.length,
      completions: notifications.filter((n) => n.type === 'completion').length,
      failures: notifications.filter((n) => n.type === 'failure').length,
      oldestTimestamp: notifications[0]?.timestamp,
      newestTimestamp: notifications[notifications.length - 1]?.timestamp,
    };
  }
}

// Export singleton instance
export const resultNotificationService = new ResultNotificationService();

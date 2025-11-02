/**
 * Async Work Queue Service
 *
 * Executes async work in background (fire-and-forget):
 * - Queue management (FIFO with priority)
 * - Work execution via existing agents
 * - Progress tracking integration
 * - Error handling and retry logic
 *
 * Part of Phase 7: Async Work Queue
 */

import { progressRegistry, ProgressStage, type ProgressTracker } from './progress-tracker.service';
import { sessionStateManager } from './session-state.service';
import { resultNotificationService } from './result-notification.service';
import type { AsyncWorkItem } from './session-state.service';

export interface WorkExecutor {
  type: 'research' | 'tool';
  execute: (request: string, tracker: ProgressTracker) => Promise<any>;
}

export interface QueuedWork {
  workId: string;
  sessionId: string;
  request: string;
  type: 'research' | 'tool';
  priority: number;
  enqueuedAt: number;
  context: Record<string, any>;
}

/**
 * Async Work Queue
 */
export class AsyncWorkQueue {
  private queue: QueuedWork[];
  private executing: Set<string>;
  private executors: Map<'research' | 'tool', WorkExecutor>;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.queue = [];
    this.executing = new Set();
    this.executors = new Map();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Register work executor
   */
  registerExecutor(executor: WorkExecutor): void {
    this.executors.set(executor.type, executor);
  }

  /**
   * Enqueue work for execution
   */
  enqueue(work: QueuedWork): void {
    this.queue.push(work);

    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Try to process immediately
    this.processQueue();
  }

  /**
   * Process queue (execute pending work)
   */
  private async processQueue(): Promise<void> {
    // Don't exceed max concurrent
    if (this.executing.size >= this.maxConcurrent) {
      return;
    }

    // Get next work item
    const work = this.queue.shift();
    if (!work) {
      return;
    }

    // Mark as executing
    this.executing.add(work.workId);

    // Execute asynchronously
    this.executeWork(work)
      .catch((error) => {
        console.error(`[AsyncWorkQueue] Work ${work.workId} failed:`, error);
      })
      .finally(() => {
        this.executing.delete(work.workId);

        // Process next item
        this.processQueue();
      });

    // Try to process more work in parallel
    if (this.queue.length > 0 && this.executing.size < this.maxConcurrent) {
      this.processQueue();
    }
  }

  /**
   * Execute work item
   */
  private async executeWork(work: QueuedWork): Promise<void> {
    const { workId, sessionId, request, type } = work;

    // Update state: in_progress
    sessionStateManager.updateAsyncWork(workId, {
      status: 'in_progress',
      startedAt: Date.now(),
    });

    // Create progress tracker
    const tracker = progressRegistry.getOrCreate(workId);

    try {
      // Initial progress
      tracker.update(ProgressStage.STARTING, 0, 'Starting work...');

      // Get executor
      const executor = this.executors.get(type);
      if (!executor) {
        throw new Error(`No executor registered for type: ${type}`);
      }

      // Execute work
      const result = await executor.execute(request, tracker);

      // Mark complete
      tracker.complete('Work completed successfully');

      // Update state
      sessionStateManager.updateAsyncWork(workId, {
        status: 'completed',
        completedAt: Date.now(),
        result,
      });

      // Notify completion
      resultNotificationService.notifyCompletion(workId, result);

      console.log(`[AsyncWorkQueue] Work ${workId} completed`);
    } catch (error) {
      // Mark failed
      tracker.update(ProgressStage.COMPLETE, 100, 'Work failed');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      sessionStateManager.updateAsyncWork(workId, {
        status: 'failed',
        completedAt: Date.now(),
        error: errorMessage,
      });

      // Notify failure
      resultNotificationService.notifyFailure(workId, errorMessage);

      console.error(`[AsyncWorkQueue] Work ${workId} failed:`, error);
    } finally {
      // Cleanup tracker after delay
      setTimeout(() => {
        progressRegistry.remove(workId);
      }, 60000); // Keep for 1 minute for notification
    }
  }

  /**
   * Cancel work
   */
  cancel(workId: string): boolean {
    // Remove from queue if pending
    const index = this.queue.findIndex((w) => w.workId === workId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      sessionStateManager.updateAsyncWork(workId, { status: 'failed', error: 'Cancelled' });
      return true;
    }

    // Can't cancel if already executing
    if (this.executing.has(workId)) {
      return false;
    }

    return false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queued: this.queue.length,
      executing: this.executing.size,
      total: this.queue.length + this.executing.size,
      executingIds: Array.from(this.executing),
    };
  }

  /**
   * Check if work is in queue or executing
   */
  isActive(workId: string): boolean {
    return (
      this.executing.has(workId) || this.queue.some((w) => w.workId === workId)
    );
  }
}

// Export singleton instance
export const asyncWorkQueue = new AsyncWorkQueue();

/**
 * Helper: Create work executor wrapper for existing agents
 */
export function createAgentExecutor(
  type: 'research' | 'tool',
  agentExecuteFn: (request: string) => Promise<any>
): WorkExecutor {
  return {
    type,
    execute: async (request: string, tracker: ProgressTracker) => {
      // Update progress at key stages
      tracker.update(ProgressStage.ANALYZING, 10, 'Analyzing request...');

      if (type === 'research') {
        tracker.update(ProgressStage.RESEARCHING, 30, 'Gathering information...');
      } else if (type === 'tool') {
        tracker.update(ProgressStage.BUILDING, 30, 'Building tool...');
      }

      // Execute agent work
      const result = await agentExecuteFn(request);

      // Refinement phase
      tracker.update(ProgressStage.REFINING, 80, 'Refining output...');

      // Finalization
      tracker.update(ProgressStage.FINALIZING, 95, 'Finalizing...');

      return result;
    },
  };
}

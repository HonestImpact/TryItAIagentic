/**
 * Progress Tracker Service
 *
 * Tracks and streams progress updates for async work to provide
 * perceptual speed and keep users engaged during long operations.
 *
 * Part of Phase 2: Perceptual Speed
 */

export enum ProgressStage {
  STARTING = 'starting',
  ANALYZING = 'analyzing',
  RESEARCHING = 'researching',
  BUILDING = 'building',
  REFINING = 'refining',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete',
}

export interface ProgressUpdate {
  stage: ProgressStage;
  progress: number; // 0-100
  message: string;
  timestamp: number;
}

export interface ProgressCallback {
  (update: ProgressUpdate): void;
}

/**
 * Progress tracker for async work
 */
export class ProgressTracker {
  private workId: string;
  private callbacks: Set<ProgressCallback>;
  private currentStage: ProgressStage;
  private currentProgress: number;

  constructor(workId: string) {
    this.workId = workId;
    this.callbacks = new Set();
    this.currentStage = ProgressStage.STARTING;
    this.currentProgress = 0;
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Update progress
   */
  update(stage: ProgressStage, progress: number, message: string): void {
    this.currentStage = stage;
    this.currentProgress = Math.max(0, Math.min(100, progress));

    const update: ProgressUpdate = {
      stage,
      progress: this.currentProgress,
      message,
      timestamp: Date.now(),
    };

    // Notify all subscribers
    for (const callback of this.callbacks) {
      try {
        callback(update);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    }
  }

  /**
   * Mark work as complete
   */
  complete(message: string = 'Work complete'): void {
    this.update(ProgressStage.COMPLETE, 100, message);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      workId: this.workId,
      stage: this.currentStage,
      progress: this.currentProgress,
    };
  }
}

/**
 * Global progress tracker registry
 */
class ProgressTrackerRegistry {
  private trackers: Map<string, ProgressTracker>;

  constructor() {
    this.trackers = new Map();
  }

  /**
   * Create or get tracker for work ID
   */
  getOrCreate(workId: string): ProgressTracker {
    if (!this.trackers.has(workId)) {
      this.trackers.set(workId, new ProgressTracker(workId));
    }
    return this.trackers.get(workId)!;
  }

  /**
   * Get tracker if exists
   */
  get(workId: string): ProgressTracker | undefined {
    return this.trackers.get(workId);
  }

  /**
   * Remove tracker (cleanup after completion)
   */
  remove(workId: string): void {
    this.trackers.delete(workId);
  }

  /**
   * Get all active trackers
   */
  getAll(): ProgressTracker[] {
    return Array.from(this.trackers.values());
  }
}

// Export singleton registry
export const progressRegistry = new ProgressTrackerRegistry();

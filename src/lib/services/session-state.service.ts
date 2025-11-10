/**
 * Session State Management Service
 *
 * Tracks conversation state, async work, and user preferences:
 * - Write-through cache with Supabase persistence
 * - In-memory cache for fast access
 * - Database persistence for scale-to-zero compatibility
 * - Tracks pending/active/completed async work
 * - Conversation history and context
 * - User preferences (async acceptance rate, etc.)
 *
 * Part of Phase 4: Session State Management
 */

import { asyncStatePersistence } from './async-state-persistence.service';

export interface AsyncWorkItem {
  id: string;
  sessionId: string;
  type: 'research' | 'tool';
  request: string;
  status: 'pending_offer' | 'offered' | 'accepted' | 'in_progress' | 'completed' | 'failed';
  estimatedDuration: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  containsOffer?: boolean;
  containsConfirmation?: boolean;
}

export interface SessionState {
  sessionId: string;
  createdAt: number;
  lastActivityAt: number;
  conversationHistory: ConversationMessage[];
  asyncWork: AsyncWorkItem[];
  preferences: {
    hasAcceptedAsyncBefore: boolean;
    asyncAcceptanceCount: number;
    asyncDeclineCount: number;
  };
  metadata: {
    totalMessages: number;
    totalAsyncWork: number;
    successfulAsyncWork: number;
  };
}

/**
 * Session State Manager (Write-Through Cache with Supabase Persistence)
 */
export class SessionStateManager {
  private sessions: Map<string, SessionState>;
  private cleanupIntervalMs: number;
  private maxSessionAgeMs: number;
  private persistenceEnabled: boolean;

  constructor(
    cleanupIntervalMs: number = 5 * 60 * 1000, // 5 minutes
    maxSessionAgeMs: number = 60 * 60 * 1000 // 1 hour
  ) {
    this.sessions = new Map();
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.maxSessionAgeMs = maxSessionAgeMs;
    this.persistenceEnabled = process.env.ENABLE_ASYNC_WORK === 'true';

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get or create session (with database persistence)
   */
  async getOrCreateAsync(sessionId: string): Promise<SessionState> {
    // Check in-memory cache first
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.lastActivityAt = Date.now();

      // Async persist activity update (fire-and-forget)
      if (this.persistenceEnabled) {
        asyncStatePersistence.saveSession(session).catch(() => {});
      }

      return session;
    }

    // Try to load from database if persistence enabled
    if (this.persistenceEnabled) {
      const loadedSession = await asyncStatePersistence.loadSession(sessionId);
      if (loadedSession) {
        loadedSession.lastActivityAt = Date.now();
        this.sessions.set(sessionId, loadedSession);

        // Persist activity update
        asyncStatePersistence.saveSession(loadedSession).catch(() => {});

        return loadedSession;
      }
    }

    // Create new session
    const now = Date.now();
    const newSession: SessionState = {
      sessionId,
      createdAt: now,
      lastActivityAt: now,
      conversationHistory: [],
      asyncWork: [],
      preferences: {
        hasAcceptedAsyncBefore: false,
        asyncAcceptanceCount: 0,
        asyncDeclineCount: 0,
      },
      metadata: {
        totalMessages: 0,
        totalAsyncWork: 0,
        successfulAsyncWork: 0,
      },
    };

    this.sessions.set(sessionId, newSession);

    // Persist to database
    if (this.persistenceEnabled) {
      asyncStatePersistence.saveSession(newSession).catch(() => {});
    }

    return newSession;
  }

  /**
   * Get or create session (synchronous, backward compatible)
   *
   * Note: This loads from cache only. For full persistence support,
   * use getOrCreateAsync() instead.
   */
  getOrCreate(sessionId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      const now = Date.now();
      const newSession: SessionState = {
        sessionId,
        createdAt: now,
        lastActivityAt: now,
        conversationHistory: [],
        asyncWork: [],
        preferences: {
          hasAcceptedAsyncBefore: false,
          asyncAcceptanceCount: 0,
          asyncDeclineCount: 0,
        },
        metadata: {
          totalMessages: 0,
          totalAsyncWork: 0,
          successfulAsyncWork: 0,
        },
      };

      this.sessions.set(sessionId, newSession);

      // Async persist (fire-and-forget)
      if (this.persistenceEnabled) {
        asyncStatePersistence.saveSession(newSession).catch(() => {});
      }
    }

    const session = this.sessions.get(sessionId)!;
    session.lastActivityAt = Date.now();
    return session;
  }

  /**
   * Add message to conversation history
   */
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: { containsOffer?: boolean; containsConfirmation?: boolean }
  ): void {
    const session = this.getOrCreate(sessionId);

    session.conversationHistory.push({
      role,
      content,
      timestamp: Date.now(),
      ...metadata,
    });

    session.metadata.totalMessages++;

    // Persist to database
    if (this.persistenceEnabled) {
      asyncStatePersistence.saveSession(session).catch(() => {});
    }
  }

  /**
   * Add async work item
   */
  addAsyncWork(sessionId: string, work: Omit<AsyncWorkItem, 'id' | 'sessionId'>): string {
    const session = this.getOrCreate(sessionId);

    const workId = `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workItem: AsyncWorkItem = {
      id: workId,
      sessionId,
      ...work,
    };

    session.asyncWork.push(workItem);
    session.metadata.totalAsyncWork++;

    // Persist work item and session
    if (this.persistenceEnabled) {
      asyncStatePersistence.saveWorkItem(workItem).catch(() => {});
      asyncStatePersistence.saveSession(session).catch(() => {});
    }

    return workId;
  }

  /**
   * Update async work status
   */
  updateAsyncWork(
    workId: string,
    updates: Partial<Pick<AsyncWorkItem, 'status' | 'startedAt' | 'completedAt' | 'result' | 'error'>>
  ): void {
    for (const session of this.sessions.values()) {
      const work = session.asyncWork.find((w) => w.id === workId);
      if (work) {
        Object.assign(work, updates);

        // Update metadata
        if (updates.status === 'accepted' && work.status !== 'accepted') {
          session.preferences.hasAcceptedAsyncBefore = true;
          session.preferences.asyncAcceptanceCount++;
        }

        if (updates.status === 'completed') {
          session.metadata.successfulAsyncWork++;
        }

        // Persist work item and session
        if (this.persistenceEnabled) {
          asyncStatePersistence.saveWorkItem(work).catch(() => {});
          asyncStatePersistence.saveSession(session).catch(() => {});
        }

        break;
      }
    }
  }

  /**
   * Get active async work for session
   */
  getActiveWork(sessionId: string): AsyncWorkItem[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.asyncWork.filter(
      (w) => w.status === 'in_progress' || w.status === 'accepted'
    );
  }

  /**
   * Get pending offers for session
   */
  getPendingOffers(sessionId: string): AsyncWorkItem[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.asyncWork.filter((w) => w.status === 'offered');
  }

  /**
   * Get completed work for session
   */
  getCompletedWork(sessionId: string): AsyncWorkItem[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.asyncWork.filter((w) => w.status === 'completed');
  }

  /**
   * Get conversation length
   */
  getConversationLength(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session?.conversationHistory.length || 0;
  }

  /**
   * Check if user has active work
   */
  hasActiveWork(sessionId: string): boolean {
    return this.getActiveWork(sessionId).length > 0;
  }

  /**
   * Get session statistics
   */
  getStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      conversationLength: session.conversationHistory.length,
      totalAsyncWork: session.metadata.totalAsyncWork,
      successfulAsyncWork: session.metadata.successfulAsyncWork,
      activeWork: this.getActiveWork(sessionId).length,
      completedWork: this.getCompletedWork(sessionId).length,
      asyncAcceptanceRate:
        session.preferences.asyncAcceptanceCount /
        (session.preferences.asyncAcceptanceCount + session.preferences.asyncDeclineCount || 1),
      sessionDuration: Date.now() - session.createdAt,
    };
  }

  /**
   * Clean up old sessions
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];

      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivityAt > this.maxSessionAgeMs) {
          toDelete.push(sessionId);
        }
      }

      for (const sessionId of toDelete) {
        this.sessions.delete(sessionId);
      }

      if (toDelete.length > 0) {
        console.log(`[SessionStateManager] Cleaned up ${toDelete.length} stale sessions`);
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Get all active sessions (for debugging)
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete session (for cleanup or logout)
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);

    // Delete from database
    if (this.persistenceEnabled) {
      asyncStatePersistence.deleteSession(sessionId).catch(() => {});
    }
  }
}

// Export singleton instance
export const sessionStateManager = new SessionStateManager();

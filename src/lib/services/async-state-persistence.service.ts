/**
 * Async State Persistence Service
 *
 * Persists async work state to Supabase for scale-to-zero compatibility:
 * - Session state (preferences, metadata, conversation history)
 * - Work items (pending, active, completed, failed)
 * - Enables server restarts without losing state
 * - Enables async work continuation across deployments
 *
 * Uses the existing analytics connection pool for efficiency
 */

import { createLogger } from '@/lib/logger';
import { analyticsPool } from '@/lib/analytics/connection-pool';
import type {
  AsyncWorkItem,
  SessionState,
  ConversationMessage
} from './session-state.service';

const logger = createLogger('async-persistence');

export class AsyncStatePersistenceService {
  /**
   * Save or update session state
   */
  async saveSession(sessionState: SessionState): Promise<boolean> {
    try {
      const result = await analyticsPool.executeQuery<any[]>(
        `INSERT INTO async_session_state (
          session_id,
          last_activity_at,
          has_accepted_async_before,
          async_acceptance_count,
          async_decline_count,
          total_messages,
          total_async_work,
          successful_async_work,
          conversation_history
        ) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (session_id) DO UPDATE SET
          last_activity_at = EXCLUDED.last_activity_at,
          has_accepted_async_before = EXCLUDED.has_accepted_async_before,
          async_acceptance_count = EXCLUDED.async_acceptance_count,
          async_decline_count = EXCLUDED.async_decline_count,
          total_messages = EXCLUDED.total_messages,
          total_async_work = EXCLUDED.total_async_work,
          successful_async_work = EXCLUDED.successful_async_work,
          conversation_history = EXCLUDED.conversation_history
        RETURNING id`,
        [
          sessionState.sessionId,
          sessionState.lastActivityAt,
          sessionState.preferences.hasAcceptedAsyncBefore,
          sessionState.preferences.asyncAcceptanceCount,
          sessionState.preferences.asyncDeclineCount,
          sessionState.metadata.totalMessages,
          sessionState.metadata.totalAsyncWork,
          sessionState.metadata.successfulAsyncWork,
          JSON.stringify(sessionState.conversationHistory)
        ],
        { skipOnError: true }
      );

      return result !== null;
    } catch (error) {
      logger.error('Failed to save session state', {
        sessionId: sessionState.sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Load session state from database
   */
  async loadSession(sessionId: string): Promise<SessionState | null> {
    try {
      const result = await analyticsPool.executeQuery<any[]>(
        `SELECT
          session_id,
          EXTRACT(EPOCH FROM created_at) * 1000 as created_at,
          EXTRACT(EPOCH FROM last_activity_at) * 1000 as last_activity_at,
          has_accepted_async_before,
          async_acceptance_count,
          async_decline_count,
          total_messages,
          total_async_work,
          successful_async_work,
          conversation_history
        FROM async_session_state
        WHERE session_id = $1`,
        [sessionId],
        { skipOnError: true }
      );

      if (!result || result.length === 0) {
        return null;
      }

      const row = result[0];

      // Load associated work items
      const workItems = await this.loadWorkItems(sessionId);

      return {
        sessionId: row.session_id,
        createdAt: Math.floor(row.created_at),
        lastActivityAt: Math.floor(row.last_activity_at),
        conversationHistory: row.conversation_history || [],
        asyncWork: workItems,
        preferences: {
          hasAcceptedAsyncBefore: row.has_accepted_async_before || false,
          asyncAcceptanceCount: row.async_acceptance_count || 0,
          asyncDeclineCount: row.async_decline_count || 0
        },
        metadata: {
          totalMessages: row.total_messages || 0,
          totalAsyncWork: row.total_async_work || 0,
          successfulAsyncWork: row.successful_async_work || 0
        }
      };
    } catch (error) {
      logger.error('Failed to load session state', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Save or update work item
   */
  async saveWorkItem(workItem: AsyncWorkItem): Promise<boolean> {
    try {
      const result = await analyticsPool.executeQuery<any[]>(
        `INSERT INTO async_work_items (
          id,
          session_id,
          type,
          request,
          status,
          estimated_duration_ms,
          started_at,
          completed_at,
          result,
          error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          started_at = EXCLUDED.started_at,
          completed_at = EXCLUDED.completed_at,
          result = EXCLUDED.result,
          error = EXCLUDED.error
        RETURNING id`,
        [
          workItem.id,
          workItem.sessionId,
          workItem.type,
          workItem.request,
          workItem.status,
          workItem.estimatedDuration,
          workItem.startedAt ? new Date(workItem.startedAt).toISOString() : null,
          workItem.completedAt ? new Date(workItem.completedAt).toISOString() : null,
          workItem.result ? JSON.stringify(workItem.result) : null,
          workItem.error || null
        ],
        { skipOnError: true }
      );

      return result !== null;
    } catch (error) {
      logger.error('Failed to save work item', {
        workId: workItem.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Load all work items for a session
   */
  async loadWorkItems(sessionId: string): Promise<AsyncWorkItem[]> {
    try {
      const result = await analyticsPool.executeQuery<any[]>(
        `SELECT
          id,
          session_id,
          type,
          request,
          status,
          estimated_duration_ms,
          EXTRACT(EPOCH FROM started_at) * 1000 as started_at,
          EXTRACT(EPOCH FROM completed_at) * 1000 as completed_at,
          result,
          error
        FROM async_work_items
        WHERE session_id = $1
        ORDER BY created_at DESC`,
        [sessionId],
        { skipOnError: true }
      );

      if (!result) {
        return [];
      }

      return result.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        type: row.type,
        request: row.request,
        status: row.status,
        estimatedDuration: row.estimated_duration_ms,
        startedAt: row.started_at ? Math.floor(row.started_at) : undefined,
        completedAt: row.completed_at ? Math.floor(row.completed_at) : undefined,
        result: row.result,
        error: row.error
      }));
    } catch (error) {
      logger.error('Failed to load work items', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Delete session and all associated work items
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await analyticsPool.executeQuery(
        'DELETE FROM async_session_state WHERE session_id = $1',
        [sessionId],
        { skipOnError: true }
      );
      return true;
    } catch (error) {
      logger.error('Failed to delete session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get active work items across all sessions (for queue restoration)
   */
  async getActiveWorkItems(): Promise<AsyncWorkItem[]> {
    try {
      const result = await analyticsPool.executeQuery<any[]>(
        `SELECT
          id,
          session_id,
          type,
          request,
          status,
          estimated_duration_ms,
          EXTRACT(EPOCH FROM started_at) * 1000 as started_at,
          EXTRACT(EPOCH FROM completed_at) * 1000 as completed_at,
          result,
          error
        FROM async_work_items
        WHERE status IN ('accepted', 'in_progress')
        ORDER BY created_at ASC`,
        [],
        { skipOnError: true }
      );

      if (!result) {
        return [];
      }

      return result.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        type: row.type,
        request: row.request,
        status: row.status,
        estimatedDuration: row.estimated_duration_ms,
        startedAt: row.started_at ? Math.floor(row.started_at) : undefined,
        completedAt: row.completed_at ? Math.floor(row.completed_at) : undefined,
        result: row.result,
        error: row.error
      }));
    } catch (error) {
      logger.error('Failed to get active work items', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Cleanup old sessions (call periodically or via cron)
   */
  async cleanupOldSessions(maxAgeHours: number = 24): Promise<{ sessions: number; workItems: number }> {
    try {
      const result = await analyticsPool.executeQuery<any[]>(
        'SELECT * FROM cleanup_old_async_sessions($1)',
        [maxAgeHours],
        { skipOnError: true }
      );

      if (!result || result.length === 0) {
        return { sessions: 0, workItems: 0 };
      }

      return {
        sessions: result[0].deleted_sessions || 0,
        workItems: result[0].deleted_work_items || 0
      };
    } catch (error) {
      logger.error('Failed to cleanup old sessions', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { sessions: 0, workItems: 0 };
    }
  }
}

// Export singleton instance
export const asyncStatePersistence = new AsyncStatePersistenceService();

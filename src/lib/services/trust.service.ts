/**
 * Trust Recovery Protocol Service
 *
 * Core principle: Trust increases when users challenge Noah and Noah responds honestly.
 * This service tracks trust events and calculates trust scores per session.
 */

import { analyticsDb } from '../analytics/database';
import { createLogger } from '../logger';

const logger = createLogger('TrustService');

export interface TrustEvent {
  sessionId: string;
  eventType: 'challenge' | 'admission_of_uncertainty' | 'correction' | 'skeptic_mode_enabled';
  impactScore: number; // How much this event should affect trust
  context?: string;
}

export class TrustService {
  private trustCache: Map<string, number> = new Map();

  /**
   * Get current trust level for a session
   * Base level: 15% (healthy skepticism)
   * Max level: 100%
   * Trust increases through challenges and honest responses
   */
  async getTrustLevel(sessionId: string): Promise<number> {
    // Check cache first
    if (this.trustCache.has(sessionId)) {
      return this.trustCache.get(sessionId)!;
    }

    try {
      // Calculate trust from event history
      const result = await analyticsDb.executeQuery<{ trust_score: number }[]>(
        `SELECT
          LEAST(100, GREATEST(15, 15 + SUM(impact_score))) as trust_score
         FROM trust_events
         WHERE session_id = $1`,
        [sessionId]
      );

      const trustLevel = result[0]?.trust_score || 15;
      this.trustCache.set(sessionId, trustLevel);

      return trustLevel;
    } catch (error) {
      logger.error('Failed to calculate trust level', { error, sessionId });
      return 15; // Default: healthy skepticism
    }
  }

  /**
   * Log a trust event and update trust level
   */
  async logTrustEvent(event: TrustEvent): Promise<number> {
    try {
      // Log the event
      await analyticsDb.executeQuery(
        `INSERT INTO trust_events (session_id, event_type, impact_score, context)
         VALUES ($1, $2, $3, $4)`,
        [event.sessionId, event.eventType, event.impactScore, event.context || null]
      );

      // Invalidate cache
      this.trustCache.delete(event.sessionId);

      // Return new trust level
      return await this.getTrustLevel(event.sessionId);
    } catch (error) {
      logger.error('Failed to log trust event', { error, event });
      // Return current trust level even if logging fails
      return await this.getTrustLevel(event.sessionId);
    }
  }

  /**
   * Handle a challenge event
   */
  async handleChallenge(sessionId: string, messageContent?: string): Promise<number> {
    return this.logTrustEvent({
      sessionId,
      eventType: 'challenge',
      impactScore: 3, // +3 points for challenging
      context: messageContent
    });
  }

  /**
   * Handle Noah admitting uncertainty
   * Detected when response contains phrases like "I'm not sure", "I don't know", etc.
   */
  async handleAdmissionOfUncertainty(sessionId: string, responseContent: string): Promise<number> {
    const uncertaintyPhrases = [
      "i'm not sure",
      "i don't know",
      "uncertain",
      "i could be wrong",
      "let me reconsider",
      "that's a fair point"
    ];

    const containsUncertainty = uncertaintyPhrases.some(phrase =>
      responseContent.toLowerCase().includes(phrase)
    );

    if (containsUncertainty) {
      return this.logTrustEvent({
        sessionId,
        eventType: 'admission_of_uncertainty',
        impactScore: 5, // +5 points for honest admission
        context: 'Admitted uncertainty or reconsidered position'
      });
    }

    return await this.getTrustLevel(sessionId);
  }

  /**
   * Handle Noah correcting a previous response
   */
  async handleCorrection(sessionId: string): Promise<number> {
    return this.logTrustEvent({
      sessionId,
      eventType: 'correction',
      impactScore: 7, // +7 points for self-correction
      context: 'Corrected previous response'
    });
  }

  /**
   * Handle skeptic mode being enabled
   */
  async handleSkepticModeEnabled(sessionId: string): Promise<number> {
    return this.logTrustEvent({
      sessionId,
      eventType: 'skeptic_mode_enabled',
      impactScore: 2, // +2 points for enabling critical evaluation
      context: 'User enabled skeptic mode'
    });
  }

  /**
   * Clear cache for a session (useful after session ends)
   */
  clearCache(sessionId?: string): void {
    if (sessionId) {
      this.trustCache.delete(sessionId);
    } else {
      this.trustCache.clear();
    }
  }
}

// Singleton instance
let trustServiceInstance: TrustService | null = null;

export function getTrustService(): TrustService {
  if (!trustServiceInstance) {
    trustServiceInstance = new TrustService();
  }
  return trustServiceInstance;
}

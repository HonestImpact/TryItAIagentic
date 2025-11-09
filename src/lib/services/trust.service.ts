/**
 * Credibility Tracking Service
 *
 * Measures Noah's earned credibility through his behavior:
 * - Being challenged LOWERS credibility (Noah said something questionable)
 * - Admitting uncertainty RAISES credibility (Noah is being honest)
 *
 * This is NOT measuring user trust - it's measuring Noah's credible behavior.
 * Database: trust_events (implementation detail, tracks credibility events)
 */

import { analyticsDb } from '../analytics/database';
import { createLogger } from '../logger';

const logger = createLogger('TrustService');

export interface TrustEvent {
  sessionId: string;
  eventType: 'challenge' | 'admission_of_uncertainty' | 'correction' | 'skeptic_mode_enabled' | 'positive_feedback';
  impactScore: number; // How much this event should affect credibility
  context?: string;
}

export class TrustService {
  private trustCache: Map<string, number> = new Map();

  /**
   * Get current trust level for a session
   * Base level: 40% (skeptical but open to possibilities)
   * Max level: 100%
   * Trust DECREASES when challenged (signal of distrust)
   * Trust INCREASES when Noah responds honestly
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
          LEAST(100, GREATEST(0, 40 + SUM(impact_score))) as trust_score
         FROM trust_events
         WHERE session_id = $1`,
        [sessionId]
      );

      const trustLevel = result[0]?.trust_score || 40;
      this.trustCache.set(sessionId, trustLevel);

      return trustLevel;
    } catch (error) {
      logger.error('Failed to calculate trust level', { error, sessionId });
      return 40; // Default: skeptical but open
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
   * Challenging means trust is LOW - user doesn't believe the response
   */
  async handleChallenge(sessionId: string, messageContent?: string): Promise<number> {
    return this.logTrustEvent({
      sessionId,
      eventType: 'challenge',
      impactScore: -5, // -5% for challenging (signal of distrust)
      context: messageContent
    });
  }

  /**
   * Handle Noah admitting uncertainty
   * Honesty about limitations INCREASES trust (even after challenge)
   * Detected when response contains phrases like "I'm not sure", "I don't know", etc.
   */
  async handleAdmissionOfUncertainty(sessionId: string, responseContent: string): Promise<number> {
    const uncertaintyPhrases = [
      "i'm not sure",
      "i don't know",
      "uncertain",
      "i could be wrong",
      "let me reconsider",
      "that's a fair point",
      "you're right",
      "good catch",
      "i was wrong"
    ];

    const containsUncertainty = uncertaintyPhrases.some(phrase =>
      responseContent.toLowerCase().includes(phrase)
    );

    if (containsUncertainty) {
      return this.logTrustEvent({
        sessionId,
        eventType: 'admission_of_uncertainty',
        impactScore: 2, // +2% for honest admission (modest reward, avoids gaming perception)
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
      impactScore: 2, // +2 points for self-correction (modest - let user judge if it was good)
      context: 'Corrected previous response'
    });
  }

  /**
   * Handle skeptic mode being enabled
   * Handicap system: User signals skepticism with real consequence
   * Only happens once per session (anti-gaming)
   */
  async handleSkepticModeEnabled(sessionId: string): Promise<number> {
    return this.logTrustEvent({
      sessionId,
      eventType: 'skeptic_mode_enabled',
      impactScore: -15, // -15% handicap - user is skeptical, Noah must prove himself
      context: 'User enabled skeptic mode (handicap applied)'
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

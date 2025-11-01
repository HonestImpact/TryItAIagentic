/**
 * Learning Service
 *
 * Enables agents to learn from experience and get smarter over time.
 *
 * Capabilities:
 * - Records successful workflows (what worked, what patterns, what confidence)
 * - Tracks failure patterns (what approaches didn't work, why)
 * - Retrieves best practices for similar requests
 * - Predicts likely outcomes based on historical data
 * - Cross-agent learning (Tinkerer's successes inform Wanderer's research)
 *
 * Learning lifecycle:
 * 1. Agent completes task (success or failure)
 * 2. Workflow details recorded with outcome metrics
 * 3. Future similar requests query best practices
 * 4. Agent uses learned knowledge to improve first-attempt quality
 *
 * @example
 * ```typescript
 * // Record success
 * await learningService.recordSuccess({
 *   domain: 'code-generation',
 *   context: 'dashboard with charts',
 *   approach: 'Simple Charts + Dashboard Layout pattern',
 *   patternsUsed: ['Simple Charts', 'Dashboard Layout'],
 *   outcome: { confidence: 0.9, time: 45000, iterations: 1 }
 * });
 *
 * // Later, retrieve for similar request
 * const practices = await learningService.getBestPractices('code-generation', 'interactive dashboard');
 * // Returns: Previous dashboard succeeded with Simple Charts pattern (0.9 confidence)
 * ```
 */

import { createLogger } from '@/lib/logger';
import { analyticsPool } from '@/lib/analytics/connection-pool';
import type {
  ILearningService,
  WorkflowMemory,
  BestPractice
} from './types';

const logger = createLogger('learning-service');

export class LearningService implements ILearningService {
  private successMemories: WorkflowMemory[] = [];
  private failureMemories: Map<string, string[]> = new Map();

  // Cache settings
  private readonly MIN_CONFIDENCE_TO_LEARN = 0.7;
  private readonly MAX_MEMORIES = 1000; // Prevent unbounded growth
  private readonly SIMILARITY_THRESHOLD = 0.4;

  private isInitialized = false;

  constructor() {
    logger.info('✅ Learning service initialized');
    // Load memories from database asynchronously
    this.loadMemoriesFromDatabase().catch(err => {
      logger.error('Failed to load memories from database', { error: err });
    });
  }

  /**
   * Load workflow memories from database on startup
   */
  private async loadMemoriesFromDatabase(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const memories = await analyticsPool.executeQuery<Array<{
        domain: string;
        context: string;
        approach: string;
        patterns_used: string[];
        what_worked: string | null;
        confidence: number;
        time_ms: number;
        iterations: number;
        created_at: Date;
      }>>(
        `SELECT
          domain, context, approach, patterns_used, what_worked,
          confidence, time_ms, iterations, created_at
         FROM workflow_memories
         ORDER BY confidence DESC
         LIMIT $1`,
        [this.MAX_MEMORIES],
        { skipOnError: false }
      );

      if (memories && memories.length > 0) {
        this.successMemories = memories.map(m => ({
          domain: m.domain,
          context: m.context,
          approach: m.approach,
          patternsUsed: m.patterns_used,
          whatWorked: m.what_worked || undefined,
          outcome: {
            confidence: m.confidence,
            time: m.time_ms,
            iterations: m.iterations
          },
          timestamp: m.created_at
        }));

        logger.info('📚 Loaded workflow memories from database', {
          count: memories.length,
          topConfidence: memories[0]?.confidence,
          domains: [...new Set(memories.map(m => m.domain))].length
        });
      } else {
        logger.info('📚 No workflow memories found in database (fresh start)');
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to load workflow memories from database', { error });
      // Continue with empty memory - graceful degradation
      this.isInitialized = true;
    }
  }

  /**
   * Record successful workflow for future reference
   *
   * Only records high-confidence successes (>= 0.7) to avoid learning from mediocre work
   */
  async recordSuccess(memory: WorkflowMemory): Promise<void> {
    if (memory.outcome.confidence < this.MIN_CONFIDENCE_TO_LEARN) {
      logger.debug('Skipping low-confidence success', {
        confidence: memory.outcome.confidence,
        threshold: this.MIN_CONFIDENCE_TO_LEARN
      });
      return;
    }

    const timestampedMemory = {
      ...memory,
      timestamp: new Date()
    };

    this.successMemories.push(timestampedMemory);

    // Prevent unbounded growth
    if (this.successMemories.length > this.MAX_MEMORIES) {
      // Keep only highest-confidence memories
      this.successMemories.sort((a, b) => b.outcome.confidence - a.outcome.confidence);
      this.successMemories = this.successMemories.slice(0, this.MAX_MEMORIES);
    }

    // Persist to database for long-term learning
    try {
      await analyticsPool.executeQuery(
        `INSERT INTO workflow_memories (
          domain, context, approach, patterns_used, what_worked,
          confidence, time_ms, iterations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          memory.domain,
          memory.context,
          memory.approach,
          JSON.stringify(memory.patternsUsed),
          memory.whatWorked || null,
          memory.outcome.confidence,
          memory.outcome.time,
          memory.outcome.iterations
        ],
        { skipOnError: true }
      );

      logger.info('💾 Recorded successful workflow to database', {
        domain: memory.domain,
        confidence: memory.outcome.confidence,
        approach: memory.approach,
        patterns: memory.patternsUsed.length,
        totalMemories: this.successMemories.length
      });
    } catch (error) {
      logger.error('Failed to persist workflow memory to database', {
        error,
        domain: memory.domain
      });
      // Continue even if database write fails - in-memory cache still works
    }
  }

  /**
   * Record failed approach to avoid repeating mistakes
   */
  async recordFailure(
    domain: string,
    approach: string,
    reason: string
  ): Promise<void> {
    if (!this.failureMemories.has(domain)) {
      this.failureMemories.set(domain, []);
    }

    const failureRecord = `${approach}: ${reason}`;
    this.failureMemories.get(domain)!.push(failureRecord);

    logger.info('📝 Recorded failure pattern', {
      domain,
      approach,
      reason,
      totalFailures: this.failureMemories.get(domain)!.length
    });
  }

  /**
   * Retrieve best practices from similar successful workflows
   *
   * Uses similarity matching to find relevant past successes:
   * - Exact domain match
   * - Context similarity (word overlap)
   * - Sorted by confidence (best practices first)
   */
  async getBestPractices(
    domain: string,
    context: string
  ): Promise<BestPractice[]> {
    const relevant = this.successMemories
      .filter(m => m.domain === domain)
      .filter(m => this.calculateSimilarity(m.context, context) >= this.SIMILARITY_THRESHOLD)
      .map(m => this.convertToBestPractice(m))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 best practices

    if (relevant.length > 0) {
      logger.info('📚 Found best practices', {
        domain,
        count: relevant.length,
        topConfidence: relevant[0].confidence,
        topApproach: relevant[0].approach
      });
    } else {
      logger.debug('No best practices found', {
        domain,
        totalMemories: this.successMemories.filter(m => m.domain === domain).length
      });
    }

    return relevant;
  }

  /**
   * Get known pitfalls for a domain
   *
   * Returns list of approaches that have failed before, so agent can avoid them
   */
  async getKnownPitfalls(domain: string): Promise<string[]> {
    const pitfalls = this.failureMemories.get(domain) || [];

    if (pitfalls.length > 0) {
      logger.info('⚠️ Retrieved known pitfalls', {
        domain,
        count: pitfalls.length
      });
    }

    return pitfalls;
  }

  /**
   * Predict expected outcome for a proposed approach
   *
   * Based on historical data, predicts likely confidence score
   */
  async predictOutcome(
    domain: string,
    approach: string,
    context: string
  ): Promise<{ expectedConfidence: number; reasoning: string }> {
    // Find similar successful workflows
    const similar = this.successMemories
      .filter(m => m.domain === domain)
      .filter(m => this.calculateSimilarity(m.approach, approach) >= 0.5)
      .filter(m => this.calculateSimilarity(m.context, context) >= this.SIMILARITY_THRESHOLD);

    if (similar.length === 0) {
      return {
        expectedConfidence: 0.5,
        reasoning: 'No similar historical workflows found - uncertain outcome'
      };
    }

    // Average confidence from similar workflows
    const avgConfidence = similar.reduce((sum, m) => sum + m.outcome.confidence, 0) / similar.length;
    const bestConfidence = Math.max(...similar.map(m => m.outcome.confidence));

    logger.info('🔮 Predicted outcome based on history', {
      domain,
      similarWorkflows: similar.length,
      expectedConfidence: avgConfidence,
      bestHistorical: bestConfidence
    });

    return {
      expectedConfidence: avgConfidence,
      reasoning: `Based on ${similar.length} similar workflows averaging ${avgConfidence.toFixed(2)} confidence (best: ${bestConfidence.toFixed(2)})`
    };
  }

  /**
   * Get learning statistics for monitoring
   */
  getStatistics(): {
    totalSuccesses: number;
    totalFailures: number;
    domainBreakdown: Record<string, number>;
    averageConfidence: number;
  } {
    const domainBreakdown: Record<string, number> = {};

    for (const memory of this.successMemories) {
      domainBreakdown[memory.domain] = (domainBreakdown[memory.domain] || 0) + 1;
    }

    const avgConfidence = this.successMemories.length > 0
      ? this.successMemories.reduce((sum, m) => sum + m.outcome.confidence, 0) / this.successMemories.length
      : 0;

    const totalFailures = Array.from(this.failureMemories.values())
      .reduce((sum, failures) => sum + failures.length, 0);

    return {
      totalSuccesses: this.successMemories.length,
      totalFailures,
      domainBreakdown,
      averageConfidence: avgConfidence
    };
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Calculate similarity between two text strings
   *
   * Uses simple word-overlap similarity (Jaccard index)
   * Good enough for learning service, can be upgraded to embeddings later
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.normalize(text1).split(/\s+/));
    const words2 = new Set(this.normalize(text2).split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();
  }

  private convertToBestPractice(memory: WorkflowMemory): BestPractice {
    return {
      approach: memory.approach,
      confidence: memory.outcome.confidence,
      patternsUsed: memory.patternsUsed,
      whatWorked: memory.whatWorked,
      timeSaved: memory.outcome.iterations === 1 ? memory.outcome.time : undefined
    };
  }

  /**
   * Clear all learning data (useful for testing)
   */
  clear(): void {
    this.successMemories = [];
    this.failureMemories.clear();
    logger.warn('🧹 Learning data cleared');
  }
}

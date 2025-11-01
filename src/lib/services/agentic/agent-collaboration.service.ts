/**
 * Agent Collaboration Service
 *
 * Enables agents to share insights, learnings, and context beyond just passing outputs.
 * This transforms the system from procedural orchestration to true multi-agent collaboration.
 *
 * Key Principles:
 * - Agents contribute discoveries to shared knowledge
 * - Agents can query for relevant insights from other agents
 * - Cross-agent learning: Wanderer's research helps Tinkerer, Tinkerer's builds help Wanderer
 * - Bidirectional communication through shared context
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('agent-collaboration');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Insight contributed by an agent
 */
export interface AgentInsight {
  id: string;
  agentName: 'wanderer' | 'tinkerer' | 'noah';
  category: 'pattern' | 'pitfall' | 'technique' | 'best-practice';
  domain: string; // 'dashboards', 'forms', 'charts', etc.
  insight: string;
  confidence: number; // 0.0-1.0
  evidence?: string; // What led to this insight
  relatedContext: string[]; // Tags for matching
  timestamp: Date;
  usageCount: number; // How many times this insight was helpful
  successRate: number; // 0.0-1.0 - how often following this insight led to success
}

/**
 * Request from one agent for help/context from others
 */
export interface AgentRequest {
  requestingAgent: 'wanderer' | 'tinkerer' | 'noah';
  requestType: 'insights' | 'patterns' | 'pitfalls' | 'clarification';
  context: string;
  domain?: string;
  tags?: string[];
}

/**
 * Collaboration context shared between agents
 */
export interface CollaborationContext {
  sessionId: string;
  primaryAgent: string;
  supportingAgents: string[];
  sharedInsights: AgentInsight[];
  sharedLearnings: string[];
  warnings: string[]; // Pitfalls discovered during collaboration
}

// ============================================================================
// SERVICE
// ============================================================================

export class AgentCollaborationService {
  private insights: Map<string, AgentInsight[]>; // Keyed by domain
  private collaborationSessions: Map<string, CollaborationContext>;

  constructor() {
    this.insights = new Map();
    this.collaborationSessions = new Map();

    logger.info('✅ Agent collaboration service initialized');
  }

  // ========================================================================
  // INSIGHT CONTRIBUTION
  // ========================================================================

  /**
   * Agent contributes an insight from their work
   *
   * @example
   * // Wanderer after research
   * collaboration.contributeInsight({
   *   agentName: 'wanderer',
   *   category: 'pattern',
   *   domain: 'dashboards',
   *   insight: 'Grid-based layouts work better than flexbox for complex dashboards',
   *   confidence: 0.85,
   *   evidence: 'Found 15 examples using CSS Grid, only 2 with flexbox',
   *   relatedContext: ['dashboard', 'layout', 'responsive']
   * });
   *
   * // Tinkerer after successful build
   * collaboration.contributeInsight({
   *   agentName: 'tinkerer',
   *   category: 'best-practice',
   *   domain: 'forms',
   *   insight: 'Real-time validation prevents submission errors better than submit-time validation',
   *   confidence: 0.9,
   *   evidence: 'User testing showed 40% fewer errors with real-time validation',
   *   relatedContext: ['forms', 'validation', 'ux']
   * });
   */
  contributeInsight(params: Omit<AgentInsight, 'id' | 'timestamp' | 'usageCount' | 'successRate'>): void {
    const insight: AgentInsight = {
      ...params,
      id: `${params.agentName}-${Date.now()}`,
      timestamp: new Date(),
      usageCount: 0,
      successRate: 1.0 // Optimistic initial success rate
    };

    // Store by domain for fast retrieval
    if (!this.insights.has(params.domain)) {
      this.insights.set(params.domain, []);
    }

    this.insights.get(params.domain)!.push(insight);

    logger.info('📝 Agent contributed insight', {
      agent: params.agentName,
      category: params.category,
      domain: params.domain,
      confidence: params.confidence
    });
  }

  /**
   * Query insights from other agents
   *
   * @example
   * // Tinkerer building a dashboard
   * const insights = collaboration.queryInsights({
   *   requestingAgent: 'tinkerer',
   *   requestType: 'patterns',
   *   context: 'Building a data visualization dashboard',
   *   domain: 'dashboards',
   *   tags: ['charts', 'responsive']
   * });
   */
  queryInsights(request: AgentRequest): AgentInsight[] {
    const { domain, tags, context } = request;

    // Get all insights for this domain
    const domainInsights = domain ? this.insights.get(domain) || [] : [];

    // Get insights from related domains (fuzzy matching)
    const relatedInsights: AgentInsight[] = [];
    if (tags && tags.length > 0) {
      for (const [insightDomain, insights] of this.insights.entries()) {
        if (domain && insightDomain === domain) continue; // Already got these

        for (const insight of insights) {
          // Check if any tags match the insight's context
          const hasMatchingTag = tags.some(tag =>
            insight.relatedContext.some(ctx => ctx.includes(tag) || tag.includes(ctx))
          );

          if (hasMatchingTag) {
            relatedInsights.push(insight);
          }
        }
      }
    }

    // Combine and sort by relevance
    const allInsights = [...domainInsights, ...relatedInsights];

    const scoredInsights = allInsights.map(insight => ({
      insight,
      relevanceScore: this.calculateRelevance(insight, context, tags || [])
    }));

    const filteredInsights = scoredInsights
      .filter(scored => scored.relevanceScore > 0.3) // Minimum relevance threshold
      .sort((a, b) => {
        // Sort by: relevance * confidence * success rate
        const scoreA = a.relevanceScore * a.insight.confidence * a.insight.successRate;
        const scoreB = b.relevanceScore * b.insight.confidence * b.insight.successRate;
        return scoreB - scoreA;
      })
      .slice(0, 5) // Top 5 most relevant
      .map(scored => scored.insight);

    if (filteredInsights.length > 0) {
      logger.info('🔍 Found relevant insights from other agents', {
        requestingAgent: request.requestingAgent,
        count: filteredInsights.length,
        topAgent: filteredInsights[0].agentName,
        topCategory: filteredInsights[0].category
      });
    }

    return filteredInsights;
  }

  /**
   * Record that an insight was used and whether it was helpful
   */
  recordInsightUsage(insightId: string, wasSuccessful: boolean): void {
    // Find the insight across all domains
    for (const insights of this.insights.values()) {
      const insight = insights.find(i => i.id === insightId);

      if (insight) {
        insight.usageCount += 1;

        // Update success rate with exponential moving average
        const alpha = 0.3; // Weight for new observation
        insight.successRate = alpha * (wasSuccessful ? 1.0 : 0.0) + (1 - alpha) * insight.successRate;

        logger.debug('Updated insight usage stats', {
          insightId,
          usageCount: insight.usageCount,
          successRate: insight.successRate.toFixed(2),
          wasSuccessful
        });

        break;
      }
    }
  }

  // ========================================================================
  // COLLABORATION SESSION MANAGEMENT
  // ========================================================================

  /**
   * Start a collaboration session between agents
   */
  startCollaboration(params: {
    sessionId: string;
    primaryAgent: string;
    supportingAgents: string[];
  }): CollaborationContext {
    const context: CollaborationContext = {
      ...params,
      sharedInsights: [],
      sharedLearnings: [],
      warnings: []
    };

    this.collaborationSessions.set(params.sessionId, context);

    logger.info('🤝 Started agent collaboration', {
      sessionId: params.sessionId,
      primary: params.primaryAgent,
      supporting: params.supportingAgents.join(', ')
    });

    return context;
  }

  /**
   * Add insights to a collaboration session
   */
  addToCollaboration(sessionId: string, insights: AgentInsight[]): void {
    const context = this.collaborationSessions.get(sessionId);
    if (!context) {
      logger.warn('Collaboration session not found', { sessionId });
      return;
    }

    context.sharedInsights.push(...insights);

    logger.debug('Added insights to collaboration', {
      sessionId,
      count: insights.length
    });
  }

  /**
   * Add a warning/pitfall discovered during collaboration
   */
  addWarning(sessionId: string, warning: string): void {
    const context = this.collaborationSessions.get(sessionId);
    if (!context) return;

    context.warnings.push(warning);

    logger.debug('Added warning to collaboration', {
      sessionId,
      warning: warning.substring(0, 50)
    });
  }

  /**
   * Get collaboration context for a session
   */
  getCollaborationContext(sessionId: string): CollaborationContext | null {
    return this.collaborationSessions.get(sessionId) || null;
  }

  /**
   * End a collaboration session and clean up
   */
  endCollaboration(sessionId: string): void {
    this.collaborationSessions.delete(sessionId);

    logger.debug('Ended collaboration session', { sessionId });
  }

  // ========================================================================
  // CROSS-AGENT LEARNING
  // ========================================================================

  /**
   * Get aggregated learnings from all agents for a specific domain
   */
  getAggregatedLearnings(domain: string): {
    patterns: string[];
    pitfalls: string[];
    techniques: string[];
  } {
    const domainInsights = this.insights.get(domain) || [];

    const patterns = domainInsights
      .filter(i => i.category === 'pattern' && i.successRate > 0.7)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 3)
      .map(i => `${i.insight} (used ${i.usageCount}x, ${(i.successRate * 100).toFixed(0)}% success)`);

    const pitfalls = domainInsights
      .filter(i => i.category === 'pitfall')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(i => i.insight);

    const techniques = domainInsights
      .filter(i => i.category === 'technique' || i.category === 'best-practice')
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)
      .map(i => i.insight);

    return { patterns, pitfalls, techniques };
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  /**
   * Calculate relevance score between insight and request context
   */
  private calculateRelevance(insight: AgentInsight, context: string, tags: string[]): number {
    let score = 0;

    // Normalize text
    const normalizedContext = context.toLowerCase();
    const normalizedInsight = insight.insight.toLowerCase();

    // Tag matching (highest weight)
    const matchingTags = tags.filter(tag =>
      insight.relatedContext.some(ctx => ctx.includes(tag) || tag.includes(ctx))
    );
    score += (matchingTags.length / Math.max(tags.length, 1)) * 0.5;

    // Word overlap in context
    const contextWords = new Set(normalizedContext.split(/\s+/));
    const insightWords = new Set(normalizedInsight.split(/\s+/));
    const intersection = new Set([...contextWords].filter(w => insightWords.has(w)));
    score += (intersection.size / Math.max(contextWords.size, 1)) * 0.3;

    // Category boost (patterns are often more actionable)
    if (insight.category === 'pattern' || insight.category === 'best-practice') {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }
}

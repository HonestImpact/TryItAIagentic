/**
 * Pattern Library Service
 *
 * Curated collection of proven code generation patterns that agents can reference.
 * Patterns are ranked by success rate and matched to user contexts.
 *
 * Benefits:
 * - Faster first-attempt quality (agent knows what works)
 * - Consistent code structure across similar requests
 * - Learning-informed pattern selection
 */

import { createLogger } from '@/lib/logger';
import type {
  IPatternLibrary,
  CodePattern,
  PatternRecommendation
} from './types';

const logger = createLogger('pattern-library');

// Curated pattern library
const PATTERNS: CodePattern[] = [
  {
    id: 'simple-component',
    name: 'Simple Component Pattern',
    category: 'component',
    description: 'Self-contained functional component with minimal dependencies',
    whenToUse: [
      'Single-purpose UI elements',
      'Stateless display components',
      'Reusable widgets'
    ],
    advantages: [
      'Easy to test',
      'Highly reusable',
      'No external dependencies'
    ],
    relatedPatterns: ['state-mgmt-hooks', 'prop-drilling']
  },
  {
    id: 'dashboard-layout',
    name: 'Dashboard Layout Pattern',
    category: 'layout',
    description: 'Grid-based responsive layout for data dashboards',
    whenToUse: [
      'Multiple data visualizations',
      'Analytics interfaces',
      'Admin panels'
    ],
    advantages: [
      'Responsive by default',
      'Easy to add/remove widgets',
      'Professional appearance'
    ],
    relatedPatterns: ['data-viz-canvas', 'responsive-grid']
  },
  {
    id: 'form-validation',
    name: 'Form with Validation Pattern',
    category: 'form',
    description: 'Controlled form with real-time validation and error handling',
    whenToUse: [
      'User input collection',
      'Multi-field forms',
      'Data submission workflows'
    ],
    advantages: [
      'Better UX with immediate feedback',
      'Prevents invalid submissions',
      'Accessible error messages'
    ],
    relatedPatterns: ['state-mgmt-hooks', 'controlled-inputs']
  },
  {
    id: 'data-viz-canvas',
    name: 'Canvas-Based Data Visualization',
    category: 'data-viz',
    description: 'Charts and graphs using HTML5 canvas for performance',
    whenToUse: [
      'Large datasets',
      'Real-time data updates',
      'Performance-critical visualizations'
    ],
    advantages: [
      'High performance with many data points',
      'Smooth animations',
      'Low DOM overhead'
    ],
    relatedPatterns: ['dashboard-layout']
  },
  {
    id: 'state-mgmt-hooks',
    name: 'React Hooks State Management',
    category: 'state-mgmt',
    description: 'Local state management using useState and useEffect',
    whenToUse: [
      'Component-local state',
      'Simple state updates',
      'No global state needed'
    ],
    advantages: [
      'No external dependencies',
      'Straightforward mental model',
      'Built into React'
    ],
    relatedPatterns: ['simple-component', 'form-validation']
  },
  {
    id: 'list-with-actions',
    name: 'Interactive List Pattern',
    category: 'component',
    description: 'List with add/remove/edit functionality',
    whenToUse: [
      'Todo lists',
      'Item collections',
      'CRUD interfaces'
    ],
    advantages: [
      'Familiar UX pattern',
      'Easy to extend',
      'Good for learning state management'
    ],
    relatedPatterns: ['state-mgmt-hooks', 'form-validation']
  },
  {
    id: 'responsive-grid',
    name: 'Responsive CSS Grid Layout',
    category: 'layout',
    description: 'Auto-responsive grid using CSS Grid with flexible columns',
    whenToUse: [
      'Card layouts',
      'Photo galleries',
      'Product grids'
    ],
    advantages: [
      'No media queries needed',
      'Auto-responsive',
      'Clean CSS'
    ],
    relatedPatterns: ['dashboard-layout']
  }
];

export class PatternLibrary implements IPatternLibrary {
  private patterns: Map<string, CodePattern>;
  private stats: Map<string, { successCount: number; totalAttempts: number; totalConfidence: number }>;

  constructor() {
    // Initialize pattern storage
    this.patterns = new Map(PATTERNS.map(p => [p.id, p]));
    this.stats = new Map();

    logger.info('✅ Pattern library initialized', {
      patternCount: this.patterns.size,
      categories: [...new Set(PATTERNS.map(p => p.category))]
    });
  }

  /**
   * Get a specific pattern by ID
   */
  getPattern(id: string): CodePattern | null {
    return this.patterns.get(id) || null;
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): CodePattern[] {
    return Array.from(this.patterns.values()).map(p => this.enrichPattern(p));
  }

  /**
   * Find patterns matching a context
   */
  findPatterns(
    context: string,
    category?: CodePattern['category']
  ): PatternRecommendation[] {
    const normalizedContext = this.normalizeText(context);
    const patterns = Array.from(this.patterns.values());

    // Filter by category if specified
    const candidatePatterns = category
      ? patterns.filter(p => p.category === category)
      : patterns;

    // Score each pattern based on context relevance
    const recommendations = candidatePatterns
      .map(pattern => {
        const relevanceScore = this.calculateRelevance(pattern, normalizedContext);
        const successProbability = this.getSuccessProbability(pattern.id);

        return {
          pattern: this.enrichPattern(pattern),
          relevanceScore,
          successProbability,
          reasoning: this.generateReasoning(pattern, relevanceScore, successProbability)
        };
      })
      .filter(rec => rec.relevanceScore > 0.3) // Only recommend if reasonably relevant
      .sort((a, b) => {
        // Sort by combined score: relevance * success probability
        const scoreA = a.relevanceScore * a.successProbability;
        const scoreB = b.relevanceScore * b.successProbability;
        return scoreB - scoreA;
      })
      .slice(0, 3); // Top 3 recommendations

    if (recommendations.length > 0) {
      logger.info('📚 Found pattern recommendations', {
        context: context.substring(0, 50),
        count: recommendations.length,
        topPattern: recommendations[0].pattern.name
      });
    }

    return recommendations;
  }

  /**
   * Update pattern statistics based on usage
   */
  updatePatternStats(patternId: string, success: boolean, confidence: number): void {
    if (!this.patterns.has(patternId)) {
      logger.warn('Unknown pattern ID', { patternId });
      return;
    }

    const existing = this.stats.get(patternId) || {
      successCount: 0,
      totalAttempts: 0,
      totalConfidence: 0
    };

    existing.totalAttempts += 1;
    if (success) {
      existing.successCount += 1;
    }
    existing.totalConfidence += confidence;

    this.stats.set(patternId, existing);

    logger.debug('Updated pattern stats', {
      patternId,
      success,
      confidence,
      successRate: (existing.successCount / existing.totalAttempts * 100).toFixed(1) + '%'
    });
  }

  /**
   * Get top-performing patterns
   */
  getTopPatterns(limit: number = 5): CodePattern[] {
    const patterns = Array.from(this.patterns.values())
      .map(p => this.enrichPattern(p))
      .sort((a, b) => {
        // Sort by success rate, then avg confidence
        const rateA = a.successRate || 0;
        const rateB = b.successRate || 0;
        if (rateA !== rateB) return rateB - rateA;
        return (b.avgConfidence || 0) - (a.avgConfidence || 0);
      })
      .slice(0, limit);

    return patterns;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Enrich pattern with computed statistics
   */
  private enrichPattern(pattern: CodePattern): CodePattern {
    const stats = this.stats.get(pattern.id);

    if (!stats || stats.totalAttempts === 0) {
      return { ...pattern };
    }

    return {
      ...pattern,
      successRate: stats.successCount / stats.totalAttempts,
      avgConfidence: stats.totalConfidence / stats.totalAttempts,
      usageCount: stats.totalAttempts
    };
  }

  /**
   * Calculate relevance score between pattern and context
   */
  private calculateRelevance(pattern: CodePattern, normalizedContext: string): number {
    let score = 0;

    // Check "when to use" scenarios
    for (const scenario of pattern.whenToUse) {
      const normalizedScenario = this.normalizeText(scenario);
      const overlap = this.textSimilarity(normalizedScenario, normalizedContext);
      score = Math.max(score, overlap);
    }

    // Boost score if pattern name appears in context
    const normalizedName = this.normalizeText(pattern.name);
    if (normalizedContext.includes(normalizedName)) {
      score = Math.max(score, 0.8);
    }

    // Check description
    const normalizedDesc = this.normalizeText(pattern.description);
    const descOverlap = this.textSimilarity(normalizedDesc, normalizedContext);
    score = Math.max(score, descOverlap * 0.7); // Description less important

    return Math.min(score, 1.0);
  }

  /**
   * Calculate text similarity using word overlap (Jaccard)
   */
  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Get success probability for a pattern
   */
  private getSuccessProbability(patternId: string): number {
    const stats = this.stats.get(patternId);

    if (!stats || stats.totalAttempts === 0) {
      return 0.7; // Default optimistic probability for untested patterns
    }

    // Combine success rate with confidence
    const successRate = stats.successCount / stats.totalAttempts;
    const avgConfidence = stats.totalConfidence / stats.totalAttempts;

    return (successRate * 0.7 + avgConfidence * 0.3);
  }

  /**
   * Generate reasoning for pattern recommendation
   */
  private generateReasoning(
    pattern: CodePattern,
    relevanceScore: number,
    successProbability: number
  ): string {
    const stats = this.stats.get(pattern.id);

    if (stats && stats.totalAttempts > 0) {
      const successRate = (stats.successCount / stats.totalAttempts * 100).toFixed(0);
      return `${pattern.name} has ${successRate}% success rate across ${stats.totalAttempts} uses. Relevance to your request: ${(relevanceScore * 100).toFixed(0)}%`;
    } else {
      return `${pattern.name} is a proven pattern for this type of request (${(relevanceScore * 100).toFixed(0)}% match)`;
    }
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

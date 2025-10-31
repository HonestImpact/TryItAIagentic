/**
 * Evaluation Service
 *
 * Provides realistic, calibrated quality evaluation for agent outputs.
 * Fixes the issue where working code scores 0.1-0.3 instead of realistic 0.7-0.9.
 *
 * Key features:
 * - Domain-specific evaluation criteria (code vs research vs conversation)
 * - Calibrated scoring (rewards excellence, realistic about completeness)
 * - Uses faster Haiku model for efficiency
 * - Context-aware (considers previous scores, iteration count)
 *
 * @example
 * ```typescript
 * const evaluation = await evaluationService.evaluate({
 *   content: generatedCode,
 *   criteria: 'code-quality',
 *   context: userRequest,
 *   previousScores: lastIterationScores
 * });
 *
 * if (evaluation.overall Confidence >= 0.8) {
 *   // Excellent quality, ship it!
 * }
 * ```
 */

import { createLogger } from '@/lib/logger';
import { LLMProvider } from '@/lib/services/llm-provider';
import type {
  IEvaluationService,
  EvaluationResult,
  QualityScores,
  EvaluationCriteria,
  EvaluationStandards
} from './types';

const logger = createLogger('evaluation-service');

export class EvaluationService implements IEvaluationService {
  private evaluationProvider: LLMProvider;

  constructor(baseProvider: LLMProvider) {
    // Use Haiku for fast, cheap evaluation (10x faster than Sonnet)
    this.evaluationProvider = new LLMProvider('ANTHROPIC', {
      model: 'claude-3-5-haiku-20241022',
      temperature: 0.2
    });

    logger.info('✅ Evaluation service initialized with Haiku model');
  }

  /**
   * Evaluate content against domain-specific quality criteria
   *
   * Returns realistic scores:
   * - 0.9-1.0: Production-grade excellence
   * - 0.7-0.8: Very good, minor polish needed
   * - 0.5-0.6: Functional, needs refinement
   * - 0.3-0.4: Working but not meeting standards
   * - 0.0-0.2: Needs significant work
   */
  async evaluate(params: {
    content: string;
    criteria: 'code-quality' | 'research-quality' | 'conversation-quality';
    previousScores?: QualityScores;
    context: string;
  }): Promise<EvaluationResult> {
    logger.info('📊 Starting evaluation', {
      criteria: params.criteria,
      contentLength: params.content.length,
      hasPreviousScores: !!params.previousScores
    });

    const standards = this.getStandards(params.criteria);
    const prompt = this.buildEvaluationPrompt(params, standards);

    try {
      const result = await this.evaluationProvider.generateText({
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a quality evaluator. Be realistic and fair. Respond ONLY with valid JSON.',
        temperature: 0.2
      });

      const evaluation = this.parseEvaluationResult(result.content);

      // Calibrate scores to be realistic
      evaluation.scores = this.calibrateScores(evaluation.scores, params.criteria);
      evaluation.overallConfidence = this.calculateOverallConfidence(evaluation.scores);

      logger.info('✅ Evaluation complete', {
        overallConfidence: evaluation.overallConfidence,
        needsRevision: evaluation.needsRevision,
        scores: evaluation.scores
      });

      return evaluation;

    } catch (error) {
      logger.error('💥 Evaluation failed', { error });

      // Fallback: basic heuristic evaluation
      return this.fallbackEvaluation(params.content, params.context);
    }
  }

  /**
   * Calibrate raw scores to be more realistic
   *
   * Problem: LLMs tend to be harsh evaluators, scoring 0.2-0.3 for working code
   * Solution: Apply domain-specific calibration to realistic ranges
   */
  calibrateScores(rawScores: QualityScores, domain: string): QualityScores {
    // For code: working implementation should score >= 0.6
    // Adjustment: if all dimensions >= 0.2, boost by calibration factor
    const avgScore = (rawScores.functionality + rawScores.codeQuality + rawScores.completeness + rawScores.usability) / 4;

    if (avgScore >= 0.2 && avgScore < 0.5) {
      // Likely being too harsh, calibrate upward
      const calibrationFactor = domain === 'code-quality' ? 1.4 : 1.2;

      return {
        functionality: Math.min(rawScores.functionality * calibrationFactor, 1.0),
        codeQuality: Math.min(rawScores.codeQuality * calibrationFactor, 1.0),
        completeness: Math.min(rawScores.completeness * calibrationFactor, 1.0),
        usability: Math.min(rawScores.usability * calibrationFactor, 1.0)
      };
    }

    return rawScores;
  }

  /**
   * Explain evaluation scores in human-readable format
   */
  explainScores(evaluation: EvaluationResult): string {
    const { scores } = evaluation;

    return `Quality Assessment:
- Functionality: ${this.scoreLabel(scores.functionality)} (${scores.functionality.toFixed(2)})
- Code Quality: ${this.scoreLabel(scores.codeQuality)} (${scores.codeQuality.toFixed(2)})
- Completeness: ${this.scoreLabel(scores.completeness)} (${scores.completeness.toFixed(2)})
- Usability: ${this.scoreLabel(scores.usability)} (${scores.usability.toFixed(2)})

Overall: ${this.scoreLabel(evaluation.overallConfidence)} (${evaluation.overallConfidence.toFixed(2)})

${evaluation.reasoning}

${evaluation.needsRevision ? `Action Plan:\n${evaluation.actionPlan.map((a, i) => `${i + 1}. ${a}`).join('\n')}` : '✅ Quality standards met'}`;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private getStandards(criteria: string): EvaluationStandards {
    const standardsMap: Record<string, EvaluationStandards> = {
      'code-quality': {
        excellence: 0.8,      // Beautiful, maintainable code
        delight: 0.7,         // User experience
        security: 1.0,        // Non-negotiable
        completeness: 0.6     // Less important than quality
      },
      'research-quality': {
        excellence: 1.0,      // Facts must be accurate
        delight: 0.7,         // Readable, well-organized
        security: 0.8,        // Source verification
        completeness: 0.8     // Thorough coverage
      },
      'conversation-quality': {
        excellence: 0.9,      // Helpful and accurate
        delight: 0.8,         // Noah's personality
        security: 1.0,        // Safety first
        completeness: 0.7     // Complete answer
      }
    };

    return standardsMap[criteria] || standardsMap['code-quality'];
  }

  private buildEvaluationPrompt(params: any, standards: EvaluationStandards): string {
    const contentPreview = params.content.substring(0, 3000);
    const continues = params.content.length > 3000;

    return `You are evaluating ${params.criteria} with realistic, calibrated scoring.

CONTENT (${params.content.length} characters):
${contentPreview}
${continues ? '\n... (implementation continues beyond preview)' : ''}

CONTEXT:
${params.context}

${params.previousScores ? `PREVIOUS ITERATION SCORES:
- Functionality: ${params.previousScores.functionality}
- Code Quality: ${params.previousScores.codeQuality}
- Completeness: ${params.previousScores.completeness}
- Usability: ${params.previousScores.usability}

Evaluate if this iteration IMPROVED on previous attempt.
` : ''}

EVALUATION STANDARDS:
${Object.entries(standards).map(([k, v]) => `- ${k}: ${(v * 100).toFixed(0)}% threshold`).join('\n')}

SCORING PHILOSOPHY:
Be REALISTIC and FAIR. This is NOT a perfection test.

0.9-1.0: Production-grade excellence, ready to ship
0.7-0.8: Very good work, minor polish needed
0.5-0.6: Functional implementation, some refinement needed
0.3-0.4: Working but doesn't meet standards
0.1-0.2: Significant issues, needs major work

CONTEXT MATTERS:
- ${params.content.length} characters suggests substantial effort
- Working code deserves 0.6+ even if not perfect
- Complete implementation of core features should score 0.7+
- Excellence in execution beats feature completeness

EVALUATE ON (Noah's Philosophy: Quality > Completeness):

1. FUNCTIONALITY (0.0-1.0)
   - Does it work as requested?
   - Are core features implemented EXCELLENTLY?
   - Is there actual working code/logic?

2. CODE QUALITY (0.0-1.0) - MOST IMPORTANT
   💎 Noah's Excellence Standards:
   - Elegant, readable code (not clever one-liners)
   - Clear variable names (userName not u, calculateTotal not calc)
   - Maintainable by future developers
   - Thoughtful error handling with helpful messages
   - Would you show this code to a senior engineer with pride?

3. COMPLETENESS (0.0-1.0) - LEAST IMPORTANT
   🎯 Noah's Philosophy: One perfect feature > ten half-done features
   - Are CORE features beautifully implemented?
   - If some features are missing but what's there is EXCELLENT, still score high
   - Missing optional features is fine if core quality is high
   - REWARD: Beautiful, working implementation of main features = 0.8+
   - DON'T PENALIZE: Missing edge cases if core works beautifully

4. USABILITY (0.0-1.0)
   - Is it user-friendly and delightful?
   - Good UX/UI with accessibility?
   - Would users enjoy interacting with this?

🌟 NOAH'S QUALITY-OVER-COMPLETENESS PRINCIPLE:
- A perfectly implemented core feature scores 0.9 (even if missing some extras)
- Beautiful, maintainable code beats feature-complete spaghetti
- Thoughtful error handling > exhaustive feature list
- REWARD excellence in what's there, don't obsess over what's missing
- Working implementation with great code quality deserves >= 0.7

IMPORTANT:
- DON'T be harsh - reward good work
- Polished core implementation > sprawling incomplete mess
- ${params.content.length}+ chars = substantial work
- Working implementation with good code quality deserves >= 0.7

Respond ONLY with valid JSON:
{
  "scores": {
    "functionality": 0.0-1.0,
    "codeQuality": 0.0-1.0,
    "completeness": 0.0-1.0,
    "usability": 0.0-1.0
  },
  "overallConfidence": 0.0-1.0,
  "needsRevision": true/false,
  "reasoning": "1-2 sentence fair assessment",
  "actionPlan": [
    "Specific improvement 1 (if needsRevision)",
    "Specific improvement 2",
    ...
  ]
}`;
  }

  private parseEvaluationResult(content: string): EvaluationResult {
    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in evaluation result');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.scores) {
      throw new Error('Invalid evaluation result structure');
    }

    return {
      overallConfidence: parsed.overallConfidence || 0.5,
      scores: parsed.scores,
      needsRevision: parsed.needsRevision !== false,
      reasoning: parsed.reasoning || 'Evaluation complete',
      actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : []
    };
  }

  private calculateOverallConfidence(scores: QualityScores): number {
    // Weighted average: functionality and usability matter most
    const weighted =
      scores.functionality * 0.35 +
      scores.usability * 0.30 +
      scores.codeQuality * 0.20 +
      scores.completeness * 0.15;

    return Math.min(Math.max(weighted, 0), 1);
  }

  private fallbackEvaluation(content: string, context: string): EvaluationResult {
    logger.warn('Using fallback evaluation');

    // Heuristic: substantial content gets reasonable score
    const hasSubstantialContent = content.length > 1000;
    const hasStructure = content.includes('<') && content.includes('>'); // Likely HTML
    const hasLogic = content.includes('function') || content.includes('=>');

    const baseScore = hasSubstantialContent ? 0.6 : 0.4;
    const structureBonus = hasStructure ? 0.1 : 0;
    const logicBonus = hasLogic ? 0.1 : 0;

    const estimatedScore = baseScore + structureBonus + logicBonus;

    const scores: QualityScores = {
      functionality: estimatedScore,
      codeQuality: estimatedScore * 0.9,
      completeness: estimatedScore * 0.8,
      usability: estimatedScore * 0.85
    };

    return {
      overallConfidence: estimatedScore,
      scores,
      needsRevision: estimatedScore < 0.7,
      reasoning: 'Fallback heuristic evaluation (LLM unavailable)',
      actionPlan: estimatedScore < 0.7 ? ['Enhance functionality and completeness'] : []
    };
  }

  private scoreLabel(score: number): string {
    if (score >= 0.9) return '🌟 Excellent';
    if (score >= 0.7) return '✅ Good';
    if (score >= 0.5) return '👍 Acceptable';
    if (score >= 0.3) return '⚠️ Needs Work';
    return '❌ Poor';
  }
}

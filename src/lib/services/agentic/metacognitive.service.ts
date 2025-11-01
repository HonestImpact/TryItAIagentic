/**
 * Metacognitive Service
 *
 * Provides deep root cause analysis, strategic decision-making, and
 * predictive effectiveness assessment for agentic workflows.
 *
 * This service enables agents to:
 * - Understand WHY quality is low (not just THAT it's low)
 * - Make strategic decisions about when to continue, change approach, or abort
 * - Predict whether proposed changes will actually help
 *
 * @example
 * ```typescript
 * const analysis = await metacognitiveService.analyzeRootCause(
 *   generatedContent,
 *   { functionality: 0.3, completeness: 0.2, ... },
 *   userRequest
 * );
 *
 * if (analysis.strategy === 'DIFFERENT_APPROACH') {
 *   // Try completely new strategy
 * } else if (analysis.strategy === 'TARGETED_REVISION') {
 *   // Fix specific issues from actionPlan
 * }
 * ```
 */

import { createLogger } from '@/lib/logger';
import type { LLMProvider } from '@/lib/services/llm-provider';
import type {
  IMetacognitiveService,
  RootCauseAnalysis,
  QualityScores,
  StrategicSituation,
  StrategicDecision,
  AnalysisStrategy
} from './types';

const logger = createLogger('metacognitive-service');

export class MetacognitiveService implements IMetacognitiveService {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Perform deep root cause analysis on why quality is low
   *
   * This goes beyond simple scoring to understand:
   * - What specific elements are missing or broken
   * - Whether the core approach is sound
   * - What concrete actions would improve quality
   * - Whether revision will actually help or if we're stuck
   */
  async analyzeRootCause(
    content: string,
    scores: QualityScores,
    context: string
  ): Promise<RootCauseAnalysis> {
    logger.info('🧠 Starting root cause analysis', {
      contentLength: content.length,
      scores
    });

    const analysisPrompt = this.buildAnalysisPrompt(content, scores, context);

    try {
      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: analysisPrompt }],
        system: 'You are a metacognitive analysis system. Think deeply and strategically about quality issues.',
        temperature: 0.3
      });

      const analysis = this.parseAnalysisResult(result.content);

      logger.info('✅ Root cause analysis complete', {
        strategy: analysis.strategy,
        willHelp: analysis.willRevisionHelp,
        actionCount: analysis.actionPlan.length
      });

      return analysis;

    } catch (error) {
      logger.error('💥 Root cause analysis failed', { error });

      // Fallback: basic analysis based on scores alone
      return this.fallbackAnalysis(scores, context);
    }
  }

  /**
   * Recommend strategic decision based on workflow situation
   *
   * Analyzes patterns like:
   * - Are we making progress? (confidence improving)
   * - Are we stuck? (confidence flat or declining)
   * - Do we have time/resources to continue?
   */
  async recommendStrategy(
    situation: StrategicSituation
  ): Promise<StrategicDecision> {
    logger.info('🎯 Evaluating strategic situation', situation);

    // Pattern 1: Making progress - continue
    if (this.isImproving(situation.confidenceTrend)) {
      logger.info('📈 Progress detected, recommend CONTINUE');
      return 'CONTINUE';
    }

    // Pattern 2: Stuck or degrading - change approach
    if (situation.previousAttempts >= 2 && !this.isImproving(situation.confidenceTrend)) {
      logger.info('📉 No progress, recommend CHANGE_APPROACH');
      return 'CHANGE_APPROACH';
    }

    // Pattern 3: Near iteration limit - abort unless making strong progress
    if (situation.previousAttempts >= situation.iterationLimit - 1) {
      const recentProgress = this.recentImprovement(situation.confidenceTrend);
      if (recentProgress < 0.1) {
        logger.info('⏱️ Near limit with poor progress, recommend ABORT');
        return 'ABORT';
      }
    }

    // Pattern 4: Out of time - abort
    if (situation.timeRemaining < 30000) { // 30 seconds
      logger.info('⏰ Time critical, recommend ABORT');
      return 'ABORT';
    }

    // Default: continue
    return 'CONTINUE';
  }

  /**
   * Predict whether a proposed change will actually improve quality
   *
   * Uses pattern recognition and heuristics to avoid wasted iterations
   */
  async predictEffectiveness(
    currentApproach: string,
    proposedChange: string
  ): Promise<{ effective: boolean; confidence: number; reasoning: string }> {
    logger.info('🔮 Predicting effectiveness of proposed change');

    const predictionPrompt = `You are predicting whether a proposed change will improve quality.

CURRENT APPROACH:
${currentApproach.substring(0, 500)}

PROPOSED CHANGE:
${proposedChange}

ANALYSIS:
1. Is the proposed change specific and actionable?
2. Does it address a real deficiency in the current approach?
3. Is it likely to improve quality, or just change things arbitrarily?

Consider:
- Vague changes like "complete the implementation" are rarely effective
- Specific changes like "add error handling to function X" are effective
- Changing working parts is risky
- Fixing identified gaps is productive

Respond ONLY in JSON:
{
  "effective": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of prediction"
}`;

    try {
      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: predictionPrompt }],
        system: 'You are a predictive effectiveness analyzer.',
        temperature: 0.2
      });

      const prediction = JSON.parse(result.content);

      logger.info('✅ Effectiveness prediction complete', {
        effective: prediction.effective,
        confidence: prediction.confidence
      });

      return prediction;

    } catch (error) {
      logger.error('💥 Effectiveness prediction failed', { error });

      // Fallback: assume change might help if it's specific
      const isSpecific = proposedChange.length > 50 && proposedChange.includes('.');
      return {
        effective: isSpecific,
        confidence: 0.5,
        reasoning: 'Fallback heuristic: specific changes more likely effective'
      };
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private buildAnalysisPrompt(content: string, scores: QualityScores, context: string): string {
    return `You are a senior technical architect performing deep root cause analysis.

USER REQUEST:
${context}

GENERATED IMPLEMENTATION (${content.length} chars):
${content.substring(0, 3000)}
${content.length > 3000 ? '... (implementation continues)' : ''}

QUALITY SCORES:
- Functionality: ${scores.functionality} (${this.scoreLabel(scores.functionality)})
- Code Quality: ${scores.codeQuality} (${this.scoreLabel(scores.codeQuality)})
- Completeness: ${scores.completeness} (${this.scoreLabel(scores.completeness)})
- Usability: ${scores.usability} (${this.scoreLabel(scores.usability)})

DEEP ANALYSIS REQUIRED:

1. ROOT CAUSE: Why are these scores what they are?
   - What SPECIFIC elements are missing or incomplete?
   - Are there truncated sections or placeholder comments?
   - Is the core architecture sound or fundamentally flawed?

2. EFFECTIVENESS ASSESSMENT: Will a revision actually help?
   - Is the basic approach correct? (YES/NO)
   - Are the patterns/technologies appropriate? (YES/NO)
   - Is it just missing details, or is it fundamentally wrong?

3. STRATEGIC RECOMMENDATION (choose ONE):
   - TARGETED_REVISION: Core is good, just fix specific issues
   - DIFFERENT_APPROACH: Current approach isn't working, try completely new strategy
   - PATTERN_SWITCH: Patterns/libraries being used don't match the need
   - GOOD_ENOUGH: Quality is actually acceptable for the request, don't over-iterate

4. ACTION PLAN: List 3-5 CONCRETE, SPECIFIC actions needed
   - Reference specific sections, functions, or features
   - Be actionable (not vague like "complete the implementation")
   - Prioritize by impact

5. PATTERN RECOMMENDATIONS: Suggest specific patterns, libraries, or techniques
   - What has worked well for similar requests?
   - What should be avoided?

IMPORTANT:
- ${content.length} characters suggests substantial implementation
- Don't be harsh - good work deserves recognition
- Only recommend DIFFERENT_APPROACH if truly stuck
- GOOD_ENOUGH is valid if quality matches request complexity

Respond ONLY with valid JSON:
{
  "rootCause": "Detailed explanation of why scores are what they are",
  "willRevisionHelp": true or false,
  "strategy": "TARGETED_REVISION" | "DIFFERENT_APPROACH" | "PATTERN_SWITCH" | "GOOD_ENOUGH",
  "actionPlan": [
    "Specific action 1 with section reference",
    "Specific action 2 with function name",
    "Specific action 3 with feature description",
    ...
  ],
  "patternRecommendations": [
    "Pattern or library 1",
    "Technique 2",
    ...
  ],
  "reasoning": "1-2 sentence strategic summary"
}`;
  }

  private parseAnalysisResult(content: string): RootCauseAnalysis {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in analysis result');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.strategy || !parsed.actionPlan) {
      throw new Error('Invalid analysis result structure');
    }

    return {
      rootCause: parsed.rootCause || 'Analysis incomplete',
      willRevisionHelp: parsed.willRevisionHelp !== false,
      strategy: parsed.strategy as AnalysisStrategy,
      actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
      patternRecommendations: Array.isArray(parsed.patternRecommendations) ? parsed.patternRecommendations : [],
      reasoning: parsed.reasoning || ''
    };
  }

  private fallbackAnalysis(scores: QualityScores, context: string): RootCauseAnalysis {
    logger.warn('Using fallback analysis logic');

    // Heuristic-based analysis when LLM fails
    const avgScore = (scores.functionality + scores.codeQuality + scores.completeness + scores.usability) / 4;

    let strategy: AnalysisStrategy;
    let willHelp: boolean;

    if (avgScore >= 0.7) {
      strategy = 'GOOD_ENOUGH';
      willHelp = false;
    } else if (scores.completeness < 0.3) {
      strategy = 'TARGETED_REVISION';
      willHelp = true;
    } else if (avgScore < 0.4) {
      strategy = 'DIFFERENT_APPROACH';
      willHelp = true;
    } else {
      strategy = 'TARGETED_REVISION';
      willHelp = true;
    }

    return {
      rootCause: `Average score is ${avgScore.toFixed(2)}. Primary issue: completeness at ${scores.completeness}.`,
      willRevisionHelp: willHelp,
      strategy,
      actionPlan: [
        'Complete missing functionality identified in evaluation',
        'Ensure all requested features are implemented',
        'Add error handling and edge case coverage'
      ],
      patternRecommendations: [],
      reasoning: 'Fallback heuristic analysis (LLM unavailable)'
    };
  }

  private scoreLabel(score: number): string {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.7) return 'Good';
    if (score >= 0.5) return 'Acceptable';
    if (score >= 0.3) return 'Needs work';
    return 'Poor';
  }

  private isImproving(confidenceTrend: number[]): boolean {
    if (confidenceTrend.length < 2) return true;

    // Check if most recent scores show improvement
    const recent = confidenceTrend.slice(-2);
    return recent[1] > recent[0];
  }

  private recentImprovement(confidenceTrend: number[]): number {
    if (confidenceTrend.length < 2) return 0;

    const recent = confidenceTrend.slice(-2);
    return recent[1] - recent[0];
  }
}

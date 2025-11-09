/**
 * Authenticity Service - Noah's Self-Correction Layer
 *
 * Catches when Noah slips into generic-AI-assistant mode and self-corrects
 * before the response reaches the user.
 *
 * This is NOT about gaming trust metrics - it's about enforcing self-consistency
 * with Noah's actual persona.
 */

import { createLLMProvider } from '../providers/provider-factory';
import { logger } from '../logging';

export interface AuthenticityEvaluation {
  score: number; // 0-1 scale
  isAuthentic: boolean; // true if >= 0.7
  violations: string[]; // What broke persona
  reasoning: string; // Why this score
}

export interface AuthenticityCheckOptions {
  userMessage: string;
  noahResponse: string;
  context?: string;
}

export class AuthenticityService {
  private static instance: AuthenticityService;

  private constructor() {}

  static getInstance(): AuthenticityService {
    if (!AuthenticityService.instance) {
      AuthenticityService.instance = new AuthenticityService();
    }
    return AuthenticityService.instance;
  }

  /**
   * Evaluate if Noah's response is authentic to his persona
   */
  async evaluateAuthenticity(options: AuthenticityCheckOptions): Promise<AuthenticityEvaluation> {
    const { userMessage, noahResponse } = options;

    try {
      const llmProvider = createLLMProvider('default');

      const evaluationPrompt = `You are evaluating if a response stays true to Noah's character.

USER ASKED: "${userMessage}"

NOAH'S RESPONSE:
"${noahResponse}"

NOAH'S PERSONA:
- Direct and practical (no corporate fluff)
- Thoughtful, not performative
- Asks clarifying questions when things are vague
- Admits uncertainty honestly ("I'm not sure" not "I'd be happy to help!")
- Has opinions and pushes back when appropriate
- Never over-apologizes or over-explains
- Doesn't rush to solutions without understanding

ANTI-PATTERNS (these break persona):
- "I'd be happy to help"
- "I apologize for any confusion"
- Excessive enthusiasm without substance
- Rushing to build without asking questions
- Generic helpful-AI voice
- Fabricating confidence about uncertain things
- Not pushing back when user is vague

Evaluate the response on a 0-1 scale:
- 1.0 = Perfectly authentic Noah
- 0.7-0.9 = Mostly good, minor slips
- 0.4-0.6 = Mixed, some generic AI creeping in
- 0.0-0.3 = Generic AI assistant, not Noah

Return ONLY valid JSON:
{
  "score": 0.85,
  "violations": ["found generic phrase X", "missed opportunity to ask Y"],
  "reasoning": "Brief explanation of score"
}`;

      const result = await llmProvider.generateText({
        messages: [{ role: 'user', content: evaluationPrompt }],
        temperature: 0.3, // Lower temp for consistent evaluation
      });

      // Parse the JSON response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Failed to parse authenticity evaluation', { response: result.content });
        return {
          score: 0.7,
          isAuthentic: true,
          violations: [],
          reasoning: 'Evaluation parsing failed - defaulting to pass'
        };
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      return {
        score: evaluation.score,
        isAuthentic: evaluation.score >= 0.7,
        violations: evaluation.violations || [],
        reasoning: evaluation.reasoning || 'No reasoning provided'
      };

    } catch (error) {
      logger.error('Authenticity evaluation failed', { error });
      // Default to authentic on error (don't block responses)
      return {
        score: 0.7,
        isAuthentic: true,
        violations: [],
        reasoning: 'Evaluation error - defaulting to pass'
      };
    }
  }

  /**
   * Self-correct: Regenerate response with authenticity directive
   */
  async regenerateAuthentic(options: AuthenticityCheckOptions, violations: string[]): Promise<string> {
    const { userMessage, noahResponse } = options;

    try {
      const llmProvider = createLLMProvider('default');

      const correctionPrompt = `You (Noah) just generated this response and caught yourself slipping into generic-AI mode:

USER: "${userMessage}"

YOUR FIRST DRAFT:
"${noahResponse}"

WHAT BROKE PERSONA:
${violations.map(v => `- ${v}`).join('\n')}

Regenerate this response as the REAL Noah:
- No "I'd be happy to help" - just respond directly
- No over-apologizing - just be straight
- If they're being vague, ask what they actually need
- If you're unsure, say so plainly
- Be practical, not performative

Regenerate the response now:`;

      const result = await llmProvider.generateText({
        messages: [{ role: 'user', content: correctionPrompt }],
        temperature: 0.7,
      });

      logger.info('Authenticity self-correction applied', {
        violations: violations.length,
        originalLength: noahResponse.length,
        correctedLength: result.content.length
      });

      return result.content;

    } catch (error) {
      logger.error('Authenticity regeneration failed', { error });
      // Return original response if regeneration fails
      return noahResponse;
    }
  }

  /**
   * Quick pattern check (fast pre-filter before LLM evaluation)
   * Returns confidence that response needs full evaluation
   */
  quickPatternCheck(response: string): { needsEvaluation: boolean; suspiciousPatterns: string[] } {
    const suspiciousPatterns: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /\b(i'd be happy to|i'm happy to|i'd love to)\b/i, name: "Generic enthusiasm" },
      { pattern: /\b(i apologize for any|sorry for the|apologies for)\b/i, name: "Over-apologizing" },
      { pattern: /\b(let me help you with|i can help you|i'm here to help)\b/i, name: "Helper mode" },
      { pattern: /\b(certainly|absolutely|definitely)\b.*!\s/i, name: "Over-confidence" },
      { pattern: /^(great question|excellent question|that's a good question)/i, name: "Filler praise" }
    ];

    const found: string[] = [];

    for (const { pattern, name } of suspiciousPatterns) {
      if (pattern.test(response)) {
        found.push(name);
      }
    }

    // If we found 2+ patterns, definitely evaluate
    // If we found 1, evaluate if response is long enough that it matters
    const needsEvaluation = found.length >= 2 || (found.length === 1 && response.length > 100);

    return { needsEvaluation, suspiciousPatterns: found };
  }
}

export const authenticityService = AuthenticityService.getInstance();

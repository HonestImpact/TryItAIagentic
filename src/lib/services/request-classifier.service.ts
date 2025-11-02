/**
 * Request Classification Service
 *
 * Determines the appropriate response tier for user requests:
 * - SIMPLE_CONVERSATION: Quick responses (<2s)
 * - SIMPLE_TOOL: Fast tool generation (5-15s)
 * - COMPLEX_WORK: Async candidate (30-90s)
 * - DEEP_WORK: Extensive research/building (2-5min)
 *
 * Part of Phase 1: Async Work Implementation
 */

export enum RequestTier {
  SIMPLE_CONVERSATION = 'simple_conversation',  // <2s
  SIMPLE_TOOL = 'simple_tool',                  // 5-15s
  COMPLEX_WORK = 'complex_work',                // 30-90s (async candidate)
  DEEP_WORK = 'deep_work'                       // 2-5min
}

export interface ClassificationResult {
  tier: RequestTier;
  confidence: number;
  reasoning: string;
  estimatedDuration: number; // seconds
}

/**
 * Domain-specific patterns for classification
 */
const PATTERNS = {
  // Simple conversation patterns
  conversation: [
    /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
    /^(thanks|thank you|appreciate)/i,
    /^(what is|what are|who is|explain|tell me about)/i,
    /^(can you|could you|would you|will you)/i,
    /\?$/,  // Questions often conversational
  ],

  // Simple tool patterns (quick, single-purpose)
  simpleTool: [
    /calculator/i,
    /\bcounter\b/i,
    /\btimer\b/i,
    /stopwatch/i,
    /color picker/i,
    /random (number|color|name)/i,
    /simple (form|button|input)/i,
    /hello world/i,
    /(create|build|make).*(timer|counter|stopwatch)/i,
  ],

  // Complex work patterns (multi-step, requires thought)
  complexWork: [
    /dashboard/i,
    /chart/i,
    /graph/i,
    /visualization/i,
    /integrate.*api/i,
    /fetch.*data/i,
    /database/i,
    /authentication/i,
    /multiple.*pages/i,
  ],

  // Deep work patterns (research-heavy, architectural)
  deepWork: [
    /research/i,
    /comprehensive/i,
    /full.*implementation/i,
    /architecture/i,
    /system.*design/i,
    /compare.*options/i,
    /evaluate.*approaches/i,
    /analyze.*codebase/i,
    /compare.*(vs|versus|against)/i,
    /evaluate.*different/i,
  ],
};

/**
 * Keyword-based complexity scoring
 */
const COMPLEXITY_INDICATORS = {
  high: ['multiple', 'complex', 'advanced', 'sophisticated', 'comprehensive', 'integrate', 'architecture'],
  low: ['simple', 'basic', 'quick', 'easy', 'small'],
};

export class RequestClassifier {
  /**
   * Classify a user request into appropriate tier
   */
  classify(request: string): ClassificationResult {
    const normalized = request.toLowerCase().trim();

    // Check for deep work first (most specific)
    if (this.matchesPatterns(normalized, PATTERNS.deepWork)) {
      return {
        tier: RequestTier.DEEP_WORK,
        confidence: 0.85,
        reasoning: 'Research-heavy or architectural work detected',
        estimatedDuration: 180, // 3 minutes
      };
    }

    // Check for complex work
    const complexityScore = this.calculateComplexity(normalized);
    if (this.matchesPatterns(normalized, PATTERNS.complexWork) || complexityScore > 0.6) {
      return {
        tier: RequestTier.COMPLEX_WORK,
        confidence: 0.8,
        reasoning: 'Multi-step work requiring agentic workflow',
        estimatedDuration: 60, // 1 minute
      };
    }

    // Check for simple tool
    if (this.matchesPatterns(normalized, PATTERNS.simpleTool)) {
      return {
        tier: RequestTier.SIMPLE_TOOL,
        confidence: 0.9,
        reasoning: 'Single-purpose tool, fast path available',
        estimatedDuration: 10, // 10 seconds
      };
    }

    // Check for conversation
    if (this.matchesPatterns(normalized, PATTERNS.conversation) || normalized.length < 50) {
      return {
        tier: RequestTier.SIMPLE_CONVERSATION,
        confidence: 0.95,
        reasoning: 'Conversational or informational request',
        estimatedDuration: 1, // 1 second
      };
    }

    // Default: treat as complex work to be safe
    return {
      tier: RequestTier.COMPLEX_WORK,
      confidence: 0.5,
      reasoning: 'Uncertain - defaulting to complex work',
      estimatedDuration: 60,
    };
  }

  /**
   * Check if request matches any pattern in list
   */
  private matchesPatterns(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Calculate complexity score based on keywords
   */
  private calculateComplexity(text: string): number {
    let score = 0.5; // baseline

    // Increase for high-complexity indicators
    for (const word of COMPLEXITY_INDICATORS.high) {
      if (text.includes(word)) {
        score += 0.1;
      }
    }

    // Decrease for low-complexity indicators
    for (const word of COMPLEXITY_INDICATORS.low) {
      if (text.includes(word)) {
        score -= 0.15;
      }
    }

    // Length factor (longer requests often more complex)
    if (text.length > 200) {
      score += 0.2;
    } else if (text.length < 50) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score)); // clamp to [0, 1]
  }

  /**
   * Determine if request is async candidate (COMPLEX_WORK or DEEP_WORK)
   */
  isAsyncCandidate(tier: RequestTier): boolean {
    return tier === RequestTier.COMPLEX_WORK || tier === RequestTier.DEEP_WORK;
  }
}

// Export singleton instance
export const requestClassifier = new RequestClassifier();

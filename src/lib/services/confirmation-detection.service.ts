/**
 * Confirmation Detection Service
 *
 * Detects when user confirms/accepts async work offers:
 * - Pattern-based detection (yes, sure, go ahead, etc.)
 * - Context-aware (checks if offer was made recently)
 * - Handles ambiguous responses
 *
 * Part of Phase 6: Confirmation Detection
 */

export interface ConfirmationResult {
  isConfirmation: boolean;
  confidence: number;
  type: 'explicit' | 'implicit' | 'none';
  reasoning: string;
}

/**
 * Confirmation patterns
 */
const CONFIRMATION_PATTERNS = {
  // Explicit confirmations (high confidence)
  explicit: [
    /^yes$/i,
    /^yeah$/i,
    /^yep$/i,
    /^sure$/i,
    /^ok$/i,
    /^okay$/i,
    /^alright$/i,
    /^absolutely$/i,
    /^definitely$/i,
    /^go ahead$/i,
    /^go for it$/i,
    /^do it$/i,
    /^let's do it$/i,
    /^sounds good$/i,
    /^that works$/i,
    /^please do$/i,
    /^yes please$/i,
    /^kick it off$/i,
    /^start/i,
  ],

  // Implicit confirmations (medium confidence)
  implicit: [
    /^(can you|could you|would you) (start|begin|kick off)/i,
    /please (start|begin)/i,
    /go ahead (with|and)/i,
    /let me know when/i,
    /i'll wait/i,
    /take your time/i,
  ],

  // Negative responses (rejection)
  negative: [
    /^no$/i,
    /^nope$/i,
    /^nah$/i,
    /^not now$/i,
    /^maybe later$/i,
    /^let's not$/i,
    /^don't$/i,
    /^wait$/i,
    /^hold on$/i,
    /^stop$/i,
    /^nevermind$/i,
    /^never mind$/i,
  ],
};

/**
 * Confirmation Detection Service
 */
export class ConfirmationDetectionService {
  /**
   * Detect if message is a confirmation
   */
  detect(message: string, context?: { hadRecentOffer?: boolean }): ConfirmationResult {
    const normalized = message.trim().toLowerCase();

    // Check for explicit confirmation
    if (this.matchesPatterns(normalized, CONFIRMATION_PATTERNS.explicit)) {
      return {
        isConfirmation: true,
        confidence: 0.95,
        type: 'explicit',
        reasoning: 'Direct confirmation phrase detected',
      };
    }

    // Check for implicit confirmation
    if (this.matchesPatterns(normalized, CONFIRMATION_PATTERNS.implicit)) {
      return {
        isConfirmation: true,
        confidence: 0.8,
        type: 'implicit',
        reasoning: 'Implicit confirmation phrase detected',
      };
    }

    // Check for negative response
    if (this.matchesPatterns(normalized, CONFIRMATION_PATTERNS.negative)) {
      return {
        isConfirmation: false,
        confidence: 0.95,
        type: 'none',
        reasoning: 'Explicit rejection detected',
      };
    }

    // Check for context-based confirmation
    // If user had recent offer and responds with something like "that would be great"
    if (context?.hadRecentOffer) {
      if (this.isProbablyConfirmation(normalized)) {
        return {
          isConfirmation: true,
          confidence: 0.65,
          type: 'implicit',
          reasoning: 'Context suggests confirmation',
        };
      }
    }

    // Default: not a confirmation
    return {
      isConfirmation: false,
      confidence: 0.5,
      type: 'none',
      reasoning: 'No confirmation pattern detected',
    };
  }

  /**
   * Check if message matches any pattern in list
   */
  private matchesPatterns(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
  }

  /**
   * Heuristic for probable confirmation based on positive sentiment
   */
  private isProbablyConfirmation(text: string): boolean {
    const positiveWords = [
      'great',
      'perfect',
      'excellent',
      'good',
      'nice',
      'awesome',
      'wonderful',
      'thanks',
      'thank you',
      'appreciate',
    ];

    return positiveWords.some((word) => text.includes(word));
  }

  /**
   * Extract confirmation intent from longer message
   * Returns true if message contains confirmation despite other content
   */
  extractConfirmationIntent(message: string): {
    hasConfirmation: boolean;
    cleanedMessage: string;
  } {
    const result = this.detect(message);

    if (result.isConfirmation && result.type === 'explicit') {
      // Remove confirmation phrase from message
      let cleanedMessage = message;

      for (const pattern of CONFIRMATION_PATTERNS.explicit) {
        cleanedMessage = cleanedMessage.replace(pattern, '').trim();
      }

      // Clean up any leading/trailing punctuation or connectors
      cleanedMessage = cleanedMessage
        .replace(/^[,.\s]+/, '')
        .replace(/[,.\s]+$/, '')
        .trim();

      return {
        hasConfirmation: true,
        cleanedMessage,
      };
    }

    return {
      hasConfirmation: result.isConfirmation,
      cleanedMessage: message,
    };
  }

  /**
   * Validate confirmation against pending offer
   * Returns true if confirmation is valid for the pending work
   */
  validateConfirmation(
    message: string,
    pendingWorkDescription: string
  ): boolean {
    const result = this.detect(message);

    // Must be a confirmation
    if (!result.isConfirmation) {
      return false;
    }

    // Explicit confirmations are always valid
    if (result.type === 'explicit' && result.confidence > 0.9) {
      return true;
    }

    // For implicit confirmations, check if message relates to pending work
    const normalized = message.toLowerCase();
    const workWords = pendingWorkDescription.toLowerCase().split(/\s+/);

    // If user mentions work-related keywords, likely valid
    const relevantWords = workWords.filter((word) => word.length > 4);
    const mentionsWork = relevantWords.some((word) => normalized.includes(word));

    return mentionsWork || result.confidence > 0.8;
  }
}

// Export singleton instance
export const confirmationDetectionService = new ConfirmationDetectionService();

/**
 * Async Opportunity Detection Service
 *
 * Determines when Noah should offer async work to users:
 * - Detects requests that would benefit from background processing
 * - Considers context: conversation flow, user preferences, workload
 * - Generates natural offer messages
 *
 * Part of Phase 3: Async Opportunity Detection
 */

import { requestClassifier, RequestTier, type ClassificationResult } from './request-classifier.service';

export interface AsyncOpportunity {
  shouldOffer: boolean;
  confidence: number;
  reasoning: string;
  estimatedDuration: number;
  offerMessage: string;
  tier: RequestTier;
}

export interface DetectionContext {
  request: string;
  conversationLength: number;
  hasActiveWork: boolean;
  userHasAcceptedBefore: boolean;
  timeOfDay?: number; // hour 0-23
}

/**
 * Async Opportunity Detector
 */
export class AsyncOpportunityDetector {
  /**
   * Detect if request is a good candidate for async work
   */
  detect(context: DetectionContext): AsyncOpportunity {
    const classification = requestClassifier.classify(context.request);

    // Only consider COMPLEX_WORK and DEEP_WORK
    if (!requestClassifier.isAsyncCandidate(classification.tier)) {
      return {
        shouldOffer: false,
        confidence: 0,
        reasoning: 'Request too simple for async work',
        estimatedDuration: classification.estimatedDuration,
        offerMessage: '',
        tier: classification.tier,
      };
    }

    // Don't offer if user already has active work
    if (context.hasActiveWork) {
      return {
        shouldOffer: false,
        confidence: 0,
        reasoning: 'User already has active async work',
        estimatedDuration: classification.estimatedDuration,
        offerMessage: '',
        tier: classification.tier,
      };
    }

    // Calculate confidence based on multiple factors
    let confidence = classification.confidence;

    // Boost confidence if user has accepted before
    if (context.userHasAcceptedBefore) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    // Reduce confidence for very early conversation
    if (context.conversationLength < 2) {
      confidence = Math.max(0, confidence - 0.2);
    }

    // Generate natural offer message
    const offerMessage = this.generateOfferMessage(classification, context);

    return {
      shouldOffer: confidence > 0.6,
      confidence,
      reasoning: this.generateReasoning(classification, context),
      estimatedDuration: classification.estimatedDuration,
      offerMessage,
      tier: classification.tier,
    };
  }

  /**
   * Generate natural offer message
   */
  private generateOfferMessage(
    classification: ClassificationResult,
    context: DetectionContext
  ): string {
    const duration = this.formatDuration(classification.estimatedDuration);

    if (classification.tier === RequestTier.DEEP_WORK) {
      return `This looks like it'll take some thought (${duration}). Want me to start working on it while we keep talking? I can let you know when it's ready.`;
    }

    if (classification.tier === RequestTier.COMPLEX_WORK) {
      return `This might take a minute or two (${duration}). I can work on it in the background while we continue the conversation. Sound good?`;
    }

    return `I can start working on this (${duration}) while we chat. Want me to kick it off?`;
  }

  /**
   * Generate reasoning for decision
   */
  private generateReasoning(
    classification: ClassificationResult,
    context: DetectionContext
  ): string {
    const reasons: string[] = [];

    if (classification.tier === RequestTier.DEEP_WORK) {
      reasons.push('Deep work requiring significant time');
    } else if (classification.tier === RequestTier.COMPLEX_WORK) {
      reasons.push('Complex work benefiting from async execution');
    }

    if (classification.estimatedDuration > 60) {
      reasons.push(`Estimated ${Math.floor(classification.estimatedDuration / 60)} minutes`);
    }

    if (context.userHasAcceptedBefore) {
      reasons.push('User familiar with async workflow');
    }

    if (context.conversationLength < 2) {
      reasons.push('Early in conversation (reduced confidence)');
    }

    return reasons.join('; ');
  }

  /**
   * Format duration in human-readable form
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `~${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) {
      return '~1 minute';
    }
    if (minutes < 5) {
      return `~${minutes} minutes`;
    }
    return 'a few minutes';
  }

  /**
   * Check if offer should be suppressed based on context
   */
  shouldSuppressOffer(context: DetectionContext): boolean {
    // Suppress if user is in rapid-fire conversation mode
    if (context.conversationLength > 5) {
      const avgTimePerMessage = 120; // assume ~2 min per message
      const totalTime = context.conversationLength * avgTimePerMessage;

      // If conversation is moving fast, don't interrupt
      if (totalTime < 300) { // less than 5 minutes total
        return true;
      }
    }

    // Don't suppress otherwise
    return false;
  }
}

// Export singleton instance
export const asyncOpportunityDetector = new AsyncOpportunityDetector();

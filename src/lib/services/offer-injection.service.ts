/**
 * Offer Injection Service
 *
 * Naturally injects async work offers into Noah's responses:
 * - Detects appropriate insertion points
 * - Maintains Noah's voice and personality
 * - Ensures offers feel conversational, not robotic
 *
 * Part of Phase 5: Offer Injection
 */

import type { AsyncOpportunity } from './async-opportunity.service';

export interface OfferInjectionResult {
  modifiedResponse: string;
  offerInjected: boolean;
  offerPosition: 'start' | 'middle' | 'end' | 'none';
  workId?: string;
}

/**
 * Offer Injection Service
 */
export class OfferInjectionService {
  /**
   * Inject async work offer into Noah's response
   */
  inject(
    originalResponse: string,
    opportunity: AsyncOpportunity,
    workId: string
  ): OfferInjectionResult {
    if (!opportunity.shouldOffer || !opportunity.offerMessage) {
      return {
        modifiedResponse: originalResponse,
        offerInjected: false,
        offerPosition: 'none',
      };
    }

    // Determine best injection position
    const position = this.determinePosition(originalResponse, opportunity);

    // Inject offer at determined position
    const modifiedResponse = this.injectAtPosition(
      originalResponse,
      opportunity.offerMessage,
      position,
      workId
    );

    return {
      modifiedResponse,
      offerInjected: true,
      offerPosition: position,
      workId,
    };
  }

  /**
   * Determine best position to inject offer
   */
  private determinePosition(
    response: string,
    opportunity: AsyncOpportunity
  ): 'start' | 'middle' | 'end' {
    const words = response.split(/\s+/).length;

    // For short responses, inject at end
    if (words < 20) {
      return 'end';
    }

    // For medium responses, inject in middle
    if (words < 50) {
      return 'middle';
    }

    // For long responses, inject at start
    return 'start';
  }

  /**
   * Inject offer at specified position
   */
  private injectAtPosition(
    response: string,
    offer: string,
    position: 'start' | 'middle' | 'end',
    workId: string
  ): string {
    // Add hidden marker for confirmation detection
    const markedOffer = `${offer} <!-- async-offer-${workId} -->`;

    if (position === 'start') {
      return `${markedOffer}\n\n${response}`;
    }

    if (position === 'end') {
      return `${response}\n\n${markedOffer}`;
    }

    // Middle: inject after first paragraph
    const paragraphs = response.split(/\n\n/);
    if (paragraphs.length >= 2) {
      return `${paragraphs[0]}\n\n${markedOffer}\n\n${paragraphs.slice(1).join('\n\n')}`;
    }

    // Fallback to end if can't find middle
    return `${response}\n\n${markedOffer}`;
  }

  /**
   * Extract work ID from offer marker
   */
  extractWorkId(response: string): string | null {
    const match = response.match(/<!-- async-offer-([a-zA-Z0-9_]+) -->/);
    return match ? match[1] : null;
  }

  /**
   * Check if response contains an async offer
   */
  containsOffer(response: string): boolean {
    return /<!-- async-offer-[a-zA-Z0-9_]+ -->/.test(response);
  }

  /**
   * Remove offer marker from response (for display)
   */
  removeMarker(response: string): string {
    return response.replace(/<!-- async-offer-[a-zA-Z0-9_]+ -->/g, '').trim();
  }

  /**
   * Create offer-only response (when Noah has nothing else to say)
   */
  createOfferOnlyResponse(opportunity: AsyncOpportunity, workId: string): string {
    const offer = opportunity.offerMessage;
    return `${offer} <!-- async-offer-${workId} -->`;
  }

  /**
   * Create conversational wrapper for offer
   * Adds Noah's personality to make offer feel natural
   */
  wrapWithPersonality(offer: string, context: { tier: string; confidence: number }): string {
    // High confidence: direct and clear
    if (context.confidence > 0.8) {
      return offer;
    }

    // Medium confidence: add slight hesitation
    if (context.confidence > 0.6) {
      return `I think ${offer.charAt(0).toLowerCase() + offer.slice(1)}`;
    }

    // Lower confidence: more tentative
    return `If you want, ${offer.charAt(0).toLowerCase() + offer.slice(1)}`;
  }

  /**
   * Format offer for specific work types
   */
  formatForWorkType(
    baseOffer: string,
    workType: 'research' | 'tool',
    estimatedDuration: number
  ): string {
    if (workType === 'research') {
      return baseOffer.replace('working on', 'researching');
    }

    if (workType === 'tool') {
      return baseOffer.replace('working on', 'building');
    }

    return baseOffer;
  }
}

// Export singleton instance
export const offerInjectionService = new OfferInjectionService();

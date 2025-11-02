/**
 * Async Workflow Orchestrator
 *
 * Coordinates all async work services into a cohesive workflow:
 * 1. Classify request
 * 2. Detect async opportunity
 * 3. Inject offer if appropriate
 * 4. Detect confirmation
 * 5. Queue async work
 * 6. Maintain conversational continuity
 * 7. Notify on completion
 *
 * This is the main integration point for the async work system.
 */

import { requestClassifier, type ClassificationResult } from './request-classifier.service';
import { asyncOpportunityDetector, type AsyncOpportunity } from './async-opportunity.service';
import { sessionStateManager } from './session-state.service';
import { offerInjectionService, type OfferInjectionResult } from './offer-injection.service';
import { confirmationDetectionService } from './confirmation-detection.service';
import { asyncWorkQueue, type QueuedWork } from './async-work-queue.service';
import { conversationalContinuityService } from './conversational-continuity.service';
import { resultNotificationService } from './result-notification.service';

export interface AsyncWorkflowRequest {
  sessionId: string;
  userMessage: string;
  noahResponse: string;
}

export interface AsyncWorkflowResult {
  // Modified response (with offer injected if applicable)
  response: string;

  // Workflow decisions
  classification: ClassificationResult;
  opportunity: AsyncOpportunity | null;
  offerInjected: boolean;
  confirmationDetected: boolean;
  workQueued: boolean;

  // Work tracking
  workId?: string;

  // Continuity
  hasPendingNotifications: boolean;
  hasActiveWork: boolean;
}

/**
 * Async Workflow Orchestrator
 */
export class AsyncWorkflowOrchestrator {
  private readonly ENABLE_ASYNC_WORK: boolean;

  constructor() {
    this.ENABLE_ASYNC_WORK = process.env.ENABLE_ASYNC_WORK === 'true';
  }

  /**
   * Process request through async workflow
   */
  async process(request: AsyncWorkflowRequest): Promise<AsyncWorkflowResult> {
    // If feature disabled, pass through
    if (!this.ENABLE_ASYNC_WORK) {
      return this.createPassthroughResult(request);
    }

    const { sessionId, userMessage, noahResponse } = request;

    // Step 1: Classify request
    const classification = requestClassifier.classify(userMessage);

    // Step 2: Check for confirmation first (higher priority)
    const confirmation = confirmationDetectionService.detect(userMessage, {
      hadRecentOffer: this.hadRecentOffer(sessionId),
    });

    if (confirmation.isConfirmation) {
      return this.handleConfirmation(sessionId, userMessage, noahResponse, classification);
    }

    // Step 3: Check for status query
    if (conversationalContinuityService.isStatusQuery(userMessage)) {
      return this.handleStatusQuery(sessionId, userMessage, noahResponse, classification);
    }

    // Step 4: Detect async opportunity
    const opportunity = asyncOpportunityDetector.detect({
      request: userMessage,
      conversationLength: sessionStateManager.getConversationLength(sessionId),
      hasActiveWork: sessionStateManager.hasActiveWork(sessionId),
      userHasAcceptedBefore: sessionStateManager.getOrCreate(sessionId).preferences
        .hasAcceptedAsyncBefore,
    });

    // Step 5: Inject offer if appropriate
    let finalResponse = noahResponse;
    let workId: string | undefined;
    let offerInjected = false;

    if (opportunity.shouldOffer) {
      // Create pending work item
      workId = sessionStateManager.addAsyncWork(sessionId, {
        type: this.inferWorkType(classification),
        request: userMessage,
        status: 'pending_offer',
        estimatedDuration: opportunity.estimatedDuration,
      });

      // Inject offer
      const injectionResult = offerInjectionService.inject(
        noahResponse,
        opportunity,
        workId
      );

      finalResponse = injectionResult.modifiedResponse;
      offerInjected = injectionResult.offerInjected;

      // Update work status
      if (offerInjected) {
        sessionStateManager.updateAsyncWork(workId, { status: 'offered' });
      }
    }

    // Step 6: Apply conversational continuity
    const guidance = conversationalContinuityService.getGuidance(sessionId, userMessage);
    if (guidance.shouldMentionCompletion || guidance.shouldMentionActiveWork) {
      finalResponse = conversationalContinuityService.injectContinuityCues(
        finalResponse,
        guidance
      );
    }

    // Step 7: Record message
    sessionStateManager.addMessage(sessionId, 'user', userMessage);
    sessionStateManager.addMessage(sessionId, 'assistant', finalResponse, {
      containsOffer: offerInjected,
    });

    return {
      response: offerInjectionService.removeMarker(finalResponse),
      classification,
      opportunity,
      offerInjected,
      confirmationDetected: false,
      workQueued: false,
      workId,
      hasPendingNotifications: guidance.shouldMentionCompletion,
      hasActiveWork: guidance.shouldMentionActiveWork,
    };
  }

  /**
   * Handle confirmation of async work
   */
  private async handleConfirmation(
    sessionId: string,
    userMessage: string,
    noahResponse: string,
    classification: ClassificationResult
  ): Promise<AsyncWorkflowResult> {
    // Find pending offer
    const pendingOffers = sessionStateManager.getPendingOffers(sessionId);

    if (pendingOffers.length === 0) {
      // No pending offer, treat as normal conversation
      return this.createPassthroughResult({
        sessionId,
        userMessage,
        noahResponse,
      });
    }

    // Accept the most recent offer
    const work = pendingOffers[pendingOffers.length - 1];

    // Update status
    sessionStateManager.updateAsyncWork(work.id, {
      status: 'accepted',
    });

    // Queue work
    asyncWorkQueue.enqueue({
      workId: work.id,
      sessionId,
      request: work.request,
      type: work.type,
      priority: 50,
      enqueuedAt: Date.now(),
      context: {},
    });

    // Generate acknowledgment
    const acknowledgment = `Got it, I'll get started on that. I'll let you know when it's ready. In the meantime, what else are you thinking about?`;

    // Record messages
    sessionStateManager.addMessage(sessionId, 'user', userMessage, {
      containsConfirmation: true,
    });
    sessionStateManager.addMessage(sessionId, 'assistant', acknowledgment);

    return {
      response: acknowledgment,
      classification,
      opportunity: null,
      offerInjected: false,
      confirmationDetected: true,
      workQueued: true,
      workId: work.id,
      hasPendingNotifications: false,
      hasActiveWork: true,
    };
  }

  /**
   * Handle status query
   */
  private handleStatusQuery(
    sessionId: string,
    userMessage: string,
    noahResponse: string,
    classification: ClassificationResult
  ): Promise<AsyncWorkflowResult> {
    const statusResponse = conversationalContinuityService.generateStatusResponse(sessionId);

    // Record messages
    sessionStateManager.addMessage(sessionId, 'user', userMessage);
    sessionStateManager.addMessage(sessionId, 'assistant', statusResponse);

    return Promise.resolve({
      response: statusResponse,
      classification,
      opportunity: null,
      offerInjected: false,
      confirmationDetected: false,
      workQueued: false,
      hasPendingNotifications: false,
      hasActiveWork: sessionStateManager.hasActiveWork(sessionId),
    });
  }

  /**
   * Create passthrough result (no async workflow)
   */
  private createPassthroughResult(request: AsyncWorkflowRequest): AsyncWorkflowResult {
    const classification = requestClassifier.classify(request.userMessage);

    // Still apply continuity
    const guidance = conversationalContinuityService.getGuidance(
      request.sessionId,
      request.userMessage
    );

    let finalResponse = request.noahResponse;
    if (guidance.shouldMentionCompletion || guidance.shouldMentionActiveWork) {
      finalResponse = conversationalContinuityService.injectContinuityCues(
        finalResponse,
        guidance
      );
    }

    return {
      response: finalResponse,
      classification,
      opportunity: null,
      offerInjected: false,
      confirmationDetected: false,
      workQueued: false,
      hasPendingNotifications: guidance.shouldMentionCompletion,
      hasActiveWork: guidance.shouldMentionActiveWork,
    };
  }

  /**
   * Check if session had recent offer
   */
  private hadRecentOffer(sessionId: string): boolean {
    const session = sessionStateManager.getOrCreate(sessionId);
    const recentMessages = session.conversationHistory.slice(-3);
    return recentMessages.some((m) => m.containsOffer);
  }

  /**
   * Infer work type from classification
   */
  private inferWorkType(classification: ClassificationResult): 'research' | 'tool' {
    // Simple heuristic: research for deep work, tool for complex work
    if (classification.tier === 'deep_work') {
      return 'research';
    }
    return 'tool';
  }
}

// Export singleton instance
export const asyncWorkflowOrchestrator = new AsyncWorkflowOrchestrator();

/**
 * Conversational Continuity Service
 *
 * Maintains natural conversation while async work happens:
 * - Context awareness (knows work is running)
 * - Prevents duplicate work offers
 * - Injects status updates naturally
 * - Handles work completion acknowledgment
 *
 * Part of Phase 9: Conversational Continuity
 */

import { sessionStateManager } from './session-state.service';
import { resultNotificationService, type NotificationMessage } from './result-notification.service';
import { asyncWorkQueue } from './async-work-queue.service';

export interface ContinuityContext {
  sessionId: string;
  lastMessage: string;
  activeWorkCount: number;
  pendingNotifications: NotificationMessage[];
  conversationLength: number;
}

export interface ContinuityGuidance {
  shouldMentionActiveWork: boolean;
  shouldMentionCompletion: boolean;
  contextPrompt: string;
  completionMessages: string[];
}

/**
 * Conversational Continuity Service
 */
export class ConversationalContinuityService {
  /**
   * Get guidance for Noah's response
   * Provides context about active work and completions
   */
  getGuidance(sessionId: string, userMessage: string): ContinuityGuidance {
    const context = this.buildContext(sessionId, userMessage);

    return {
      shouldMentionActiveWork: this.shouldMentionActiveWork(context),
      shouldMentionCompletion: context.pendingNotifications.length > 0,
      contextPrompt: this.buildContextPrompt(context),
      completionMessages: this.buildCompletionMessages(context),
    };
  }

  /**
   * Build continuity context
   */
  private buildContext(sessionId: string, lastMessage: string): ContinuityContext {
    const activeWork = sessionStateManager.getActiveWork(sessionId);
    const pendingNotifications = resultNotificationService.getPendingNotifications(sessionId);
    const conversationLength = sessionStateManager.getConversationLength(sessionId);

    return {
      sessionId,
      lastMessage,
      activeWorkCount: activeWork.length,
      pendingNotifications,
      conversationLength,
    };
  }

  /**
   * Determine if Noah should mention active work
   */
  private shouldMentionActiveWork(context: ContinuityContext): boolean {
    // Don't mention if no active work
    if (context.activeWorkCount === 0) {
      return false;
    }

    // Don't mention if user is asking about completion
    if (
      context.lastMessage.toLowerCase().includes('ready') ||
      context.lastMessage.toLowerCase().includes('done') ||
      context.lastMessage.toLowerCase().includes('finished')
    ) {
      return true; // Mention to acknowledge they're asking
    }

    // Mention occasionally during long conversations
    if (context.conversationLength % 5 === 0) {
      return true;
    }

    return false;
  }

  /**
   * Build context prompt for Noah
   * This gets injected into Noah's system prompt
   */
  private buildContextPrompt(context: ContinuityContext): string {
    const parts: string[] = [];

    // Active work context
    if (context.activeWorkCount > 0) {
      parts.push(
        `CONTEXT: You have ${context.activeWorkCount} task${
          context.activeWorkCount > 1 ? 's' : ''
        } running in the background. Continue the conversation naturally. Don't bring it up unless relevant.`
      );
    }

    // Completion notifications
    if (context.pendingNotifications.length > 0) {
      const completions = context.pendingNotifications.filter((n) => n.type === 'completion');
      const failures = context.pendingNotifications.filter((n) => n.type === 'failure');

      if (completions.length > 0) {
        parts.push(
          `IMPORTANT: ${completions.length} task${
            completions.length > 1 ? 's have' : ' has'
          } completed! Naturally mention this in your response.`
        );
      }

      if (failures.length > 0) {
        parts.push(
          `IMPORTANT: ${failures.length} task${
            failures.length > 1 ? 's' : ''
          } failed. Acknowledge this sympathetically.`
        );
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Build completion messages
   */
  private buildCompletionMessages(context: ContinuityContext): string[] {
    return context.pendingNotifications.map((n) => n.message);
  }

  /**
   * Check if user is asking about work status
   */
  isStatusQuery(message: string): boolean {
    const normalized = message.toLowerCase();

    const statusQueries = [
      'done',
      'ready',
      'finished',
      'complete',
      'status',
      'progress',
      'how is',
      'is it',
      'are you done',
      'still working',
    ];

    return statusQueries.some((query) => normalized.includes(query));
  }

  /**
   * Generate status response for work-in-progress
   */
  generateStatusResponse(sessionId: string): string {
    const activeWork = sessionStateManager.getActiveWork(sessionId);

    if (activeWork.length === 0) {
      return "Nothing in progress right now. What would you like me to work on?";
    }

    if (activeWork.length === 1) {
      const work = activeWork[0];
      const elapsed = Date.now() - (work.startedAt || Date.now());
      const minutes = Math.floor(elapsed / 60000);

      if (minutes < 1) {
        return "Just getting started on that. Give me another moment.";
      } else if (minutes < 3) {
        return `Still working on it. About ${minutes} minute${minutes > 1 ? 's' : ''} in.`;
      } else {
        return "Taking a bit longer than expected. Almost there.";
      }
    }

    return `Working on ${activeWork.length} things right now. They're all in progress.`;
  }

  /**
   * Generate acknowledgment for completion
   */
  generateCompletionAcknowledgment(notification: NotificationMessage): string {
    // Use the natural message from notification service
    return notification.message;
  }

  /**
   * Check if response should be modified for continuity
   */
  shouldModifyResponse(sessionId: string): boolean {
    const activeWork = sessionStateManager.getActiveWork(sessionId);
    const pendingNotifications = resultNotificationService.getPendingNotifications(sessionId);

    return activeWork.length > 0 || pendingNotifications.length > 0;
  }

  /**
   * Inject continuity cues into Noah's response
   */
  injectContinuityCues(
    originalResponse: string,
    guidance: ContinuityGuidance
  ): string {
    let modified = originalResponse;

    // Prepend completion messages
    if (guidance.completionMessages.length > 0) {
      const completionBlock = guidance.completionMessages.join('\n\n');
      modified = `${completionBlock}\n\n${modified}`;
    }

    // Optionally append active work reminder (sparingly)
    if (guidance.shouldMentionActiveWork && Math.random() < 0.3) {
      modified += `\n\n(I'm still working on that other thing in the background, by the way.)`;
    }

    return modified;
  }

  /**
   * Mark notifications as acknowledged
   */
  acknowledgeNotifications(sessionId: string): void {
    resultNotificationService.clearAllNotifications(sessionId);
  }
}

// Export singleton instance
export const conversationalContinuityService = new ConversationalContinuityService();

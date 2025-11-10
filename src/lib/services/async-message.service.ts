/**
 * Async Message Service
 *
 * Enables bidirectional communication between async work and users:
 * - Async work can send messages/questions to users
 * - Users can respond to async work messages
 * - Message threading and conversation tracking
 * - Integration with progress updates
 *
 * Part of Phase 8: Bidirectional Async Communication
 */

import { createLogger } from '@/lib/logger';
import { asyncEventEmitter } from './async-event-emitter.service';

const logger = createLogger('async-message');

export interface AsyncMessage {
  id: string;
  workId: string;
  sessionId: string;
  direction: 'to_user' | 'from_user';
  type: 'question' | 'update' | 'response' | 'info';
  content: string;
  timestamp: number;
  requiresResponse?: boolean;
  responseId?: string; // Links response to original message
  metadata?: Record<string, any>;
}

export class AsyncMessageService {
  private messages: Map<string, AsyncMessage[]>; // workId -> messages
  private pendingQuestions: Map<string, AsyncMessage>; // questionId -> message
  private userResponses: Map<string, AsyncMessage>; // questionId -> response

  constructor() {
    this.messages = new Map();
    this.pendingQuestions = new Map();
    this.userResponses = new Map();
  }

  /**
   * Send message from async work to user
   */
  sendToUser(
    workId: string,
    sessionId: string,
    type: 'question' | 'update' | 'info',
    content: string,
    requiresResponse: boolean = false,
    metadata?: Record<string, any>
  ): string {
    const messageId = `msg_${workId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message: AsyncMessage = {
      id: messageId,
      workId,
      sessionId,
      direction: 'to_user',
      type,
      content,
      timestamp: Date.now(),
      requiresResponse,
      metadata
    };

    // Store message
    if (!this.messages.has(workId)) {
      this.messages.set(workId, []);
    }
    this.messages.get(workId)!.push(message);

    // Track pending questions
    if (requiresResponse) {
      this.pendingQuestions.set(messageId, message);
    }

    // Emit event for real-time notification
    asyncEventEmitter.emitMessageReceived(sessionId, workId, message);

    logger.info('Message sent to user', {
      workId,
      messageId,
      type,
      requiresResponse
    });

    return messageId;
  }

  /**
   * Send response from user to async work
   */
  respondFromUser(
    messageId: string,
    sessionId: string,
    content: string
  ): AsyncMessage | null {
    const originalMessage = this.pendingQuestions.get(messageId);
    if (!originalMessage) {
      logger.warn('Cannot respond - original message not found', { messageId });
      return null;
    }

    const responseMessage: AsyncMessage = {
      id: `resp_${messageId}_${Date.now()}`,
      workId: originalMessage.workId,
      sessionId,
      direction: 'from_user',
      type: 'response',
      content,
      timestamp: Date.now(),
      responseId: messageId
    };

    // Store response
    if (!this.messages.has(originalMessage.workId)) {
      this.messages.set(originalMessage.workId, []);
    }
    this.messages.get(originalMessage.workId)!.push(responseMessage);

    // Track response
    this.userResponses.set(messageId, responseMessage);
    this.pendingQuestions.delete(messageId);

    logger.info('User responded to async work', {
      workId: originalMessage.workId,
      messageId,
      responseId: responseMessage.id
    });

    return responseMessage;
  }

  /**
   * Get all messages for a work item
   */
  getMessages(workId: string): AsyncMessage[] {
    return this.messages.get(workId) || [];
  }

  /**
   * Get pending questions for a session
   */
  getPendingQuestions(sessionId: string): AsyncMessage[] {
    return Array.from(this.pendingQuestions.values())
      .filter(msg => msg.sessionId === sessionId);
  }

  /**
   * Get user response to a question
   */
  getUserResponse(messageId: string): AsyncMessage | undefined {
    return this.userResponses.get(messageId);
  }

  /**
   * Wait for user response (polling helper for async work)
   */
  async waitForResponse(messageId: string, timeoutMs: number = 300000): Promise<AsyncMessage | null> {
    const startTime = Date.now();
    const pollInterval = 1000; // Check every second

    while (Date.now() - startTime < timeoutMs) {
      const response = this.getUserResponse(messageId);
      if (response) {
        return response;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    logger.warn('Waiting for user response timed out', { messageId, timeoutMs });
    return null;
  }

  /**
   * Clear messages for a work item (cleanup after completion)
   */
  clearMessages(workId: string): void {
    const messages = this.messages.get(workId) || [];

    // Remove pending questions
    for (const msg of messages) {
      if (msg.requiresResponse) {
        this.pendingQuestions.delete(msg.id);
      }
      if (msg.responseId) {
        this.userResponses.delete(msg.responseId);
      }
    }

    this.messages.delete(workId);
    logger.info('Messages cleared for work', { workId, count: messages.length });
  }

  /**
   * Get message thread (conversation view)
   */
  getThread(workId: string): Array<{
    message: AsyncMessage;
    response?: AsyncMessage;
  }> {
    const messages = this.getMessages(workId);
    const thread: Array<{ message: AsyncMessage; response?: AsyncMessage }> = [];

    for (const msg of messages) {
      if (msg.direction === 'to_user') {
        const response = messages.find(m => m.responseId === msg.id);
        thread.push({ message: msg, response });
      }
    }

    return thread;
  }

  /**
   * Get unread messages for a session
   */
  getUnreadMessages(sessionId: string): AsyncMessage[] {
    const unread: AsyncMessage[] = [];

    for (const messages of this.messages.values()) {
      for (const msg of messages) {
        if (msg.sessionId === sessionId && msg.direction === 'to_user') {
          // Check if it has been responded to
          const hasResponse = messages.some(m => m.responseId === msg.id);
          if (!hasResponse && msg.requiresResponse) {
            unread.push(msg);
          }
        }
      }
    }

    return unread;
  }
}

// Export singleton instance
export const asyncMessageService = new AsyncMessageService();

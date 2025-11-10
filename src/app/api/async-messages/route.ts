/**
 * Async Messages API
 *
 * Enables bidirectional communication between async work and users:
 * - GET: Retrieve messages for a session/work item
 * - POST: Send user response to async work question
 *
 * Part of Phase 8: Bidirectional Async Communication
 */

import { NextRequest, NextResponse } from 'next/server';
import { asyncMessageService, type AsyncMessage } from '@/lib/services/async-message.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('async-messages-api');

interface MessagesResponse {
  workId?: string;
  sessionId: string;
  messages: AsyncMessage[];
  pendingQuestions: AsyncMessage[];
  unreadCount: number;
}

interface SendResponse {
  success: boolean;
  response?: AsyncMessage;
  error?: string;
}

/**
 * GET /api/async-messages?sessionId=xxx&workId=xxx
 *
 * Retrieve messages for a session or specific work item
 */
export async function GET(req: NextRequest): Promise<NextResponse<MessagesResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const workId = searchParams.get('workId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter required' },
        { status: 400 }
      );
    }

    let messages: AsyncMessage[] = [];

    if (workId) {
      // Get messages for specific work item
      messages = asyncMessageService.getMessages(workId);
    } else {
      // Get all unread messages for session
      messages = asyncMessageService.getUnreadMessages(sessionId);
    }

    const pendingQuestions = asyncMessageService.getPendingQuestions(sessionId);
    const unreadCount = asyncMessageService.getUnreadMessages(sessionId).length;

    const response: MessagesResponse = {
      workId: workId || undefined,
      sessionId,
      messages,
      pendingQuestions,
      unreadCount
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to retrieve messages', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/async-messages
 *
 * Send user response to async work question
 *
 * Body: { messageId: string, sessionId: string, content: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse<SendResponse>> {
  try {
    const { messageId, sessionId, content } = await req.json();

    if (!messageId || !sessionId || !content) {
      return NextResponse.json(
        { success: false, error: 'messageId, sessionId, and content required' },
        { status: 400 }
      );
    }

    const response = asyncMessageService.respondFromUser(messageId, sessionId, content);

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Message not found or already responded' },
        { status: 404 }
      );
    }

    logger.info('User responded to async message', {
      messageId,
      responseId: response.id
    });

    return NextResponse.json({
      success: true,
      response
    });

  } catch (error) {
    logger.error('Failed to send message response', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

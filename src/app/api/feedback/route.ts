/**
 * Feedback API - Handles positive/negative user feedback on Noah's responses
 * Updates credibility based on user's explicit feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrustService } from '@/lib/services/trust.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('FeedbackAPI');

export async function POST(req: NextRequest) {
  try {
    const { sessionId, eventType, messageContent } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const trustService = getTrustService();
    let credibilityLevel = 40; // Default

    // Handle positive feedback
    if (eventType === 'positive_feedback') {
      credibilityLevel = await trustService.logTrustEvent({
        sessionId,
        eventType: 'positive_feedback',
        impactScore: 5, // +5% for good response
        context: messageContent ? `User appreciated response: ${messageContent.substring(0, 100)}...` : 'User appreciated response'
      });

      logger.info('Positive feedback recorded', {
        sessionId,
        newCredibility: credibilityLevel
      });
    }

    return NextResponse.json({
      success: true,
      credibilityLevel
    });

  } catch (error) {
    logger.error('Feedback API error', { error });
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}

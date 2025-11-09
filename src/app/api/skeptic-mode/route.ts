/**
 * Skeptic Mode API - Handles the credibility handicap when user enables Skeptic Mode
 *
 * Handicap System:
 * - Toggle ON: -15% credibility (one-time per session)
 * - While active: Only user actions (challenge/appreciate) affect credibility
 * - Toggle OFF: Returns to normal scoring (no points restored)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrustService } from '@/lib/services/trust.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SkepticModeAPI');

export async function POST(req: NextRequest) {
  try {
    const { sessionId, enabled, alreadyTriggered } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const trustService = getTrustService();
    let credibilityLevel: number;

    // Only apply handicap if:
    // 1. User is enabling (not disabling)
    // 2. Hasn't been triggered this session yet
    if (enabled && !alreadyTriggered) {
      credibilityLevel = await trustService.handleSkepticModeEnabled(sessionId);

      logger.info('Skeptic Mode handicap applied', {
        sessionId: sessionId.substring(0, 8) + '...',
        newCredibility: credibilityLevel,
        drop: -15
      });
    } else {
      // Just get current level (no change)
      credibilityLevel = await trustService.getTrustLevel(sessionId);

      if (!enabled) {
        logger.info('Skeptic Mode disabled', {
          sessionId: sessionId.substring(0, 8) + '...',
          credibility: credibilityLevel,
          note: 'Normal scoring resumed, no points restored'
        });
      }
    }

    return NextResponse.json({
      success: true,
      credibilityLevel,
      handicapApplied: enabled && !alreadyTriggered
    });

  } catch (error) {
    logger.error('Skeptic Mode API error', { error });
    return NextResponse.json(
      { error: 'Failed to process Skeptic Mode toggle' },
      { status: 500 }
    );
  }
}

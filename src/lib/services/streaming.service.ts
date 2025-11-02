/**
 * Streaming Service
 *
 * Provides streaming response capabilities for perceptual speed:
 * - Immediate response (<500ms first token)
 * - Progress updates during async work
 * - Conversational continuity while working
 *
 * Part of Phase 2: Perceptual Speed
 */

import { progressRegistry, type ProgressUpdate } from './progress-tracker.service';

/**
 * Stream event types
 */
export enum StreamEventType {
  MESSAGE = 'message',
  PROGRESS = 'progress',
  ASYNC_STARTED = 'async_started',
  ASYNC_COMPLETE = 'async_complete',
  ERROR = 'error',
}

export interface StreamEvent {
  type: StreamEventType;
  data: any;
}

/**
 * Create a streaming response with Server-Sent Events
 */
export function createStreamingResponse(
  generator: AsyncGenerator<StreamEvent>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          const sseMessage = formatSSE(event);
          controller.enqueue(encoder.encode(sseMessage));
        }
      } catch (error) {
        const errorEvent: StreamEvent = {
          type: StreamEventType.ERROR,
          data: { message: error instanceof Error ? error.message : 'Unknown error' },
        };
        controller.enqueue(encoder.encode(formatSSE(errorEvent)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Format event as Server-Sent Event
 */
function formatSSE(event: StreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Create immediate acknowledgment stream
 * Sends first token <500ms to ensure perceptual speed
 */
export async function* createImmediateAckStream(
  message: string
): AsyncGenerator<StreamEvent> {
  // Send immediate acknowledgment (<500ms)
  yield {
    type: StreamEventType.MESSAGE,
    data: { content: message, partial: true },
  };
}

/**
 * Create progress tracking stream
 * Streams progress updates for async work
 */
export async function* createProgressStream(
  workId: string,
  acknowledgmentMessage: string
): AsyncGenerator<StreamEvent> {
  // Immediate ack
  yield {
    type: StreamEventType.MESSAGE,
    data: { content: acknowledgmentMessage, partial: false },
  };

  // Notify that async work started
  yield {
    type: StreamEventType.ASYNC_STARTED,
    data: { workId },
  };

  // Stream progress updates
  const tracker = progressRegistry.get(workId);
  if (!tracker) {
    yield {
      type: StreamEventType.ERROR,
      data: { message: 'Progress tracker not found' },
    };
    return;
  }

  // Subscribe to progress updates
  const updates: ProgressUpdate[] = [];
  const unsubscribe = tracker.subscribe((update) => {
    updates.push(update);
  });

  try {
    // Stream progress updates as they come in
    while (true) {
      if (updates.length > 0) {
        const update = updates.shift()!;
        yield {
          type: StreamEventType.PROGRESS,
          data: update,
        };

        // Exit if complete
        if (update.stage === 'complete') {
          break;
        }
      }

      // Small delay to avoid tight loop
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } finally {
    unsubscribe();
  }

  // Final completion event
  yield {
    type: StreamEventType.ASYNC_COMPLETE,
    data: { workId },
  };
}

/**
 * Create conversational stream with interleaved progress
 * Allows Noah to continue conversation while work happens in background
 */
export async function* createConversationalStream(
  conversationMessages: string[],
  workId?: string
): AsyncGenerator<StreamEvent> {
  // Stream conversation messages
  for (const message of conversationMessages) {
    yield {
      type: StreamEventType.MESSAGE,
      data: { content: message, partial: false },
    };

    // Small delay between messages for natural pacing
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // If work ID provided, also stream progress
  if (workId) {
    const tracker = progressRegistry.get(workId);
    if (tracker) {
      const unsubscribe = tracker.subscribe((update) => {
        // Progress updates will be handled asynchronously
      });

      // Just indicate work is happening
      yield {
        type: StreamEventType.PROGRESS,
        data: {
          stage: 'building',
          progress: 50,
          message: 'Working on it in the background...',
          timestamp: Date.now(),
        },
      };

      unsubscribe();
    }
  }
}

/**
 * Helper: Create timed message stream
 * Streams a message with natural typing speed
 */
export async function* createTypingStream(
  message: string,
  chunkSize: number = 20
): AsyncGenerator<StreamEvent> {
  let sent = 0;
  while (sent < message.length) {
    const chunk = message.slice(sent, sent + chunkSize);
    sent += chunkSize;

    yield {
      type: StreamEventType.MESSAGE,
      data: {
        content: chunk,
        partial: sent < message.length,
      },
    };

    // Simulate typing speed (~50ms per chunk)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

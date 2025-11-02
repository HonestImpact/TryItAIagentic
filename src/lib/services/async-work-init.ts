/**
 * Async Work System Initialization
 *
 * Registers agent executors with the async work queue
 * This connects the existing agents (Wanderer, Tinkerer) to the async system
 */

import { asyncWorkQueue, createAgentExecutor } from './async-work-queue.service';
import { resultNotificationService } from './result-notification.service';
import type { WandererAgent } from '@/lib/agents/wanderer-agent';
import type { PracticalAgentAgentic } from '@/lib/agents/practical-agent-agentic';

let initialized = false;

/**
 * Initialize async work system with agent executors
 *
 * Call this once during application startup
 */
export async function initializeAsyncWorkSystem(
  wandererAgent: WandererAgent,
  tinkererAgent: PracticalAgentAgentic
): Promise<void> {
  if (initialized) {
    return;
  }

  // Register research executor (Wanderer)
  const researchExecutor = createAgentExecutor('research', async (request: string) => {
    // Call Wanderer's research method
    const result = await wandererAgent.research(request);
    return result;
  });

  asyncWorkQueue.registerExecutor(researchExecutor);

  // Register tool executor (Tinkerer)
  const toolExecutor = createAgentExecutor('tool', async (request: string) => {
    // Call Tinkerer's build method
    const result = await tinkererAgent.buildTool(request);
    return result;
  });

  asyncWorkQueue.registerExecutor(toolExecutor);

  // Set up completion/failure listeners
  // When work completes, notify via notification service
  // This is handled automatically by async-work-queue.service.ts
  // which calls resultNotificationService internally

  initialized = true;

  console.log('[AsyncWorkInit] System initialized with agent executors');
}

/**
 * Check if async work system is initialized
 */
export function isAsyncWorkSystemInitialized(): boolean {
  return initialized;
}

/**
 * Reset initialization state (for testing)
 */
export function resetAsyncWorkSystem(): void {
  initialized = false;
}

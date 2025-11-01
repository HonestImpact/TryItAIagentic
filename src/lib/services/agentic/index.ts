/**
 * Agentic Services
 *
 * Intelligent services that enable agents to think strategically, evaluate realistically,
 * learn from experience, and protect against manipulation.
 *
 * These services are injected into agents via constructor, enhancing their capabilities
 * without changing their core LangGraph workflows.
 *
 * Architecture:
 * - Service-oriented (NOT inheritance-based)
 * - Each agent maintains its unique StateGraph workflow
 * - Services are called from within existing workflow nodes
 * - Cross-agent learning and intelligence sharing
 *
 * @example
 * ```typescript
 * import { createAgenticServices } from '@/lib/services/agentic';
 *
 * const services = await createAgenticServices();
 *
 * const tinkerer = new PracticalAgentAgentic(config, services);
 * const wanderer = new ExploratoryAgent(config, services);
 * const noah = new ConversationalAgent(config, services);
 * ```
 */

import { LLMProvider } from '@/lib/services/llm-provider';
import { MetacognitiveService } from './metacognitive.service';
import { EvaluationService } from './evaluation.service';
import { LearningService } from './learning.service';
import { SecurityService } from './security.service';
import { PatternLibrary } from './pattern-library.service';
import { AgentCollaborationService } from './agent-collaboration.service';

// Export all types
export * from './types';

// Export all services
export { MetacognitiveService } from './metacognitive.service';
export { EvaluationService } from './evaluation.service';
export { LearningService } from './learning.service';
export { SecurityService } from './security.service';
export { PatternLibrary } from './pattern-library.service';
export { AgentCollaborationService } from './agent-collaboration.service';
export { performanceTracker, measurePerformance } from './performance';

/**
 * Create and initialize all agentic services
 *
 * This is the primary entry point for setting up the service container.
 * Call this once at application startup and inject the result into all agents.
 *
 * @param llmProvider - The LLM provider to use for AI-powered analysis
 * @returns Fully initialized agentic services container
 *
 * @example
 * ```typescript
 * const llmProvider = new LLMProvider('ANTHROPIC', {
 *   model: 'claude-sonnet-4-20250514',
 *   temperature: 0.7
 * });
 *
 * const services = await createAgenticServices(llmProvider);
 *
 * // Inject into agents
 * const tinkerer = new PracticalAgentAgentic(config, services);
 * ```
 */
export async function createAgenticServices(llmProvider: LLMProvider) {
  const metacognition = new MetacognitiveService(llmProvider);
  const evaluation = new EvaluationService(llmProvider);
  const learning = new LearningService();
  const security = new SecurityService(llmProvider);
  const patterns = new PatternLibrary();
  const collaboration = new AgentCollaborationService();

  return {
    metacognition,
    evaluation,
    learning,
    security,
    patterns,
    collaboration
  };
}

/**
 * Type-safe agentic services container
 *
 * Use this type when declaring service dependencies in agent constructors
 */
export type { AgenticServices } from './types';

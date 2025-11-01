/**
 * LLM Provider Wrapper
 *
 * Provides a class-based interface for LLM operations that wraps the
 * existing provider factory infrastructure.
 *
 * This wrapper enables:
 * - Constructor-based dependency injection for services
 * - Flexible provider and model configuration
 * - Consistent interface across all agentic services
 */

import { createLLMProvider, type LLMProvider as ILLMProvider, type TaskType } from '@/lib/providers/provider-factory';

export type LLMProviderType = 'ANTHROPIC' | 'OPENAI';

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLMProvider class for dependency injection into services
 *
 * @example
 * ```typescript
 * const provider = new LLMProvider('ANTHROPIC', {
 *   model: 'claude-sonnet-4-20250514',
 *   temperature: 0.7
 * });
 *
 * const result = await provider.generateText({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   system: 'You are a helpful assistant'
 * });
 * ```
 */
export class LLMProvider {
  private provider: ILLMProvider;
  private config: LLMConfig;

  constructor(
    providerType: LLMProviderType,
    config: LLMConfig = {}
  ) {
    // Map provider type to task type for the factory
    const taskType: TaskType = providerType === 'ANTHROPIC' ? 'default' : 'deepbuild';

    this.provider = createLLMProvider(taskType);
    this.config = config;
  }

  /**
   * Generate text using the configured LLM
   *
   * @param params Generation parameters
   * @returns Generated text content
   */
  async generateText(params: {
    messages: Array<{ role: string; content: string }>;
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string }> {
    return this.provider.generateText({
      messages: params.messages,
      system: params.system,
      model: this.config.model,
      temperature: params.temperature ?? this.config.temperature,
      maxTokens: params.maxTokens ?? this.config.maxTokens
    });
  }
}

/**
 * Create LLMProvider from existing factory (for backwards compatibility)
 */
export function createLLMProviderFromFactory(taskType: TaskType = 'default'): LLMProvider {
  const providerType: LLMProviderType = taskType === 'default' ? 'ANTHROPIC' : 'OPENAI';
  return new LLMProvider(providerType);
}

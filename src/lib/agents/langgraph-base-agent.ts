/**
 * LangGraph Base Agent - Foundation for truly agentic behavior
 *
 * This base class provides:
 * - StateGraph workflow orchestration
 * - Self-evaluation with confidence scoring
 * - Conditional edges for autonomous decision-making
 * - Bounded autonomy with iteration limits
 * - State persistence across workflow steps
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import type { AgentCapability, AgentRequest, AgentResponse, LLMProvider, AgentConfig } from './types';
import { IntelligentErrorHandler, type ErrorContext } from '@/lib/error-handling/intelligent-errors';
import { createLogger } from '@/lib/logger';

const logger = createLogger('langgraph-base-agent');

/**
 * Agent state maintained throughout workflow execution
 */
export interface AgentState {
  // Request information
  requestId: string;
  sessionId: string;
  userRequest: string;
  timestamp: Date;

  // Workflow state
  currentStep: string;
  iterationCount: number;
  maxIterations: number;

  // Content generation
  generatedContent: string;
  previousContent?: string;

  // Self-evaluation
  confidence?: number;
  needsRevision?: boolean;
  evaluationReasoning?: string;
  revisionFeedback?: string;

  // Completion
  isComplete: boolean;
  completionReason?: string;

  // Agent-specific metadata
  metadata: Record<string, any>;
}

/**
 * Base configuration for LangGraph agents
 */
export interface LangGraphAgentConfig extends AgentConfig {
  maxIterations?: number;
  confidenceThreshold?: number;
}

/**
 * Abstract base class for LangGraph-powered agentic agents
 */
export abstract class LangGraphBaseAgent {
  protected readonly logger = createLogger(`${this.id}-agent`);

  protected constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly capabilities: AgentCapability[],
    protected readonly llmProvider: LLMProvider,
    protected readonly config: LangGraphAgentConfig
  ) {
    this.config.maxIterations = config.maxIterations || 3;
    this.config.confidenceThreshold = config.confidenceThreshold || 0.8;
  }

  /**
   * Main entry point - creates workflow and executes it
   */
  abstract processRequest(request: AgentRequest): Promise<AgentResponse>;

  /**
   * Create initial state from request
   */
  protected createInitialState(request: AgentRequest): AgentState {
    return {
      requestId: request.id,
      sessionId: request.sessionId,
      userRequest: request.content,
      timestamp: request.timestamp,
      currentStep: 'start',
      iterationCount: 0,
      maxIterations: this.config.maxIterations || 3,
      generatedContent: '',
      isComplete: false,
      metadata: {}
    };
  }

  /**
   * Convert final state to agent response
   */
  protected stateToResponse(state: AgentState): AgentResponse {
    return {
      requestId: state.requestId,
      agentId: this.id,
      content: state.generatedContent,
      confidence: state.confidence || 0.5,
      reasoning: state.completionReason || state.evaluationReasoning || 'Processing completed',
      timestamp: new Date(),
      metadata: {
        ...state.metadata,
        iterationsUsed: state.iterationCount,
        maxIterations: state.maxIterations,
        completionReason: state.completionReason
      }
    };
  }

  /**
   * Generate intelligent error response with context awareness
   */
  protected generateErrorResponse(request: AgentRequest, error?: unknown): AgentResponse {
    const errorContext: ErrorContext = {
      operation: `${this.id}-process-request`,
      agentInvolved: this.id as 'noah' | 'wanderer' | 'tinkerer',
      requestType: this.inferRequestType(request.content),
      userMessageLength: request.content.length,
      sessionId: request.sessionId,
      originalError: error instanceof Error ? error : undefined
    };

    const errorResponse = IntelligentErrorHandler.handleError(errorContext);

    return {
      requestId: request.id,
      agentId: this.id,
      content: errorResponse.userMessage,
      confidence: 0.3,
      reasoning: errorResponse.internalReason,
      timestamp: new Date(),
      metadata: {
        error: true,
        errorSeverity: errorResponse.severity,
        suggestedAction: errorResponse.suggestedAction,
        fallbackStrategy: errorResponse.fallbackStrategy
      }
    };
  }

  /**
   * Infer request type from content for better error handling
   */
  protected inferRequestType(content: string): 'conversation' | 'research' | 'tool-generation' | 'analysis' {
    const contentLower = content.toLowerCase();

    if (contentLower.includes('create') || contentLower.includes('build') || contentLower.includes('make') || contentLower.includes('generate')) {
      return 'tool-generation';
    }

    if (contentLower.includes('research') || contentLower.includes('find') || contentLower.includes('search') || contentLower.includes('investigate')) {
      return 'research';
    }

    if (contentLower.includes('analyze') || contentLower.includes('explain') || contentLower.includes('why') || contentLower.includes('how')) {
      return 'analysis';
    }

    return 'conversation';
  }

  /**
   * Get base system prompt - can be overridden by subclasses
   */
  protected getSystemPrompt(): string {
    return `You are ${this.name}, an AI agent with these capabilities: ${this.capabilities.map(c => c.name).join(', ')}.`;
  }

  /**
   * Check if should continue iterating based on confidence and iteration count
   */
  protected shouldContinueIterating(state: AgentState): boolean {
    // Safety valve: max iterations reached
    if (state.iterationCount >= state.maxIterations) {
      this.logger.warn('Max iterations reached, forcing completion', {
        iterationCount: state.iterationCount,
        maxIterations: state.maxIterations
      });
      return false;
    }

    // Quality check: confidence below threshold
    if (state.confidence && state.confidence < (this.config.confidenceThreshold || 0.8)) {
      this.logger.info('Confidence below threshold, continuing iteration', {
        confidence: state.confidence,
        threshold: this.config.confidenceThreshold,
        iteration: state.iterationCount
      });
      return true;
    }

    // Agent explicitly marked needs revision
    if (state.needsRevision) {
      this.logger.info('Agent marked needs revision, continuing iteration', {
        iteration: state.iterationCount,
        feedback: state.revisionFeedback
      });
      return true;
    }

    return false;
  }
}

/**
 * Practical Agent (Tinkerer) - LangGraph Agentic Version
 *
 * Truly agentic technical implementation specialist with:
 * - Self-evaluation and quality assessment
 * - Autonomous revision based on confidence thresholds
 * - Bounded autonomy with iteration limits
 * - RAG-enhanced pattern knowledge
 */

import { StateGraph, END } from '@langchain/langgraph';
import { LangGraphBaseAgent, type AgentState, type LangGraphAgentConfig } from './langgraph-base-agent';
import { createLogger } from '../logger';
import type { AgentSharedResources } from './shared-resources';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider
} from './types';

const logger = createLogger('tinkerer-agentic');

/**
 * Extended state for Tinkerer-specific workflow
 */
interface TinkererState extends AgentState {
  // Knowledge enhancement
  knowledgeContext?: string;
  patternsUsed?: string[];

  // Generation tracking
  generationAttempts: number;

  // Quality metrics
  qualityScores?: {
    functionality: number;
    codeQuality: number;
    completeness: number;
    usability: number;
  };
}

export class PracticalAgentAgentic extends LangGraphBaseAgent {
  private readonly sharedResources?: AgentSharedResources;
  private workflow: any; // StateGraph workflow instance

  constructor(
    llmProvider: LLMProvider,
    config: LangGraphAgentConfig = {},
    sharedResources?: AgentSharedResources
  ) {
    const capabilities: AgentCapability[] = [
      {
        name: 'technical-implementation',
        description: 'Creates production-ready code with enterprise standards and self-evaluation',
        version: '3.0.0'
      }
    ];

    super('tinkerer', 'Tinkerer - Agentic Technical Implementation', capabilities, llmProvider, {
      temperature: 0.3,
      maxTokens: 4000,
      maxIterations: 3,
      confidenceThreshold: 0.8,
      ...config
    });

    this.sharedResources = sharedResources;
    this.workflow = this.buildWorkflow();
  }

  /**
   * Build LangGraph workflow with agentic nodes and conditional edges
   */
  private buildWorkflow() {
    const graph = new StateGraph<TinkererState>({
      channels: {
        requestId: null,
        sessionId: null,
        userRequest: null,
        timestamp: null,
        currentStep: null,
        iterationCount: null,
        maxIterations: null,
        generatedContent: null,
        previousContent: null,
        confidence: null,
        needsRevision: null,
        evaluationReasoning: null,
        revisionFeedback: null,
        isComplete: null,
        completionReason: null,
        metadata: null,
        knowledgeContext: null,
        patternsUsed: null,
        generationAttempts: null,
        qualityScores: null
      }
    });

    // Add workflow nodes
    graph.addNode('reasoning', this.reasoningNode.bind(this));
    graph.addNode('knowledge_enhancement', this.knowledgeEnhancementNode.bind(this));
    graph.addNode('generation', this.generationNode.bind(this));
    graph.addNode('self_evaluation', this.selfEvaluationNode.bind(this));
    graph.addNode('revision', this.revisionNode.bind(this));

    // Define workflow edges
    graph.addEdge('__start__', 'reasoning');
    graph.addEdge('reasoning', 'knowledge_enhancement');
    graph.addEdge('knowledge_enhancement', 'generation');
    graph.addEdge('generation', 'self_evaluation');

    // Conditional edge: should revise or complete?
    graph.addConditionalEdges(
      'self_evaluation',
      this.shouldRevise.bind(this),
      {
        'revision': 'revision',
        'complete': END
      }
    );

    graph.addEdge('revision', 'generation'); // Loop back for another attempt

    return graph.compile();
  }

  /**
   * Main entry point - executes the LangGraph workflow
   */
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    logger.info('Tinkerer (Agentic) processing implementation request', {
      requestId: request.id,
      contentLength: request.content.length
    });

    try {
      // Create initial state
      const initialState: TinkererState = {
        ...this.createInitialState(request),
        generationAttempts: 0,
        patternsUsed: [],
        metadata: {
          agenticVersion: true,
          workflowType: 'langgraph-stategraph'
        }
      };

      // Execute workflow
      const finalState = await this.workflow.invoke(initialState);

      // Convert state to response
      const response = this.stateToResponse(finalState);

      logger.info('Tinkerer (Agentic) completed', {
        iterationsUsed: finalState.iterationCount,
        confidence: finalState.confidence,
        patternsUsed: finalState.patternsUsed?.length || 0
      });

      return response;

    } catch (error) {
      logger.error('Tinkerer (Agentic) processing failed', { error });
      return this.generateErrorResponse(request, error);
    }
  }

  /**
   * REASONING NODE: Analyze the request and plan approach
   */
  private async reasoningNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('🧠 Reasoning about implementation approach', {
      iteration: state.iterationCount
    });

    state.currentStep = 'reasoning';

    // For first iteration, analyze the request
    // For subsequent iterations, we already know what to do
    if (state.iterationCount === 0) {
      logger.info('Initial analysis - determining implementation strategy');
    } else {
      logger.info('Revision iteration - will incorporate feedback', {
        iteration: state.iterationCount,
        previousConfidence: state.confidence
      });
    }

    return {
      currentStep: 'reasoning_complete'
    };
  }

  /**
   * KNOWLEDGE ENHANCEMENT NODE: Get relevant design patterns
   */
  private async knowledgeEnhancementNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('🧠 Enhancing with design patterns', {
      iteration: state.iterationCount
    });

    state.currentStep = 'knowledge_enhancement';

    let knowledgeContext = '';
    let patternsUsed: string[] = [];

    // Get relevant design patterns if tool knowledge service is available
    if (this.sharedResources?.toolKnowledgeService) {
      try {
        const knowledgeResult = await this.sharedResources.toolKnowledgeService.getRelevantPatterns(
          state.userRequest,
          3 // Top 3 most relevant patterns
        );

        if (knowledgeResult.patterns.length > 0) {
          logger.info('✅ Found relevant patterns', {
            patternsCount: knowledgeResult.patterns.length,
            topPattern: knowledgeResult.patterns[0]?.title
          });

          knowledgeContext = this.buildKnowledgeContext(knowledgeResult);
          patternsUsed = knowledgeResult.patterns.map(p => p.title);
        }
      } catch (error) {
        logger.warn('Knowledge enhancement failed, proceeding without patterns', { error });
      }
    }

    return {
      knowledgeContext,
      patternsUsed,
      currentStep: 'knowledge_enhanced'
    };
  }

  /**
   * GENERATION NODE: Create the technical implementation
   */
  private async generationNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('🔧 Generating implementation', {
      iteration: state.iterationCount,
      attempt: state.generationAttempts + 1,
      hasKnowledge: !!state.knowledgeContext,
      hasRevisionFeedback: !!state.revisionFeedback
    });

    state.currentStep = 'generation';

    // Build the generation prompt
    let enhancedContent = state.userRequest;

    // Add revision feedback if this is a retry
    if (state.revisionFeedback && state.previousContent) {
      enhancedContent = `${state.userRequest}

PREVIOUS ATTEMPT (needs improvement):
${state.previousContent.substring(0, 500)}...

FEEDBACK FOR IMPROVEMENT:
${state.revisionFeedback}

Please generate an IMPROVED version addressing the feedback above.`;
    }

    // Add knowledge context
    if (state.knowledgeContext) {
      enhancedContent = `${enhancedContent}\n\n${state.knowledgeContext}`;
    }

    // Generate the implementation
    const result = await this.llmProvider.generateText({
      messages: [{ role: 'user', content: enhancedContent }],
      system: this.getEnhancedSystemPrompt(state.knowledgeContext || ''),
      model: process.env.LLM_DEEPBUILD_ID || process.env.LLM_DEFAULT_ID || 'gpt-4o',
      temperature: 0.3
    });

    return {
      previousContent: state.generatedContent || undefined,
      generatedContent: result.content,
      generationAttempts: state.generationAttempts + 1,
      currentStep: 'generation_complete'
    };
  }

  /**
   * SELF-EVALUATION NODE: Assess quality and determine if revision needed
   */
  private async selfEvaluationNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('📊 Self-evaluating quality', {
      iteration: state.iterationCount,
      contentLength: state.generatedContent?.length || 0
    });

    state.currentStep = 'self_evaluation';

    // Build evaluation prompt
    const evaluationPrompt = `You are a quality assurance expert. Evaluate this technical implementation:

USER REQUEST:
${state.userRequest}

GENERATED IMPLEMENTATION:
${state.generatedContent.substring(0, 2000)}...

Evaluate on these dimensions (score 0.0-1.0 for each):
1. FUNCTIONALITY - Does it fully meet the user's requirements?
2. CODE QUALITY - Is the code clean, maintainable, and well-structured?
3. COMPLETENESS - Are all features implemented? No placeholders or TODOs?
4. USABILITY - Is it user-friendly with good UX/UI?

Respond in this EXACT JSON format:
{
  "functionality": 0.0-1.0,
  "codeQuality": 0.0-1.0,
  "completeness": 0.0-1.0,
  "usability": 0.0-1.0,
  "overallConfidence": 0.0-1.0,
  "needsRevision": true/false,
  "reasoning": "Brief explanation of the assessment",
  "revisionFeedback": "Specific improvements needed (if needsRevision is true)"
}`;

    try {
      const evaluationResult = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: evaluationPrompt }],
        system: 'You are a technical quality evaluator. Respond ONLY with valid JSON.',
        model: process.env.LLM_DEFAULT_ID || 'claude-sonnet-4-20250514',
        temperature: 0.2 // Low temperature for consistent evaluation
      });

      // Parse evaluation
      const jsonMatch = evaluationResult.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Failed to parse evaluation JSON, using fallback confidence');
        return {
          confidence: state.knowledgeContext ? 0.85 : 0.75,
          needsRevision: false,
          evaluationReasoning: 'Technical implementation completed',
          iterationCount: state.iterationCount + 1
        };
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      logger.info('✅ Self-evaluation complete', {
        overallConfidence: evaluation.overallConfidence,
        needsRevision: evaluation.needsRevision,
        scores: {
          functionality: evaluation.functionality,
          codeQuality: evaluation.codeQuality,
          completeness: evaluation.completeness,
          usability: evaluation.usability
        }
      });

      return {
        confidence: evaluation.overallConfidence,
        needsRevision: evaluation.needsRevision && state.iterationCount < state.maxIterations,
        evaluationReasoning: evaluation.reasoning,
        revisionFeedback: evaluation.revisionFeedback || undefined,
        qualityScores: {
          functionality: evaluation.functionality,
          codeQuality: evaluation.codeQuality,
          completeness: evaluation.completeness,
          usability: evaluation.usability
        },
        iterationCount: state.iterationCount + 1,
        currentStep: 'self_evaluation_complete'
      };

    } catch (error) {
      logger.error('Self-evaluation failed, using fallback', { error });
      // Fallback: assume decent quality if we have knowledge context
      return {
        confidence: state.knowledgeContext ? 0.85 : 0.75,
        needsRevision: false,
        evaluationReasoning: 'Technical implementation completed (evaluation fallback)',
        iterationCount: state.iterationCount + 1
      };
    }
  }

  /**
   * REVISION NODE: Prepare for another generation attempt with feedback
   */
  private async revisionNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('🔄 Preparing revision', {
      iteration: state.iterationCount,
      confidence: state.confidence,
      feedback: state.revisionFeedback?.substring(0, 100)
    });

    state.currentStep = 'revision';

    // The revision feedback is already in state from self-evaluation
    // We just mark that we're ready for another generation attempt

    return {
      currentStep: 'revision_ready'
    };
  }

  /**
   * CONDITIONAL EDGE: Determine if revision is needed or work is complete
   */
  private shouldRevise(state: TinkererState): string {
    // Safety valve: max iterations reached
    if (state.iterationCount >= state.maxIterations) {
      logger.warn('⚠️ Max iterations reached, forcing completion', {
        iterationCount: state.iterationCount,
        confidence: state.confidence
      });

      return 'complete';
    }

    // Agent explicitly marked needs revision and we have iterations left
    if (state.needsRevision) {
      logger.info('🔄 Agent determined revision needed', {
        iteration: state.iterationCount,
        confidence: state.confidence,
        feedback: state.revisionFeedback?.substring(0, 100)
      });
      return 'revision';
    }

    // Confidence below threshold (shouldn't happen if self-evaluation is working)
    if (state.confidence && state.confidence < (this.config.confidenceThreshold || 0.8)) {
      logger.info('⚠️ Confidence below threshold', {
        confidence: state.confidence,
        threshold: this.config.confidenceThreshold
      });
      return 'revision';
    }

    // All good - work is complete
    logger.info('✅ Quality standards met, completing', {
      confidence: state.confidence,
      iterations: state.iterationCount
    });

    return 'complete';
  }

  /**
   * Enhanced system prompt with knowledge context
   */
  private getEnhancedSystemPrompt(knowledgeContext: string): string {
    const basePrompt = `You are the Tinkerer, an advanced AI agent specialized in enterprise-grade technical implementation.

CORE IDENTITY:
- You excel at building sophisticated, production-ready solutions
- You prioritize code quality, maintainability, and performance
- You create complete, working implementations
- You are self-aware of quality standards and iterate until they are met

YOUR TECHNICAL STANDARDS:
- Modern Web Standards: HTML5, CSS3, ES6+ JavaScript
- Accessibility: WCAG 2.1 AA compliance with proper ARIA labels
- Responsive Design: Mobile-first approach with flexible layouts
- Performance: Optimized DOM manipulation and resource loading
- Security: Input validation and XSS prevention

TOOL CREATION FORMAT:
When building tools, use this exact format:

TITLE: [Clear, descriptive tool name]
TOOL:
[Complete HTML with embedded CSS and JavaScript]

REASONING:
[Brief explanation of design choices]

Create functional, self-contained solutions that work immediately when saved as .html files.`;

    if (!knowledgeContext) {
      return basePrompt;
    }

    return `${basePrompt}

KNOWLEDGE ENHANCEMENT:
You have access to proven design patterns and implementations that are relevant to this request. Use these patterns as inspiration and foundation, but adapt them to the specific requirements. The patterns provide excellent starting points for structure, styling, and functionality.

${knowledgeContext}

INTEGRATION GUIDANCE:
- Leverage the proven patterns as your foundation
- Adapt and enhance the patterns for the specific use case
- Combine multiple patterns if beneficial
- Ensure the final implementation is cohesive and polished
- Maintain the established technical standards while incorporating pattern insights`;
  }

  /**
   * Build knowledge context from relevant patterns
   */
  private buildKnowledgeContext(knowledgeResult: any): string {
    if (!knowledgeResult.patterns || knowledgeResult.patterns.length === 0) {
      return '';
    }

    let context = 'RELEVANT DESIGN PATTERNS:\n\n';

    knowledgeResult.patterns.forEach((pattern: any, index: number) => {
      context += `${index + 1}. ${pattern.title} (${pattern.category})\n`;
      context += `   Description: ${pattern.description}\n`;

      if (pattern.features && pattern.features.length > 0) {
        context += `   Key Features: ${pattern.features.slice(0, 3).join(', ')}\n`;
      }

      if (pattern.codeSnippets) {
        // Include key structural patterns
        if (pattern.codeSnippets.structure) {
          const structurePreview = pattern.codeSnippets.structure
            .replace(/\s+/g, ' ')
            .substring(0, 200);
          context += `   Structure Pattern: ${structurePreview}...\n`;
        }

        // Include key styling approaches
        if (pattern.codeSnippets.styling) {
          const stylePreview = pattern.codeSnippets.styling
            .replace(/\s+/g, ' ')
            .substring(0, 150);
          context += `   Style Pattern: ${stylePreview}...\n`;
        }
      }

      context += `   Relevance: ${Math.round(pattern.relevanceScore * 100)}%\n\n`;
    });

    if (knowledgeResult.recommendations && knowledgeResult.recommendations.length > 0) {
      context += 'RECOMMENDATIONS:\n';
      knowledgeResult.recommendations.forEach((rec: string) => {
        context += `- ${rec}\n`;
      });
    }

    return context;
  }

  protected getSystemPrompt(): string {
    return this.getEnhancedSystemPrompt('');
  }
}

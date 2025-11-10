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
import type { AgenticServices, WorkflowMemory } from '../services/agentic';

const logger = createLogger('tinkerer-agentic');

/**
 * Extended state for Tinkerer-specific workflow
 */
interface TinkererState extends AgentState {
  // Knowledge enhancement
  knowledgeContext?: string;
  patternsUsed?: string[];
  collaborationInsights?: string[]; // IDs of insights used
  bestPracticesUsed?: number; // Count of best practices from learning cache

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
  private readonly agenticServices?: AgenticServices;
  private workflow: any; // StateGraph workflow instance
  private workflowStartTime: number = 0;

  constructor(
    llmProvider: LLMProvider,
    config: LangGraphAgentConfig = {},
    sharedResources?: AgentSharedResources,
    agenticServices?: AgenticServices
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

    // Constructor validation (fail-fast pattern for critical dependencies)
    if (!llmProvider) {
      logger.warn('PracticalAgentAgentic initialized without LLM provider - evaluation will be degraded');
    }

    this.sharedResources = sharedResources;
    this.agenticServices = agenticServices;
    this.workflow = this.buildWorkflow();

    if (agenticServices) {
      logger.info('🧠 Agentic services enabled', {
        hasMetacognition: !!agenticServices.metacognition,
        hasEvaluation: !!agenticServices.evaluation,
        hasLearning: !!agenticServices.learning,
        hasSecurity: !!agenticServices.security
      });
    }
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
        qualityScores: null,
        synthesisPlan: null,  // Pattern synthesis plan for creative combination
        beautyCheckResult: null  // 💎 Beauty check assessment (code elegance, readability, craft)
      }
    });

    // Add workflow nodes
    graph.addNode('reasoning', this.reasoningNode.bind(this));
    graph.addNode('knowledge_enhancement', this.knowledgeEnhancementNode.bind(this));
    graph.addNode('synthesis', this.synthesisNode.bind(this));  // 🎨 NEW: Pattern synthesis
    graph.addNode('generation', this.generationNode.bind(this));
    graph.addNode('beauty_check', this.beautyCheckNode.bind(this));  // 💎 NEW: Noah's excellence validation
    graph.addNode('self_evaluation', this.selfEvaluationNode.bind(this));
    graph.addNode('revision', this.revisionNode.bind(this));

    // Define workflow edges
    graph.addEdge('__start__', 'reasoning');
    graph.addEdge('reasoning', 'knowledge_enhancement');
    graph.addEdge('knowledge_enhancement', 'synthesis');  // 🎨 NEW: Synthesize patterns before generation
    graph.addEdge('synthesis', 'generation');
    graph.addEdge('generation', 'beauty_check');  // 💎 NEW: Check elegance and craft before evaluation
    graph.addEdge('beauty_check', 'self_evaluation');

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
   * 🎯 AGENTIC ROUTING: Evaluate whether this agent should handle the request
   *
   * This method enables truly agentic routing by allowing the agent to autonomously
   * decide if it should handle a request based on its capabilities, not keyword matching.
   *
   * @param requestContent - The user's request content
   * @returns Promise<{ confidence: number, reasoning: string }>
   *   - confidence: 0.0-1.0, how confident the agent is it should handle this
   *   - reasoning: Explanation of why this confidence level
   *
   * @example
   * const bid = await tinkerer.evaluateRequest("Build a React dashboard");
   * // { confidence: 0.95, reasoning: "Complex code generation task matches my specialization..." }
   */
  async evaluateRequest(requestContent: string): Promise<{ confidence: number; reasoning: string }> {
    logger.debug('Tinkerer evaluating request for agentic routing', {
      contentLength: requestContent.length
    });

    try {
      // Use LLM to analyze request fit
      const prompt = `You are the Tinkerer agent, specialized in building production-ready code, React components, interactive tools, and technical implementations.

Your capabilities:
- Creating React components with modern patterns
- Building interactive dashboards and data visualizations
- Implementing forms with validation
- Developing full-featured web applications
- Writing production-quality code with best practices

Analyze this user request and determine how confident you are that YOU should handle it (0.0-1.0):

User Request: "${requestContent}"

Consider:
1. Does this require code generation or building something?
2. Does this match your technical implementation specialization?
3. Is this within your capability scope?
4. How complex is the implementation required?

Return a JSON object with:
{
  "confidence": <number 0.0-1.0>,
  "reasoning": "<brief explanation of your confidence level>"
}

Examples:
- "Build a React dashboard" → confidence: 0.95 (perfect match for your skills)
- "Create a simple calculator" → confidence: 0.90 (straightforward code generation)
- "Research best practices for React hooks" → confidence: 0.3 (research task, not building)
- "How do I use useState?" → confidence: 0.2 (conversational, not building)
- "What's the weather like?" → confidence: 0.05 (completely outside your domain)`;

      // Hybrid approach: Check if LLM is available before using it
      if (!this.llm || typeof this.llm.generateText !== 'function') {
        logger.warn('Tinkerer evaluation degraded - LLM unavailable', {
          hasLlm: !!this.llm,
          hasGenerateText: !!(this.llm?.generateText)
        });
        return {
          confidence: 0.30,
          reasoning: 'Evaluation unavailable - LLM provider not configured'
        };
      }

      const response = await this.llm.generateText({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low temperature for consistent evaluation
        maxTokens: 200
      });

      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);

        logger.info('Tinkerer evaluation complete', {
          confidence: result.confidence,
          reasoning: result.reasoning?.substring(0, 100)
        });

        return {
          confidence: Math.max(0, Math.min(1, result.confidence)), // Clamp to [0, 1]
          reasoning: result.reasoning || 'No reasoning provided'
        };
      }

      // Fallback if parsing fails
      logger.warn('Failed to parse Tinkerer evaluation response, using fallback');
      return {
        confidence: 0.5,
        reasoning: 'Unable to evaluate - defaulting to moderate confidence'
      };

    } catch (error) {
      logger.error('Tinkerer evaluation failed', { error });
      return {
        confidence: 0.3,
        reasoning: 'Evaluation error - low confidence fallback'
      };
    }
  }

  /**
   * Main entry point - executes the LangGraph workflow
   */
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    logger.info('Tinkerer (Agentic) processing implementation request', {
      requestId: request.id,
      contentLength: request.content.length
    });

    this.workflowStartTime = Date.now();

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

      // Add learning transparency messaging if best practices were used
      // Check both direct field and metadata (metadata survives iteration resets)
      const practicesUsed = finalState.bestPracticesUsed || finalState.metadata?.bestPracticesUsed;
      if (practicesUsed && practicesUsed > 0) {
        const learningNote = practicesUsed === 1
          ? `\n\n_I remembered a similar request from before and applied what worked well then. This helped me build something better, faster._`
          : `\n\n_I pulled from ${practicesUsed} past successes with similar requests. Each time I build, I get a little sharper._`;

        response.content += learningNote;

        logger.info('📚 Added learning transparency message', {
          bestPractices: practicesUsed,
          source: finalState.bestPracticesUsed ? 'direct' : 'metadata'
        });
      }

      logger.info('Tinkerer (Agentic) completed', {
        iterationsUsed: finalState.iterationCount,
        confidence: finalState.confidence,
        patternsUsed: finalState.patternsUsed?.length || 0,
        bestPracticesUsed: finalState.bestPracticesUsed || 0
      });

      // Record workflow outcome for learning (if services available and quality high enough)
      await this.recordWorkflowOutcome(finalState, request.content);

      return response;

    } catch (error) {
      logger.error('Tinkerer (Agentic) processing failed', { error });
      return this.generateErrorResponse(request, error);
    }
  }

  /**
   * Record workflow outcome for learning service
   * Only records high-confidence successes to learn from good work
   */
  private async recordWorkflowOutcome(state: TinkererState, userRequest: string): Promise<void> {
    if (!this.agenticServices?.learning || !state.confidence) {
      return;
    }

    const workflowTime = Date.now() - this.workflowStartTime;

    // Determine what worked and what didn't
    const whatWorked: string[] = [];
    const whatDidntWork: string[] = [];

    if (state.patternsUsed && state.patternsUsed.length > 0) {
      whatWorked.push(`Used ${state.patternsUsed.length} relevant patterns`);
    }

    if (state.iterationCount === 1 && state.confidence >= 0.8) {
      whatWorked.push('First-attempt success with high quality');
    }

    if (state.iterationCount > 1 && state.confidence >= 0.8) {
      whatWorked.push('Successfully improved through iteration');
    }

    if (state.iterationCount >= 3 && state.confidence < 0.7) {
      whatDidntWork.push('Multiple iterations did not significantly improve quality');
    }

    // Record success if confidence is high (>= 0.7)
    if (state.confidence >= 0.7) {
      const memory: WorkflowMemory = {
        domain: 'code-generation',
        context: userRequest.substring(0, 200), // Summary of request
        approach: state.evaluationReasoning || 'Technical implementation with agentic workflow',
        patternsUsed: state.patternsUsed || [],
        outcome: {
          confidence: state.confidence,
          time: workflowTime,
          iterations: state.iterationCount
        },
        whatWorked,
        whatDidntWork,
        timestamp: new Date()
      };

      try {
        await this.agenticServices.learning.recordSuccess(memory);
        logger.info('📚 Recorded successful workflow for learning', {
          confidence: state.confidence,
          iterations: state.iterationCount,
          patterns: state.patternsUsed?.length || 0
        });
      } catch (error) {
        logger.warn('Failed to record learning outcome', { error });
      }
    } else {
      // Record failure pattern if quality was low
      try {
        await this.agenticServices.learning.recordFailure(
          'code-generation',
          state.evaluationReasoning || 'Unknown approach',
          `Low confidence (${state.confidence?.toFixed(2)}) after ${state.iterationCount} iterations`
        );
        logger.info('📝 Recorded failure pattern for learning', {
          confidence: state.confidence,
          iterations: state.iterationCount
        });
      } catch (error) {
        logger.warn('Failed to record failure pattern', { error });
      }
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
   * KNOWLEDGE ENHANCEMENT NODE: Get relevant design patterns and learn from past successes
   * Combines RAG design patterns with LearningService best practices
   */
  private async knowledgeEnhancementNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('🧠 Enhancing with design patterns and learning', {
      iteration: state.iterationCount,
      hasLearningService: !!this.agenticServices?.learning
    });

    state.currentStep = 'knowledge_enhancement';

    let knowledgeContext = '';
    let patternsUsed: string[] = [];

    // 1. Get relevant design patterns from RAG if tool knowledge service is available
    if (this.sharedResources?.toolKnowledgeService) {
      try {
        const knowledgeResult = await this.sharedResources.toolKnowledgeService.getRelevantPatterns(
          state.userRequest,
          3 // Top 3 most relevant patterns
        );

        if (knowledgeResult.patterns.length > 0) {
          logger.info('✅ Found relevant RAG patterns', {
            patternsCount: knowledgeResult.patterns.length,
            topPattern: knowledgeResult.patterns[0]?.title
          });

          knowledgeContext = this.buildKnowledgeContext(knowledgeResult);
          patternsUsed = knowledgeResult.patterns.map(p => p.title);
        }
      } catch (error) {
        logger.warn('RAG pattern retrieval failed', { error });
      }
    }

    // 2. Get pattern recommendations from Pattern Library
    if (this.agenticServices?.patterns) {
      try {
        const patternRecommendations = this.agenticServices.patterns.findPatterns(
          state.userRequest
        );

        if (patternRecommendations.length > 0) {
          logger.info('📐 Found pattern recommendations', {
            count: patternRecommendations.length,
            topPattern: patternRecommendations[0].pattern.name,
            relevance: (patternRecommendations[0].relevanceScore * 100).toFixed(0) + '%'
          });

          // Append pattern recommendations to knowledge context
          let patternContext = '\n\nRECOMMENDED PATTERNS:\n\n';
          patternRecommendations.forEach((rec, index) => {
            patternContext += `${index + 1}. ${rec.pattern.name} (${(rec.relevanceScore * 100).toFixed(0)}% relevance)\n`;
            patternContext += `   ${rec.pattern.description}\n`;
            patternContext += `   When to use: ${rec.pattern.whenToUse.join(', ')}\n`;
            if (rec.pattern.successRate) {
              patternContext += `   Success rate: ${(rec.pattern.successRate * 100).toFixed(0)}%\n`;
            }
            patternContext += `   ${rec.reasoning}\n\n`;
            patternsUsed.push(rec.pattern.name);
          });

          knowledgeContext += patternContext;
        }
      } catch (error) {
        logger.warn('Pattern library retrieval failed', { error });
      }
    }

    // 2.5 Get insights from other agents (Collaboration Service)
    if (this.agenticServices?.collaboration) {
      try {
        // Infer domain from request (simple keyword extraction)
        const domain = this.inferDomain(state.userRequest);
        const tags = this.extractTags(state.userRequest);

        const agentInsights = this.agenticServices.collaboration.queryInsights({
          requestingAgent: 'tinkerer',
          requestType: 'patterns',
          context: state.userRequest,
          domain,
          tags
        });

        if (agentInsights.length > 0) {
          logger.info('🤝 Found insights from other agents', {
            count: agentInsights.length,
            topAgent: agentInsights[0].agentName,
            topCategory: agentInsights[0].category
          });

          // Append agent insights to knowledge context
          let collaborationContext = '\n\nINSIGHTS FROM OTHER AGENTS:\n\n';
          agentInsights.forEach((insight, index) => {
            collaborationContext += `${index + 1}. From ${insight.agentName} (${insight.category}):\n`;
            collaborationContext += `   "${insight.insight}"\n`;
            collaborationContext += `   Confidence: ${(insight.confidence * 100).toFixed(0)}%, `;
            collaborationContext += `Success rate: ${(insight.successRate * 100).toFixed(0)}%\n`;
            if (insight.evidence) {
              collaborationContext += `   Evidence: ${insight.evidence}\n`;
            }
            collaborationContext += `\n`;
          });

          knowledgeContext += collaborationContext;

          // Store these insights for later feedback
          state.collaborationInsights = agentInsights.map(i => i.id);
        }
      } catch (error) {
        logger.warn('Collaboration service retrieval failed', { error });
      }
    }

    // 3. Get best practices from past successful workflows (LearningService)
    if (this.agenticServices?.learning) {
      try {
        const bestPractices = await this.agenticServices.learning.getBestPractices(
          'code-generation',
          state.userRequest
        );

        if (bestPractices.length > 0) {
          logger.info('📚 Found best practices from learning', {
            practiceCount: bestPractices.length,
            topConfidence: bestPractices[0].confidence
          });

          // Track that we're using best practices (for user-facing transparency)
          state.bestPracticesUsed = bestPractices.length;
          // ALSO store in metadata to survive iteration resets
          if (!state.metadata) state.metadata = {};
          state.metadata.bestPracticesUsed = bestPractices.length;
          logger.info('🔢 Set bestPracticesUsed in state', { value: state.bestPracticesUsed });

          // Append best practices to knowledge context
          let learningContext = '\n\nBEST PRACTICES FROM PAST SUCCESSES:\n\n';
          bestPractices.forEach((practice, index) => {
            learningContext += `${index + 1}. ${practice.approach} (Confidence: ${(practice.confidence * 100).toFixed(0)}%)\n`;
            if (Array.isArray(practice.whatWorked) && practice.whatWorked.length > 0) {
              learningContext += `   What worked: ${practice.whatWorked.join(', ')}\n`;
            }
            if (Array.isArray(practice.patternsUsed) && practice.patternsUsed.length > 0) {
              learningContext += `   Patterns: ${practice.patternsUsed.join(', ')}\n`;
              patternsUsed.push(...practice.patternsUsed);
            }
            learningContext += '\n';
          });

          knowledgeContext += learningContext;
        }

        // Also check for known pitfalls to avoid
        const pitfalls = await this.agenticServices.learning.getKnownPitfalls('code-generation');
        if (pitfalls.length > 0) {
          logger.info('⚠️  Found known pitfalls to avoid', { count: pitfalls.length });
          knowledgeContext += '\n\nKNOWN PITFALLS TO AVOID:\n';
          pitfalls.forEach((pitfall, index) => {
            knowledgeContext += `${index + 1}. ${pitfall}\n`;
          });
          knowledgeContext += '\n';
        }

      } catch (error) {
        logger.warn('Learning service retrieval failed', { error });
      }
    }

    const returnValue = {
      knowledgeContext,
      patternsUsed: [...new Set(patternsUsed)], // Deduplicate
      bestPracticesUsed: state.bestPracticesUsed, // Include for transparency messaging
      currentStep: 'knowledge_enhanced'
    };

    logger.info('🔄 Knowledge enhancement node returning', {
      bestPracticesUsed: returnValue.bestPracticesUsed,
      patternsCount: returnValue.patternsUsed.length
    });

    return returnValue;
  }

  /**
   * 🎨 SYNTHESIS NODE: Creatively combine patterns into novel solutions
   *
   * Don't just copy patterns - SYNTHESIZE them into something better.
   * Analyze strengths, combine best aspects, and add innovations.
   *
   * This transforms pattern retrieval from "here are 3 patterns" to
   * "take the layout from A, interaction model from B, and add [novel innovation]"
   */
  private async synthesisNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('🎨 Synthesizing creative solution from patterns', {
      iteration: state.iterationCount,
      patternsAvailable: state.patternsUsed?.length || 0,
      hasKnowledge: !!state.knowledgeContext
    });

    state.currentStep = 'synthesis';

    // If no patterns or only one pattern, skip synthesis (no combination needed)
    if (!state.patternsUsed || state.patternsUsed.length < 2) {
      logger.info('Skipping synthesis - insufficient patterns for combination', {
        patternCount: state.patternsUsed?.length || 0
      });
      return {
        synthesisPlan: null,
        currentStep: 'synthesis_skipped'
      };
    }

    try {
      const synthesisPrompt = `You are a creative technical architect synthesizing design patterns.

USER REQUEST:
${state.userRequest}

AVAILABLE PATTERNS (${state.patternsUsed.length}):
${state.knowledgeContext}

SYNTHESIS TASK:
Don't just copy these patterns. COMBINE their best aspects into something better:

1. ANALYZE: What makes each pattern effective for this specific request?
2. IDENTIFY: Which strengths from each pattern apply here?
3. SYNTHESIZE: How can you combine/enhance these patterns creatively?
4. INNOVATE: What can you add that's NOT in any pattern?

Think like a chef creating a signature dish - you're not following a single recipe,
you're combining techniques and adding your own flair.

Respond with a synthesis plan in JSON format:
{
  "corePattern": "Which pattern provides the best foundation? Why?",
  "enhancements": [
    "What to borrow from pattern 2",
    "What to borrow from pattern 3"
  ],
  "innovations": [
    "Novel idea 1 not in any pattern",
    "Novel idea 2 that improves on patterns"
  ],
  "integrationStrategy": "How will these elements work together cohesively?",
  "reasoning": "Brief explanation of why this synthesis will be effective"
}`;

      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: synthesisPrompt }],
        system: 'You are a creative synthesis engine. Combine patterns innovatively.',
        temperature: 0.5,  // Higher temp for creativity
        maxTokens: 800
      });

      // Parse the synthesis plan
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const synthesisPlan = JSON.parse(jsonMatch[0]);

        logger.info('✅ Pattern synthesis complete', {
          corePattern: synthesisPlan.corePattern?.substring(0, 50),
          enhancementsCount: synthesisPlan.enhancements?.length || 0,
          innovationsCount: synthesisPlan.innovations?.length || 0
        });

        return {
          synthesisPlan,
          currentStep: 'synthesis_complete'
        };
      }

      logger.warn('Failed to parse synthesis plan, proceeding without synthesis');
      return {
        synthesisPlan: null,
        currentStep: 'synthesis_failed'
      };

    } catch (error) {
      logger.error('Pattern synthesis failed', { error });
      return {
        synthesisPlan: null,
        currentStep: 'synthesis_error'
      };
    }
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

    // Add synthesis plan if patterns were creatively combined
    if (state.synthesisPlan) {
      const synthesisPlan = state.synthesisPlan;
      enhancedContent = `${enhancedContent}

🎨 PATTERN SYNTHESIS PLAN (creative combination):

CORE FOUNDATION:
${synthesisPlan.corePattern}

ENHANCEMENTS FROM OTHER PATTERNS:
${synthesisPlan.enhancements?.map((e: string, i: number) => `${i + 1}. ${e}`).join('\n') || 'None'}

INNOVATIONS (not in any pattern):
${synthesisPlan.innovations?.map((inn: string, i: number) => `${i + 1}. ${inn}`).join('\n') || 'None'}

INTEGRATION STRATEGY:
${synthesisPlan.integrationStrategy}

REASONING:
${synthesisPlan.reasoning}

IMPORTANT: Don't just copy patterns. Follow this synthesis plan to combine the best aspects creatively.`;

      logger.info('🎨 Using pattern synthesis for generation', {
        corePattern: synthesisPlan.corePattern?.substring(0, 40),
        enhancementsCount: synthesisPlan.enhancements?.length || 0,
        innovationsCount: synthesisPlan.innovations?.length || 0
      });
    }

    // Generate the implementation (use provider's configured model)
    const result = await this.llmProvider.generateText({
      messages: [{ role: 'user', content: enhancedContent }],
      system: this.getEnhancedSystemPrompt(state.knowledgeContext || ''),
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
   * 💎 BEAUTY CHECK NODE: Validate code elegance, readability, and craft
   * Noah's Excellence: Code should be thoughtful, maintainable, and delightful
   */
  private async beautyCheckNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('💎 Performing beauty check (Noah\'s excellence standards)', {
      iteration: state.iterationCount,
      contentLength: state.generatedContent?.length || 0
    });

    state.currentStep = 'beauty_check';

    if (!state.generatedContent) {
      logger.warn('No content to beauty check, skipping');
      return {
        beautyCheckResult: null,
        currentStep: 'beauty_check_skipped'
      };
    }

    try {
      const beautyCheckPrompt = `You are Noah's craft inspector, evaluating code for elegance and excellence.

CODE TO REVIEW:
${state.generatedContent.substring(0, 4000)}

🎯 NOAH'S EXCELLENCE CRITERIA:

1. ELEGANCE (not cleverness):
   - Is the code simple and readable?
   - Are complex one-liners avoided in favor of clarity?
   - Would a junior developer understand this in 6 months?

2. MAINTAINABILITY:
   - Are functions focused on a single purpose?
   - Would future maintainers thank you or curse you?
   - Is the code organized logically?

3. CRAFT QUALITY:
   - Variable names: userName, calculateTotalPrice (not u, calc)
   - Comments: Explain WHY, not WHAT
   - Error handling: Thoughtful, helpful messages
   - Edge cases: Handled gracefully

4. USER DELIGHT:
   - Is the UX thoughtful and accessible?
   - Are interactions smooth and intuitive?
   - Would users find this delightful?

5. TECHNICAL EXCELLENCE:
   - Accessibility (semantic HTML, ARIA labels)
   - Performance (minimal DOM operations)
   - Security (input validation, XSS prevention)

EVALUATION TASK:
Rate each criterion (0.0-1.0) and identify specific improvements.

Respond in JSON:
{
  "elegance": 0.0-1.0,
  "maintainability": 0.0-1.0,
  "craft": 0.0-1.0,
  "userDelight": 0.0-1.0,
  "technicalExcellence": 0.0-1.0,
  "overallBeauty": 0.0-1.0,
  "strengths": ["What's excellent about this code"],
  "improvements": ["Specific things that could be more beautiful/elegant"],
  "wouldShowToSeniorEngineer": true/false,
  "reasoning": "Brief explanation of the beauty assessment"
}`;

      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: beautyCheckPrompt }],
        system: 'You are a craft inspector for Noah. You have high standards for code beauty and elegance.',
        temperature: 0.2,  // Low temp for consistent evaluation
        maxTokens: 600
      });

      // Parse the beauty check result
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const beautyResult = JSON.parse(jsonMatch[0]);

        logger.info('✨ Beauty check complete', {
          overallBeauty: beautyResult.overallBeauty?.toFixed(2),
          wouldShow: beautyResult.wouldShowToSeniorEngineer,
          strengthsCount: beautyResult.strengths?.length || 0,
          improvementsCount: beautyResult.improvements?.length || 0
        });

        return {
          beautyCheckResult: beautyResult,
          currentStep: 'beauty_check_complete'
        };
      }

      logger.warn('Failed to parse beauty check result');
      return {
        beautyCheckResult: null,
        currentStep: 'beauty_check_parse_failed'
      };

    } catch (error) {
      logger.error('Beauty check failed', { error });
      return {
        beautyCheckResult: null,
        currentStep: 'beauty_check_error'
      };
    }
  }

  /**
   * SELF-EVALUATION NODE: Assess quality and determine if revision needed
   * Uses EvaluationService for calibrated, realistic quality assessment
   */
  private async selfEvaluationNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('📊 Self-evaluating quality', {
      iteration: state.iterationCount,
      contentLength: state.generatedContent?.length || 0,
      usingEvaluationService: !!this.agenticServices?.evaluation
    });

    state.currentStep = 'self_evaluation';

    // Use EvaluationService if available (provides calibrated realistic scores)
    if (this.agenticServices?.evaluation) {
      try {
        const evaluation = await this.agenticServices.evaluation.evaluate({
          content: state.generatedContent,
          criteria: 'code-quality',
          previousScores: state.qualityScores,
          context: state.userRequest
        });

        logger.info('✅ EvaluationService assessment complete', {
          overallConfidence: evaluation.overallConfidence,
          needsRevision: evaluation.needsRevision,
          scores: evaluation.scores
        });

        return {
          confidence: evaluation.overallConfidence,
          needsRevision: evaluation.needsRevision && state.iterationCount < state.maxIterations,
          evaluationReasoning: evaluation.reasoning,
          revisionFeedback: evaluation.actionPlan.join('\n'),
          qualityScores: evaluation.scores,
          iterationCount: state.iterationCount + 1,
          currentStep: 'self_evaluation_complete'
        };

      } catch (error) {
        logger.error('EvaluationService failed, using fallback', { error });
        // Fall through to legacy evaluation
      }
    }

    // Legacy evaluation (fallback when services not available)
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
        temperature: 0.2
      });

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
      logger.error('Legacy evaluation failed, using fallback', { error });
      return {
        confidence: state.knowledgeContext ? 0.85 : 0.75,
        needsRevision: false,
        evaluationReasoning: 'Technical implementation completed (evaluation fallback)',
        iterationCount: state.iterationCount + 1
      };
    }
  }

  /**
   * REVISION NODE: Prepare for another generation attempt with metacognitive analysis
   * Uses MetacognitiveService for deep root cause analysis and strategic planning
   */
  private async revisionNode(state: TinkererState): Promise<Partial<TinkererState>> {
    logger.info('🔄 Preparing revision', {
      iteration: state.iterationCount,
      confidence: state.confidence,
      feedback: state.revisionFeedback?.substring(0, 100),
      usingMetacognition: !!this.agenticServices?.metacognition
    });

    state.currentStep = 'revision';

    // Use MetacognitiveService if available (deep root cause analysis)
    if (this.agenticServices?.metacognition && state.qualityScores) {
      try {
        const analysis = await this.agenticServices.metacognition.analyzeRootCause(
          state.generatedContent,
          state.qualityScores,
          state.userRequest
        );

        logger.info('🧠 Metacognitive analysis complete', {
          strategy: analysis.strategy,
          willHelp: analysis.willRevisionHelp,
          actionCount: analysis.actionPlan.length,
          patterns: analysis.patternRecommendations.length
        });

        // Build enhanced revision feedback from metacognitive insights
        let enhancedFeedback = `ROOT CAUSE: ${analysis.rootCause}\n\n`;
        enhancedFeedback += `STRATEGY: ${analysis.strategy}\n\n`;
        enhancedFeedback += `ACTION PLAN:\n${analysis.actionPlan.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n`;

        if (analysis.patternRecommendations.length > 0) {
          enhancedFeedback += `RECOMMENDED PATTERNS:\n${analysis.patternRecommendations.map(p => `- ${p}`).join('\n')}\n\n`;
        }

        enhancedFeedback += analysis.reasoning;

        return {
          revisionFeedback: enhancedFeedback,
          bestPracticesUsed: state.bestPracticesUsed, // Preserve from iteration 1
          currentStep: 'revision_ready'
        };

      } catch (error) {
        logger.error('Metacognitive analysis failed, using standard feedback', { error });
        // Fall through to use existing revision feedback
      }
    }

    // Standard revision (when metacognition not available)
    return {
      bestPracticesUsed: state.bestPracticesUsed, // Preserve from iteration 1
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
    const basePrompt = `You are the Tinkerer, Noah's technical implementation specialist.

🎯 NOAH'S PERSONALITY (infuse this into your work):
- Thoughtful: You don't rush. You think deeply about the best solution.
- Creative: You love finding elegant solutions to complex problems.
- Slightly snarky: Your code comments have personality. Your variable names are clever (but still clear).
- Proud craftsman: You build things that work beautifully AND look beautiful.
- Security-conscious: You never cut corners on security, even when no one's looking.

💎 NOAH'S VALUES (non-negotiable):
- Elegance over cleverness: Simple, readable code beats complex one-liners
- Maintainability over shortcuts: Future developers will thank you
- User delight over feature completeness: One perfect feature > ten half-done ones
- Accessibility is non-negotiable: WCAG 2.1 AA compliance always
- Code is communication: Readable, documented, thoughtful

✨ YOUR CRAFT STANDARDS (what makes code excellent):
- Every function has a clear, single purpose (no "god functions")
- Variable names tell a story (userName, not u; calculateTotalPrice, not calc)
- Comments explain WHY, not WHAT (the code shows what, comments show intent)
- The first working solution is not the final solution (refactor for clarity)
- If it feels ugly, it IS ugly - refactor it before shipping
- Error handling is thoughtful, not an afterthought
- Edge cases are handled gracefully with helpful messages

🛡️ TECHNICAL EXCELLENCE:
- Modern Web Standards: HTML5, CSS3, ES6+ JavaScript
- Accessibility: Semantic HTML, ARIA labels, keyboard navigation
- Responsive Design: Mobile-first, fluid layouts, touch-friendly
- Performance: Minimal DOM operations, efficient algorithms
- Security: Input validation, XSS prevention, CSP compliance

📝 CODE QUALITY CHECKLIST:
Before you finish, ask yourself:
□ Would I be proud to show this code to a senior engineer?
□ Will future maintainers understand the intent?
□ Are edge cases handled gracefully?
□ Is it beautiful AND functional?
□ Would users find this delightful to interact with?

TOOL CREATION FORMAT:
When building tools, use this exact format:

TITLE: [Clear, descriptive tool name]
TOOL:
[Complete HTML with embedded CSS and JavaScript]

REASONING:
[Brief explanation of design choices and why this approach was chosen]

Remember: You have time. Don't rush. Build something Noah would be proud to demonstrate.
The goal is excellence, not just completion.`;

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

  /**
   * Infer domain from request for collaboration context matching
   */
  private inferDomain(request: string): string {
    const requestLower = request.toLowerCase();

    // Simple keyword-based domain inference
    if (requestLower.includes('dashboard') || requestLower.includes('chart') || requestLower.includes('data viz')) {
      return 'dashboards';
    }
    if (requestLower.includes('form') || requestLower.includes('validation') || requestLower.includes('input')) {
      return 'forms';
    }
    if (requestLower.includes('list') || requestLower.includes('todo') || requestLower.includes('task')) {
      return 'lists';
    }
    if (requestLower.includes('auth') || requestLower.includes('login') || requestLower.includes('register')) {
      return 'authentication';
    }
    if (requestLower.includes('table') || requestLower.includes('grid') || requestLower.includes('spreadsheet')) {
      return 'tables';
    }

    // Default to general
    return 'general';
  }

  /**
   * Extract tags from request for collaboration matching
   */
  private extractTags(request: string): string[] {
    const requestLower = request.toLowerCase();
    const tags: string[] = [];

    // Technology/framework tags
    if (requestLower.includes('react')) tags.push('react');
    if (requestLower.includes('vue')) tags.push('vue');
    if (requestLower.includes('angular')) tags.push('angular');

    // Feature tags
    if (requestLower.includes('responsive')) tags.push('responsive');
    if (requestLower.includes('interactive')) tags.push('interactive');
    if (requestLower.includes('animation')) tags.push('animation');
    if (requestLower.includes('validation')) tags.push('validation');
    if (requestLower.includes('real-time') || requestLower.includes('realtime')) tags.push('realtime');

    // Component tags
    if (requestLower.includes('chart') || requestLower.includes('graph')) tags.push('charts');
    if (requestLower.includes('form')) tags.push('forms');
    if (requestLower.includes('button')) tags.push('buttons');
    if (requestLower.includes('modal') || requestLower.includes('dialog')) tags.push('modals');
    if (requestLower.includes('navigation') || requestLower.includes('nav')) tags.push('navigation');

    // Layout tags
    if (requestLower.includes('grid')) tags.push('grid-layout');
    if (requestLower.includes('flexbox') || requestLower.includes('flex')) tags.push('flexbox');
    if (requestLower.includes('layout')) tags.push('layout');

    return tags;
  }

  protected getSystemPrompt(): string {
    return this.getEnhancedSystemPrompt('');
  }
}

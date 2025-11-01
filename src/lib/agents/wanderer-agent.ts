// Wanderer Agent - Research Specialist (Simplified for initial deployment)
import { BaseAgent } from './base-agent';
import { createLogger } from '../logger';
import type { AgentSharedResources } from './shared-resources';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig
} from './types';

export class WandererAgent extends BaseAgent {
  private readonly logger = createLogger('wanderer-agent');

  constructor(
    llmProvider: LLMProvider,
    config: AgentConfig = {},
    _sharedResources?: AgentSharedResources // Available for future enhancement
  ) {
    const capabilities: AgentCapability[] = [
      {
        name: 'deep-research',
        description: 'Conducts comprehensive research using RAG and external sources',
        version: '1.0.0'
      }
    ];

    super('wanderer', 'Wanderer - Research Specialist', capabilities, llmProvider, {
      temperature: 0.75,
      maxTokens: 2500,
      ...config
    });
  }

  /**
   * 🎯 AGENTIC ROUTING: Evaluate whether this agent should handle the request
   *
   * Enables truly agentic routing by allowing the agent to autonomously
   * decide if it should handle a request based on research/analysis needs.
   *
   * @param requestContent - The user's request content
   * @returns Promise<{ confidence: number, reasoning: string }>
   */
  async evaluateRequest(requestContent: string): Promise<{ confidence: number; reasoning: string }> {
    this.logger.debug('Wanderer evaluating request for agentic routing', {
      contentLength: requestContent.length
    });

    try {
      const prompt = `You are the Wanderer agent, specialized in deep research, analysis, and information gathering.

Your capabilities:
- Conducting comprehensive research on complex topics
- Breaking down complex subjects into key components
- Analyzing best practices, trends, and approaches
- Gathering context for implementation decisions
- Providing synthesized, actionable insights

Analyze this user request and determine how confident you are that YOU should handle it (0.0-1.0):

User Request: "${requestContent}"

Consider:
1. Does this require research, analysis, or gathering information?
2. Is this asking about best practices, trends, or approaches?
3. Does this need comprehensive understanding before implementation?
4. Is this within your research specialization scope?

Return a JSON object with:
{
  "confidence": <number 0.0-1.0>,
  "reasoning": "<brief explanation of your confidence level>"
}

Examples:
- "Research best practices for React state management" → confidence: 0.95 (perfect research task)
- "What are the latest trends in data visualization?" → confidence: 0.9 (research and analysis)
- "Build a React dashboard" → confidence: 0.2 (building task, not research)
- "Create a simple calculator" → confidence: 0.1 (code generation, not research)
- "How do I cook pasta?" → confidence: 0.05 (outside your domain)`;

      const response = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 200
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);

        this.logger.info('Wanderer evaluation complete', {
          confidence: result.confidence,
          reasoning: result.reasoning?.substring(0, 100)
        });

        return {
          confidence: Math.max(0, Math.min(1, result.confidence)),
          reasoning: result.reasoning || 'No reasoning provided'
        };
      }

      this.logger.warn('Failed to parse Wanderer evaluation response, using fallback');
      return {
        confidence: 0.5,
        reasoning: 'Unable to evaluate - defaulting to moderate confidence'
      };

    } catch (error) {
      this.logger.error('Wanderer evaluation failed', { error });
      return {
        confidence: 0.3,
        reasoning: 'Evaluation error - low confidence fallback'
      };
    }
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      this.logger.info('Wanderer processing research request', {
        requestId: request.id,
        sessionId: request.sessionId
      });

      // Simplified research for initial deployment
      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: request.content }],
        system: this.getSystemPrompt(),
        model: process.env.LLM_RESEARCH_ID || process.env.LLM_DEFAULT_ID || 'claude-3-5-haiku-20241022',
        temperature: 0.75
      });

      return {
        requestId: request.id,
        agentId: this.id,
        content: result.content,
        confidence: 0.8,
        reasoning: 'Research analysis completed',
        timestamp: new Date(),
        metadata: {
          researchStrategy: 'direct-analysis',
          domain: 'general'
        }
      };

    } catch (error) {
      this.logger.error('Wanderer research failed', { error });
      return this.generateBasicResponse(request, error);
    }
  }

  protected getSystemPrompt(): string {
    return `You are Wanderer, the research specialist for Noah's multi-agent system.

Your role is to conduct thorough research and analysis on user requests. You excel at:
- Breaking down complex topics into key components
- Identifying different perspectives and approaches
- Synthesizing information into actionable insights
- Providing context for implementation decisions

Provide comprehensive, well-researched responses that give Noah's team everything they need to proceed with confidence.`;
  }
}
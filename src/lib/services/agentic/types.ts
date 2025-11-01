/**
 * Agentic Services - Type Definitions
 *
 * Shared types for metacognitive, evaluation, learning, and security services
 */

import type { LLMProvider } from '@/lib/services/llm-provider';

// ============================================================================
// QUALITY & EVALUATION TYPES
// ============================================================================

export interface QualityScores {
  functionality: number;   // 0.0-1.0: Does it work as requested?
  codeQuality: number;     // 0.0-1.0: Is the code elegant and maintainable?
  completeness: number;    // 0.0-1.0: Are all features implemented?
  usability: number;       // 0.0-1.0: Is it user-friendly and delightful?
}

export interface EvaluationResult {
  overallConfidence: number;
  scores: QualityScores;
  needsRevision: boolean;
  reasoning: string;
  actionPlan: string[];
}

export interface EvaluationCriteria {
  type: 'code-quality' | 'research-quality' | 'conversation-quality';
  standards: Record<string, number>;
}

export interface EvaluationStandards {
  excellence: number;
  delight: number;
  security: number;
  completeness: number;
}

// ============================================================================
// METACOGNITIVE ANALYSIS TYPES
// ============================================================================

export type AnalysisStrategy =
  | 'TARGETED_REVISION'    // Fix specific issues, keep good parts
  | 'DIFFERENT_APPROACH'   // Current approach failing, try new strategy
  | 'PATTERN_SWITCH'       // Current patterns don't match, use different ones
  | 'GOOD_ENOUGH';         // Quality is actually acceptable, don't over-iterate

export interface RootCauseAnalysis {
  rootCause: string;
  willRevisionHelp: boolean;
  strategy: AnalysisStrategy;
  actionPlan: string[];
  patternRecommendations: string[];
  reasoning: string;
}

export interface StrategicSituation {
  previousAttempts: number;
  confidenceTrend: number[];
  timeRemaining: number;
  iterationLimit: number;
}

export type StrategicDecision = 'CONTINUE' | 'CHANGE_APPROACH' | 'ABORT';

// ============================================================================
// LEARNING & MEMORY TYPES
// ============================================================================

export interface WorkflowMemory {
  domain: string;              // 'code-generation', 'research', 'conversation'
  context: string;             // User request summary
  approach: string;            // What strategy was used
  patternsUsed: string[];      // Which patterns/techniques
  outcome: WorkflowOutcome;
  whatWorked: string[];
  whatDidntWork: string[];
  timestamp: Date;
}

export interface WorkflowOutcome {
  confidence: number;
  time: number;
  iterations: number;
}

export interface BestPractice {
  approach: string;
  confidence: number;
  patternsUsed: string[];
  whatWorked: string[];
  timeSaved?: number;
}

// ============================================================================
// SECURITY TYPES
// ============================================================================

export type SecurityRiskCategory =
  | 'jailbreak'           // Attempting to bypass safety guidelines
  | 'social_engineering'  // Manipulating the agent
  | 'prompt_injection'    // Embedding instructions in queries
  | 'data_exfiltration'   // Trying to extract system information
  | 'privilege_escalation'; // Trying to access unauthorized functions

export type RiskSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityRisk {
  category: SecurityRiskCategory;
  severity: RiskSeverity;
  evidence: string;
  confidence: number;
}

export interface SecurityAssessment {
  safe: boolean;
  confidence: number;
  risks: SecurityRisk[];
  reasoning: string;
  recommendedAction?: 'ALLOW' | 'WARN' | 'BLOCK' | 'ESCALATE';
}

export interface SecurityContext {
  conversationHistory: string[];
  userTrustLevel: number;
  previousViolations: number;
  sessionAge: number;
}

// ============================================================================
// PATTERN LIBRARY TYPES
// ============================================================================

export interface CodePattern {
  id: string;
  name: string;
  category: 'component' | 'layout' | 'form' | 'data-viz' | 'state-mgmt' | 'utility';
  description: string;
  whenToUse: string[];
  advantages: string[];
  codeSnippet?: string;
  relatedPatterns: string[];
  successRate?: number;
  avgConfidence?: number;
  usageCount?: number;
}

export interface PatternRecommendation {
  pattern: CodePattern;
  relevanceScore: number;
  reasoning: string;
  successProbability: number;
}

export interface IPatternLibrary {
  getPattern(id: string): CodePattern | null;

  getAllPatterns(): CodePattern[];

  findPatterns(context: string, category?: CodePattern['category']): PatternRecommendation[];

  updatePatternStats(patternId: string, success: boolean, confidence: number): void;

  getTopPatterns(limit?: number): CodePattern[];
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IMetacognitiveService {
  analyzeRootCause(
    content: string,
    scores: QualityScores,
    context: string
  ): Promise<RootCauseAnalysis>;

  recommendStrategy(
    situation: StrategicSituation
  ): Promise<StrategicDecision>;

  predictEffectiveness(
    currentApproach: string,
    proposedChange: string
  ): Promise<{ effective: boolean; confidence: number; reasoning: string }>;
}

export interface IEvaluationService {
  evaluate(params: {
    content: string;
    criteria: EvaluationCriteria['type'];
    previousScores?: QualityScores;
    context: string;
  }): Promise<EvaluationResult>;

  calibrateScores(
    rawScores: QualityScores,
    domain: string
  ): QualityScores;

  explainScores(evaluation: EvaluationResult): string;
}

export interface ILearningService {
  recordSuccess(memory: WorkflowMemory): Promise<void>;

  recordFailure(
    domain: string,
    approach: string,
    reason: string
  ): Promise<void>;

  getBestPractices(
    domain: string,
    context: string
  ): Promise<BestPractice[]>;

  getKnownPitfalls(domain: string): Promise<string[]>;

  predictOutcome(
    domain: string,
    approach: string,
    context: string
  ): Promise<{ expectedConfidence: number; reasoning: string }>;
}

export interface ISecurityService {
  deepValidation(
    content: string,
    context: SecurityContext
  ): Promise<SecurityAssessment>;

  intentAnalysis(
    message: string,
    history: string[]
  ): Promise<{ intent: string; safe: boolean; confidence: number }>;

  getTrustContext(userId: string): Promise<SecurityContext>;

  updateTrustScore(
    userId: string,
    violation: boolean
  ): Promise<void>;
}

// ============================================================================
// AGENT COLLABORATION TYPES
// ============================================================================

export interface AgentInsight {
  id: string;
  agentName: 'wanderer' | 'tinkerer' | 'noah';
  category: 'pattern' | 'pitfall' | 'technique' | 'best-practice';
  domain: string;
  insight: string;
  confidence: number;
  evidence?: string;
  relatedContext: string[];
  timestamp: Date;
  usageCount: number;
  successRate: number;
}

export interface AgentRequest {
  requestingAgent: 'wanderer' | 'tinkerer' | 'noah';
  requestType: 'insights' | 'patterns' | 'pitfalls' | 'clarification';
  context: string;
  domain?: string;
  tags?: string[];
}

export interface CollaborationContext {
  sessionId: string;
  primaryAgent: string;
  supportingAgents: string[];
  sharedInsights: AgentInsight[];
  sharedLearnings: string[];
  warnings: string[];
}

export interface IAgentCollaborationService {
  contributeInsight(params: Omit<AgentInsight, 'id' | 'timestamp' | 'usageCount' | 'successRate'>): void;

  queryInsights(request: AgentRequest): AgentInsight[];

  recordInsightUsage(insightId: string, wasSuccessful: boolean): void;

  startCollaboration(params: {
    sessionId: string;
    primaryAgent: string;
    supportingAgents: string[];
  }): CollaborationContext;

  addToCollaboration(sessionId: string, insights: AgentInsight[]): void;

  addWarning(sessionId: string, warning: string): void;

  getCollaborationContext(sessionId: string): CollaborationContext | null;

  endCollaboration(sessionId: string): void;

  getAggregatedLearnings(domain: string): {
    patterns: string[];
    pitfalls: string[];
    techniques: string[];
  };
}

// ============================================================================
// AGENTIC SERVICES CONTAINER
// ============================================================================

export interface AgenticServices {
  metacognition: IMetacognitiveService;
  evaluation: IEvaluationService;
  learning: ILearningService;
  security: ISecurityService;
  patterns: IPatternLibrary;
  collaboration: IAgentCollaborationService;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ServiceError {
  service: string;
  method: string;
  error: Error;
  context?: any;
}

export interface ServiceMetrics {
  callCount: number;
  totalTime: number;
  averageTime: number;
  errors: number;
  lastCalled?: Date;
}

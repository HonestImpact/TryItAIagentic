// Analytics Types - Elegant type definitions for Noah's analytics system
// Following the Golden Rule: Best, Cleanest, Fastest, Most Logical, Most Elegant

export interface SessionData {
  sessionFingerprint: string;
  environment: 'development' | 'preview' | 'production';
}

export interface ConversationData {
  sessionId: string;
  conversationSequence: number;
  initialTrustLevel?: number;
  finalTrustLevel?: number;
  skepticModeEnabled: boolean;
  conversationLength: number;
  conversationDurationMs?: number;
  userEngagementLevel?: 'low' | 'medium' | 'high' | 'very-high';
  completionStatus: 'active' | 'completed' | 'abandoned' | 'error';
  agentStrategy?: string; // noah_direct, noah_wanderer, noah_tinkerer, noah_wanderer_tinkerer
  totalMessages?: number;
  artifactsGenerated?: number;
  reasoningEnabled?: boolean;
  challengeCount?: number;
}

export interface MessageData {
  conversationId: string;
  sessionId: string;
  messageSequence: number;
  role: 'user' | 'assistant';
  content: string;  // NOW STORING ACTUAL CONTENT
  contentLength: number;
  wordCount: number;
  messageType?: 'question' | 'request' | 'challenge' | 'feedback' | 'response' | 'tool-generation';
  responseTimeMs?: number;
  agentInvolved?: 'noah' | 'wanderer' | 'tinkerer';
  trustDelta?: number;
  reasoning?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'skeptical';
  skepticModeActive?: boolean;
  // Agentic behavior tracking
  confidence?: number; // 0.0-1.0 confidence score from self-evaluation
  iterationCount?: number; // Number of iterations taken for this response
  agenticBehavior?: boolean; // True if agent used self-evaluation/revision
}

export interface GeneratedToolData {
  conversationId: string;
  sessionId: string;
  messageId?: string;
  toolHash?: string;
  title: string;
  content: string;  // NOW STORING ACTUAL CONTENT
  contentLength: number;
  contentType?: string;
  toolType?: string;
  toolCategory?: string;
  generationTimeMs: number;
  generationAgent: 'noah' | 'wanderer' | 'tinkerer';
  userMessageLength: number;
  agentStrategy?: string;  // noah_direct, noah_wanderer, noah_tinkerer, etc.
  version?: number;
  downloadCount?: number;
  // Agentic behavior tracking
  confidence?: number; // Final confidence score
  iterationCount?: number; // Number of revision iterations
  qualityScores?: Record<string, number>; // Detailed quality metrics
}

export interface ToolUsageEvent {
  toolId: string;
  sessionId: string;
  eventType: 'generated' | 'viewed' | 'interacted' | 'downloaded' | 'shared' | 'reused';
  usageContext?: 'same-session' | 'different-session' | 'recycled';
  interactionDurationMs?: number;
}

export interface AnalyticsQueryOptions {
  timeout?: number;
  retries?: number;
  skipOnError?: boolean;
}

export interface PerformanceMetrics {
  operationName: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

// NEW: Trust tracking interfaces for comprehensive Trust Recovery Protocol
export interface TrustEventData {
  sessionId: string;
  conversationId: string;
  previousLevel: number;
  newLevel: number;
  triggerEvent: string;
  triggerReason?: string;
}

export interface MessageAnnotationData {
  messageId: string;
  annotationType: string;
  annotationValue: string;
  confidenceScore?: number;
}
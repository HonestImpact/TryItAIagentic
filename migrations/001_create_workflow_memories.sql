-- Migration: Add workflow_memories table for persistent learning
-- Created: 2025-10-30
-- Purpose: Enable LearningService to persist workflow successes across server restarts

CREATE TABLE IF NOT EXISTS workflow_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workflow identification
  domain VARCHAR(100) NOT NULL,
  context TEXT NOT NULL,
  approach TEXT NOT NULL,

  -- Patterns used
  patterns_used JSONB NOT NULL DEFAULT '[]',
  what_worked TEXT,

  -- Outcome metrics
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  time_ms INTEGER NOT NULL,
  iterations INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for fast retrieval
  CONSTRAINT confidence_check CHECK (confidence >= 0.7)
);

-- Index for domain-based queries
CREATE INDEX IF NOT EXISTS idx_workflow_memories_domain ON workflow_memories(domain);

-- Index for confidence-based sorting
CREATE INDEX IF NOT EXISTS idx_workflow_memories_confidence ON workflow_memories(confidence DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_workflow_memories_created_at ON workflow_memories(created_at DESC);

-- GIN index for pattern search
CREATE INDEX IF NOT EXISTS idx_workflow_memories_patterns ON workflow_memories USING GIN (patterns_used);

-- Composite index for best practice queries (domain + confidence)
CREATE INDEX IF NOT EXISTS idx_workflow_memories_domain_confidence
ON workflow_memories(domain, confidence DESC);

COMMENT ON TABLE workflow_memories IS 'Stores successful workflow patterns for cross-session learning';
COMMENT ON COLUMN workflow_memories.domain IS 'Problem domain (e.g., code-generation, data-analysis)';
COMMENT ON COLUMN workflow_memories.context IS 'User request context for similarity matching';
COMMENT ON COLUMN workflow_memories.approach IS 'Successful approach/strategy used';
COMMENT ON COLUMN workflow_memories.patterns_used IS 'JSON array of pattern identifiers';
COMMENT ON COLUMN workflow_memories.what_worked IS 'Human-readable description of success factors';
COMMENT ON COLUMN workflow_memories.confidence IS 'Evaluation confidence (0.7-1.0, only high-confidence stored)';
COMMENT ON COLUMN workflow_memories.time_ms IS 'Execution time in milliseconds';
COMMENT ON COLUMN workflow_memories.iterations IS 'Number of iterations to success';

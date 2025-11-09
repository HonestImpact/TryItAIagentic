-- Migration: Complete Analytics Schema for TryItAI
-- Created: 2025-11-08
-- Purpose: Store conversations, messages, generated tools, and analytics
-- NOTE: Schema derived from actual code in src/lib/analytics/database.ts

-- ======================
-- USER SESSIONS
-- ======================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_fingerprint VARCHAR(255) UNIQUE NOT NULL,
  environment VARCHAR(50) DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint ON user_sessions(session_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON user_sessions(last_seen DESC);

-- ======================
-- CONVERSATIONS
-- ======================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  conversation_sequence INTEGER NOT NULL,
  initial_trust_level INTEGER DEFAULT 50,
  final_trust_level INTEGER,
  skeptic_mode BOOLEAN DEFAULT FALSE,
  conversation_length INTEGER DEFAULT 0,
  conversation_duration_ms INTEGER DEFAULT 0,
  user_engagement_level VARCHAR(20),
  completion_status VARCHAR(20) DEFAULT 'active',
  agent_strategy VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(completion_status);

-- ======================
-- MESSAGES (with FULL content storage)
-- ======================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  message_sequence INTEGER NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  content_length INTEGER NOT NULL,
  word_count INTEGER,
  message_type VARCHAR(50),
  response_time_ms INTEGER,
  agent_involved VARCHAR(50),
  trust_delta INTEGER DEFAULT 0,
  reasoning TEXT,
  sentiment VARCHAR(20),
  skeptic_mode_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GIN (to_tsvector('english', content));

-- ======================
-- GENERATED TOOLS (with FULL content storage)
-- ======================
CREATE TABLE IF NOT EXISTS generated_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content_hash VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(100) DEFAULT 'text/plain',
  content_length INTEGER NOT NULL,
  tool_type VARCHAR(50),
  tool_category VARCHAR(50),
  generation_time_ms INTEGER,
  generation_agent VARCHAR(50),
  user_message_length INTEGER,
  version INTEGER DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_tools_conversation ON generated_tools(conversation_id);
CREATE INDEX IF NOT EXISTS idx_generated_tools_session ON generated_tools(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_tools_hash ON generated_tools(content_hash);
CREATE INDEX IF NOT EXISTS idx_generated_tools_created ON generated_tools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_tools_type ON generated_tools(tool_type);

-- ======================
-- TOOL USAGE EVENTS
-- ======================
CREATE TABLE IF NOT EXISTS tool_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES generated_tools(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  usage_context TEXT,
  interaction_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_tool ON tool_usage_events(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_session ON tool_usage_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_event_type ON tool_usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created ON tool_usage_events(created_at DESC);

-- ======================
-- TRUST EVENTS
-- ======================
CREATE TABLE IF NOT EXISTS trust_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  previous_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  trigger_event VARCHAR(100),
  trigger_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_events_session ON trust_events(session_id);
CREATE INDEX IF NOT EXISTS idx_trust_events_conversation ON trust_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_trust_events_created ON trust_events(created_at DESC);

-- ======================
-- MESSAGE ANNOTATIONS
-- ======================
CREATE TABLE IF NOT EXISTS message_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  annotation_type VARCHAR(100) NOT NULL,
  annotation_value TEXT,
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_annotations_message ON message_annotations(message_id);
CREATE INDEX IF NOT EXISTS idx_message_annotations_type ON message_annotations(annotation_type);

-- ======================
-- ERROR EVENTS
-- ======================
CREATE TABLE IF NOT EXISTS error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  operation VARCHAR(100) NOT NULL,
  agent_involved VARCHAR(50),
  request_type VARCHAR(100),
  error_type VARCHAR(100) NOT NULL,
  error_category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  suggested_action VARCHAR(100),
  fallback_strategy VARCHAR(100),
  user_message_length INTEGER,
  attempt_number INTEGER DEFAULT 1,
  error_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_events_session ON error_events(session_id);
CREATE INDEX IF NOT EXISTS idx_error_events_conversation ON error_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_error_events_type ON error_events(error_type);
CREATE INDEX IF NOT EXISTS idx_error_events_category ON error_events(error_category);
CREATE INDEX IF NOT EXISTS idx_error_events_severity ON error_events(severity);
CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at DESC);

-- ======================
-- COMMENTS
-- ======================
COMMENT ON TABLE user_sessions IS 'User session fingerprints and environment data';
COMMENT ON TABLE conversations IS 'Complete conversations with metadata and outcomes';
COMMENT ON TABLE messages IS 'ALL messages with FULL content for conversation playback';
COMMENT ON TABLE generated_tools IS 'ALL generated tools/artifacts with FULL content (HTML/JS/etc)';
COMMENT ON TABLE tool_usage_events IS 'Tool adoption and usage patterns';
COMMENT ON TABLE trust_events IS 'Trust level changes for Trust Recovery Protocol';
COMMENT ON TABLE message_annotations IS 'Rich metadata for messages';
COMMENT ON TABLE error_events IS 'Error tracking for reliability monitoring and pattern detection';

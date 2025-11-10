-- Async Work State Persistence
-- Enables async work to survive server restarts and work in scale-to-zero environments

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS async_work_items CASCADE;
DROP TABLE IF EXISTS async_session_state CASCADE;

-- Async Session State Table
-- Stores per-session preferences, metadata, and conversation history
CREATE TABLE async_session_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Preferences
  has_accepted_async_before BOOLEAN DEFAULT FALSE,
  async_acceptance_count INTEGER DEFAULT 0,
  async_decline_count INTEGER DEFAULT 0,

  -- Metadata
  total_messages INTEGER DEFAULT 0,
  total_async_work INTEGER DEFAULT 0,
  successful_async_work INTEGER DEFAULT 0,

  -- Conversation history (JSONB for flexibility)
  conversation_history JSONB DEFAULT '[]'::jsonb,

  -- Indexes
  CONSTRAINT async_session_state_session_id_key UNIQUE (session_id)
);

-- Async Work Items Table
-- Stores individual async work requests with full state tracking
CREATE TABLE async_work_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,

  -- Work details
  type TEXT NOT NULL CHECK (type IN ('research', 'tool')),
  request TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_offer', 'offered', 'accepted', 'in_progress', 'completed', 'failed', 'cancelled')),

  -- Timing
  estimated_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Results (stored as JSONB for flexibility)
  result JSONB,
  error TEXT,

  -- Metadata
  context JSONB DEFAULT '{}'::jsonb,

  -- Foreign key to session state
  FOREIGN KEY (session_id) REFERENCES async_session_state(session_id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX idx_async_session_state_last_activity ON async_session_state(last_activity_at);
CREATE INDEX idx_async_work_items_session_id ON async_work_items(session_id);
CREATE INDEX idx_async_work_items_status ON async_work_items(status);
CREATE INDEX idx_async_work_items_created_at ON async_work_items(created_at);
CREATE INDEX idx_async_work_items_session_status ON async_work_items(session_id, status);

-- Function to update last_activity_at automatically
CREATE OR REPLACE FUNCTION update_async_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE async_session_state
  SET last_activity_at = NOW()
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity when work items are modified
CREATE TRIGGER trigger_update_async_session_activity
  AFTER INSERT OR UPDATE ON async_work_items
  FOR EACH ROW
  EXECUTE FUNCTION update_async_session_activity();

-- Function to clean up old sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_async_sessions(
  max_age_hours INTEGER DEFAULT 24
)
RETURNS TABLE(deleted_sessions INTEGER, deleted_work_items INTEGER) AS $$
DECLARE
  deleted_session_count INTEGER;
  deleted_work_count INTEGER;
BEGIN
  -- Count work items to be deleted
  SELECT COUNT(*) INTO deleted_work_count
  FROM async_work_items
  WHERE session_id IN (
    SELECT session_id FROM async_session_state
    WHERE last_activity_at < NOW() - (max_age_hours || ' hours')::INTERVAL
  );

  -- Delete old sessions (CASCADE will delete work items)
  WITH deleted AS (
    DELETE FROM async_session_state
    WHERE last_activity_at < NOW() - (max_age_hours || ' hours')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_session_count FROM deleted;

  RETURN QUERY SELECT deleted_session_count, deleted_work_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust if needed for your Supabase setup)
-- These are commented out as they may need to be adjusted based on your auth setup
-- GRANT ALL ON async_session_state TO authenticated;
-- GRANT ALL ON async_work_items TO authenticated;

-- Add helpful comments
COMMENT ON TABLE async_session_state IS 'Stores async work session state for scale-to-zero persistence';
COMMENT ON TABLE async_work_items IS 'Stores individual async work items with full lifecycle tracking';
COMMENT ON COLUMN async_work_items.status IS 'pending_offer = detected opportunity | offered = user shown offer | accepted = user confirmed | in_progress = executing | completed = success | failed = error | cancelled = user cancelled';
COMMENT ON FUNCTION cleanup_old_async_sessions IS 'Cleanup function to remove stale sessions - call periodically via cron or manually';

-- Migration 003: Fix Security and Analytics Schema Issues
-- Date: 2025-11-09
-- Issues Fixed:
--   BUG #10: message_sequence too small for Date.now() timestamps (13 digits)
--   BUG #11: trust_events table missing impact_score column

-- ============================================================================
-- BUG #10: Fix message_sequence overflow
-- ============================================================================
-- Problem: Date.now() returns 13-digit timestamps (e.g., 1762717000969)
--          but message_sequence is INTEGER (max: 2,147,483,647)
-- Solution: Change to BIGINT (max: 9,223,372,036,854,775,807)

ALTER TABLE messages
  ALTER COLUMN message_sequence TYPE BIGINT;

COMMENT ON COLUMN messages.message_sequence IS
  'Message sequence using timestamp (Date.now()) for guaranteed ordering';

-- ============================================================================
-- BUG #11: Add missing impact_score column to trust_events
-- ============================================================================
-- Problem: Trust service expects impact_score but column doesn't exist
-- Solution: Add the column with appropriate constraints

ALTER TABLE trust_events
  ADD COLUMN impact_score INTEGER;

COMMENT ON COLUMN trust_events.impact_score IS
  'Impact on credibility score (-100 to +100)';

-- Optional: Add constraint to ensure reasonable values
ALTER TABLE trust_events
  ADD CONSTRAINT trust_events_impact_score_range
  CHECK (impact_score IS NULL OR (impact_score >= -100 AND impact_score <= 100));

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify message_sequence is now BIGINT
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'message_sequence') = 'bigint'
  THEN
    RAISE NOTICE 'SUCCESS: messages.message_sequence is now BIGINT';
  ELSE
    RAISE EXCEPTION 'FAILED: messages.message_sequence is not BIGINT';
  END IF;
END $$;

-- Verify impact_score column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'trust_events' AND column_name = 'impact_score')
  THEN
    RAISE NOTICE 'SUCCESS: trust_events.impact_score column created';
  ELSE
    RAISE EXCEPTION 'FAILED: trust_events.impact_score column not found';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

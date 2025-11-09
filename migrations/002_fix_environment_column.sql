-- Fix environment column type mismatch
-- ROOT CAUSE: Code sends string ('development'), schema expects JSONB
-- This causes 100% write failure on user_sessions table

-- Step 1: Alter column type from JSONB to VARCHAR(50)
ALTER TABLE user_sessions
ALTER COLUMN environment TYPE VARCHAR(50)
USING environment::text;

-- Step 2: Set a proper default value
ALTER TABLE user_sessions
ALTER COLUMN environment SET DEFAULT 'production';

-- Verify the change
COMMENT ON COLUMN user_sessions.environment IS 'Deployment environment: development, preview, or production';

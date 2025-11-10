# Database Migration Instructions

## Critical: Fix Analytics Schema (BUG #1)

**Issue**: The `user_sessions.environment` column type mismatch is preventing ALL analytics writes.

**Symptoms**:
- All analytics tables are empty despite code execution
- Error logs show: `invalid input syntax for type json`
- Sessions, conversations, messages, tools not being saved

**Fix Required**: Run migration `002_fix_environment_column.sql` on production database

---

## Running the Migration on Koyeb

### Option 1: Via Koyeb Dashboard (Recommended)

1. Go to Koyeb Dashboard → Your service → Settings
2. Find "Database" section
3. Click "Connect to database" or copy the DATABASE_URL
4. Use the web-based SQL runner or:

```bash
psql $DATABASE_URL -f migrations/002_fix_environment_column.sql
```

### Option 2: Via Local psql

```bash
# Get DATABASE_URL from Koyeb environment variables
export DATABASE_URL="postgresql://koyeb-adm:PASSWORD@HOST:5432/koyebdb"

# Run the migration
psql $DATABASE_URL -f migrations/002_fix_environment_column.sql
```

### Option 3: Manual SQL Execution

If you can only access via SQL console, run these commands:

```sql
-- Fix environment column type mismatch
ALTER TABLE user_sessions
ALTER COLUMN environment TYPE VARCHAR(50)
USING environment::text;

ALTER TABLE user_sessions
ALTER COLUMN environment SET DEFAULT 'production';

COMMENT ON COLUMN user_sessions.environment IS 'Deployment environment: development, preview, or production';
```

---

## Verification

After running the migration, verify it worked:

```sql
-- Check column type changed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_sessions' AND column_name = 'environment';

-- Should return: VARCHAR(50) or character varying
```

Test that writes now work by visiting the app and checking:

```sql
-- Should show new sessions after visiting the app
SELECT COUNT(*) FROM user_sessions;

-- Should show new conversations
SELECT COUNT(*) FROM conversations;
```

---

## What This Fixes

✅ **Unblocks all analytics** - Sessions, conversations, messages can now be saved
✅ **Enables error tracking** - The new error_events table can now receive data
✅ **Activates learning system** - Workflow memories can now be persisted
✅ **Powers credibility system** - Trust events can now be tracked

**Expected Impact**: 0% → 100% analytics success rate

---

## Already Fixed

The following files have been updated in the codebase (deployed on next push):

- ✅ `migrations/000_create_analytics_schema.sql` - Schema now uses VARCHAR(50)
- ✅ `migrations/002_fix_environment_column.sql` - ALTER statement ready to run

**The migration just needs to be executed on the production database.**

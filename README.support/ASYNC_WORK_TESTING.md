# Production Testing Guide: Async Work Features

Complete guide to testing all async work features in production.

---

## Quick Start

### 1. Enable Async Work

Add to your `.env` or environment variables:

```bash
ENABLE_ASYNC_WORK=true
```

### 2. Ensure Database is Ready

Make sure these migrations have been run in Supabase:

```sql
-- In Supabase SQL Editor, run in order:
1. supabase/migrations/001_create_analytics_schema.sql
2. supabase/migrations/002_add_pgvector_rag.sql
3. supabase/migrations/003_async_work_state.sql
```

Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('async_session_state', 'async_work_items');
```

### 3. Run the Test Suite

**Local testing:**
```bash
chmod +x tests/async-work/test-async-production.sh
./tests/async-work/test-async-production.sh
```

**Production testing:**
```bash
API_BASE=https://your-production-url.com ./tests/async-work/test-async-production.sh
```

---

## Manual Testing Scenarios

### Scenario 1: Transparent Workflow Visibility

**Test the status API:**

```bash
# Start a session
SESSION_ID="test_$(date +%s)"

# Send a complex request (should trigger async work)
curl -X POST https://your-app.com/api/chat \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Research the latest AI trends and build me an interactive dashboard to visualize them"
    }]
  }'

# Check status (should show active work)
curl "https://your-app.com/api/async-status?sessionId=$SESSION_ID" | jq '.'
```

**Expected response:**
```json
{
  "sessionId": "test_1234567890",
  "activeWork": [{
    "id": "work_123...",
    "type": "research",
    "status": "in_progress",
    "estimatedDuration": 30000,
    "elapsedSeconds": 15,
    "progress": {
      "stage": "RESEARCHING",
      "percentage": 45,
      "message": "Gathering information..."
    }
  }],
  "pendingQuestions": [],
  "unreadMessageCount": 0,
  "queueStatus": {
    "queued": 0,
    "executing": 1
  }
}
```

---

### Scenario 2: Real-Time SSE Updates

**Test live progress updates:**

```bash
# Open SSE connection in one terminal
curl -N -H "Accept: text/event-stream" \
  "https://your-app.com/api/async-events?sessionId=$SESSION_ID"

# In another terminal, trigger async work
curl -X POST https://your-app.com/api/chat \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Build a complex data visualization dashboard"
    }]
  }'
```

**Expected SSE events:**
```
data: {"type":"connected","sessionId":"test_1234","timestamp":1234567890}

data: {"type":"work_started","workId":"work_123","sessionId":"test_1234","timestamp":1234567891,"data":{...}}

data: {"type":"work_progress","workId":"work_123","sessionId":"test_1234","timestamp":1234567892,"data":{"stage":"ANALYZING","percentage":10,"message":"Analyzing request..."}}

data: {"type":"work_progress","workId":"work_123","sessionId":"test_1234","timestamp":1234567893,"data":{"stage":"BUILDING","percentage":45,"message":"Building dashboard..."}}

data: {"type":"work_completed","workId":"work_123","sessionId":"test_1234","timestamp":1234567900,"data":{...}}
```

---

### Scenario 3: Work Cancellation

**Test cancelling async work:**

```bash
# Get active work
curl "https://your-app.com/api/async-status?sessionId=$SESSION_ID" | jq -r '.activeWork[0].id'

# Cancel specific work
curl -X POST https://your-app.com/api/async-cancel \
  -H "Content-Type: application/json" \
  -d '{
    "workId": "work_123..."
  }' | jq '.'

# Or cancel all work for session
curl -X POST https://your-app.com/api/async-cancel \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_1234",
    "cancelAll": true
  }' | jq '.'
```

**Expected response:**
```json
{
  "success": true,
  "cancelled": ["work_123..."],
  "message": "Work cancelled successfully"
}
```

---

### Scenario 4: Bidirectional Messaging

**Test async work asking questions:**

```bash
# Get pending questions
curl "https://your-app.com/api/async-messages?sessionId=$SESSION_ID" | jq '.'

# Respond to a question
curl -X POST https://your-app.com/api/async-messages \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "msg_work_123...",
    "sessionId": "test_1234",
    "content": "Use a blue and white color scheme"
  }' | jq '.'
```

**Expected messages response:**
```json
{
  "sessionId": "test_1234",
  "workId": "work_123",
  "messages": [{
    "id": "msg_work_123_456",
    "workId": "work_123",
    "direction": "to_user",
    "type": "question",
    "content": "What color scheme would you like for the dashboard?",
    "requiresResponse": true,
    "timestamp": 1234567890
  }],
  "pendingQuestions": [...],
  "unreadCount": 1
}
```

---

### Scenario 5: Database Persistence

**Test that state survives server restarts:**

```bash
# 1. Create async work
SESSION_ID="persist_test_$(date +%s)"

curl -X POST https://your-app.com/api/chat \
  -H "x-session-id: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Research AI safety and build a comprehensive report"
    }]
  }'

# 2. Check status (note the work ID)
curl "https://your-app.com/api/async-status?sessionId=$SESSION_ID" | jq '.'

# 3. Restart your server (if local: npm run dev, if production: redeploy)

# 4. Check status again with same session ID
curl "https://your-app.com/api/async-status?sessionId=$SESSION_ID" | jq '.'

# 5. Should see the same work items (loaded from database)
```

---

## Troubleshooting

### Issue: "No async work detected"

**Causes:**
- `ENABLE_ASYNC_WORK` not set to `true`
- Request not complex enough to trigger async work
- Request classifier not detecting it as async-worthy

**Solutions:**
```bash
# 1. Verify environment variable
echo $ENABLE_ASYNC_WORK  # Should output: true

# 2. Check request classification
curl -X POST https://your-app.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Analyze the entire history of programming languages and create an interactive timeline visualization with detailed information about each language"
    }]
  }'

# 3. Check logs for classification results
# Look for: "Request classified" with tier information
```

### Issue: "Status API returns empty"

**Causes:**
- Session not found
- Work already completed/cancelled
- Feature disabled

**Solutions:**
```bash
# Check if session exists in database
# In Supabase SQL Editor:
SELECT * FROM async_session_state WHERE session_id = 'your_session_id';
SELECT * FROM async_work_items WHERE session_id = 'your_session_id';
```

### Issue: "SSE connection immediately closes"

**Causes:**
- Proxy/CDN buffering
- CORS issues
- Network timeout

**Solutions:**
```bash
# 1. Test locally first
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/api/async-events?sessionId=test"

# 2. Check server logs for connection errors

# 3. If using Vercel, ensure Edge runtime is not used
# SSE requires Node.js runtime
```

### Issue: "Database persistence not working"

**Causes:**
- Migrations not run
- `DATABASE_URL` not configured
- Supabase connection issues

**Solutions:**
```bash
# 1. Verify tables exist
psql $DATABASE_URL -c "\dt async_*"

# 2. Test connection
psql $DATABASE_URL -c "SELECT 1"

# 3. Check migration status in Supabase dashboard
# Migrations should show as applied
```

---

## Production Deployment Checklist

Before deploying async work to production:

- [ ] Environment variable `ENABLE_ASYNC_WORK=true` set
- [ ] All 3 migrations applied in Supabase
- [ ] Database connection verified (`DATABASE_URL` correct)
- [ ] Tested locally with test suite
- [ ] SSE endpoint tested (curl with `-N` flag)
- [ ] Status API returning valid responses
- [ ] Cancellation working correctly
- [ ] Messages API tested
- [ ] Server restart persistence verified
- [ ] Frontend can handle SSE events
- [ ] Error handling tested (failed work, timeouts)

---

## Monitoring in Production

**Key metrics to watch:**

1. **Active Work Queue:**
   ```bash
   curl "https://your-app.com/api/async-status?sessionId=any" | jq '.queueStatus'
   ```

2. **Database Growth:**
   ```sql
   SELECT COUNT(*) as total_sessions FROM async_session_state;
   SELECT COUNT(*) as total_work FROM async_work_items;
   SELECT COUNT(*) as active_work FROM async_work_items
   WHERE status IN ('accepted', 'in_progress');
   ```

3. **SSE Connections:**
   - Monitor server logs for connection count
   - Check for memory leaks with many concurrent connections

4. **Completion Rates:**
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM async_work_items
   GROUP BY status;
   ```

---

## Next Steps

Once async work is tested and working:

1. **Frontend Integration:**
   - Implement EventSource client for SSE
   - Add UI for work status display
   - Add cancel buttons
   - Show progress bars

2. **User Experience:**
   - Design notification system for completed work
   - Add sound/visual cues for questions
   - Implement conversation continuity

3. **Optimization:**
   - Monitor queue performance
   - Tune concurrency limits
   - Optimize database queries
   - Add caching where appropriate

4. **Analytics:**
   - Track async work acceptance rates
   - Monitor completion times
   - Analyze cancellation patterns
   - Measure user satisfaction

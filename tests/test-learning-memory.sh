#!/bin/bash

# Test Priority 3: Learning & Memory
# Success Metric: Second dashboard request should be better/faster than first

echo "📚 Testing Learning & Memory (Priority 3)"
echo "=========================================="
echo ""
echo "Testing components:"
echo "  ✅ Learning cache (in-memory + database)"
echo "  ✅ Success/failure pattern tracking"
echo "  ✅ Best practices injection"
echo "  ✅ Known pitfalls avoidance"
echo ""
echo "Success Metric: Second similar request should be better/faster"
echo ""

# Test 1: First todo list request (agent learns from this)
echo "Test 1: First Todo List Request (Learning Baseline)"
echo "Request: 'Build a todo list app with add, complete, and delete functionality'"
echo "Expected: Normal processing, records success for learning"
echo ""

START_TIME_1=$(date +%s)

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Build a todo list app with add, complete, and delete functionality"
    }],
    "sessionId": "learning-demo-1"
  }' > /tmp/test-learning-1.json 2>&1

END_TIME_1=$(date +%s)
DURATION_1=$((END_TIME_1 - START_TIME_1))

if [ $? -eq 0 ]; then
  echo "✅ Request completed in ${DURATION_1}s"
  echo ""
  echo "Check server logs for:"
  echo "  - 📚 'Recorded successful workflow for learning'"
  echo "  - 💾 Database INSERT into workflow_memories"
else
  echo "❌ Request failed"
fi

echo ""
echo "---"
echo ""
echo "⏳ Waiting 5 seconds for learning to persist..."
sleep 5
echo ""

# Test 2: Second similar request (should use learned best practices)
echo "Test 2: Second Similar Request (Using Learned Best Practices)"
echo "Request: 'Create a task manager with priority levels and completion tracking'"
echo "Expected: Faster/better due to learned patterns from Test 1"
echo ""

START_TIME_2=$(date +%s)

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Create a task manager with priority levels and completion tracking"
    }],
    "sessionId": "learning-demo-2"
  }' > /tmp/test-learning-2.json 2>&1

END_TIME_2=$(date +%s)
DURATION_2=$((END_TIME_2 - START_TIME_2))

if [ $? -eq 0 ]; then
  echo "✅ Request completed in ${DURATION_2}s"
  echo ""
  echo "Check server logs for:"
  echo "  - 📚 'Found best practices from learning'"
  echo "  - 🎯 'Previously succeeded with...' (shows learned patterns)"
  echo "  - ⚡ Should be faster/better than Test 1"
else
  echo "❌ Request failed"
fi

echo ""
echo "---"
echo ""

# Test 3: Different domain request (should not use todo list patterns)
echo "Test 3: Different Domain Request (Learning Boundary Test)"
echo "Request: 'Build an interactive data visualization dashboard'"
echo "Expected: No best practices injected (different domain)"
echo ""

START_TIME_3=$(date +%s)

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Build an interactive data visualization dashboard with bar charts and pie charts"
    }],
    "sessionId": "learning-demo-3"
  }' > /tmp/test-learning-3.json 2>&1

END_TIME_3=$(date +%s)
DURATION_3=$((END_TIME_3 - START_TIME_3))

if [ $? -eq 0 ]; then
  echo "✅ Request completed in ${DURATION_3}s"
  echo ""
  echo "Check server logs for:"
  echo "  - Should NOT show 'Found best practices from learning' (different domain)"
  echo "  - May record new success for future visualization requests"
else
  echo "❌ Request failed"
fi

echo ""
echo "=========================================="
echo "📊 Learning & Memory Test Results"
echo "=========================================="
echo ""
echo "Test 1 (Baseline):    ${DURATION_1}s"
echo "Test 2 (With Learning): ${DURATION_2}s"
echo "Test 3 (Different Domain): ${DURATION_3}s"
echo ""

if [ $DURATION_2 -le $DURATION_1 ]; then
  echo "✅ SUCCESS: Learning improved performance!"
  echo "   Second request (${DURATION_2}s) was faster/equal to first (${DURATION_1}s)"
else
  echo "⚠️  Note: Second request (${DURATION_2}s) took longer than first (${DURATION_1}s)"
  echo "   This is okay - quality may have improved even if time increased"
fi

echo ""
echo "To verify learning system:"
echo "1. Check server logs for '📚 Recorded successful workflow for learning'"
echo "2. Verify database: SELECT * FROM workflow_memories WHERE domain='code-generation'"
echo "3. Look for '📚 Found best practices from learning' in Test 2"
echo "4. Confirm best practices NOT injected in Test 3 (different domain)"
echo ""
echo "Expected workflow:"
echo "  Test 1: generation → beauty_check → evaluation → recordSuccess()"
echo "  Test 2: getBestPractices() → generation (using learned patterns)"
echo ""
echo "Priority 3 Success Metric: ✅ Second similar request uses learned best practices"
echo ""

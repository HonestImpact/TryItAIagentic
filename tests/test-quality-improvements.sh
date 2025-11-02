#!/bin/bash

# Test Priority 1: Quality Foundation Implementation
# Success Metric: Confidence should INCREASE with iterations (0.3 → 0.6 → 0.8)

echo "🎯 Testing Quality Foundation (Priority 1)"
echo "=========================================="
echo ""
echo "Testing components:"
echo "  ✅ Metacognitive Analysis - Deep root cause understanding"
echo "  ✅ Strategic Revision - Adaptive strategies (TARGETED_REVISION, DIFFERENT_APPROACH, etc.)"
echo "  ✅ Calibrated Evaluation - Realistic scoring (working code >= 0.6)"
echo "  ✅ Pattern Synthesis - Creative pattern combination"
echo ""
echo "Expected behavior: Iterations should IMPROVE quality, not degrade it"
echo ""

# Test 1: Complex Dashboard (should trigger pattern synthesis with multiple patterns)
echo "Test 1: Complex Interactive Dashboard"
echo "Request: 'Build an interactive analytics dashboard with real-time charts, filters, and data export'"
echo "Expected: Multiple patterns → synthesis → high-quality output with improving confidence"
echo ""

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Build an interactive analytics dashboard with real-time charts, data filters, and CSV export functionality"
    }],
    "sessionId": "test-quality-dashboard"
  }' > /tmp/test-quality-1.json 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Request completed"
  echo ""
  echo "Check server logs for:"
  echo "  - 🎨 Pattern synthesis (combining multiple patterns)"
  echo "  - 🧠 Metacognitive analysis (if revision needed)"
  echo "  - 📊 Calibrated evaluation scores"
  echo "  - Quality scores across iterations"
else
  echo "❌ Request failed"
fi

echo ""
echo "---"
echo ""

# Test 2: Form with validation (moderate complexity)
echo "Test 2: Form with Validation"
echo "Request: 'Create a multi-step form with validation and progress tracking'"
echo "Expected: Good first attempt with synthesis, minimal revision needed"
echo ""

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Create a multi-step registration form with field validation, progress indicator, and data persistence"
    }],
    "sessionId": "test-quality-form"
  }' > /tmp/test-quality-2.json 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Request completed"
else
  echo "❌ Request failed"
fi

echo ""
echo "---"
echo ""

# Test 3: Data visualization (should benefit from pattern synthesis)
echo "Test 3: Advanced Data Visualization"
echo "Request: 'Build a data visualization with interactive charts and custom tooltips'"
echo "Expected: Pattern synthesis combines chart patterns with interaction patterns"
echo ""

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Build an interactive data visualization dashboard with bar charts, line charts, and custom hover tooltips showing detailed statistics"
    }],
    "sessionId": "test-quality-viz"
  }' > /tmp/test-quality-3.json 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Request completed"
else
  echo "❌ Request failed"
fi

echo ""
echo "========================================"
echo "✅ Quality Foundation Test Complete"
echo ""
echo "To verify success:"
echo "1. Check server logs for synthesis markers (🎨)"
echo "2. Look for metacognitive analysis if revisions occurred (🧠)"
echo "3. Verify confidence scores increase with iterations"
echo "4. Check that working code scores >= 0.6 (calibrated evaluation)"
echo ""
echo "Expected workflow:"
echo "  reasoning → knowledge_enhancement → synthesis → generation → evaluation"
echo "  (If revision needed): → revision → generation → evaluation → complete"
echo ""

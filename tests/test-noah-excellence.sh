#!/bin/bash

# Test Priority 2: Noah's Excellence
# Success Metric: Code feels thoughtful, maintainable, delightful

echo "💎 Testing Noah's Excellence (Priority 2)"
echo "=========================================="
echo ""
echo "Testing components:"
echo "  ✅ Noah-enhanced system prompts (personality, values, craft)"
echo "  ✅ Beauty check node (elegance validation)"
echo "  ✅ Quality-over-completeness evaluation"
echo "  ✅ Code elegance standards"
echo ""
echo "Expected behavior: Code should be beautiful, maintainable, delightful"
echo ""

# Test 1: Simple tool (should produce elegant, well-crafted code)
echo "Test 1: Simple Calculator Tool"
echo "Request: 'Create a simple calculator with basic operations'"
echo "Expected: Beautiful code with clear variable names, thoughtful comments, elegant design"
echo ""

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Create a simple calculator with addition, subtraction, multiplication, and division"
    }],
    "sessionId": "test-noah-calculator"
  }' > /tmp/test-noah-1.json 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Request completed"
  echo ""
  echo "Check server logs for:"
  echo "  - 💎 Beauty check markers"
  echo "  - 🎯 Noah's personality in system prompts"
  echo "  - 📊 Quality-over-completeness evaluation scoring"
  echo "  - ✨ Code elegance validation"
else
  echo "❌ Request failed"
fi

echo ""
echo "---"
echo ""

# Test 2: Form component (moderate complexity, should show quality over completeness)
echo "Test 2: User Registration Form"
echo "Request: 'Create a user registration form with validation'"
echo "Expected: Core features beautifully implemented, high quality score even if some features missing"
echo ""

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Create a user registration form with email, password, and basic validation"
    }],
    "sessionId": "test-noah-form"
  }' > /tmp/test-noah-2.json 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Request completed"
else
  echo "❌ Request failed"
fi

echo ""
echo "---"
echo ""

# Test 3: Data visualization (should demonstrate craft and thoughtfulness)
echo "Test 3: Data Visualization Chart"
echo "Request: 'Build a bar chart for displaying monthly sales data'"
echo "Expected: Thoughtful design, accessible, delightful interactions"
echo ""

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Build an interactive bar chart that displays monthly sales data with hover tooltips"
    }],
    "sessionId": "test-noah-viz"
  }' > /tmp/test-noah-3.json 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Request completed"
else
  echo "❌ Request failed"
fi

echo ""
echo "=========================================="
echo "✅ Noah's Excellence Test Complete"
echo ""
echo "To verify success:"
echo "1. Check server logs for beauty check markers (💎)"
echo "2. Look for Noah's personality traits in generated code"
echo "3. Verify quality-over-completeness in evaluation scores"
echo "4. Check that code has clear variable names (userName not u)"
echo "5. Validate thoughtful error handling and comments"
echo ""
echo "Expected workflow:"
echo "  reasoning → knowledge → synthesis → generation → beauty_check → evaluation"
echo ""
echo "Noah's philosophy should be visible:"
echo "  - Elegance over cleverness"
echo "  - Maintainability over shortcuts"
echo "  - User delight over feature completeness"
echo "  - One perfect feature > ten half-done ones"
echo ""

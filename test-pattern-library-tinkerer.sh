#!/bin/bash

echo "=========================================="
echo "Testing Pattern Library with Tinkerer"
echo "=========================================="
echo ""

# Test 1: Interactive list (should recommend list-with-actions)
echo "Test 1: Interactive list with React component..."
echo "Expected pattern: list-with-actions"
echo ""
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Build a React component for an interactive todo list with add, complete, and delete functionality"
      }
    ],
    "sessionId": "pattern-test-list"
  }' &

sleep 3

# Test 2: Dashboard with data visualization (should recommend dashboard-layout, data-viz-canvas)
echo "Test 2: Interactive dashboard with data visualization..."
echo "Expected patterns: dashboard-layout, data-viz-canvas"
echo ""
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create an interactive dashboard with data visualization charts for analytics"
      }
    ],
    "sessionId": "pattern-test-dashboard"
  }' &

sleep 3

# Test 3: Form with validation (should recommend form-validation)
echo "Test 3: Complex interface form with validation..."
echo "Expected pattern: form-validation"
echo ""
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Build a complex interface with a registration form including validation for email and password"
      }
    ],
    "sessionId": "pattern-test-form"
  }' &

echo ""
echo "=========================================="
echo "All tests queued. Check server logs for:"
echo "  📐 Found pattern recommendations"
echo "  📚 (Pattern library logs)"
echo "  🔧 Noah delegating to Tinkerer"
echo "=========================================="

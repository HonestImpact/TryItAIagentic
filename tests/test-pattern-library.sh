#!/bin/bash

echo "=========================================="
echo "Testing Pattern Library Integration"
echo "=========================================="
echo ""

# Test 1: Todo list (should recommend list-with-actions)
echo "Test 1: Todo list request..."
echo "Expected pattern: list-with-actions"
echo ""
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Build a todo list app with add, remove, and complete functionality"
      }
    ],
    "sessionId": "pattern-test-todo"
  }' 2>&1 | head -20

echo ""
echo "=========================================="
echo ""

# Test 2: Dashboard with charts (should recommend dashboard-layout, data-viz-canvas)
echo "Test 2: Dashboard with data visualization..."
echo "Expected patterns: dashboard-layout, data-viz-canvas"
echo ""
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create an analytics dashboard with multiple charts showing data"
      }
    ],
    "sessionId": "pattern-test-dashboard"
  }' 2>&1 | head -20

echo ""
echo "=========================================="
echo ""

# Test 3: Form with validation (should recommend form-validation)
echo "Test 3: Form with validation..."
echo "Expected pattern: form-validation"
echo ""
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Build a user registration form with email and password validation"
      }
    ],
    "sessionId": "pattern-test-form"
  }' 2>&1 | head -20

echo ""
echo "=========================================="
echo "Check server logs for pattern recommendations"
echo "Look for: 📐 Found pattern recommendations"
echo "=========================================="

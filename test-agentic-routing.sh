#!/bin/bash

# Test Agentic Routing - Truly distributed agent self-selection
# Tests various request types to verify agents autonomously decide routing

echo "🎯 Testing Truly Agentic Routing"
echo "================================"
echo ""

# Test 1: Code generation (should route to Tinkerer)
echo "Test 1: Code Generation Request"
echo "Request: 'Build a React dashboard with charts'"
echo "Expected: Tinkerer (high confidence for code generation)"
echo ""
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Build a React dashboard with charts"}],
    "sessionId": "test-routing-1"
  }' | jq -r '.agent' 2>/dev/null | head -1
echo ""
echo "---"
echo ""

# Test 2: Research request (should route to Wanderer)
echo "Test 2: Research Request"
echo "Request: 'Research best practices for React state management'"
echo "Expected: Wanderer (high confidence for research)"
echo ""
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Research best practices for React state management"}],
    "sessionId": "test-routing-2"
  }' | jq -r '.agent' 2>/dev/null | head -1
echo ""
echo "---"
echo ""

# Test 3: Simple question (should route to Noah)
echo "Test 3: Conversational Question"
echo "Request: 'How do I center a div in CSS?'"
echo "Expected: Noah (high confidence for quick answers)"
echo ""
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "How do I center a div in CSS?"}],
    "sessionId": "test-routing-3"
  }' | jq -r '.agent' 2>/dev/null | head -1
echo ""
echo "---"
echo ""

# Test 4: Simple tool (could route to Noah or Tinkerer)
echo "Test 4: Simple Tool Request"
echo "Request: 'Create a simple calculator'"
echo "Expected: Noah or Tinkerer (moderate confidence from both)"
echo ""
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Create a simple calculator"}],
    "sessionId": "test-routing-4"
  }' | jq -r '.agent' 2>/dev/null | head -1
echo ""
echo "---"
echo ""

# Test 5: Complex implementation (should route to Tinkerer)
echo "Test 5: Complex Implementation"
echo "Request: 'Build an interactive data visualization with D3.js'"
echo "Expected: Tinkerer (high confidence for complex code)"
echo ""
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Build an interactive data visualization with D3.js"}],
    "sessionId": "test-routing-5"
  }' | jq -r '.agent' 2>/dev/null | head -1
echo ""

echo "================================"
echo "✅ Agentic Routing Test Complete"
echo ""
echo "Note: Check logs to see agent bidding process:"
echo "  - Each agent evaluates the request independently"
echo "  - Agents return confidence scores (0.0-1.0)"
echo "  - Highest confidence wins (or clear winner >0.8)"
echo "  - No centralized keyword matching!"

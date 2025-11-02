#!/bin/bash

echo "🧪 Testing Agentic Tinkerer - Simple Calculator"
echo "================================================"
echo ""
echo "Request: Create a simple calculator"
echo "Expected: 1 iteration, confidence >= 0.8"
echo ""

START_TIME=$(date +%s)

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Create a simple calculator"}],"skepticMode":false}' \
  2>/dev/null

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo ""
echo "================================================"
echo "✅ Test completed in ${DURATION} seconds"
echo ""
echo "Check logs above for:"
echo "  - 'Tinkerer agent (AGENTIC) cached' message"
echo "  - Self-evaluation node execution"
echo "  - Confidence scores"
echo "  - Iteration count"

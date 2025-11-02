#!/bin/bash

echo "🧪 Testing Agentic Tinkerer - Complex Interactive Dashboard"
echo "=========================================================="
echo ""
echo "Request: Build an interactive dashboard with charts"
echo "Expected: Tinkerer delegation, 2-3 iterations, self-evaluation"
echo ""

START_TIME=$(date +%s)

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Build an interactive dashboard with multiple charts showing data visualization"}],"skepticMode":false}' \
  2>/dev/null | head -100

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo ""
echo "=========================================================="
echo "✅ Test completed in ${DURATION} seconds"
echo ""
echo "Now checking server logs for agentic behavior..."

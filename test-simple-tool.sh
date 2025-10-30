#!/bin/bash

echo "Testing simple calculator generation..."
echo "========================================"
echo ""

curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Create a simple calculator"}],"skepticMode":false}' \
  2>&1

echo ""
echo ""
echo "========================================"
echo "Test complete"

#!/bin/bash

echo "Making request..."
response=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Build me a task management board with drag and drop"}]}')

echo "Full response:"
echo "$response" | jq -r '.content'

echo ""
echo "=== Checking for transparency message ==="
echo "$response" | jq -r '.content' | grep -i "pulled\|remembered\|sharper\|past success" || echo "❌ Message not found"

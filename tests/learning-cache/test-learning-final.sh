#!/bin/bash

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Build me a comprehensive user dashboard with authentication, charts, and real-time updates"}]}' \
  | tee /tmp/final-response.json | jq -r '.content' | tail -50

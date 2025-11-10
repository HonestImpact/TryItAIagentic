#!/bin/bash

curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "I need a React dashboard with user authentication, data visualization, and real-time updates. Build me a comprehensive solution."}]}' \
  | jq -r '.content' > /tmp/tinkerer-response.txt 2>&1

echo "Response saved to /tmp/tinkerer-response.txt"
tail -20 /tmp/tinkerer-response.txt

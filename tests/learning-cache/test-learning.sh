#!/bin/bash

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "build me a simple calculator component"}]}' \
  2>&1 | tee /tmp/learning-response.json | jq -r '.content' 2>/dev/null || cat /tmp/learning-response.json

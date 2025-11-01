#!/bin/bash

echo "Testing learning persistence..."
echo

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "messages": [
    {
      "role": "user",
      "content": "Build a simple counter component with increment and decrement buttons"
    }
  ],
  "sessionId": "test-learning-persistence"
}
EOF

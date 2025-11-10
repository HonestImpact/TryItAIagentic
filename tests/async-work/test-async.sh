#!/bin/bash

curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Build a comprehensive dashboard with interactive charts and data visualization"
      }
    ]
  }'

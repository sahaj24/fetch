#!/bin/sh
echo "Starting Fetch application on port ${PORT:-8080}..."

# Try npm start first
export PORT=${PORT:-8080}
npm start
if [ $? -ne 0 ]; then
  echo "Failed to start with npm start, trying node server.js..."
  node server.js
  if [ $? -ne 0 ]; then
    echo "Failed with node server.js, serving static fallback..."
    node /app/emergency-server.js
  fi
fi

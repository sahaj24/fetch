#!/bin/sh
echo "Starting Fetch application on port ${PORT:-8080}..."

# Print debugging information
echo "Current directory: $(pwd)"
echo "Checking for Next.js build output..."
if [ -d ".next" ]; then
  echo "Next.js build found at $(pwd)/.next"
  ls -la .next
else
  echo "No .next directory found!"
fi

# Try npm start first
export PORT=${PORT:-8080}
echo "Attempting to start Next.js app with npm start..."
npm start
if [ $? -ne 0 ]; then
  echo "Failed to start with npm start, trying server.js fallback..."
  echo "Checking if server.js exists..."
  if [ -f "server.js" ]; then
    echo "Found server.js, attempting to start it..."
    node server.js
    if [ $? -ne 0 ]; then
      echo "server.js failed, falling back to emergency server..."
      node emergency-server.js
    fi
  else
    echo "server.js not found, falling back to emergency server..."
    node emergency-server.js
  fi
fi

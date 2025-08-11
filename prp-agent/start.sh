#!/bin/bash
# Start script for Context Engineering Turso A2A Agent

echo "🚀 Starting Context Engineering Turso A2A Agent..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Export A2A configuration
export A2A_PORT=9993
export A2A_AGENT_NAME="context_engineering_turso"

# Start the A2A server
echo "✅ Starting A2A server on port $A2A_PORT..."
node a2a-server.js
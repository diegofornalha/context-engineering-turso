#!/bin/bash

# Turso A2A Agent Startup Script

echo "🚀 Starting Turso A2A Database Agent..."

# Set the port if not already set
export A2A_PORT=${A2A_PORT:-4243}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "💾 Starting Turso agent on port $A2A_PORT..."
node simple-server.js
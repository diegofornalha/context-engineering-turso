#!/bin/bash
# Start MCP Briefing Server

echo "🚀 Starting MCP Briefing Server..."

# Navigate to the mcp-briefing directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Start the server
echo "✨ Starting MCP Briefing server on stdio..."
npm start

echo "✅ MCP Briefing server is running!"
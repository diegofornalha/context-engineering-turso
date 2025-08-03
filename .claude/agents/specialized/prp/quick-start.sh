#!/bin/bash
# Quick start script for PRP Specialist Agent

echo "🧠 PRP Specialist Agent Quick Start"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/Users/agents/Desktop/context-engineering-turso"
PRP_AGENT_PATH="$PROJECT_ROOT/prp-agent"
CLAUDE_AGENTS="$PROJECT_ROOT/.claude/agents"

# Check if prp-agent exists
if [ -d "$PRP_AGENT_PATH" ]; then
    echo -e "${GREEN}✅ PRP Agent found at: $PRP_AGENT_PATH${NC}"
    
    # Count existing PRPs
    PRP_COUNT=$(find "$PRP_AGENT_PATH/PRPs" -name "*.md" 2>/dev/null | wc -l)
    echo -e "${GREEN}📚 Found $PRP_COUNT existing PRPs${NC}"
else
    echo -e "${YELLOW}⚠️  PRP Agent not found at expected location${NC}"
fi

# Show usage instructions
echo ""
echo "📝 How to use the PRP Specialist Agent:"
echo ""
echo "1. Generate a new PRP:"
echo "   Task: 'Generate a PRP about [YOUR TOPIC]'"
echo ""
echo "2. Search existing PRPs:"
echo "   Task: 'Search for PRPs about [KEYWORDS]'"
echo ""
echo "3. Update an existing PRP:"
echo "   Task: 'Update PRP_[ID] with [NEW CONTENT]'"
echo ""
echo "4. List all PRPs:"
echo "   Task: 'List all existing PRPs'"
echo ""
echo "5. Validate a PRP:"
echo "   Task: 'Validate PRP at [PATH]'"
echo ""

# Test Python integration
echo "🐍 Testing Python integration..."
if [ -f "$PROJECT_ROOT/venv/bin/python" ]; then
    source "$PROJECT_ROOT/venv/bin/activate"
    python -c "print('✅ Python environment ready')" 2>/dev/null || echo -e "${RED}❌ Python environment needs configuration${NC}"
else
    echo -e "${YELLOW}⚠️  Virtual environment not found${NC}"
fi

echo ""
echo "🚀 The PRP Specialist Agent is ready to use!"
echo "   Use the Task tool with subagent_type='prp-specialist'"
echo ""
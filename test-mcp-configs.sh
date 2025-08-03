#!/bin/bash

# Script para testar diferentes configurações MCP

echo "=== Testando diferentes configurações MCP ==="

# Backup do arquivo original
cp /Users/agents/.claude/.mcp.json /Users/agents/.claude/.mcp.json.backup

# Configuração 1: Script wrapper original
echo "1. Testando com script wrapper original..."
cat > /Users/agents/.claude/.mcp.json << 'EOF'
{
  "mcpServers": {
    "mcp-turso": {
      "command": "/Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp.sh",
      "args": [],
      "type": "stdio"
    }
  }
}
EOF

# Configuração 2: Script limpo
echo "2. Testando com script limpo..."
cat > /Users/agents/.claude/.mcp.json << 'EOF'
{
  "mcpServers": {
    "mcp-turso": {
      "command": "/Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp-clean.sh",
      "args": [],
      "type": "stdio"
    }
  }
}
EOF

# Configuração 3: Node direto com env
echo "3. Testando com node direto..."
cat > /Users/agents/.claude/.mcp.json << 'EOF'
{
  "mcpServers": {
    "mcp-turso": {
      "command": "node",
      "args": ["/Users/agents/Desktop/context-engineering-turso/mcp-turso/dist/index.js"],
      "env": {
        "TURSO_API_TOKEN": "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yYzA4R3ZNeEhYMlNCc3l0d2padm95cEdJeDUiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NTQ3MjU0ODUsImlhdCI6MTc1NDEyMDY4NSwiaXNzIjoiaHR0cHM6Ly9jbGVyay50dXJzby50ZWNoIiwianRpIjoiY2IwNDA3ZTdhNWFmMGJkZDU2NzAiLCJuYmYiOjE3NTQxMjA2ODAsInN1YiI6InVzZXJfMng5SlpMR2FHN2VuRjJMT0M1ZlQ1Q2NLeUlvIn0.va7_z4o_nsGYol3m90mxCnKURCE8ECnYfQq1KFJINJsLNBvRPRMsiuTb94sr_qr0C6NL6IGrZrCw_oj7lLKXK1MSWKyKIlgVjB1Q8Ms_TsCzEpzyzk2TLHU9jvPW35da4TfejcdBk_gC6WOAKptbsVuqq4VL06QmOlNCPNRh9FoPFcmE2ANGbkuuvzCdW-pBjM4w2dC0toYVXa7tUzHxD1vLoVvMuMrPu_TSghiGFM7K1nnJsNHr20TXwgtRYSWlmqNhznDvL_4S__xBhdpArp5oyNvjbsaibcwlWw0LhxDtgJaYzYRySWs0FTMxYaoz1Jbk3Avb2gbqYNfd1DCyKQ",
        "TURSO_AUTH_TOKEN": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQxNzIwODYsImlkIjoiOTUwY2ExMGUtN2EzMi00ODgwLTkyYjgtOTNkMTdmZTZjZTBkIiwicmlkIjoiZWU2YTJlNmYtMDViYy00NWIzLWEyOTgtN2Q0NzE3NTE0YjRiIn0.aFmJW5X557_TVqJUQjY6ffNsbn29U9mKJJYckLl_QiHN3m82Z-jZaaM5wpdecWI3JCWdeyCVX9h7NwVvj1w0Cg",
        "TURSO_ORGANIZATION": "diegofornalha",
        "TURSO_DEFAULT_DATABASE": "context-memory"
      },
      "type": "stdio"
    }
  }
}
EOF

# Restaurar configuração original
echo "4. Restaurando configuração original com todos os MCPs..."
cat > /Users/agents/.claude/.mcp.json << 'EOF'
{
  "mcpServers": {
    "claude-flow": {
      "command": "npx",
      "args": [
        "claude-flow@alpha",
        "mcp",
        "start"
      ],
      "type": "stdio"
    },
    "ruv-swarm": {
      "command": "npx",
      "args": [
        "ruv-swarm@latest",
        "mcp",
        "start"
      ],
      "type": "stdio"
    },
    "mcp-turso": {
      "command": "/Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp-clean.sh",
      "args": [],
      "type": "stdio"
    }
  }
}
EOF

echo "Configuração atualizada. Reinicie o Claude Code para testar!"
echo "Use: claude mcp list"
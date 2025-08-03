#!/bin/bash

# Script para testar handshake MCP manualmente

echo "=== Testando MCP Handshake ==="
echo "Enviando mensagem de inicialização..."

# Mensagem de inicialização MCP padrão
INIT_MSG='{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0","capabilities":{"roots":{"listChanged":true},"sampling":{}}},"id":1}'

echo "Request: $INIT_MSG"
echo "---"

# Enviar para o servidor e capturar resposta
RESPONSE=$(echo "$INIT_MSG" | /Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp-stdio.sh 2>/tmp/mcp-test-stderr.log)

echo "Response: $RESPONSE"
echo "---"
echo "Stderr output:"
cat /tmp/mcp-test-stderr.log

# Testar também list tools
echo -e "\n=== Testando List Tools ==="
LIST_TOOLS='{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
echo "Request: $LIST_TOOLS"

# Enviar ambas mensagens em sequência
(echo "$INIT_MSG"; sleep 0.1; echo "$LIST_TOOLS") | /Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp-stdio.sh
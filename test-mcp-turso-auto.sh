#!/bin/bash

# Script automatizado para testar MCP Turso

echo "=== Teste Automatizado MCP Turso ==="
echo "Data: $(date)"
echo ""

# 1. Verificar status do servidor
echo "1. Verificando status dos servidores MCP..."
claude mcp list
echo ""

# 2. Verificar processos rodando
echo "2. Verificando processos MCP Turso..."
ps aux | grep -E "node.*dist/index.js" | grep -v grep
echo ""

# 3. Testar handshake manual
echo "3. Testando handshake manual..."
HANDSHAKE_RESPONSE=$(echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0","capabilities":{"roots":{"listChanged":true},"sampling":{}},"clientInfo":{"name":"test-client","version":"1.0.0"}},"id":1}' | /Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp-clean.sh 2>/dev/null | grep -o '"result"')

if [[ -n "$HANDSHAKE_RESPONSE" ]]; then
    echo "✅ Handshake bem-sucedido!"
else
    echo "❌ Handshake falhou!"
fi
echo ""

# 4. Listar ferramentas disponíveis
echo "4. Listando ferramentas MCP Turso..."
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0","capabilities":{"roots":{"listChanged":true},"sampling":{}},"clientInfo":{"name":"test-client","version":"1.0.0"}},"id":1}
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | /Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp-clean.sh 2>/dev/null | grep -A1 '"name"' | head -20
echo ""

# 5. Testar conexão direta ao Turso
echo "5. Testando conexão direta ao banco Turso..."
turso db shell context-memory ".tables" | head -5
echo ""

# 6. Resumo
echo "=== RESUMO ==="
echo "Para as ferramentas MCP funcionarem no Claude Code:"
echo "1. O servidor deve estar rodando (verificar com 'claude mcp list')"
echo "2. O handshake deve funcionar (incluir clientInfo)"
echo "3. As ferramentas devem ser listadas corretamente"
echo "4. Reiniciar Claude Code após mudanças no .mcp.json"
echo ""
echo "Status atual:"
if claude mcp list | grep -q "mcp-turso.*Connected"; then
    echo "✅ MCP Turso está CONECTADO"
else
    echo "❌ MCP Turso NÃO está conectado"
fi
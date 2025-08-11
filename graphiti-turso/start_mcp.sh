#!/bin/bash
cd "$(dirname "$0")"

# Verificar se o ambiente virtual existe
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Executar o servidor MCP usando FastMCP (API mais simples e estável)
exec python3 graphiti_mcp_fastmcp.py
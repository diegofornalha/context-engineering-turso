#!/bin/bash

echo "Testando MCP Turso Server..."
echo ""

# Configurar variáveis de ambiente
export TURSO_API_TOKEN="eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yYzA4R3ZNeEhYMlNCc3l0d2padm95cEdJeDUiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NTQ3MjU0ODUsImlhdCI6MTc1NDEyMDY4NSwiaXNzIjoiaHR0cHM6Ly9jbGVyay50dXJzby50ZWNoIiwianRpIjoiY2IwNDA3ZTdhNWFmMGJkZDU2NzAiLCJuYmYiOjE3NTQxMjA2ODAsInN1YiI6InVzZXJfMng5SlpMR2FHN2VuRjJMT0M1ZlQ1Q2NLeUlvIn0.va7_z4o_nsGYol3m90mxCnKURCE8ECnYfQq1KFJINJsLNBvRPRMsiuTb94sr_qr0C6NL6IGrZrCw_oj7lLKXK1MSWKyKIlgVjB1Q8Ms_TsCzEpzyzk2TLHU9jvPW35da4TfejcdBk_gC6WOAKptbsVuqq4VL06QmOlNCPNRh9FoPFcmE2ANGbkuuvzCdW-pBjM4w2dC0toYVXa7tUzHxD1vLoVvMuMrPu_TSghiGFM7K1nnJsNHr20TXwgtRYSWlmqNhznDvL_4S__xBhdpArp5oyNvjbsaibcwlWw0LhxDtgJaYzYRySWs0FTMxYaoz1Jbk3Avb2gbqYNfd1DCyKQ"
export TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQxNzIwODYsImlkIjoiOTUwY2ExMGUtN2EzMi00ODgwLTkyYjgtOTNkMTdmZTZjZTBkIiwicmlkIjoiZWU2YTJlNmYtMDViYy00NWIzLWEyOTgtN2Q0NzE3NTE0YjRiIn0.aFmJW5X557_TVqJUQjY6ffNsbn29U9mKJJYckLl_QiHN3m82Z-jZaaM5wpdecWI3JCWdeyCVX9h7NwVvj1w0Cg"
export TURSO_ORGANIZATION="diegofornalha"
export TURSO_DEFAULT_DATABASE="context-memory"

# Mudar para o diretório do MCP Turso
cd /Users/agents/Desktop/context-engineering-turso/mcp-turso

# Teste 1: Verificar se o servidor inicia
echo "Teste 1: Iniciando servidor e enviando comando de inicialização..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | node dist/index.js 2>&1 | head -20

echo ""
echo "Se o servidor respondeu com um JSON contendo 'result', está funcionando corretamente."
echo ""
echo "Para usar no Claude Code:"
echo "1. Certifique-se de que o arquivo .mcp.json foi atualizado"
echo "2. Reinicie o Claude Code"
echo "3. Use ListMcpResourcesTool para verificar se o servidor aparece"
echo "4. As ferramentas mcp__mcp_turso__* devem estar disponíveis"
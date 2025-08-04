#!/bin/bash

# Script para iniciar o MCP Turso Unificado (10 tools)
# Compatível com Claude Code CLI e Cursor Agent

echo "🚀 Iniciando MCP Turso Unificado v2.0..."
echo "🛠️  10 tools disponíveis (4 básicas + 6 avançadas)"
echo "🔧 Compatível com Claude Code CLI & Cursor Agent"

# Definir variáveis de ambiente
export TURSO_API_TOKEN="eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yYzA4R3ZNeEhYMlNCc3l0d2padm95cEdJeDUiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NTQ3MjU0ODUsImlhdCI6MTc1NDEyMDY4NSwiaXNzIjoiaHR0cHM6Ly9jbGVyay50dXJzby50ZWNoIiwianRpIjoiY2IwNDA3ZTdhNWFmMGJkZDU2NzAiLCJuYmYiOjE3NTQxMjA2ODAsInN1YiI6InVzZXJfMng5SlpMR2FHN2VuRjJMT0M1ZlQ1Q2NLeUlvIn0.va7_z4o_nsGYol3m90mxCnKURCE8ECnYfQq1KFJINJsLNBvRPRMsiuTb94sr_qr0C6NL6IGrZrCw_oj7lLKXK1MSWKyKIlgVjB1Q8Ms_TsCzEpzyzk2TLHU9jvPW35da4TfejcdBk_gC6WOAKptbsVuqq4VL06QmOlNCPNRh9FoPFcmE2ANGbkuuvzCdW-pBjM4w2dC0toYVXa7tUzHxD1vLoVvMuMrPu_TSghiGFM7K1nnJsNHr20TXwgtRYSWlmqNhznDvL_4S__xBhdpArp5oyNvjbsaibcwlWw0LhxDtgJaYzYRySWs0FTMxYaoz1Jbk3Avb2gbqYNfd1DCyKQ"

export TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTQyOTk1NDYsImlkIjoiOTUwY2ExMGUtN2EzMi00ODgwLTkyYjgtOTNkMTdmZTZjZTBkIiwicmlkIjoiZWU2YTJlNmYtMDViYy00NWIzLWEyOTgtN2Q0NzE3NTE0YjRiIn0.OxnLTNVp7dzXSsHrKkzyuE-MAAV0_D-LEaYiOnscNMCqOCOxAqYYVE_RQ2SoiNzLHbZDQOFtfwp78bHWvYDtDg"

export TURSO_ORGANIZATION="diegofornalha"
export TURSO_DEFAULT_DATABASE="context-memory"

# Para Cursor Agent, definir também a URL do banco
export TURSO_DATABASE_URL="libsql://context-memory-diegofornalha.aws-us-east-1.turso.io"

echo "Variáveis de ambiente configuradas:"
echo "TURSO_API_TOKEN: ${TURSO_API_TOKEN:0:20}..."
echo "TURSO_AUTH_TOKEN: ${TURSO_AUTH_TOKEN:0:20}..."
echo "TURSO_ORGANIZATION: $TURSO_ORGANIZATION"
echo "TURSO_DEFAULT_DATABASE: $TURSO_DEFAULT_DATABASE"
echo "TURSO_DATABASE_URL: $TURSO_DATABASE_URL"

# Mudar para o diretório correto
cd "$(dirname "$0")"

# Iniciar o MCP servidor unificado
exec node dist/index-unified.js
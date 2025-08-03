#!/bin/bash

# Script de debug para MCP Turso - Captura toda comunicação stdio
LOG_FILE="/tmp/mcp-turso-debug-$(date +%Y%m%d-%H%M%S).log"
COMM_LOG="/tmp/mcp-turso-comm-$(date +%Y%m%d-%H%M%S).log"

echo "[$(date)] Starting MCP Turso Debug" > "$LOG_FILE"
echo "Log file: $LOG_FILE" >&2
echo "Communication log: $COMM_LOG" >&2

# Exportar variáveis de ambiente
export TURSO_API_TOKEN="eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yYzA4R3ZNeEhYMlNCc3l0d2padm95cEdJeDUiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NTQ3MjU0ODUsImlhdCI6MTc1NDEyMDY4NSwiaXNzIjoiaHR0cHM6Ly9jbGVyay50dXJzby50ZWNoIiwianRpIjoiY2IwNDA3ZTdhNWFmMGJkZDU2NzAiLCJuYmYiOjE3NTQxMjA2ODAsInN1YiI6InVzZXJfMng5SlpMR2FHN2VuRjJMT0M1ZlQ1Q2NLeUlvIn0.va7_z4o_nsGYol3m90mxCnKURCE8ECnYfQq1KFJINJsLNBvRPRMsiuTb94sr_qr0C6NL6IGrZrCw_oj7lLKXK1MSWKyKIlgVjB1Q8Ms_TsCzEpzyzk2TLHU9jvPW35da4TfejcdBk_gC6WOAKptbsVuqq4VL06QmOlNCPNRh9FoPFcmE2ANGbkuuvzCdW-pBjM4w2dC0toYVXa7tUzHxD1vLoVvMuMrPu_TSghiGFM7K1nnJsNHr20TXwgtRYSWlmqNhznDvL_4S__xBhdpArp5oyNvjbsaibcwlWw0LhxDtgJaYzYRySWs0FTMxYaoz1Jbk3Avb2gbqYNfd1DCyKQ"
export TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQxNzIwODYsImlkIjoiOTUwY2ExMGUtN2EzMi00ODgwLTkyYjgtOTNkMTdmZTZjZTBkIiwicmlkIjoiZWU2YTJlNmYtMDViYy00NWIzLWEyOTgtN2Q0NzE3NTE0YjRiIn0.aFmJW5X557_TVqJUQjY6ffNsbn29U9mKJJYckLl_QiHN3m82Z-jZaaM5wpdecWI3JCWdeyCVX9h7NwVvj1w0Cg"
export TURSO_ORGANIZATION="diegofornalha"
export TURSO_DEFAULT_DATABASE="context-memory"

# Debug flags
export DEBUG="mcp:*"
export NODE_DEBUG="*"
export MCP_DEBUG="true"

# Suprimir logs do dotenv mas manter debug MCP
export DOTENV_CONFIG_QUIET=true

# Log environment
echo "[$(date)] Environment variables set" >> "$LOG_FILE"
echo "TURSO_ORGANIZATION=$TURSO_ORGANIZATION" >> "$LOG_FILE"
echo "TURSO_DEFAULT_DATABASE=$TURSO_DEFAULT_DATABASE" >> "$LOG_FILE"
echo "DEBUG=$DEBUG" >> "$LOG_FILE"

# Mudar para o diretório correto
cd "$(dirname "$0")"

# Criar um wrapper que loga toda comunicação
echo "[$(date)] Starting node process with communication logging" >> "$LOG_FILE"

# Use tee para capturar stdin/stdout enquanto ainda passa pela pipe
exec 3>&1 4>&2  # Salvar stdout e stderr originais

# Executar node com logging completo
node dist/index.js 2>&1 | while IFS= read -r line; do
    echo "[$(date)] STDOUT: $line" >> "$COMM_LOG"
    echo "$line"
done &

# Capturar PID do processo
NODE_PID=$!

# Log stdin também
while IFS= read -r line; do
    echo "[$(date)] STDIN: $line" >> "$COMM_LOG"
    echo "$line" | node dist/index.js
done

# Esperar processo terminar
wait $NODE_PID
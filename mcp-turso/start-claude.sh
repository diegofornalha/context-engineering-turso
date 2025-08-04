#!/bin/bash

# MCP Turso Server - Script de inicialização
cd "$(dirname "$0")"

# Verificar se existe arquivo .env
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "📝 Copie .env.example para .env e configure suas variáveis:"
    echo "   cp .env.example .env"
    echo "   # Edite o arquivo .env com suas configurações"
    exit 1
fi

# Carregar variáveis de ambiente do arquivo .env
export $(cat .env | grep -v '^#' | xargs)

# Verificar variáveis obrigatórias
if [ -z "$TURSO_DATABASE_URL" ] || [ -z "$TURSO_AUTH_TOKEN" ]; then
    echo "❌ Erro: TURSO_DATABASE_URL e TURSO_AUTH_TOKEN devem estar configurados"
    echo "Execute: ./setup-env.sh"
    exit 1
fi

# Garantir que o projeto está compilado
if [ ! -d "dist" ]; then
    echo "🔨 Compilando projeto..."
    npm install >/dev/null 2>&1
    npm run build >/dev/null 2>&1
fi

# Iniciar servidor MCP
echo "🚀 Iniciando servidor MCP Turso..."
exec node dist/index.js